#!/usr/bin/env python3
"""
MCP Hub 服务器下载和模板化管理系统
负责下载可用的 MCP 服务器并生成标准化配置模板
"""

import hashlib
import json
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class MCPServerTemplate:
    """MCP 服务器标准化模板"""

    name: str
    display_name: str
    description: str
    source: str
    language: str
    stars: int
    source_type: str  # official, community
    install_command: str
    install_args: List[str]
    install_env: Dict[str, str]
    config: Dict[str, Any]
    categories: List[str]
    quality_score: int
    quality_level: str
    download_status: str  # pending, downloading, downloaded, failed
    download_path: Optional[str] = None
    error_message: Optional[str] = None
    last_updated: Optional[str] = None


class MCPServerDownloader:
    """MCP 服务器下载器"""

    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.download_dir = base_path / "servers"
        self.template_dir = base_path / "templates"
        self.registry_file = base_path / "server_registry.json"

    def load_registry(self) -> Dict[str, Any]:
        """加载服务器注册表"""
        if self.registry_file.exists():
            with open(self.registry_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"version": "1.0", "servers": {}, "total": 0, "downloaded": 0, "last_sync": ""}

    def save_registry(self, registry: Dict[str, Any]):
        """保存服务器注册表"""
        with open(self.registry_file, "w", encoding="utf-8") as f:
            json.dump(registry, f, ensure_ascii=False, indent=2)

    def generate_template(self, server_data: Dict) -> MCPServerTemplate:
        """从服务器数据生成标准化模板"""
        name = server_data.get("name", "")
        source = server_data.get("source", "")
        language = server_data.get("language", "unknown")

        # 生成安装命令
        install_command, install_args, install_env = self._generate_install_info(
            source, language, server_data
        )

        # 生成配置
        config = self._generate_config(name, install_command, install_args, install_env)

        # 计算质量评分
        quality_score = self._calculate_quality_score(server_data)
        quality_level = self._get_quality_level(quality_score)

        return MCPServerTemplate(
            name=name,
            display_name=name.replace("-", " ").replace("_", " ").title(),
            description=server_data.get("description", ""),
            source=source,
            language=language,
            stars=server_data.get("stars", 0),
            source_type=server_data.get("source_type", "community"),
            install_command=install_command,
            install_args=install_args,
            install_env=install_env,
            config=config,
            categories=server_data.get("categories", []),
            quality_score=quality_score,
            quality_level=quality_level,
            download_status="pending",
        )

    def _generate_install_info(self, source: str, language: str, server_data: Dict) -> tuple:
        """生成安装命令和参数"""
        # 优先使用 npm_package
        npm_pkg = server_data.get("npm_package", "")
        if npm_pkg:
            return "npx", ["-y", npm_pkg], {}

        # 如果是 GitHub URL，提取信息
        if "github.com" in source:
            # 标准化 GitHub URL
            parts = (
                source.replace("https://github.com/", "")
                .replace("http://github.com/", "")
                .split("/")
            )
            if len(parts) >= 2:
                owner, repo = parts[0], parts[1].replace(".git", "")

                # Python 项目
                if language.lower() in ["python", "py"] or "requirements.txt" in source:
                    return "uvx", [f"--from", f"git+https://github.com/{owner}/{repo}"], {}

                # Node.js 项目
                if language.lower() in ["javascript", "typescript", "node", "nodejs"]:
                    package_name = (
                        f"@modelcontextprotocol/server-{repo}" if "@" not in repo else repo
                    )
                    return "npx", ["-y", package_name], {}

                # Go 项目
                if language.lower() == "go":
                    return "go", ["install", f"github.com/{owner}/{repo}@latest"], {}

                # 默认使用 npm
                return "npx", ["-y", f"@modelcontextprotocol/server-{repo}"], {}

        # 默认回退
        return "npx", ["-y", "@modelcontextprotocol/server-unknown"], {}

    def _generate_config(
        self, name: str, command: str, args: List[str], env: Dict[str, str]
    ) -> Dict:
        """生成 MCP 配置文件"""
        return {
            "mcpServers": {
                name: {"command": command, "args": args, **({"env": env} if env else {})}
            }
        }

    def _calculate_quality_score(self, server_data: Dict) -> int:
        """计算质量评分"""
        score = 0

        # Source 类型 (30分)
        if server_data.get("source_type") == "official":
            score += 30
        elif server_data.get("source_type") == "community":
            score += 20

        # Star 数量 (25分)
        stars = server_data.get("stars", 0)
        if stars >= 10000:
            score += 25
        elif stars >= 1000:
            score += 20
        elif stars >= 100:
            score += 15
        elif stars >= 10:
            score += 10
        else:
            score += 5

        # 分类完整性 (10分)
        if server_data.get("categories"):
            score += 10
        else:
            score += 5

        # 归档状态 (10分)
        if not server_data.get("archived", False):
            score += 10
        else:
            score += 3

        return max(0, min(100, score))

    def _get_quality_level(self, score: int) -> str:
        """获取质量等级"""
        if score >= 85:
            return "S"
        elif score >= 70:
            return "A"
        elif score >= 55:
            return "B"
        elif score >= 40:
            return "C"
        else:
            return "D"

    def download_server(self, server_template: MCPServerTemplate) -> bool:
        """下载单个服务器"""
        try:
            server_template.download_status = "downloading"

            # 创建下载目录
            server_dir = self.download_dir / server_template.name
            server_dir.mkdir(parents=True, exist_ok=True)

            # 克隆仓库
            if "github.com" in server_template.source:
                subprocess.run(
                    ["git", "clone", "--depth", "1", server_template.source, str(server_dir)],
                    check=True,
                    capture_output=True,
                )

            server_template.download_status = "downloaded"
            server_template.download_path = str(server_dir)
            server_template.last_updated = datetime.now().isoformat()

            # 生成配置文件
            config_file = server_dir / "mcp_config.json"
            with open(config_file, "w", encoding="utf-8") as f:
                json.dump(server_template.config, f, indent=2)

            # 生成 README
            readme_content = self._generate_readme(server_template)
            readme_file = server_dir / "README_MCP.md"
            with open(readme_file, "w", encoding="utf-8") as f:
                f.write(readme_content)

            return True

        except Exception as e:
            server_template.download_status = "failed"
            server_template.error_message = str(e)
            return False

    def _generate_readme(self, template: MCPServerTemplate) -> str:
        """生成 MCP 服务器 README"""
        return f"""# {template.display_name}

## 概述

{template.description}

## 质量评分

- **评分**: {template.quality_score}/100 ({template.quality_level}级)
- **Star 数**: {template.stars:,}
- **类型**: {template.source_type}
- **语言**: {template.language}

## 安装

### 自动安装

```bash
{template.install_command} {' '.join(template.install_args)}
```

### 手动安装

```bash
git clone {template.source}
cd {template.name}
# 根据项目说明安装
```

## 配置

### Claude Desktop

在 `~/.config/claude-desktop/claude_desktop_config.json` 中添加：

```json
{json.dumps(template.config, indent=2)}
```

### Cursor

在设置中添加 MCP Server 配置。

### VS Code Copilot

根据 VS Code 文档配置 MCP Server。

## 分类

{', '.join(template.categories)}

## 源码

{template.source}

---
*由 MCP Hub 自动生成 | {datetime.now().strftime('%Y-%m-%d')}*
"""

    def sync_from_index(self, index_path: Path, limit: Optional[int] = None):
        """从索引同步服务器并生成模板"""
        with open(index_path, "r", encoding="utf-8") as f:
            index_data = json.load(f)

        servers = index_data.get("servers", [])
        if limit:
            servers = servers[:limit]

        registry = self.load_registry()
        templates = {}

        for server in servers:
            name = server.get("name", "")
            if not name:
                continue

            # 生成模板
            template = self.generate_template(server)
            templates[name] = {
                "name": template.name,
                "display_name": template.display_name,
                "description": template.description,
                "source": template.source,
                "language": template.language,
                "stars": template.stars,
                "source_type": template.source_type,
                "install_command": template.install_command,
                "install_args": template.install_args,
                "install_env": template.install_env,
                "config": template.config,
                "categories": template.categories,
                "quality_score": template.quality_score,
                "quality_level": template.quality_level,
                "download_status": template.download_status,
                "download_path": template.download_path,
                "last_updated": template.last_updated,
            }

        registry["servers"] = templates
        registry["total"] = len(templates)
        registry["downloaded"] = sum(
            1 for s in templates.values() if s["download_status"] == "downloaded"
        )
        registry["last_sync"] = datetime.now().isoformat()

        self.save_registry(registry)

        # 保存模板到文件
        self.template_dir.mkdir(parents=True, exist_ok=True)
        for name, template_data in templates.items():
            template_file = self.template_dir / f"{name}.json"
            with open(template_file, "w", encoding="utf-8") as f:
                json.dump(template_data, f, indent=2, ensure_ascii=False)

        return registry

    def download_batch(self, server_names: List[str], parallel: int = 3) -> Dict[str, bool]:
        """批量下载服务器"""
        registry = self.load_registry()
        results = {}

        for name in server_names:
            if name not in registry["servers"]:
                results[name] = False
                continue

            template_data = registry["servers"][name]
            template = MCPServerTemplate(
                **{k: v for k, v in template_data.items() if k != "error_message"},
                error_message=template_data.get("error_message"),
            )

            success = self.download_server(template)
            results[name] = success

            # 更新注册表
            registry["servers"][name]["download_status"] = template.download_status
            registry["servers"][name]["download_path"] = template.download_path
            registry["servers"][name]["last_updated"] = template.last_updated
            registry["servers"][name]["error_message"] = template.error_message

        registry["downloaded"] = sum(
            1 for s in registry["servers"].values() if s["download_status"] == "downloaded"
        )
        self.save_registry(registry)

        return results

    def export_config(self, server_names: List[str], output_path: Path, format: str = "claude"):
        """导出配置到文件"""
        registry = self.load_registry()
        all_configs = {}

        for name in server_names:
            if name in registry["servers"]:
                template_data = registry["servers"][name]
                all_configs.update(template_data["config"]["mcpServers"])

        final_config = {"mcpServers": all_configs}

        if format == "claude":
            output_path = Path.home() / ".config" / "claude-desktop" / "claude_desktop_config.json"
            output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_config, f, indent=2, ensure_ascii=False)

        return output_path


def main():
    """主函数"""
    import sys

    base_path = Path(__file__).parent.parent
    downloader = MCPServerDownloader(base_path)

    if len(sys.argv) < 2:
        print("用法:")
        print("  python download_manager.py sync [limit]  同步服务器并生成模板")
        print("  python download_manager.py list         列出所有已注册服务器")
        print("  python download_manager.py download <names...>  下载指定服务器")
        print("  python download_manager.py export <names...>  导出配置")
        return

    cmd = sys.argv[1]

    if cmd == "sync":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else None
        print("🔄 正在同步服务器...")
        registry = downloader.sync_from_index(base_path / "servers-index.json", limit)
        print(f"✅ 已同步 {registry['total']} 个服务器")
        print(f"📊 其中 {registry['downloaded']} 个已下载")

    elif cmd == "list":
        registry = downloader.load_registry()
        print(f"\n📦 已注册服务器: {registry['total']} 个")
        print(f"✅ 已下载: {registry['downloaded']} 个")
        print(f"🕐 最后同步: {registry['last_sync']}\n")

        for name, data in list(registry["servers"].items())[:20]:
            status_icon = {
                "downloaded": "✅",
                "downloading": "⏳",
                "pending": "⭕",
                "failed": "❌",
            }.get(data["download_status"], "❓")

            print(f"{status_icon} {name} ({data['quality_level']}级 {data['quality_score']}分)")

    elif cmd == "download":
        if len(sys.argv) < 3:
            print("❌ 请指定要下载的服务器名称")
            return

        names = sys.argv[2:]
        print(f"📥 正在下载 {len(names)} 个服务器...")
        results = downloader.download_batch(names)

        for name, success in results.items():
            print(f"{'✅' if success else '❌'} {name}")

    elif cmd == "export":
        if len(sys.argv) < 3:
            print("❌ 请指定要导出的服务器名称")
            return

        names = sys.argv[2:]
        output = downloader.export_config(names, base_path / "exported_config.json")
        print(f"✅ 配置已导出到: {output}")


if __name__ == "__main__":
    main()

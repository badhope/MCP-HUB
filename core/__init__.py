"""
MCP-HUB 核心框架
提供基于 JSON 索引的服务器管理、搜索、配置生成功能
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class MCPServer:
    """单个 MCP 服务器（基于 JSON 数据）"""

    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self.name = data.get("name", "")
        self.description = data.get("description", "")
        self.categories = data.get("categories", [])
        self.language = data.get("language", "unknown")
        self.source = data.get("source", "")
        self.source_type = data.get("source_type", "unknown")
        self.stars = data.get("stars", 0)
        self.full_name = data.get("full_name", "")
        self.owner = data.get("owner", "")
        self.topics = data.get("topics", [])
        self.updated_at = data.get("updated_at", "")
        self.created_at = data.get("created_at", "")
        self.archived = data.get("archived", False)

    def has_readme(self) -> bool:
        """Check if server has README (based on source availability)"""
        return bool(self.source)

    def get_tools(self) -> List[Dict[str, Any]]:
        """Get tools info from description"""
        tools = []
        desc = self.description or ""
        # Simple parsing: look for tool-like patterns in description
        tool_pattern = r"([\w\-]+)\s*[:-]\s*([^,.;]+)"
        matches = re.findall(tool_pattern, desc)
        for name, desc_text in matches[:5]:
            if len(name) < 30 and len(desc_text) > 5:
                tools.append(
                    {
                        "name": name.strip(),
                        "description": desc_text.strip()[:100],
                    }
                )
        return tools

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return self.data
    
    def get_quality_score(self) -> int:
        """
        计算服务器质量评分 (0-100)
        
        评分维度：
        - Source 类型: 30%
        - Star 数量: 25%
        - 更新时间: 15%
        - 分类完整性: 10%
        - 归档状态: 10%
        - Owner 认证: 10%
        """
        score = 0
        
        # 1. Source 类型 (30分)
        if self.source_type == "official":
            score += 30
        elif self.source_type == "community":
            score += 20
        else:
            score += 10
        
        # 2. Star 数量 (25分)
        if self.stars >= 10000:
            score += 25
        elif self.stars >= 1000:
            score += 20
        elif self.stars >= 100:
            score += 15
        elif self.stars >= 10:
            score += 10
        else:
            score += 5
        
        # 3. 更新时间 (15分)
        if self.updated_at:
            try:
                updated_date = datetime.fromisoformat(self.updated_at.replace('Z', '+00:00'))
                days_since_update = (datetime.now() - updated_date).days
                if days_since_update <= 30:  # 1个月内
                    score += 15
                elif days_since_update <= 90:  # 3个月内
                    score += 12
                elif days_since_update <= 180:  # 6个月内
                    score += 10
                elif days_since_update <= 365:  # 1年内
                    score += 7
                else:
                    score += 3
            except (ValueError, TypeError):
                score += 5
        else:
            score += 3
        
        # 4. 分类完整性 (10分)
        if self.categories and len(self.categories) > 0:
            score += 10
        else:
            score += 5
        
        # 5. 归档状态 (10分)
        if not self.archived:
            score += 10
        else:
            score += 3
        
        # 6. Owner 认证 (10分)
        # 检查是否是知名大厂或官方组织
        verified_owners = {
            'modelcontextprotocol', 'anthropic', 'openai', 'google', 'stripe',
            'sentry', 'docker', 'notion', 'slack', 'github', 'gitlab',
            'vercel', 'aws', 'azure', 'gcp', 'cloudflare', 'fastly',
            'alibaba', 'aliyun', 'tencent', 'bytedance', 'byte',
            'huawei', 'baidu', 'jd', 'meituan', 'xiaomi', 'netease',
            'bilibili', 'feishu', 'dingtalk'
        }
        if self.owner and self.owner.lower() in verified_owners:
            score += 10
        elif self.owner:
            score += 7
        else:
            score += 3
        
        # 确保分数在 0-100 之间
        return max(0, min(100, score))
    
    def get_quality_level(self) -> str:
        """获取质量等级"""
        score = self.get_quality_score()
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


class MCPHub:
    """MCP 中心管理器（基于 servers-index.json）"""

    INDEX_FILE = "servers-index.json"

    def __init__(self, base_path: Path):
        self.base_path = Path(base_path)
        self.index_path = self.base_path / self.INDEX_FILE
        self.servers: Dict[str, MCPServer] = {}
        self._index_data: Dict[str, Any] = {}
        self._load_index()

    def _load_index(self):
        """从 JSON 索引加载所有服务器"""
        if not self.index_path.exists():
            return

        try:
            with open(self.index_path, "r", encoding="utf-8") as f:
                self._index_data = json.load(f)

            for server_data in self._index_data.get("servers", []):
                name = server_data.get("name", "")
                if name:
                    self.servers[name] = MCPServer(server_data)
        except (json.JSONDecodeError, IOError):
            self._index_data = {"servers": [], "categories": {}}

    def reload(self):
        """重新加载索引"""
        self.servers.clear()
        self._load_index()

    def get_servers_by_type(self) -> Dict[str, List[MCPServer]]:
        """按语言分组服务器"""
        groups: Dict[str, List[MCPServer]] = {}
        for server in self.servers.values():
            t = server.language
            if t not in groups:
                groups[t] = []
            groups[t].append(server)
        return groups

    def get_servers_by_category(self, category: str) -> List[MCPServer]:
        """按分类获取服务器"""
        category = category.lower()
        results = []
        for server in self.servers.values():
            for cat in server.categories:
                if category in cat.lower():
                    results.append(server)
                    break
        return results

    def search(self, keyword: str) -> List[MCPServer]:
        """搜索服务器（名称、描述、分类、topics、owner）"""
        keyword = keyword.lower()
        results = []

        for server in self.servers.values():
            # 搜索名称
            if keyword in server.name.lower():
                results.append(server)
                continue

            # 搜索描述
            if keyword in server.description.lower():
                results.append(server)
                continue

            # 搜索分类
            for cat in server.categories:
                if keyword in cat.lower():
                    results.append(server)
                    break
            else:
                # 搜索 topics
                for topic in server.topics:
                    if keyword in topic.lower():
                        results.append(server)
                        break
                else:
                    # 搜索 owner
                    if keyword in server.owner.lower():
                        results.append(server)

        return results

    def get_server(self, name: str) -> Optional[MCPServer]:
        """获取单个服务器"""
        return self.servers.get(name)

    def generate_config(
        self, server_name: str, platform: str = "claude"
    ) -> Optional[Dict[str, Any]]:
        """为指定服务器生成配置"""
        server = self.servers.get(server_name)
        if not server:
            return None

        # Use npm_package if available
        npm_pkg = server.data.get("npm_package", "")
        if npm_pkg:
            return {
                "command": "npx",
                "args": ["-y", npm_pkg],
            }

        # Fallback to name-based config
        return {
            "command": "npx",
            "args": ["-y", f"@modelcontextprotocol/server-{server_name}"],
        }

    def generate_claude_config(
        self, server_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """生成 Claude Desktop 配置"""
        config = {"mcpServers": {}}

        names = server_names or list(self.servers.keys())
        for name in names:
            server_config = self.generate_config(name, "claude")
            if server_config:
                config["mcpServers"][name] = server_config

        return config

    def get_stats(self) -> Dict[str, Any]:
        """获取市场统计"""
        by_type = self.get_servers_by_type()
        categories = self._index_data.get("categories", {})

        source_types = {}
        for server in self.servers.values():
            st = server.source_type
            source_types[st] = source_types.get(st, 0) + 1

        return {
            "total": len(self.servers),
            "by_type": {t: len(svrs) for t, svrs in by_type.items()},
            "by_category": categories,
            "by_source": source_types,
        }

    def export_index(self, output_path: Optional[Path] = None) -> Path:
        """导出市场索引（与当前索引一致）"""
        if output_path is None:
            output_path = self.base_path / "market-index.json"

        version = self._index_data.get("version", "2.0.0")
        index = {
            "version": version,
            "total_servers": len(self.servers),
            "servers": {name: srv.to_dict() for name, srv in self.servers.items()},
            "stats": self.get_stats(),
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, indent=2)

        return output_path

    def get_categories(self) -> Dict[str, int]:
        """获取分类统计"""
        return self._index_data.get("categories", {})


__all__ = ["MCPServer", "MCPHub"]

#!/usr/bin/env python3
"""
MCP Hub 统一下载器
合并所有下载逻辑，修复 Token 泄露问题

用法:
    python tools/downloader.py popular          # 下载热门服务器
    python tools/downloader.py awesome [N]      # 从 awesome-mcp-list 下载 N 个 (默认 50)
    python tools/downloader.py awesome --all    # 下载全部
    python tools/downloader.py update           # 更新已下载的服务器
    python tools/downloader.py install          # 安装所有服务器依赖
"""

import logging
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Tuple

_LOG = logging.getLogger(__name__)

# ─── 日志配置 ───────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("mcp-hub")


def git_clone(url: str, target: str, token: str = "", timeout: int = 180) -> Tuple[bool, str]:
    """
    安全克隆仓库，Token 通过环境变量传递，不拼接到 URL。

    Returns:
        (success, message)
    """
    target_path = Path(target)
    if target_path.exists():
        return True, "已存在，跳过"

    try:
        if token:
            # 安全方式：通过 GIT_ASKPASS 脚本传递 Token
            # Token 只存在于临时文件中，不暴露在进程参数里
            env = os.environ.copy()
            askpass_script = Path(target).parent / ".git_askpass_tmp.sh"
            askpass_script.write_text(f'#!/bin/sh\necho "{token}"')
            askpass_script.chmod(0o700)
            env["GIT_ASKPASS"] = str(askpass_script)
            env["GIT_TERMINAL_PROMPT"] = "0"

            # 使用 x-access-token 作为用户名，触发 GIT_ASKPASS
            auth_url = url.replace(
                "https://github.com/",
                "https://x-access-token@github.com/",
            )
            result = subprocess.run(
                ["git", "clone", "--depth", "1", auth_url, target],
                capture_output=True,
                text=True,
                timeout=timeout,
                env=env,
            )
            # 清理临时脚本
            try:
                askpass_script.unlink()
            except OSError:
                pass
        else:
            result = subprocess.run(
                ["git", "clone", "--depth", "1", url, target],
                capture_output=True,
                text=True,
                timeout=timeout,
            )

        if result.returncode == 0:
            return True, "成功"
        else:
            return False, result.stderr.strip()[:100]

    except subprocess.TimeoutExpired:
        return False, "超时"
    except Exception as e:
        return False, str(e)[:100]


def git_pull(server_path: str) -> Tuple[bool, str]:
    """更新单个服务器仓库"""
    try:
        result = subprocess.run(
            ["git", "pull"],
            cwd=server_path,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0:
            if "Already up to date" in result.stdout:
                return True, "已是最新"
            return True, "已更新"
        return False, result.stderr.strip()[:80]
    except Exception as e:
        return False, str(e)[:80]


# ─── 热门服务器列表 ────────────────────────────────────────
POPULAR_SERVERS: List[Tuple[str, str, str]] = [
    # (owner/repo, short_name, description)
    ("modelcontextprotocol/server-filesystem", "filesystem", "官方文件系统"),
    ("modelcontextprotocol/server-memory", "memory", "官方记忆服务器"),
    ("modelcontextprotocol/server-brave-search", "brave-search", "官方搜索"),
    (
        "modelcontextprotocol/server-sequential-thinking",
        "sequential-thinking",
        "官方思维链",
    ),
    ("modelcontextprotocol/server-sqlite", "sqlite", "官方 SQLite"),
    ("modelcontextprotocol/server-postgres", "postgres", "官方 PostgreSQL"),
    ("modelcontextprotocol/server-mysql", "mysql", "官方 MySQL"),
    ("modelcontextprotocol/server-puppeteer", "puppeteer", "官方 Puppeteer"),
    ("modelcontextprotocol/python-sdk", "python-sdk", "Python SDK"),
    ("modelcontextprotocol/typescript-sdk", "typescript-sdk", "TypeScript SDK"),
    ("executeautomation/playwright-mcp-server", "playwright", "Playwright 浏览器"),
    ("microsoft/mcp-github", "github-microsoft", "微软 GitHub"),
    (
        "browserbasehq/mcp-playwright",
        "playwright-browserbase",
        "Browserbase Playwright",
    ),
    ("makenotion/notion-mcp-server", "notion", "Notion 官方"),
    ("github/github-mcp-server", "github-official", "GitHub 官方"),
    ("huggingface/hf-mcp-server", "huggingface", "HuggingFace 官方"),
    ("postmanlabs/postman-mcp-server", "postman", "Postman 官方"),
    ("metatool-ai/metatool-app", "metamcp", "MetaMCP 聚合器"),
    ("mindsdb/mindsdb", "mindsdb", "MindsDB AI 数据库"),
    ("PipedreamHQ/pipedream", "pipedream", "Pipedream 集成"),
    ("julien040/anyquery", "anyquery", "AnyQuery SQL"),
    ("serverless/mcp-server-aws", "aws", "AWS 服务器"),
    ("alexandercurtis/mcp-context7", "context7", "Context7 知识"),
    ("sourceryai/mcp-server-sourcegraph", "sourcegraph", "Sourcegraph 代码搜索"),
    ("deadcoder0904/mcp-server-stock", "stock", "股票数据"),
]


# ─── Awesome MCP 列表解析 ──────────────────────────────────
def parse_awesome_readme(readme_path: Path) -> List[Dict]:
    """解析 awesome-mcp-servers README，提取仓库信息"""
    if not readme_path.exists():
        logger.error("找不到 awesome-mcp-list/README.md，请先克隆:")
        logger.error(
            "  git clone --depth 1 https://github.com/wong2/awesome-mcp-servers awesome-mcp-list"
        )
        return []

    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()

    pattern = r"\[([^\]]+)\]\((https://github\.com/([^/]+)/([^)\s]+))\)"
    matches = re.findall(pattern, content)

    repos: List[Dict] = []
    seen: set = set()

    for _name, url, owner, repo in matches:
        # 清理路径
        repo = repo.split("#")[0].split("/blob/")[0].split("/tree/")[0].rstrip("/")

        if len(repo.split("/")) > 1:
            repo = repo.split("/")[0]

        key = f"{owner}/{repo}".lower()
        if key in seen:
            continue
        seen.add(key)

        short_name = repo.lower().replace("mcp-", "").replace("-mcp", "").replace("-", "_")
        repos.append(
            {
                "name": _name,
                "url": f"https://github.com/{owner}/{repo}",
                "owner": owner,
                "repo": repo,
                "short_name": short_name,
            }
        )

    return repos


# ─── 多线程批量下载 ────────────────────────────────────────
def batch_download(
    repos: List[Dict],
    servers_path: Path,
    token: str = "",
    max_workers: int = 5,
    limit: int = 0,
) -> Dict[str, int]:
    """多线程批量下载"""
    existing = {d.name for d in servers_path.iterdir() if d.is_dir()}
    skipped_names = [r["short_name"] for r in repos if r["short_name"] in existing]
    to_download = [r for r in repos if r["short_name"] not in existing]
    if limit > 0:
        to_download = to_download[:limit]

    stats = {"success": 0, "skipped": len(skipped_names), "failed": 0}

    logger.info(f"待下载: {len(to_download)} 个 (已存在: {len(existing)} 个)")
    logger.info(f"并发线程: {max_workers}")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for repo in to_download:
            target = str(servers_path / repo["short_name"])
            future = executor.submit(git_clone, repo["url"], target, token)
            futures[future] = repo["short_name"]

        for future in as_completed(futures):
            name = futures[future]
            try:
                success, msg = future.result()
                if success and msg == "已存在，跳过":
                    stats["skipped"] += 1
                elif success:
                    stats["success"] += 1
                    logger.info(f"✅ {name}")
                else:
                    stats["failed"] += 1
                    logger.warning(f"❌ {name}: {msg}")
            except Exception as e:
                stats["failed"] += 1
                logger.error(f"❌ {name}: {e}")

    return stats


# ─── 命令实现 ──────────────────────────────────────────────
def cmd_popular(servers_path: Path, token: str):
    """下载热门服务器"""
    logger.info("下载热门 MCP 服务器...")
    repos = [{"url": f"https://github.com/{r[0]}", "short_name": r[1]} for r in POPULAR_SERVERS]
    stats = batch_download(repos, servers_path, token, max_workers=5)
    _print_stats(stats)


def cmd_awesome(servers_path: Path, token: str, args: List[str]):
    """从 awesome-mcp-list 下载"""
    limit = 50
    if "--all" in args:
        limit = 0
    else:
        for a in args:
            if a.isdigit():
                limit = int(a)
                break

    readme_path = servers_path.parent / "awesome-mcp-list" / "README.md"
    repos = parse_awesome_readme(readme_path)
    if not repos:
        return

    logger.info(f"从 awesome-mcp-list 解析到 {len(repos)} 个仓库")
    stats = batch_download(repos, servers_path, token, max_workers=10, limit=limit)
    _print_stats(stats)


def cmd_update(servers_path: Path):
    """更新已下载的服务器"""
    if not servers_path.exists():
        logger.error("servers/ 目录不存在")
        return

    servers = [d for d in servers_path.iterdir() if d.is_dir() and (d / ".git").exists()]
    if not servers:
        logger.error("没有已下载的服务器")
        return

    logger.info(f"更新 {len(servers)} 个服务器...")
    updated, latest, failed = 0, 0, 0

    for server in servers:
        success, msg = git_pull(str(server))
        if success and msg == "已是最新":
            latest += 1
            logger.info(f"⏭️  {server.name}: 已是最新")
        elif success:
            updated += 1
            logger.info(f"✅ {server.name}: 已更新")
        else:
            failed += 1
            logger.warning(f"❌ {server.name}: {msg}")

    logger.info(f"完成 — 已更新: {updated}, 已是最新: {latest}, 失败: {failed}")


def cmd_install(servers_path: Path):
    """安装所有服务器的依赖"""
    if not servers_path.exists():
        logger.error("servers/ 目录不存在")
        return

    for server_dir in servers_path.iterdir():
        if not server_dir.is_dir():
            continue

        pkg_json = server_dir / "package.json"
        if pkg_json.exists():
            logger.info(f"📦 {server_dir.name}: npm install")
            try:
                subprocess.run(["npm", "install"], cwd=server_dir, capture_output=True, timeout=120)
                logger.info("  ✅ npm install 完成")
            except Exception as e:
                logger.warning(f"  ⚠️ npm install 失败: {e}")

        req_txt = server_dir / "requirements.txt"
        if req_txt.exists():
            logger.info(f"📦 {server_dir.name}: pip install")
            try:
                subprocess.run(
                    ["pip", "install", "-r", "requirements.txt", "--user"],
                    cwd=server_dir,
                    capture_output=True,
                    timeout=120,
                )
                logger.info("  ✅ pip install 完成")
            except Exception as e:
                logger.warning(f"  ⚠️ pip install 失败: {e}")

    logger.info("依赖安装完成")


def _print_stats(stats: Dict[str, int]):
    logger.info(
        f"完成 — 成功: {stats['success']}, 跳过: {stats['skipped']}, 失败: {stats['failed']}"
    )


# ─── 入口 ──────────────────────────────────────────────────
def main():
    if len(sys.argv) < 2:
        _LOG.info(__doc__)
        return

    base_path = Path(__file__).parent.parent
    servers_path = base_path / "servers"
    servers_path.mkdir(exist_ok=True)

    token = os.environ.get("GITHUB_TOKEN", "")
    command = sys.argv[1]
    args = sys.argv[2:]

    commands = {
        "popular": lambda: cmd_popular(servers_path, token),
        "awesome": lambda: cmd_awesome(servers_path, token, args),
        "update": lambda: cmd_update(servers_path),
        "install": lambda: cmd_install(servers_path),
    }

    if command in commands:
        commands[command]()
    else:
        logger.error(f"未知命令: {command}")
        _LOG.info(__doc__)


if __name__ == "__main__":
    main()

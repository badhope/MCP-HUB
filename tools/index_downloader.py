#!/usr/bin/env python3
"""
从 servers-index.json 中的 source 字段下载服务器
解决 servers/ 目录为空的问题
"""

import json
import os
import subprocess
from pathlib import Path
from typing import List, Optional

BASE_PATH = Path(__file__).parent.parent
INDEX_FILE = BASE_PATH / "servers-index.json"
SERVERS_DIR = BASE_PATH / "servers"


def extract_repo_from_source(source: str) -> Optional[str]:
    """从 source URL 提取 GitHub 仓库地址"""
    if not source:
        return None

    # 处理 github.com/owner/repo 格式
    if "github.com" in source:
        # 提取 github.com/owner/repo 部分
        parts = source.split("github.com/")
        if len(parts) >= 2:
            repo_path = parts[1].split("/")[0:2]  # owner/repo
            if len(repo_path) == 2:
                return f"https://github.com/{'/'.join(repo_path)}"
    return None


def git_clone(repo_url: str, target_dir: Path, token: str = "") -> bool:
    """克隆 GitHub 仓库"""
    askpass_script = None
    try:
        env = os.environ.copy()
        if token:
            # 使用 GIT_ASKPASS 安全传递 token
            askpass_script = target_dir.parent / ".git_askpass_tmp.sh"
            askpass_script.write_text(f'#!/bin/sh\necho "{token}"')
            askpass_script.chmod(0o700)
            env["GIT_ASKPASS"] = str(askpass_script)
            env["GIT_USERNAME"] = "x-access-token"
            repo_url = repo_url.replace(
                "https://github.com/", "https://x-access-token@github.com/"
            )

        result = subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, str(target_dir)],
            capture_output=True,
            text=True,
            timeout=120,
            env=env,
        )

        return result.returncode == 0
    except Exception as e:
        print(f"  ❌ 克隆失败: {e}")
        return False
    finally:
        if askpass_script is not None:
            try:
                askpass_script.unlink(missing_ok=True)
            except OSError:
                pass


def download_server(server: dict, token: str = "") -> tuple:
    """下载单个服务器"""
    name = server.get("name", "")
    source = server.get("source", "")
    source_type = server.get("source_type", "unknown")

    if not source:
        return name, "skipped", "无 source 信息"

    repo_url = extract_repo_from_source(source)
    if not repo_url:
        return name, "skipped", f"无法解析 source: {source[:50]}..."

    target_dir = SERVERS_DIR / name
    if target_dir.exists():
        return name, "exists", "已存在"

    print(f"  📥 下载 {name} ({source_type})...")

    if git_clone(repo_url, target_dir, token):
        return name, "success", repo_url
    else:
        return name, "failed", "克隆失败"


def download_from_index(
    limit: Optional[int] = None,
    source_types: Optional[List[str]] = None,
    token: str = "",
):
    """从索引下载服务器"""
    if not INDEX_FILE.exists():
        print(f"❌ 索引文件不存在: {INDEX_FILE}")
        return

    SERVERS_DIR.mkdir(exist_ok=True)

    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    servers = data.get("servers", [])

    # 过滤
    if source_types:
        servers = [s for s in servers if s.get("source_type") in source_types]

    if limit:
        servers = servers[:limit]

    print(f"🚀 准备下载 {len(servers)} 个服务器...")
    print(f"   目标目录: {SERVERS_DIR}")
    print()

    stats = {"success": 0, "failed": 0, "skipped": 0, "exists": 0}

    # 串行下载（避免触发 GitHub 限流）
    for server in servers:
        name, status, msg = download_server(server, token)
        stats[status] = stats.get(status, 0) + 1

        if status == "success":
            print(f"    ✅ {name}")
        elif status == "failed":
            print(f"    ❌ {name}: {msg}")

    print()
    print("📊 下载统计:")
    print(f"   成功: {stats['success']}")
    print(f"   失败: {stats['failed']}")
    print(f"   跳过: {stats['skipped']}")
    print(f"   已存在: {stats['exists']}")


def main():
    """CLI 入口"""
    import argparse

    parser = argparse.ArgumentParser(description="从索引下载 MCP 服务器")
    parser.add_argument("--limit", "-n", type=int, help="下载数量限制")
    parser.add_argument(
        "--type",
        "-t",
        action="append",
        choices=["official", "community", "extracted", "inferred", "unknown"],
        help="按 source_type 过滤 (可多次使用)",
    )
    parser.add_argument("--token", help="GitHub Token (或设置 GITHUB_TOKEN 环境变量)")

    args = parser.parse_args()

    token = args.token or os.environ.get("GITHUB_TOKEN", "")

    download_from_index(limit=args.limit, source_types=args.type, token=token)


if __name__ == "__main__":
    main()

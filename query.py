#!/usr/bin/env python3
"""
MCP Hub AI 查询接口
供 AI 智能体调用的搜索和推荐工具

用法:
    python query.py search <keyword>          搜索服务器
    python query.py recommend <场景>          按场景推荐
    python query.py config <server>           生成配置
    python query.py categories                列出所有分类
    python query.py popular                   列出热门服务器
    python query.py recent                    列出最近更新
"""

import json
import sys

from services import (
    generate_config,
    list_categories,
    list_popular,
    list_recent,
    recommend_by_scene,
    search_servers,
)


def _format_stars(stars):
    """格式化 star 数"""
    if stars >= 10000:
        return f"{stars / 10000:.1f}w"
    elif stars >= 1000:
        return f"{stars / 1000:.1f}k"
    return str(stars)


def cmd_search(args):
    """搜索服务器"""
    if not args:
        print("用法: python query.py search <关键词>")
        return

    keyword = " ".join(args)
    results = search_servers(keyword)
    print(f"搜索 '{keyword}' 找到 {len(results)} 个结果:\n")
    for r in results[:20]:
        name = r.get("name", "Unknown")
        desc = r.get("description", "")
        stars = r.get("stars", 0)
        source_type = r.get("source_type", "unknown")
        badge = "🏛️" if source_type == "official" else "👥" if source_type == "community" else "📦"
        star_str = _format_stars(stars)
        print(f"  {badge} ⭐{star_str:>6} {name}: {desc[:80]}")


def cmd_recommend(args):
    """按场景推荐"""
    if not args:
        print("用法: python query.py recommend <场景>")
        print("\n支持的场景:")
        print("  browser, search, github, database, file")
        print("  ai, note, chat, cloud, image, finance, security")
        print("  或中文: 浏览器自动化, AI搜索, 数据库, 文件操作...")
        return

    scene = " ".join(args)
    results = recommend_by_scene(scene)
    print(f"场景 '{scene}' 推荐以下 MCP 服务器:\n")
    for r in results[:10]:
        name = r.get("name", "Unknown")
        desc = r.get("description", "")
        stars = r.get("stars", 0)
        source_type = r.get("source_type", "unknown")
        badge = "🏛️" if source_type == "official" else "👥" if source_type == "community" else "📦"
        star_str = _format_stars(stars)
        print(f"  {badge} ⭐{star_str:>6} {name}: {desc[:80]}")


def cmd_config(args):
    """生成配置"""
    if not args:
        print("用法: python query.py config <server_name>")
        return

    server_name = args[0]
    config = generate_config(server_name)
    print(f"# {server_name} 的配置 (复制下方 JSON 到你的配置文件):\n")
    print(json.dumps(config, indent=2, ensure_ascii=False))


def cmd_categories(args):
    """列出分类"""
    cats = list_categories()
    print(f"共 {len(cats)} 个分类:\n")
    for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count} 个")


def cmd_popular(args):
    """列出热门服务器"""
    try:
        limit = int(args[0]) if args else 10
    except (ValueError, IndexError):
        limit = 10
    servers = list_popular(limit)
    print(f"热门 MCP 服务器 (前 {limit} 个):\n")
    for s in servers:
        name = s.get("name", "Unknown")
        desc = s.get("description", "")[:60]
        stars = s.get("stars", 0)
        source_type = s.get("source_type", "unknown")
        badge = "🏛️" if source_type == "official" else "👥" if source_type == "community" else "📦"
        star_str = _format_stars(stars)
        print(f"  {badge} ⭐{star_str:>6} {name}: {desc}")


def cmd_recent(args):
    """列出最近更新的服务器"""
    try:
        limit = int(args[0]) if args else 10
    except (ValueError, IndexError):
        limit = 10
    servers = list_recent(limit)
    print(f"最近更新的 MCP 服务器 (前 {limit} 个):\n")
    for s in servers:
        name = s.get("name", "Unknown")
        desc = s.get("description", "")[:60]
        stars = s.get("stars", 0)
        updated = s.get("updated_at", "")[:10]
        star_str = _format_stars(stars)
        print(f"  ⭐{star_str:>6} {name} ({updated}): {desc}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]
    args = sys.argv[2:]

    commands = {
        "search": cmd_search,
        "recommend": cmd_recommend,
        "config": cmd_config,
        "categories": cmd_categories,
        "popular": cmd_popular,
        "recent": cmd_recent,
    }

    handler = commands.get(cmd)
    if handler:
        handler(args)
    else:
        print(f"未知命令: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()

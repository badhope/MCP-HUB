#!/usr/bin/env python3
"""
MCP Hub 分类和索引工具
对所有服务器进行智能分类和索引
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, List

# 分类关键词（中英文都支持）
CATEGORY_KEYWORDS = {
    "🔤 语言模型 & AI 桥接": [
        "openai",
        "claude",
        "deepseek",
        "gemini",
        "mistral",
        "ollama",
        "llama",
        "ai",
        "llm",
        "语言模型",
        "桥接",
        "bridge",
        "gpt",
    ],
    "🌐 浏览器与网页": [
        "browser",
        "playwright",
        "puppeteer",
        "web",
        "网页",
        "浏览器",
        "selenium",
        "chrome",
    ],
    "🎵 音乐与音频": [
        "music",
        "spotify",
        "apple music",
        "tts",
        "audio",
        "音乐",
        "音频",
        "sound",
    ],
    "🎬 视频与媒体": ["video", "youtube", "bilibili", "ffmpeg", "媒体", "视频", "编辑"],
    "🎨 艺术与设计": [
        "art",
        "design",
        "svg",
        "drawing",
        "设计",
        "艺术",
        "flux",
        "stability",
    ],
    "🏛️ 博物馆与文化": [
        "museum",
        "艺术",
        "艺术史",
        "culture",
        "met",
        "大都会",
        "rijksmuseum",
        "史密森尼",
    ],
    "💳 金融与加密货币": [
        "crypto",
        "finance",
        "bitcoin",
        "ethereum",
        "solana",
        "金融",
        "加密",
        "wallet",
        "defi",
        "banking",
        "股票",
        "stock",
    ],
    "🧬 生物与医疗": [
        "bio",
        "medical",
        "health",
        "医疗",
        "健康",
        "基因",
        "dna",
        "biology",
        "medical",
        "medicine",
        "hospital",
    ],
    "📱 社交与通信": [
        "social",
        "twitter",
        "reddit",
        "discord",
        "slack",
        "微信",
        "qq",
        "电报",
        "tiktok",
        "telegram",
        "facebook",
        "social",
    ],
    "☁️ 云服务与 DevOps": [
        "cloud",
        "aws",
        "gcp",
        "azure",
        "kubernetes",
        "docker",
        "devops",
        "云服务",
        "容器",
        "terraform",
        "gitlab",
        "github",
        "serverless",
    ],
    "🔒 安全与隐私": [
        "security",
        "privacy",
        "安全",
        "隐私",
        "加密",
        "authentication",
        "vpn",
    ],
    "📚 学习与研究": ["study", "research", "学习", "研究", "arxiv", "学术", "academic"],
    "💻 开发工具": ["dev", "code", "git", "开发", "代码", "ide", "编辑器"],
    "🖥️ 终端与系统": [
        "terminal",
        "shell",
        "system",
        "终端",
        "系统",
        "操作系统",
        "linux",
    ],
    "📊 数据与数据库": [
        "data",
        "database",
        "sql",
        "数据",
        "数据库",
        "analytics",
        "数据分析",
    ],
    "🎮 游戏与娱乐": ["game", "entertainment", "游戏", "娱乐", "steam", "rpg"],
    "🌍 地图与地理": ["map", "geography", "地图", "地理", "gis", "google maps"],
    "🌤️ 天气与自然": ["weather", "天气", "气候", "climate"],
    "📝 文档与笔记": ["note", "document", "文档", "笔记", "notion", "obsidian"],
    "🕐 日历与时间": ["calendar", "时间", "日历", "date"],
    "🧠 记忆与 RAG": ["memory", "rag", "记忆", "检索", "vector"],
    "🔗 聚合与集成": ["aggregate", "integrate", "聚合", "集成", "hub"],
}


def categorize_server(server_name: str, readme_content: str = "") -> List[str]:
    """
    根据服务器名称和 README 内容进行分类
    返回匹配的分类列表
    """
    categories = []
    text = (server_name + " " + readme_content).lower()

    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in text:
                categories.append(category)
                break

    # 如果没有匹配到，添加到其他分类
    if not categories:
        categories.append("📦 其他")

    return categories


def analyze_readme(server_path: Path) -> Dict[str, Any]:
    """
    分析服务器目录中的 README
    """
    result = {
        "has_readme": False,
        "readme_path": "",
        "language": "unknown",
        "description": "",
        "keywords": [],
    }

    # 查找 README
    readme_names = ["README.md", "readme.md", "Readme.md"]
    for name in readme_names:
        readme_path = server_path / name
        if readme_path.exists():
            result["has_readme"] = True
            result["readme_path"] = str(readme_path)
            try:
                with open(readme_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read(2000)  # 只读取前 2KB
                    result["description"] = content[:500]  # 取前 500 字作为描述

                    # 简单语言检测
                    if re.search(r"^import|^from|python", content, re.MULTILINE):
                        result["language"] = "python"
                    elif re.search(
                        r"require|module\.exports|node|npm", content, re.MULTILINE
                    ):
                        result["language"] = "nodejs"
                    elif re.search(
                        r"go\.mod|^package|import \(|func main", content, re.MULTILINE
                    ):
                        result["language"] = "go"
            except (IOError, OSError, UnicodeDecodeError):
                pass
            break

    return result


def main():
    base_path = Path(__file__).parent.parent
    servers_path = base_path / "servers"

    if not servers_path.exists():
        print("❌ 找不到 servers 目录")
        return

    index = {"total_servers": 0, "categories": {}, "servers": []}

    # 扫描所有服务器
    print("🔍 扫描服务器目录...")

    for server_dir in servers_path.iterdir():
        if not server_dir.is_dir():
            continue

        # 分析服务器
        readme_analysis = analyze_readme(server_dir)
        categories = categorize_server(server_dir.name, readme_analysis["description"])

        # 构建服务器信息
        server_info = {
            "name": server_dir.name,
            "path": str(server_dir.relative_to(base_path)),
            "categories": categories,
            "has_readme": readme_analysis["has_readme"],
            "detected_language": readme_analysis["language"],
            "description": (
                readme_analysis["description"][:200] + "..."
                if readme_analysis["description"]
                else ""
            ),
        }

        index["servers"].append(server_info)

        # 更新分类统计
        for cat in categories:
            if cat not in index["categories"]:
                index["categories"][cat] = 0
            index["categories"][cat] += 1

    index["total_servers"] = len(index["servers"])

    # 保存索引文件
    index_path = base_path / "servers-index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    # 打印统计
    print("\n✅ 索引完成！")
    print(f"📦 总服务器数: {index['total_servers']}")
    print("\n📂 分类统计:")
    for category, count in sorted(
        index["categories"].items(), key=lambda x: x[1], reverse=True
    ):
        print(f"   {category}: {count}")

    # 保存分类目录
    catalog_path = base_path / "SERVER_CATALOG.md"
    generate_catalog(index, catalog_path)

    print(f"\n📄 目录已保存: {catalog_path}")
    print(f"📊 索引已保存: {index_path}")


def generate_catalog(index, output_path):
    """生成 Markdown 目录"""
    md = []
    md.append("# MCP Hub 服务器目录\n")
    md.append(f"> 收录 {index['total_servers']} 个 MCP 服务器\n")
    md.append("\n## 分类统计\n")

    for category, count in sorted(
        index["categories"].items(), key=lambda x: x[1], reverse=True
    ):
        md.append(f"- {category}: {count}")

    md.append("\n## 服务器列表\n")

    # 按分类组织
    category_map = {}
    for server in index["servers"]:
        for cat in server["categories"]:
            if cat not in category_map:
                category_map[cat] = []
            category_map[cat].append(server)

    for category, servers in sorted(
        category_map.items(), key=lambda x: len(x[1]), reverse=True
    ):
        md.append(f"\n### {category} ({len(servers)})\n")
        for server in servers:
            md.append(
                f"- [{server['name']}]({server['path']}) - {server['detected_language']}"
            )

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md))


if __name__ == "__main__":
    main()

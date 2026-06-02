#!/usr/bin/env python3
"""
MCP Hub 知名项目导航引导系统
收集并展示所有知名 MCP 相关项目，包括大厂项目、明星项目、框架项目等
"""

import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime


# 知名 MCP 相关项目分类收集
NOTABLE_PROJECTS = {
    "🏢 大厂官方 MCP": {
        "description": "各大厂官方提供的 MCP Server 和工具",
        "projects": [
            {
                "name": "GitHub MCP Server",
                "repo": "github/github-mcp-server",
                "stars": 30000,
                "description": "GitHub 官方 MCP Server，支持仓库、Issue、PR 管理",
                "language": "Go",
                "url": "https://github.com/github/github-mcp-server",
                "categories": ["代码平台", "DevOps"],
                "features": ["仓库管理", "Issue管理", "PR管理", "Actions触发"],
                "install": "npx -y @github/mcp-server",
                "is_downloadable": True,
                "is_mcp_server": True
            },
            {
                "name": "Anthropic MCP",
                "repo": "modelcontextprotocol",
                "stars": 10000,
                "description": "Anthropic 官方 MCP 协议和 SDK",
                "language": "Python/TypeScript",
                "url": "https://github.com/modelcontextprotocol",
                "categories": ["协议", "框架"],
                "features": ["MCP协议", "Python SDK", "TypeScript SDK"],
                "install": "pip install mcp",
                "is_downloadable": True,
                "is_mcp_server": False
            },
            {
                "name": "Stripe MCP",
                "repo": "stripe/stripe-mcp",
                "stars": 1200,
                "description": "Stripe 官方 MCP Server，支持支付、客户管理",
                "language": "TypeScript",
                "url": "https://github.com/stripe/stripe-mcp",
                "categories": ["支付", "金融"],
                "features": ["支付处理", "客户管理", "产品管理"],
                "install": "npx -y @stripe/mcp",
                "is_downloadable": True,
                "is_mcp_server": True
            },
            {
                "name": "Notion MCP",
                "repo": "makeswift/notion-mcp",
                "stars": 3600,
                "description": "Notion 官方 MCP Server，支持笔记、数据库读写",
                "language": "TypeScript",
                "url": "https://github.com/makeswift/notion-mcp",
                "categories": ["笔记", "协作"],
                "features": ["页面读写", "数据库操作", "搜索"],
                "install": "npx -y @makeswift/notion-mcp",
                "is_downloadable": True,
                "is_mcp_server": True
            },
            {
                "name": "Microsoft Playwright MCP",
                "repo": "microsoft/playwright-mcp",
                "stars": 33000,
                "description": "微软官方浏览器自动化 MCP Server",
                "language": "TypeScript",
                "url": "https://github.com/microsoft/playwright-mcp",
                "categories": ["浏览器自动化", "测试"],
                "features": ["浏览器控制", "网页抓取", "自动化测试"],
                "install": "npx -y @executeautomation/playwright-mcp-server",
                "is_downloadable": True,
                "is_mcp_server": True
            },
            {
                "name": "Docker MCP",
                "repo": "modelcontextprotocol/server-docker",
                "stars": 2000,
                "description": "Docker 官方 MCP Server，支持容器管理",
                "language": "Python",
                "url": "https://github.com/modelcontextprotocol/server-docker",
                "categories": ["DevOps", "容器"],
                "features": ["容器管理", "镜像操作", "日志查看"],
                "install": "npx -y @modelcontextprotocol/server-docker",
                "is_downloadable": True,
                "is_mcp_server": True
            }
        ]
    },

    "🌟 明星项目": {
        "description": "GitHub 上最受欢迎的 MCP 相关项目",
        "projects": [
            {
                "name": "n8n",
                "repo": "n8n-io/n8n",
                "stars": 189000,
                "description": "开源工作流自动化平台，支持 MCP 集成",
                "language": "TypeScript",
                "url": "https://github.com/n8n-io/n8n",
                "categories": ["自动化", "工作流"],
                "features": ["可视化工作流", "800+ 集成", "自托管"],
                "install": "docker run -it --name n8n -p 5678:5678 n8nio/n8n",
                "is_downloadable": True,
                "is_mcp_server": False,
                "mcp_support": True
            },
            {
                "name": "Dify",
                "repo": "langgenius/dify",
                "stars": 142000,
                "description": "开源 LLM 应用开发平台，支持 MCP 协议",
                "language": "Python",
                "url": "https://github.com/langgenius/dify",
                "categories": ["AI应用", "LLMOps"],
                "features": ["LLM应用开发", "RAG", "工作流", "Agent"],
                "install": "docker run -it -p 80:80 -p 443:443 dify-community/dify-community",
                "is_downloadable": True,
                "is_mcp_server": False,
                "mcp_support": True
            },
            {
                "name": "Open WebUI",
                "repo": "open-webui/open-webui",
                "stars": 138000,
                "description": "开源自托管 WebUI，支持 MCP 工具调用",
                "language": "Python",
                "url": "https://github.com/open-webui/open-webui",
                "categories": ["AI界面", "LLM"],
                "features": ["ChatGPT界面", "多模型支持", "工具调用"],
                "install": "docker run -d -p 3000:8080 -v open-webui:/app/backend/data ghcr.io/open-webui/open-webui:main",
                "is_downloadable": True,
                "is_mcp_server": False,
                "mcp_support": True
            },
            {
                "name": "MindsDB",
                "repo": "mindsdb/mindsdb",
                "stars": 28000,
                "description": "开源 ML 数据库，AI 和数据库的桥梁",
                "language": "Python",
                "url": "https://github.com/mindsdb/mindsdb",
                "categories": ["数据库", "机器学习"],
                "features": ["AutoML", "预测分析", "数据集成"],
                "install": "pip install mindsdb",
                "is_downloadable": True,
                "is_mcp_server": False
            },
            {
                "name": "1Panel",
                "repo": "1Panel-dev/1Panel",
                "stars": 32000,
                "description": "现代化 Linux 服务器管理面板，支持 MCP",
                "language": "Go",
                "url": "https://github.com/1Panel-dev/1Panel",
                "categories": ["运维", "服务器管理"],
                "features": ["容器管理", "网站管理", "数据库管理", "LLM集成"],
                "install": "curl -sSL https://resource.fit2cloud.com/1panel.sh | bash",
                "is_downloadable": True,
                "is_mcp_server": False,
                "mcp_support": True
            }
        ]
    },

    "🎮 游戏相关": {
        "description": "游戏引擎和游戏相关的 MCP 项目",
        "projects": [
            {
                "name": "Unity MCP",
                "repo": "CoplayDev/unity-mcp",
                "stars": 4500,
                "description": "Unity 编辑器 MCP Server，支持场景、对象、资产控制",
                "language": "C#",
                "url": "https://github.com/CoplayDev/unity-mcp",
                "categories": ["游戏引擎", "Unity"],
                "features": ["场景控制", "对象操作", "资产管理", "编辑器自动化"],
                "install": "从 Unity Asset Store 下载",
                "is_downloadable": False,
                "is_mcp_server": True
            },
            {
                "name": "Unreal Engine MCP",
                "repo": "tncbtth/UE-MCP",
                "stars": 1200,
                "description": "Unreal Engine MCP Server，通过蓝图调用 AI",
                "language": "C++",
                "url": "https://github.com/tncbtth/UE-MCP",
                "categories": ["游戏引擎", "Unreal"],
                "features": ["蓝图集成", "AI对话", "场景管理"],
                "install": "从 GitHub 下载插件",
                "is_downloadable": False,
                "is_mcp_server": True
            },
            {
                "name": "Godot MCP",
                "repo": "godot-mcp/godot-mcp",
                "stars": 800,
                "description": "Godot 游戏引擎 MCP Server",
                "language": "GDScript/Python",
                "url": "https://github.com/godot-mcp/godot-mcp",
                "categories": ["游戏引擎", "Godot"],
                "features": ["节点控制", "场景操作", "信号系统"],
                "install": "pip install godot-mcp",
                "is_downloadable": True,
                "is_mcp_server": True
            }
        ]
    },

    "🛠️ 开发框架": {
        "description": "MCP 开发框架和 SDK",
        "projects": [
            {
                "name": "FastMCP",
                "repo": "modelcontextprotocol/fastmcp",
                "stars": 8100,
                "description": "Python MCP 开发框架，简洁易用",
                "language": "Python",
                "url": "https://github.com/modelcontextprotocol/fastmcp",
                "categories": ["框架", "Python"],
                "features": ["装饰器语法", "自动文档", "热重载"],
                "install": "pip install fastmcp",
                "is_downloadable": True,
                "is_mcp_server": False
            },
            {
                "name": "MCP Go SDK",
                "repo": "modelcontextprotocol/go-sdk",
                "stars": 4500,
                "description": "官方 Go 语言 MCP SDK",
                "language": "Go",
                "url": "https://github.com/modelcontextprotocol/go-sdk",
                "categories": ["框架", "Go"],
                "features": ["高性能", "类型安全", "Google维护"],
                "install": "go get github.com/modelcontextprotocol/go-sdk",
                "is_downloadable": True,
                "is_mcp_server": False
            },
            {
                "name": "MCP TypeScript SDK",
                "repo": "modelcontextprotocol/typescript-sdk",
                "stars": 3500,
                "description": "官方 TypeScript MCP SDK",
                "language": "TypeScript",
                "url": "https://github.com/modelcontextprotocol/typescript-sdk",
                "categories": ["框架", "TypeScript"],
                "features": ["类型完整", "Promise支持", "VS Code插件"],
                "install": "npm install @modelcontextprotocol/sdk",
                "is_downloadable": True,
                "is_mcp_server": False
            },
            {
                "name": "PyMCP",
                "repo": "uranus-public/pymcp",
                "stars": 1500,
                "description": "Python MCP 服务开发框架",
                "language": "Python",
                "url": "https://github.com/uranus-public/pymcp",
                "categories": ["框架", "Python"],
                "features": ["异步支持", "依赖注入", "中间件"],
                "install": "pip install pymcp",
                "is_downloadable": True,
                "is_mcp_server": False
            }
        ]
    },

    "🇨🇳 国内大厂": {
        "description": "国内大厂提供的 MCP 相关产品和服务",
        "projects": [
            {
                "name": "阿里云 MCP",
                "repo": "aliyun",
                "stars": 0,
                "description": "阿里云提供的一系列 MCP 服务",
                "language": "多语言",
                "url": "https://help.aliyun.com/",
                "categories": ["云服务", "国内"],
                "features": ["云API集成", "OSS存储", "函数计算"],
                "install": "参考阿里云文档",
                "is_downloadable": False,
                "is_mcp_server": False
            },
            {
                "name": "腾讯云 MCP",
                "repo": "tencentcloud",
                "stars": 0,
                "description": "腾讯云 MCP 服务集成",
                "language": "多语言",
                "url": "https://cloud.tencent.com/",
                "categories": ["云服务", "国内"],
                "features": ["COS存储", "SCF函数", "API网关"],
                "install": "参考腾讯云文档",
                "is_downloadable": False,
                "is_mcp_server": False
            },
            {
                "name": "百度文心 MCP",
                "repo": "baidu/ernie-mcp",
                "stars": 12000,
                "description": "百度文心一言 MCP Server",
                "language": "Python",
                "url": "https://github.com/baidu/ernie-mcp",
                "categories": ["AI", "国内"],
                "features": ["文心一言", "知识库", "文档处理"],
                "install": "pip install ernie-mcp",
                "is_downloadable": True,
                "is_mcp_server": True
            },
            {
                "name": "钉钉 MCP",
                "repo": "dingtalk/dingtalk-mcp",
                "stars": 9000,
                "description": "钉钉官方 MCP Server，企业办公集成",
                "language": "TypeScript",
                "url": "https://github.com/dingtalk/dingtalk-mcp",
                "categories": ["企业应用", "OA", "国内"],
                "features": ["日程管理", "任务创建", "消息通知", "审批流程"],
                "install": "npx -y dingtalk-mcp",
                "is_downloadable": True,
                "is_mcp_server": True
            },
            {
                "name": "网易云信 MCP",
                "repo": "netease-im/yunxin-mcp-server",
                "stars": 5500,
                "description": "网易云信 IM/RTC MCP Server",
                "language": "Python",
                "url": "https://github.com/netease-im/yunxin-mcp-server",
                "categories": ["通讯", "IM", "RTC", "国内"],
                "features": ["即时通讯", "音视频", "实时互动"],
                "install": "pip install yunxin-mcp",
                "is_downloadable": True,
                "is_mcp_server": True
            }
        ]
    },

    "📚 资源汇总": {
        "description": "MCP 相关的awesome列表和资源收集",
        "projects": [
            {
                "name": "awesome-mcp-servers",
                "repo": "punkpeye/awesome-mcp-servers",
                "stars": 73000,
                "description": "最全面的 MCP Server 资源汇总，收录 2700+ 项目",
                "language": "Markdown",
                "url": "https://github.com/punkpeye/awesome-mcp-servers",
                "categories": ["资源", "awesome"],
                "features": ["2700+ MCP Server", "20+ 分类", "持续更新"],
                "is_downloadable": False,
                "is_mcp_server": False
            },
            {
                "name": "awesome-mcp",
                "repo": "appcypher/awesome-mcp",
                "stars": 5800,
                "description": "另一个 MCP 资源awesome列表",
                "language": "Markdown",
                "url": "https://github.com/appcypher/awesome-mcp",
                "categories": ["资源", "awesome"],
                "features": ["MCP客户端", "MCP服务器", "框架"],
                "is_downloadable": False,
                "is_mcp_server": False
            },
            {
                "name": "MCP Registry",
                "repo": "modelcontextprotocol/registry",
                "stars": 6800,
                "description": "官方 MCP Server 注册中心",
                "language": "TypeScript",
                "url": "https://github.com/modelcontextprotocol/registry",
                "categories": ["资源", "官方"],
                "features": ["官方认证", "持续更新", "质量保证"],
                "is_downloadable": False,
                "is_mcp_server": False
            }
        ]
    }
}


def generate_notable_projects_report() -> str:
    """生成知名项目导航报告"""
    report = "# 🎯 MCP 知名项目导航\n\n"
    report += f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    # 统计信息
    total_projects = sum(len(cat['projects']) for cat in NOTABLE_PROJECTS.values())
    downloadable = sum(
        1 for cat in NOTABLE_PROJECTS.values()
        for p in cat['projects'] if p.get('is_downloadable', False)
    )
    mcp_servers = sum(
        1 for cat in NOTABLE_PROJECTS.values()
        for p in cat['projects'] if p.get('is_mcp_server', False)
    )
    total_stars = sum(
        p.get('stars', 0)
        for cat in NOTABLE_PROJECTS.values()
        for p in cat['projects']
    )

    report += "## 📊 统计概览\n\n"
    report += f"- **总项目数**: {total_projects} 个\n"
    report += f"- **可下载项目**: {downloadable} 个\n"
    report += f"- **MCP Server**: {mcp_servers} 个\n"
    report += f"- **总 Star 数**: {total_stars:,} ⭐\n"
    report += f"- **涵盖分类**: {len(NOTABLE_PROJECTS)} 个\n\n"

    # 分类展示
    for category, data in NOTABLE_PROJECTS.items():
        report += f"## {category}\n\n"
        report += f"{data['description']}\n\n"

        for project in sorted(data['projects'], key=lambda x: -x.get('stars', 0)):
            report += f"### {project['name']}\n\n"
            report += f"- ⭐ **{project['stars']:,}**\n"
            report += f"- 📝 {project['description']}\n"
            report += f"- 💻 语言: {project['language']}\n"
            report += f"- 🔗 [GitHub](https://github.com/{project['repo']})\n"

            if project.get('features'):
                report += f"- ✨ 特性: {', '.join(project['features'])}\n"

            if project.get('install'):
                report += f"- 📦 安装: `{project['install']}`\n"

            if project.get('is_mcp_server'):
                report += f"- 🎯 **MCP Server**: 是\n"

            if project.get('mcp_support'):
                report += f"- 🔌 **MCP 支持**: 是\n"

            if project.get('categories'):
                report += f"- 🏷️ 分类: {', '.join(project['categories'])}\n"

            report += "\n"

    return report


def export_notable_projects_json() -> Dict[str, Any]:
    """导出为 JSON 格式"""
    return {
        "version": "1.0",
        "generated_at": datetime.now().isoformat(),
        "total_projects": sum(len(cat['projects']) for cat in NOTABLE_PROJECTS.values()),
        "categories": NOTABLE_PROJECTS
    }


def generate_navigation_guide() -> str:
    """生成导航指南"""
    guide = """# 🧭 MCP Hub 导航指南

欢迎使用 MCP Hub！这里为你提供 MCP 生态系统的完整导航。

## 🎯 我想...

### 1. 找到好用的 MCP Server
```bash
# 查看精选推荐
python market.py curated

# 查看国内大厂项目
python market.py companies

# 按分类浏览
python market.py search <关键词>
```

### 2. 下载并使用 MCP Server
```bash
# 同步服务器并生成模板
python tools/download_manager.py sync 100

# 下载指定服务器
python tools/download_manager.py download puppeteer github

# 导出配置
python tools/download_manager.py export puppeteer github
```

### 3. 了解知名项目和框架
```bash
# 查看知名项目导航
cat NOTABLE_PROJECTS_GUIDE.md
```

### 4. 开发自己的 MCP Server
```bash
# 安装框架
pip install fastmcp  # Python
npm install @modelcontextprotocol/sdk  # TypeScript

# 查看开发文档
# https://modelcontextprotocol.io/
```

## 📚 学习资源

### 官方资源
- [MCP 官网](https://modelcontextprotocol.io/)
- [MCP GitHub](https://github.com/modelcontextprotocol)
- [MCP 协议规范](https://modelcontextprotocol.io/specification)

### 社区资源
- [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) - 2700+ 项目
- [MCP Registry](https://github.com/modelcontextprotocol/registry) - 官方注册表

### 国内资源
- [阿里云 MCP](https://help.aliyun.com/) - 阿里云服务
- [钉钉 MCP](https://open.dingtalk.com/) - 企业办公
- [文心 MCP](https://github.com/baidu/ernie-mcp) - 百度 AI

## 🏆 推荐路线

### 入门路线
1. 安装 Claude Desktop 或 Cursor
2. 添加 GitHub MCP Server
3. 体验浏览器自动化 (Playwright)
4. 尝试 Notion 集成

### 进阶路线
1. 部署 n8n 工作流平台
2. 集成 Dify AI 应用
3. 使用 1Panel 管理服务器
4. 开发自己的 MCP Server

### 企业路线
1. 部署钉钉 MCP
2. 集成网易云信
3. 配置飞书/微信集成
4. 搭建内部知识库

## ⚠️ 注意事项

1. **安全第一**: 使用官方渠道安装，定期更新
2. **权限控制**: 配置 MCP 时注意最小权限原则
3. **数据安全**: 敏感操作建议本地部署
4. **社区支持**: 遇到问题先查文档，再提Issue

## 🔄 持续更新

本项目会持续更新，欢迎：
- 提交新的 MCP Server
- 报告问题和建议
- 贡献代码和文档

---

*由 MCP Hub 自动生成 | 祝你使用愉快！*
"""

    return guide


if __name__ == '__main__':
    # 生成报告
    report = generate_notable_projects_report()

    # 保存到文件
    report_file = Path(__file__).parent.parent / 'NOTABLE_PROJECTS_GUIDE.md'
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"✅ 知名项目导航已生成: {report_file}")

    # 生成 JSON 数据
    json_data = export_notable_projects_json()
    json_file = Path(__file__).parent.parent / 'notable_projects.json'
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)

    print(f"✅ JSON 数据已生成: {json_file}")

    # 生成导航指南
    guide = generate_navigation_guide()
    guide_file = Path(__file__).parent.parent / 'NAVIGATION_GUIDE.md'
    with open(guide_file, 'w', encoding='utf-8') as f:
        f.write(guide)

    print(f"✅ 导航指南已生成: {guide_file}")

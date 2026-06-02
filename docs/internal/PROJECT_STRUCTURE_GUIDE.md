# 📦 MCP Hub 仓库规范化文档

## 📋 概述

本文档定义了 MCP Hub 项目的文件结构和规范化标准，确保项目易于维护、扩展和理解。

---

## 📁 目录结构

```
mcp-hub/
│
├── 📄 核心文件
│   ├── market.py              # CLI 主入口
│   ├── api.py                 # REST API 服务器
│   ├── query.py              # AI 查询接口
│   ├── services.py            # 业务逻辑层
│   ├── servers-index.json     # MCP 服务器索引数据
│   ├── comprehensive_mcp_projects.json  # 全量项目清单
│   └── pyproject.toml        # Python 项目配置
│
├── 🗂️ 核心模块
│   └── core/
│       ├── __init__.py        # 核心类和功能
│       └── tests/             # 核心模块测试
│
├── 🛠️ 工具脚本
│   └── tools/
│       ├── download_manager.py            # 服务器下载和模板生成
│       ├── comprehensive_collector.py    # 全量项目收集
│       ├── notable_projects_navigator.py # 知名项目导航
│       ├── completeness_scoring.py       # 完整性评分系统
│       ├── auto_updater.py               # 自动化更新
│       ├── sync_index.py                 # 索引同步
│       ├── collect_domestic_companies.py  # 国内大厂项目收集
│       └── README.md                     # 工具使用说明
│
├── 📚 文档
│   ├── README.md               # 项目主说明
│   ├── README_CN.md           # 中文说明
│   ├── AGENT_GUIDE.md         # AI Agent 专用指南 ⭐
│   ├── COMPLETENESS_SCORING_GUIDE.md    # 评分系统说明
│   ├── COMPREHENSIVE_PROJECTS.md         # 全量项目清单
│   ├── NOTABLE_PROJECTS_GUIDE.md         # 知名项目导航
│   ├── NAVIGATION_GUIDE.md    # 使用教程
│   ├── DOMESTIC_COMPANIES_REPORT.md     # 国内大厂报告
│   ├── IMPROVEMENT_PLAN.md    # 改进计划
│   ├── IMPLEMENTATION_SUMMARY.md         # 实施总结
│   └── FULL_SYSTEM_GUIDE.md  # 系统完整指南
│
├── 🧪 测试
│   └── tests/
│       ├── test_core.py       # 核心功能测试
│       ├── test_api.py        # API 测试
│       ├── test_query.py       # 查询功能测试
│       ├── test_downloader.py  # 下载器测试
│       └── pytest.ini         # pytest 配置
│
├── 📥 下载文件
│   ├── servers/               # 下载的服务器源码
│   ├── templates/             # 配置模板
│   └── server_registry.json   # 服务器注册表
│
├── 💾 备份
│   └── backups/               # 自动备份
│
└── 📝 日志
    └── update.log             # 更新日志
```

---

## 📄 文件命名规范

### 1. 代码文件
- **模块文件**: `snake_case.py` (如: `download_manager.py`)
- **测试文件**: `test_<module>.py` (如: `test_core.py`)
- **配置文件**: `snake_case.json` (如: `server_registry.json`)

### 2. 文档文件
- **说明文档**: `UPPER_SNAKE_CASE.md` (如: `AGENT_GUIDE.md`)
- **报告文档**: `*_REPORT.md` (如: `DOMESTIC_COMPANIES_REPORT.md`)
- **指南文档**: `*_GUIDE.md` (如: `COMPLETENESS_SCORING_GUIDE.md`)

### 3. 目录命名
- **模块目录**: `snake_case/` (如: `core/`, `tools/`)
- **测试目录**: `tests/`
- **文档目录**: `docs/` (可选)

---

## 📝 JSON 数据文件规范

### servers-index.json
```json
{
  "version": "2.0.0",
  "generated_at": "2026-05-28T00:00:00Z",
  "total_servers": 4403,
  "total_categories": 23,
  "categories": {
    "browser-automation": 150,
    "database": 200
  },
  "source_types": {
    "official": 51,
    "community": 4352
  },
  "languages": {
    "TypeScript": 2000,
    "Python": 1800
  },
  "last_sync": "2026-05-28T00:00:00Z",
  "upstream_total": 4403,
  "servers": [
    {
      "name": "github-mcp-server",
      "full_name": "github/github-mcp-server",
      "owner": "github",
      "description": "GitHub Official MCP Server",
      "source": "https://github.com/github/github-mcp-server",
      "source_type": "official",
      "language": "Go",
      "stars": 25000,
      "categories": ["DevOps", "CI/CD"],
      "topics": ["github", "mcp", "automation"],
      "updated_at": "2026-05-20T00:00:00Z",
      "npm_package": "",
      "archived": false
    }
  ]
}
```

### comprehensive_mcp_projects.json
```json
{
  "version": "2.0",
  "generated_at": "2026-05-28T00:00:00Z",
  "total_projects": 53,
  "categories": {
    "by_owner_type": {"official": 22, "community": 31},
    "by_language": {"TypeScript": 22, "Python": 22},
    "by_downloadable": {"可下载": 50, "不可下载": 3}
  },
  "projects": [
    {
      "name": "github-mcp-server",
      "display_name": "GitHub MCP Server",
      "description": "GitHub Official MCP Server",
      "source": "official",
      "repo_url": "https://github.com/github/github-mcp-server",
      "stars": 25000,
      "language": "Go",
      "categories": ["DevOps", "代码平台", "CI/CD"],
      "owner_type": "official",
      "owner_name": "GitHub",
      "company": "Microsoft",
      "is_downloadable": true,
      "download_type": "binary",
      "install_command": "go install",
      "install_args": ["github.com/github/github-mcp-server@latest"],
      "features": ["仓库管理", "Issue管理", "PR管理"],
      "use_cases": ["AI代码审查", "自动化工作流"],
      "pricing": "free",
      "license": "MIT",
      "documentation_url": "https://github.com/github/github-mcp-server",
      "related_urls": [],
      "news_mentions": [],
      "completeness_score": 85,
      "completeness_level": "S",
      "last_verified": "2026-05-28"
    }
  ]
}
```

### server_registry.json
```json
{
  "version": "1.0",
  "generated_at": "2026-05-28T00:00:00Z",
  "total": 50,
  "downloaded": 10,
  "last_sync": "2026-05-28T00:00:00Z",
  "servers": {
    "github": {
      "name": "github",
      "display_name": "GitHub",
      "description": "GitHub Official MCP Server",
      "source": "https://github.com/github/github-mcp-server",
      "language": "Go",
      "stars": 25000,
      "source_type": "official",
      "install_command": "go",
      "install_args": ["install", "github.com/github/github-mcp-server@latest"],
      "install_env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      },
      "config": {
        "mcpServers": {
          "github": {
            "command": "go",
            "args": ["install", "github.com/github/github-mcp-server@latest"]
          }
        }
      },
      "categories": ["DevOps", "CI/CD"],
      "quality_score": 85,
      "quality_level": "S",
      "download_status": "downloaded",
      "download_path": "servers/github",
      "last_updated": "2026-05-28T00:00:00Z"
    }
  }
}
```

---

## 🛠️ 工具脚本规范

### 1. 命名规范
- 文件名: `snake_case.py`
- 类名: `PascalCase`
- 函数名: `snake_case`
- 常量: `UPPER_SNAKE_CASE`

### 2. 脚本结构
```python
#!/usr/bin/env python3
"""
脚本名称 - 功能描述

详细说明...
"""

import json
from pathlib import Path
from typing import Dict, List, Any


class ScriptClass:
    """脚本类"""
    
    def __init__(self, base_path: Path):
        self.base_path = base_path
    
    def run(self):
        """执行主要逻辑"""
        pass


def main():
    """主函数"""
    pass


if __name__ == '__main__':
    main()
```

### 3. 工具脚本列表

| 脚本 | 功能 | 输入 | 输出 |
|------|------|------|------|
| `download_manager.py` | 下载和模板生成 | servers-index.json | templates/*.json, servers/ |
| `comprehensive_collector.py` | 全量项目收集 | 无 | comprehensive_mcp_projects.json |
| `notable_projects_navigator.py` | 知名项目导航 | 无 | NOTABLE_PROJECTS_GUIDE.md |
| `completeness_scoring.py` | 完整性评分 | servers-index.json | 评分数据 |
| `auto_updater.py` | 自动更新 | servers-index.json | 更新后的索引 |
| `sync_index.py` | 索引同步 | awesome-mcp | servers-index.json |
| `collect_domestic_companies.py` | 国内大厂收集 | 无 | servers-index.json |

---

## 📚 文档规范

### 1. 文档头部
```markdown
# 文档标题

> **简介**: 一句话描述文档内容
>
> **适用对象**: 目标读者
>
> **版本**: v1.0
>
> **更新日期**: 2026-05-28
```

### 2. 章节结构
```markdown
## 1. 概述
### 1.1 背景
### 1.2 目标

## 2. 核心功能
### 2.1 功能一
### 2.2 功能二

## 3. 使用示例
```bash
# 示例命令
```

## 4. 常见问题

## 5. 参考资料
```

### 3. 文档优先级

| 优先级 | 文档 | 说明 |
|--------|------|------|
| 🔴 高 | `README.md`, `AGENT_GUIDE.md` | 必须阅读 |
| 🟡 中 | `COMPLETENESS_SCORING_GUIDE.md`, `NAVIGATION_GUIDE.md` | 推荐阅读 |
| 🟢 低 | `*_REPORT.md`, `*_SUMMARY.md` | 可选阅读 |

---

## 📊 API 端点规范

### 端点格式
```
GET /{resource}                    # 列表
GET /{resource}/{id}               # 单个
GET /{resource}?param=value        # 带参数
```

### 响应格式
```json
{
  "status": "success",
  "data": {},
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 10
  }
}
```

### 错误格式
```json
{
  "status": "error",
  "error": {
    "code": 404,
    "message": "Not found"
  }
}
```

---

## 🧪 测试规范

### 测试文件命名
- `test_<module>.py` - 单模块测试
- `test_integration_<feature>.py` - 集成测试

### 测试结构
```python
import pytest
from module import function


def test_function_basic():
    """测试基本功能"""
    assert function() == expected


def test_function_edge_case():
    """测试边界情况"""
    pass
```

---

## 🚀 部署规范

### 1. 开发环境
```bash
# 安装依赖
pip install -r requirements.txt

# 运行测试
python -m pytest tests/

# 启动 API
python api.py --port 8080
```

### 2. 生产环境
```bash
# 使用 uvicorn
uvicorn api:app --host 0.0.0.0 --port 8080

# 或使用 gunicorn
gunicorn api:app -w 4 -b 0.0.0.0:8080
```

---

## 📈 版本控制规范

### 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `refactor`: 重构
- `test`: 测试
- `chore`: 维护

---

## 🔒 安全规范

### 1. 敏感信息
- ❌ 不要硬编码 API Key
- ✅ 使用环境变量
- ✅ 使用 `.env` 文件（不提交到 git）

### 2. 配置管理
```python
import os

api_key = os.getenv("API_KEY", "")
```

---

## 📞 支持和反馈

- **GitHub Issues**: [项目地址]/issues
- **文档**: 查看 `README.md`
- **AI Agent**: 查看 `AGENT_GUIDE.md`

---

**最后更新**: 2026-05-28  
**版本**: 2.0.0  
**维护团队**: MCP Hub Contributors

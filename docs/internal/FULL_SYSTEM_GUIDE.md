# 🎯 MCP Hub 系统功能完整说明

## 📖 概述

MCP Hub 是一个功能完善的 MCP (Model Context Protocol) 生态系统导航平台，提供以下核心功能：

- ✅ 服务器索引和管理
- ✅ 下载和标准化模板
- ✅ 知名项目导航
- ✅ 自动化更新机制

## 🛠️ 工具系统

### 1. 下载管理器 (`tools/download_manager.py`)

**功能**: 下载可用的 MCP 服务器并生成标准化配置模板

**主要功能**:

#### 1.1 同步服务器并生成模板
```bash
python tools/download_manager.py sync [limit]
```

**作用**:
- 从 `servers-index.json` 读取服务器列表
- 为每个服务器生成标准化模板
- 创建统一的配置文件格式
- 保存到 `server_registry.json`

**模板包含**:
```json
{
  "name": "服务器名称",
  "display_name": "显示名称",
  "description": "描述",
  "source": "源码地址",
  "language": "编程语言",
  "stars": "Star数量",
  "source_type": "official/community",
  "install_command": "安装命令",
  "install_args": ["参数"],
  "install_env": {"环境变量"},
  "config": {"MCP配置"},
  "categories": ["分类"],
  "quality_score": 85,
  "quality_level": "A级",
  "download_status": "pending"
}
```

#### 1.2 批量下载服务器
```bash
python tools/download_manager.py download <服务器名称...>
```

**支持**:
- GitHub 仓库自动克隆
- 自动识别项目类型 (Python/Node.js/Go)
- 自动生成安装命令
- 生成 MCP 配置文件

#### 1.3 导出配置
```bash
python tools/download_manager.py export <服务器名称...>
```

**作用**:
- 将多个服务器配置合并
- 生成标准的 MCP 配置文件
- 支持导出为 Claude Desktop 格式

**示例**:
```bash
# 导出多个服务器配置
python tools/download_manager.py export github puppeteer notio
```

#### 1.4 列出已注册服务器
```bash
python tools/download_manager.py list
```

**显示**:
- 服务器总数
- 已下载数量
- 每个服务器的质量等级和评分
- 下载状态

### 2. 知名项目导航器 (`tools/notable_projects_navigator.py`)

**功能**: 收集并展示所有知名 MCP 相关项目

**包含分类**:

#### 2.1 🏢 大厂官方 MCP
- GitHub MCP Server
- Anthropic MCP
- Stripe MCP
- Notion MCP
- Microsoft Playwright MCP
- Docker MCP

#### 2.2 🌟 明星项目
- n8n (189k⭐) - 工作流自动化
- Dify (142k⭐) - LLM应用开发
- Open WebUI (138k⭐) - WebUI
- MindsDB (28k⭐) - ML数据库
- 1Panel (32k⭐) - 服务器管理

#### 2.3 🎮 游戏相关
- Unity MCP (4.5k⭐)
- Unreal Engine MCP
- Godot MCP

#### 2.4 🛠️ 开发框架
- FastMCP (8.1k⭐) - Python框架
- MCP Go SDK (4.5k⭐)
- MCP TypeScript SDK (3.5k⭐)
- PyMCP

#### 2.5 🇨🇳 国内大厂
- 百度文心 MCP (12k⭐)
- 钉钉 MCP (9k⭐)
- 网易云信 MCP (5.5k⭐)
- 阿里云 MCP
- 腾讯云 MCP

#### 2.6 📚 资源汇总
- awesome-mcp-servers (73k⭐)
- MCP Registry (6.8k⭐)
- awesome-mcp (5.8k⭐)

**生成文件**:
- `NOTABLE_PROJECTS_GUIDE.md` - 详细导航文档
- `notable_projects.json` - JSON 数据
- `NAVIGATION_GUIDE.md` - 使用指南

### 3. 自动化更新器 (`tools/auto_updater.py`)

**功能**: 定期自动更新系统数据

**更新任务**:

#### 3.1 同步上游索引
- 从 awesome-mcp 同步最新服务器列表
- 保持索引数据最新

#### 3.2 更新质量评分
- 重新计算所有服务器的质量评分
- 更新质量等级 (S/A/B/C/D)

#### 3.3 更新知名项目
- 重新生成知名项目导航
- 更新项目 Star 数量
- 检查项目活跃度

#### 3.4 检查下载状态
- 检查已下载服务器状态
- 统计成功/失败数量
- 自动重试失败的下载

**配置选项**:
```json
{
  "auto_update": {
    "enabled": true,
    "interval_hours": 24,  // 更新间隔
    "tasks": {
      "sync_index": true,
      "update_quality_scores": true,
      "update_notable_projects": true,
      "check_downloads": true
    }
  },
  "notifications": {
    "enabled": true,
    "on_success": true,
    "on_failure": true
  },
  "backup": {
    "enabled": true,
    "keep_days": 7
  }
}
```

**使用方式**:

```bash
# 查看状态
python tools/auto_updater.py status

# 运行更新（按配置间隔）
python tools/auto_updater.py run

# 强制更新（忽略间隔）
python tools/auto_updater.py run --force

# 生成报告
python tools/auto_updater.py report
```

## 📊 数据文件

### 服务器索引
- **文件**: `servers-index.json`
- **内容**: 所有 MCP 服务器列表
- **大小**: 4403+ 服务器
- **更新**: 定期从 awesome-mcp 同步

### 服务器注册表
- **文件**: `server_registry.json`
- **内容**: 已处理的服务器模板
- **生成**: 由 download_manager.py 生成
- **包含**: 标准化配置模板

### 知名项目数据
- **文件**: `notable_projects.json`
- **内容**: 知名项目导航数据
- **格式**: JSON 分类结构
- **生成**: 由 notable_projects_navigator.py 生成

## 🎯 标准化模板系统

### 模板特点

1. **统一格式**: 所有服务器使用相同的结构
2. **完整信息**: 包含安装、配置、使用说明
3. **质量评分**: 自动计算质量等级
4. **分类清晰**: 易于查找和筛选

### 配置示例

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@github/mcp-server"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token"
      }
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

### 安装命令示例

```bash
# Python 项目
pip install fastmcp
uvx --from git+https://github.com/owner/repo

# Node.js 项目
npx -y @modelcontextprotocol/server-puppeteer
npm install -g @github/mcp-server

# Go 项目
go install github.com/owner/repo@latest
```

## 🔄 自动化流程

### 每日更新流程

1. **检查更新时间**
   - 读取配置中的更新间隔
   - 对比上次更新时间
   - 判断是否需要更新

2. **执行更新任务**
   - 同步上游索引
   - 更新质量评分
   - 更新知名项目
   - 检查下载状态

3. **创建备份**
   - 备份关键数据文件
   - 清理过期备份
   - 记录更新日志

4. **发送通知** (可选)
   - 更新成功通知
   - 失败告警

## 📚 使用场景

### 场景 1: 快速搭建 MCP 环境

```bash
# 1. 同步前 50 个服务器
python tools/download_manager.py sync 50

# 2. 下载推荐的服务器
python tools/download_manager.py download github puppeteer notio

# 3. 导出配置到 Claude Desktop
python tools/download_manager.py export github puppeteer notio
```

### 场景 2: 查找高质量服务器

```bash
# 查看精选服务器
python market.py curated

# 查看质量评分
python market.py companies

# 查看详细配置
curl http://localhost:8080/quality/github
```

### 场景 3: 自动化维护

```bash
# 查看更新状态
python tools/auto_updater.py status

# 手动触发更新
python tools/auto_updater.py run

# 查看更新日志
cat update.log
```

### 场景 4: 探索知名项目

```bash
# 查看知名项目导航
cat NOTABLE_PROJECTS_GUIDE.md

# 查看使用指南
cat NAVIGATION_GUIDE.md

# 查看 JSON 数据
cat notable_projects.json | jq '.categories | keys'
```

## 🚀 快速开始

### 1. 基础使用

```bash
# 查看精选推荐
python market.py curated

# 搜索服务器
python market.py search github

# 查看国内大厂
python market.py companies
```

### 2. 下载和使用

```bash
# 同步 100 个服务器
python tools/download_manager.py sync 100

# 下载感兴趣的服务器
python tools/download_manager.py download github puppeteer

# 导出配置
python tools/download_manager.py export github puppeteer
```

### 3. 导航探索

```bash
# 查看知名项目
cat NOTABLE_PROJECTS_GUIDE.md

# 查看导航指南
cat NAVIGATION_GUIDE.md
```

### 4. 自动化维护

```bash
# 检查更新状态
python tools/auto_updater.py status

# 运行更新
python tools/auto_updater.py run --force
```

## 📈 统计信息

- **总服务器数**: 4403+
- **知名项目**: 40+ 个
- **分类数量**: 6 个大类
- **质量等级**: S/A/B/C/D 5 级
- **自动化任务**: 4 个
- **备份保留**: 7 天

## 🔧 自定义配置

### 修改更新间隔

编辑 `update_config.json`:

```json
{
  "auto_update": {
    "interval_hours": 12  // 改为12小时
  }
}
```

### 禁用特定任务

```json
{
  "auto_update": {
    "tasks": {
      "sync_index": true,
      "update_quality_scores": false,  // 禁用质量评分更新
      "update_notable_projects": true,
      "check_downloads": true
    }
  }
}
```

### 调整质量评分权重

编辑 `tools/auto_updater.py`:

```python
def _calculate_quality_score(self, server: Dict) -> int:
    score = 0
    # Source 类型 (30分)
    if server.get('source_type') == 'official':
        score += 30
    # ... 其他权重调整
```

## 📝 日志和报告

### 更新日志
- **文件**: `update.log`
- **格式**: `[时间戳] [级别] 消息`
- **级别**: INFO, SUCCESS, WARNING, ERROR

### 备份文件
- **目录**: `backups/`
- **命名**: `backup_YYYYMMDD_HHMMSS.json`
- **保留**: 7 天

### 更新报告
- **生成**: `python tools/auto_updater.py report`
- **文件**: `UPDATE_REPORT.md`

## 🎓 学习资源

### 官方文档
- [MCP 官网](https://modelcontextprotocol.io/)
- [MCP GitHub](https://github.com/modelcontextprotocol)
- [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)

### 国内资源
- [钉钉 MCP](https://open.dingtalk.com/)
- [文心 MCP](https://github.com/baidu/ernie-mcp)
- [网易云信](https://github.com/netease-im/yunxin-mcp-server)

## 🤝 贡献指南

欢迎贡献：

1. 新的 MCP 服务器
2. 知名项目信息
3. 质量评分优化
4. 自动化脚本
5. 文档改进

请提交 Issue 或 Pull Request！

## 📄 许可证

本项目遵循原项目许可证。

---

**文档版本**: v1.0  
**生成时间**: 2026-05-28  
**维护团队**: MCP Hub Contributors  
**联系邮箱**: [请在 GitHub 提交 Issue]

# 示例 — 通用适配器

本目录展示 MCP Hub 第 2 层使用的**通用适配器格式**。

---

## 什么是通用适配器？

通用适配器是一个包装过的 MCP 服务器，它：
- 提供**单一安装命令**，在所有主要 MCP 客户端（Claude Desktop、Cursor、Cline、Windsurf）上都能工作
- 已经过 MCP Hub 团队的**亲自测试**
- 在目录中标记为 **"✅ 已适配"** 徽章
- 在排名算法中获得**分数加权**（our_signal = 1.0）

---

## 当前适配器

### 1. fastmcp

**上游**：[jlowin/fastmcp](https://github.com/jlowin/fastmcp)

**作用**：一个用最少样板代码构建 MCP 服务器的 Python 框架。

**安装命令**：
```bash
uv tool install fastmcp
```

**通用配置**：
```json
{
  "mcpServers": {
    "fastmcp": {
      "command": "uvx",
      "args": ["fastmcp"]
    }
  }
}
```

**已测试客户端**：Claude Desktop、Cursor、Cline、Windsurf

**文件**：
- `frontend/public/adapters/fastmcp/adapter.json` — 清单
- `frontend/public/adapters/fastmcp/install.sh` — 单行安装器
- `frontend/public/adapters/fastmcp/README.md` — 适配说明
- `frontend/public/adapters/fastmcp/tests/README.md` — 测试结果

---

### 2. playwright-mcp

**上游**：[microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)

**作用**：通过 Playwright 为 MCP 客户端提供浏览器自动化。

**安装命令**：
```bash
npx -y @playwright/mcp@latest
```

**通用配置**：
```json
{
  "mcpServers": {
    "playwright-mcp": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

**已测试客户端**：Claude Desktop、Cursor、Cline、Windsurf

**文件**：
- `frontend/public/adapters/playwright-mcp/adapter.json` — 清单
- `frontend/public/adapters/playwright-mcp/install.sh` — 单行安装器
- `frontend/public/adapters/playwright-mcp/README.md` — 适配说明
- `frontend/public/adapters/playwright-mcp/tests/README.md` — 测试结果

---

## 适配器格式

每个适配器位于 `frontend/public/adapters/<name>/`，包含 4 个文件：

### 1. `adapter.json`（必需）

构建管道读取的清单文件：

```json
{
  "name": "fastmcp",
  "upstream": "jlowin/fastmcp",
  "status": "adapted",
  "platforms": {
    "claude-desktop": { "command": "uvx", "args": ["fastmcp"] },
    "cursor": { "command": "uvx", "args": ["fastmcp"] },
    "cline": { "command": "uvx", "args": ["fastmcp"] },
    "windsurf": { "command": "uvx", "args": ["fastmcp"] }
  },
  "install_universal": "uv tool install fastmcp",
  "tested_clients": ["claude-desktop", "cursor", "cline", "windsurf"],
  "gotchas": [],
  "notes": "通用 uvx 调用；跨所有 stdio MCP 客户端工作。"
}
```

**字段**：
- `name` — 适配器名称（匹配目录名）
- `upstream` — 上游 GitHub 仓库（`owner/repo`）
- `status` — `"adapted"` | `"in_progress"` | `"researched"`
- `platforms` — 每客户端配置（可选，用于文档）
- `install_universal` — 到处都能工作的单一命令
- `tested_clients` — 我们测试过的客户端列表
- `gotchas` — 已知问题或限制
- `notes` — 人类可读的描述

### 2. `install.sh`（必需）

单行安装器脚本。应该是：
- **幂等的** — 多次运行安全
- **自我检查的** — 验证安装成功
- **跨平台的** — 在 macOS、Linux、Windows（WSL）上工作

示例：
```bash
#!/usr/bin/env bash
set -euo pipefail

# 检查先决条件
if ! command -v uv &> /dev/null; then
    echo "错误：uv 未安装。从 https://github.com/astral-sh/uv 安装"
    exit 1
fi

# 安装
uv tool install fastmcp

# 验证
if command -v fastmcp &> /dev/null; then
    echo "✅ fastmcp 安装成功"
else
    echo "❌ 安装失败"
    exit 1
fi
```

### 3. `README.md`（必需）

人类可读的适配说明：
- 适配器的作用
- 如何安装
- 已知问题或限制
- 上游文档链接

### 4. `tests/README.md`（必需）

测试结果日志。应包括：
- 测试了哪些客户端
- 哪些平台（macOS、Linux、Windows）
- 测试日期
- 通过/失败状态
- 遇到的任何问题

示例：
```markdown
# 测试结果

## 2026-06-12

| 客户端 | 平台 | 状态 | 备注 |
|---|---|---|---|
| Claude Desktop | macOS 14 | ✅ 通过 | — |
| Cursor | macOS 14 | ✅ 通过 | — |
| Cline | macOS 14 | ✅ 通过 | — |
| Windsurf | macOS 14 | ✅ 通过 | — |
```

---

## 适配器如何评分

`tools/_our_signal.py` 脚本在构建时扫描 `frontend/public/adapters/` 并分配 `our_signal` 分数：

- `status: "adapted"` → 1.0（总分中占 20% 权重）
- `status: "in_progress"` → 0.7
- `status: "researched"` → 0.4
- 未知/缺失 → 0.0

这给已适配的服务器显著的排名提升。

---

## 添加新适配器

1. 创建目录：`frontend/public/adapters/<name>/`
2. 添加 4 个必需文件（见上文）
3. 运行 `python3 tools/_our_signal.py` 验证扫描器能识别它
4. 运行 `python3 tools/gen_static_data.py` 重新生成静态索引
5. 验证服务器的 `our_signal` 字段在 `frontend/public/servers-index.json` 中现在是 1.0
6. 提交：`feat(adapter): add <name> universal adapter`

完整规范见 [`REFACTOR_PLAN.md`](../REFACTOR_PLAN.md) §9。

---

## 为什么需要通用适配器？

MCP 生态有一个 **"50 份模板"问题**：每个客户端集成指南都为每个服务器提供一份手写的 JSON，它们全部会过时。

通用适配器通过以下方式解决这个问题：
1. 提供**单一安装命令**，到处都能工作
2. 经过 MCP Hub 团队的**亲自测试**
3. 获得**分数加权**以信号信任
4. 留下**清晰的纸面记录**（adapter.json + tests/README.md）

---

## 许可证

[MIT](../LICENSE)

---
name: 提交一个新的 MCP 服务器
about: 把一个新的 MCP 服务器提交到目录
title: '[NEW SERVER] '
labels: 'submission, server, zh'
assignees: ''
---

## 服务器信息

- **服务器名称**:
- **GitHub 仓库 / 主页 URL**:
- **分类**（database、search、browser 等）:
- **编程语言**:
- **License**:
- **Stars**（大约）:
- **维护者**（公司或个人）:
- **最近一次 commit 日期**:

## 质量检查清单

- [ ] 服务器是开源的
- [ ] 有清晰的 README 和安装说明
- [ ] 有 MCP 配置示例
- [ ] 已经在至少一个 MCP 客户端（Claude Desktop、Cursor 等）测试过
- [ ] License 是 OSI 批准的
- [ ] 没有已知的安全漏洞
- [ ] 6 个月内有维护

## 配置片段

粘贴一个最小可工作的 MCP 配置（**不要包含真实 token**）：

```json
{
  "mcpServers": {
    "your-server": {
      "command": "npx",
      "args": ["-y", "@your/package-name"]
    }
  }
}
```

## 描述

1-2 句话描述这个服务器做什么、为什么有人会安装它。

## 为什么这个服务器应该收录到 MCP Hub

解释为什么这个服务器对社区有价值。

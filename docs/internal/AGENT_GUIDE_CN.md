# AI Agent 指南 - MCP Hub（中文版）

> **完整的 AI Agent 指南** — 涵盖 AI 高效使用 MCP Hub 所需的一切
>
> [![AI Agent Ready](https://img.shields.io/badge/AI_Agent-Ready-purple?style=for-the-badge)](README.md)
> [![英文版](https://img.shields.io/badge/English-AGENT_GUIDE-blue?style=for-the-badge)](AGENT_GUIDE.md)

> ⚠️ **注意**：英文 `AGENT_GUIDE.md` 是规范版本。本中文版仅做关键章节翻译，最新更新请以英文版为准。

---

## MCP Hub 是什么

MCP Hub 是一个 **Model Context Protocol (MCP) 服务器市场**，提供：

- 4,400+ 经过策展的 MCP 服务器清单
- 每个服务器的标准化元数据（stars、categories、topics、install 命令）
- 自动生成的可下载配置文件
- AI Agent 友好的发现 API
- 静态数据 bundle（无需后端也可在 GitHub Pages 上浏览）

完整介绍、API 端点、查询示例、JSON-LD 规范，请阅读
[英文版 AGENT_GUIDE](AGENT_GUIDE.md)。

---

## 快速上手

| 任务 | 英文指南位置 |
| --- | --- |
| 浏览所有服务器 | `GET /servers`（详见英文 §3） |
| 按分类筛选 | `GET /servers?category=ai` |
| 搜索服务器 | `GET /servers?search=github` |
| 获取配置 JSON | `GET /config/{name}` |
| 推荐服务器 | `GET /recommend/similar?name=...` |
| 对比服务器 | `GET /compare?servers=a,b` |

完整 API 规范见 [API.md](../API.md) / [API_CN.md](../API_CN.md)。

---

## 关键文件位置

- 数据索引：`servers-index.json`（运行时由 `tools/sync_index.py` 同步）
- 服务器模板：`templates/*.json`
- 文档：`docs/`（中英双版本以 `_CN` 后缀标识）
- 公开 REST API：`main.py`（FastAPI 应用）
- 旧版兼容 API：`api.py`（`http.server` 实现）

---

## AI Agent 使用建议

1. 始终先调用 `/stats` 了解当前数据规模
2. 用 `/servers?category=...&min_stars=100` 过滤高质量服务器
3. 拿到 `name` 后用 `/config/{name}` 获取可粘贴的 JSON 配置
4. 提交新服务器请走 `/submissions/submit` 而非直接 PR

---

## 贡献

- 发现数据错误：开 Issue，附 server name + 复现链接
- 提交新服务器：使用 `tools/comprehensive_collector.py` 或前端 `/submit` 表单
- 改进文档：直接编辑英文版，中文版通过 PR 自动同步

完整贡献流程见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

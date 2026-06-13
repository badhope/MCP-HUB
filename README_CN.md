# MCP Hub

> **通用适配器平台** — 上游索引 · 我们做的通用适配 · 一键添加更多
>
> *The universal adapter platform for Model Context Protocol servers.*

4,400+ 已索引 MCP 服务器 · 21 个分类 · 每日上游同步 · 零后端。

[在线演示](https://badhope.github.io/MCP-HUB/) · [English](README.md)

---

## 这是什么

MCP Hub 是一个**纯静态单页应用**，把混乱的公共 MCP 服务器生态整理成一个
有评分、有排名、易安装的目录。产品分三层：

| 层级 | 内容 | 位置 |
|---|---|---|
| **1. 上游索引** | 从 `awesome-mcp` 等源镜像的 4,400+ MCP 服务器 | `frontend/public/servers-index.json`（~4.4 MB，每晚重建）|
| **2. 我们的适配器** | 我们**亲自**包装的少量服务器，提供通用安装命令，评分加权，标记"✅ 已适配" | `frontend/public/adapters/<name>/adapter.json` |
| **3. "更多"标签页** | 添加我们尚未覆盖的新服务器的入口（issue / PR / 内联表单）| `/more` 路由 |

我们是一个**中转站/枢纽**，不是后端：没有 FastAPI，没有 Postgres，没有认证。
整个技术栈是一个部署到 GitHub Pages 的 Vite SPA，加一个每晚运行的
GitHub Action 拉取上游索引、给每个服务器打分、提交新的 `servers-index.json`。

---

## 为什么做这个

MCP 生态在爆发——但公共目录一团糟：

- **安装命令因语言而异**（`uvx X` vs `npx -y X` vs `pip install X` vs
  `git clone` …），每个客户端（Claude Desktop、Cursor、Cline、Windsurf …）
  都用各自的配置格式包装同一个服务器。
- **质量参差不齐**——周末玩具项目和 Anthropic / Stripe / Microsoft 的
  生产系统并存。
- **"50 份模板"问题**——每个客户端集成指南都为每个服务器维护一份手写
  JSON，全部会过时。

MCP Hub 的解决方式：

1. **打分**——用透明的 5 因子公式（见 [评分](#评分)）给每个服务器评分，
   让质量可比较。
2. **自动生成安装命令**——根据服务器的语言/源码自动推导
   （`tools/_install_hint.py`）。
3. **标记我们信任的**（✅ 已适配）——让你不用猜。
4. **开放入口**——通过 `/more` 标签页添加新服务器，因为我们不可能
   自己适配所有东西。

---

## 快速开始

没有后端。`npm install` + `npm run dev` 就行。

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB
cd frontend && npm ci && npm run dev
# → http://localhost:5173
```

就这样。目录已经预构建为 `frontend/public/servers-index.json`
（~4.4 MB，~4,400 个服务器）。无需后端、无需数据库、无需 API key。

### 重新生成目录

每日 GitHub Action 会从上游重建 `servers-index.json`。本地操作：

```bash
python3 tools/sync_index.py           # 拉上游 + 充实元数据 + 写 servers-index.json（根目录）
python3 tools/gen_static_data.py      # 复制 + 装饰到 frontend/public/servers-index.json
```

两个脚本只用 Python 标准库——数据管道无需 `pip install`。
唯一的 Python 依赖是跑测试用的 `pytest`：

```bash
pip install pytest
pytest tests/ -v                     # 56 个测试，~0.3 s
```

### 生产构建

```bash
make build                           # 数据 + 前端
# 或
python3 tools/gen_static_data.py
cd frontend && npm run build
```

输出在 `frontend/dist/`——约 7 MB 的包（其中 4.4 MB 是目录数据）。
放到任何静态托管即可。GitHub Pages 开箱即用
（`.github/workflows/deploy-pages.yml`）。

---

## 评分

目录中每个服务器都有一个 `score`（0–100），在构建时由
`tools/completeness_scoring.py` 计算：

| 因子 | 权重 | 衡量内容 |
|---|---|---|
| `stars` | 30% | `log10(stars + 1) / log10(10_000 + 1)` — 超过 10k 收益递减 |
| `recency` | 15% | `exp(-Δdays / 30)` — 最后一次提交 30 天半衰期 |
| `lang_coverage` | 15% | 我们是否对该语言有一流安装支持 |
| `desc_quality` | 20% | 描述长度分档（60 / 200 / 500 字符）|
| `our_signal` | 20% | **最重要的一个。** 0.0 = "未处理"，0.4 = "调研过"，0.7 = "适配中"，1.0 = "已适配" |

权重可在 `tools/completeness_scoring.py` 中调整；
`tests/test_scoring.py` 中的测试锁定了公式。

---

## 通用适配器格式

已适配的服务器放在 `frontend/public/adapters/<server-name>/`，结构如下：

```json
{
  "name": "fastmcp",
  "platforms": {
    "claude-desktop": { "command": "uvx", "args": ["fastmcp"] },
    "cursor":        { "command": "uvx", "args": ["fastmcp"] },
    "cline":         { "command": "uvx", "args": ["fastmcp"] },
    "windsurf":      { "command": "uvx", "args": ["fastmcp"] }
  },
  "notes": "通用 uvx 调用；跨所有 stdio MCP 客户端工作。"
}
```

`_our_signal.py` 遍历此目录，给每个目录中的服务器标记 `our_signal` 值，
SPA 将其渲染为彩色徽章（✅ 已适配 / ⚙️ 适配中 / 👀 调研过 / 🆕 未处理）。

---

## 项目结构

```
.
├── tools/                            # Python 数据管道（仅标准库）
│   ├── sync_index.py                 # 1. 拉上游
│   ├── gen_static_data.py            # 2. 装饰 + 写入前端包
│   ├── completeness_scoring.py       # 5 因子评分
│   ├── _install_hint.py              # 按语言生成 uvx/npx/pip/git/docker
│   ├── _our_signal.py                # 扫描 adapters/ → our_signal 映射
│   └── secret_scanner.py             # pre-commit / CI 钩子
├── tests/                            # 56 个 pytest 测试，无外部依赖
├── frontend/                         # Vite + React 19 + TypeScript SPA
│   ├── public/
│   │   ├── servers-index.json        # 构建时目录
│   │   └── adapters/                 # 第 2 层：我们的通用适配器
│   └── src/
│       ├── lib/api.ts                # 内存查询 + localStorage
│       ├── pages/                    # Home, OurTools, More, ServerDetail…
│       └── …
├── docs/                             # 用户文档
├── .github/workflows/                # ci + sync-data + deploy-pages + …
└── （无 main.py，无 services.py，无 core/，无 Dockerfile，无 docker-compose）
```

运行 `make help` 查看完整任务列表。

---

## 架构

```
                  每晚 GitHub Action
                          │
                          ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
  │  上游        │ ─► │  sync_index  │ ─► │  gen_static_data │ ─► frontend/public/
  │  awesome-mcp │    │      .py     │    │       .py        │     servers-index.json
  └──────────────┘    └──────────────┘    └──────────────────┘
                                                     │
                                                     ▼
                       ┌─────────────────────────────────────┐
                       │  Vite + React 19 SPA（静态）          │
                       │  · 读取 servers-index.json（4.4 MB） │
                       │  · 内存中评分                         │
                       │  · 用户状态存 localStorage            │
                       │  · 部署在 GitHub Pages               │
                       └─────────────────────────────────────┘
```

- **无请求时计算。** 目录在构建时冻结。
- **无服务器。** GitHub Pages 就够了。
- **无追踪。** 收藏 / 评分 / 评论存在你浏览器的 `localStorage` 中。
  清除站点数据即清除。

---

## 贡献

- **添加我们还没有的适配器。** 参考 `frontend/public/adapters/` 的格式，
  然后开 PR。评分加权自动生效。
- **向目录添加新服务器。** 大多数会从上游 `awesome-mcp` 镜像在每日同步时
  自动收录。如果没有，开一个 `server_submission` issue。
- **发现 bug / 有功能建议 / 安全披露？** 使用
  `.github/ISSUE_TEMPLATE/` 中对应的模板。
- 代码规范和 PR 清单：[`CONTRIBUTING.md`](CONTRIBUTING.md)。

能让 PR 最快被合的两件事：`make test && make lint` 全绿，
并写一条 [`CHANGELOG.md`](CHANGELOG.md)。

---

## 许可

[MIT](LICENSE)。上游数据从
[awesome-mcp](https://github.com/Rodert/awesome-mcp) 和每个精选源的
公开 GitHub API 镜像——逐源署名和评分理由见
[`docs/internal/COMPLETENESS_SCORING_GUIDE.md`](docs/internal/COMPLETENESS_SCORING_GUIDE.md)。

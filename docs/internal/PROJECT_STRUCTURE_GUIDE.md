# MCP Hub 仓库结构与规范化文档

> **适用对象**: 维护者、贡献者、AI agent
> **版本**: v2.0
> **更新日期**: 2026-06-02

本仓库是一个**单仓多包 (monorepo)**，包含 FastAPI 后端、React/Vite 前端、Python 工具链、以及完整的双语文档。

---

## 顶层目录

```
mcp-market/
├── api.py                      # FastAPI 路由定义（薄层）
├── main.py                     # App factory、lifespan、CORS、middleware、/health
├── services.py                 # 业务逻辑（搜索、评分、配置生成）
├── query.py                    # AI 自然语言查询接口
├── user_data.py                # 用户数据存储（favorites、submissions、ratings）
├── core/                       # 底层数据模型 + 索引（Server、Stats、Indexes）
├── tools/                      # 19 个 CLI 工具脚本（同步、评分、收集、扫描）
├── templates/                  # 50 个预制 MCP 配置模板
├── tests/                      # 9 个 pytest 测试文件 + conftest.py
│
├── frontend/                   # Vite + React 19 + TypeScript 前端
│   ├── src/
│   │   ├── components/         # layout/、server/、shared/、ui/、user/
│   │   ├── pages/              # 9 个路由级页面
│   │   ├── hooks/              # 9 个自定义 React hooks
│   │   ├── lib/                # API client、formatter、queryClient
│   │   ├── store/              # Zustand store
│   │   ├── types/              # TypeScript 类型定义
│   │   ├── test/               # Vitest 测试（components/、lib/、store/、mocks/）
│   │   ├── App.tsx             # 根组件 + Router
│   │   └── main.tsx            # 入口
│   ├── public/                 # 静态资源（favicon、social-preview、static-data/）
│   ├── dist/                   # 构建产物（已部署到 gh-pages）
│   ├── tsconfig.json           # 根 references 配置
│   ├── tsconfig.app.json       # 应用代码编译配置
│   ├── tsconfig.node.json      # 配置文件编译配置（vite.config.ts 等）
│   ├── vite.config.ts          # Vite 构建配置
│   ├── vitest.config.ts        # Vitest 测试配置
│   ├── eslint.config.js        # ESLint 9 flat config
│   ├── tailwind.config.js      # Tailwind 主题
│   ├── postcss.config.js       # PostCSS
│   ├── nginx.conf              # 生产 Nginx 配置（含 SPA fallback）
│   ├── Dockerfile              # 多阶段构建（base → deps → builder → production | development）
│   ├── .dockerignore           # 排除 node_modules、tests、static-data 等
│   └── package.json
│
├── docs/                       # 用户文档（每个文件都有 EN + CN 配套）
│   ├── QUICKSTART.md / QUICKSTART_CN.md
│   ├── USER_GUIDE.md / USER_GUIDE_CN.md
│   ├── API.md / API_CN.md
│   └── internal/               # 维护者专用文档
│       ├── README.md           # internal/ 目录说明
│       ├── AGENT_GUIDE.md      # 旧版 AI-agent 指南（被 AGENTS.md 取代）
│       ├── COMPLETENESS_SCORING_GUIDE.md
│       ├── DOMESTIC_COMPANIES_REPORT.md
│       ├── FULL_SYSTEM_GUIDE.md
│       ├── IMPROVEMENT_PLAN.md
│       ├── NOTABLE_PROJECTS_GUIDE.md
│       ├── PROJECT_STRUCTURE_GUIDE.md   # ← 本文件
│       ├── REPOSITORY_INTRO.md
│       └── SERVER_CATALOG.md
│
├── examples/                   # 配置示例（claude-config.json + 50 templates README）
│   ├── README.md / README_CN.md
│   └── claude-config.json
│
├── .github/                    # GitHub 集成
│   ├── workflows/              # 5 个 CI workflow（ci、frontend-deploy、lint、release、sync）
│   ├── ISSUE_TEMPLATE/         # 10 个 issue 模板（5 EN + 5 CN）
│   ├── PULL_REQUEST_TEMPLATE.md / PULL_REQUEST_TEMPLATE_CN.md
│   ├── CODEOWNERS              # @badhope 拥有所有路径
│   ├── FUNDING.yml             # 7 个赞助平台
│   └── dependabot.yml          # 5 个生态系统的依赖更新
│
├── .vscode/                    # 团队共享的 IDE 配置
│   ├── settings.json           # per-language formatter
│   └── extensions.json         # 16 个推荐扩展
│
├── .devcontainer/              # GitHub Codespaces 一键开发环境
│   └── devcontainer.json
│
├── server_registry.json        # 持久化服务器注册表
├── market-config.json          # 市场配置
├── comprehensive_mcp_projects.json   # 全量项目清单
├── notable_projects.json       # 知名项目导航
│
├── Dockerfile                  # 后端 Docker 镜像
├── docker-compose.yml          # 一键起 dev stack（含 healthcheck）
├── Makefile                    # 25+ 常用目标
├── pyproject.toml              # Python 项目元数据
├── requirements.txt            # 运行时依赖
├── pytest.ini                  # pytest 配置（pythonpath=.）
├── package.json                # 根 package.json
│
├── .editorconfig               # 跨编辑器格式
├── .gitattributes              # line endings / linguist 规则
├── .gitignore                  # 完整忽略规则
├── .dockerignore               # 根级 docker 忽略
├── .pre-commit-config.yaml     # pre-commit hooks（secret-scan、ruff、black、eslint）
├── .nvmrc                      # Node 20 锁版本
├── .env.example                # 环境变量示例
│
├── README.md / README_CN.md    # 项目主页
├── AGENTS.md                   # 供 AI 编程助手阅读的根级约定
├── CHANGELOG.md / CHANGELOG_CN.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md / CODE_OF_CONDUCT_CN.md
├── SECURITY.md / SECURITY_CN.md
├── SUPPORT.md / SUPPORT_CN.md
├── CITATION.cff                # 学术引用
└── LICENSE                     # MIT
```

---

## 数据文件

| 文件 | 用途 | 重建方式 | 提交策略 |
|------|------|----------|----------|
| `servers-index.json` | 全量服务器索引（4403+ 条） | `python tools/update_index.py` | **gitignore**（.gitignore 第 99 行） |
| `market-index.json` | 市场聚合索引 | `python tools/sync_index.py` | **gitignore** |
| `user-data.json` | 用户收藏、评分、评论 | 运行时 API 写入 | **gitignore** |
| `submissions.json` | 用户提交 | 运行时 API 写入 | **gitignore** |
| `server_registry.json` | 持久化注册表 | `python tools/downloader.py` | **commit** |
| `comprehensive_mcp_projects.json` | 全量项目清单 | `python tools/comprehensive_collector.py` | **commit** |
| `notable_projects.json` | 知名项目导航 | `python tools/notable_projects_navigator.py` | **commit** |
| `market-config.json` | 市场配置 | 手工维护 | **commit** |
| `frontend/public/static-data/*.json` | 前端静态数据快照 | `python tools/gen_static_data.py` | **commit**（已 build 也 deploy） |

> ⚠️ 首次 `git clone` 后 `servers-index.json` 缺失属正常 — 运行 `python tools/update_index.py` 拉取上游最新快照。

---

## 命名规范

### 1. 代码文件
- **Python 模块**: `snake_case.py`（如 `download_manager.py`）
- **测试文件**: `test_<module>.py`（如 `test_api.py`）
- **TypeScript 组件**: `PascalCase.tsx`（如 `ServerCard.tsx`）
- **TypeScript 工具**: `camelCase.ts`（如 `queryClient.ts`）
- **配置文件**: `kebab-case.yml`、`snake_case.ini`（如 `pytest.ini`）

### 2. 文档文件
- **用户文档**: EN 文件 + `_CN` 配套（如 `README.md` + `README_CN.md`）
- **指南文档**: `*_GUIDE.md`
- **报告文档**: `*_REPORT.md`
- **变更日志**: `CHANGELOG.md` + `CHANGELOG_CN.md`

### 3. 目录命名
- **模块目录**: `snake_case/`（如 `core/`、`tools/`）
- **测试目录**: `tests/`
- **组件目录**: 按角色分（`components/layout/`、`components/server/` 等）

---

## API 端点规范

### 命名约定
```
GET    /{resource}                    # 列表
GET    /{resource}/{id}               # 单个
GET    /{resource}?param=value        # 过滤
POST   /{resource}                    # 创建（用户操作）
DELETE /{resource}/{id}               # 删除
```

### 端点清单
| 端点 | 用途 |
|------|------|
| `GET /` | API 健康信息（name、version、docs/redoc 链接） |
| `GET /health` | 轻量 liveness 探针（Docker HEALTHCHECK 用） |
| `GET /stats` | 统计信息（总服务器数、分类数、source 分布） |
| `GET /servers` | 列表（支持 search、category、source、sort） |
| `GET /servers/{name}` | 单个详情 |
| `GET /categories` | 分类聚合 |
| `GET /quality/{name}` | 完整性评分 |
| `GET /featured` | 推荐配置 |
| `GET /download/{name}` | 下载配置 JSON |
| `POST /favorites` | 添加收藏 |
| `DELETE /favorites` | 取消收藏 |
| `POST /rate` | 评分 |
| `POST /comments` | 评论 |
| `GET /query` | AI 自然语言查询（query.py） |

### 响应格式
```json
{
  "total": 4403,
  "servers": [...],
  "last_sync": "2026-06-02T00:00:00Z"
}
```

---

## 测试规范

- **后端**: pytest（9 个测试文件，pythonpath=. 配置在 `pytest.ini`）
- **前端**: Vitest（MSW 拦截 + happy-dom 环境，配置在 `vitest.config.ts`）
- **Pre-commit**: 7 类 hook（secret-scan、trailing-whitespace、end-of-file-fixer、check-yaml、check-json、check-toml、ruff、black、eslint、detect-private-key）
- **CI**: 5 个 workflow（ci、lint、release、frontend-deploy、sync）

### 运行测试
```bash
make test            # 后端
cd frontend && npm test   # 前端
pre-commit run --all-files
```

---

## 版本控制规范

### 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat` — 新功能
- `fix` — 错误修复
- `docs` — 文档
- `refactor` — 重构
- `test` — 测试
- `chore` — 维护（依赖、配置）
- `ci` — CI/CD
- `perf` — 性能

### 提交前检查
- [ ] `pre-commit run --all-files` 通过
- [ ] 后端 `make test` 通过
- [ ] 前端 `cd frontend && npm run lint && npm test` 通过
- [ ] 添加 `CHANGELOG.md` 条目
- [ ] 如改 API，加 `docs/API.md` / `docs/API_CN.md` 同步

### Release 流程（AGENTS.md §Release）
1. bump `pyproject.toml` / `package.json` / `__init__.py`
2. 更新 `CHANGELOG.md`
3. `chore(release): vX.Y.Z`
4. `git tag vX.Y.Z && git push --tags`
5. （可选）`gh release create vX.Y.Z`

---

## 安全规范

- ❌ 硬编码 token / API key
- ✅ `.env` + 环境变量
- ✅ `tools/secret_scanner.py` 强制 pre-commit 扫描
- ✅ `.gitattributes` 标记二进制文件，避免误扫描

---

## 国际化

- 用户文档必须 **EN + CN 配套**
- 中文版文件名后缀 `_CN.md`
- Issue template / PR template 同样双语言
- 前端 UI 通过 `i18n` 字符串管理（不涉及 YAML 文件）

---

## 参考

- [AGENTS.md](../../AGENTS.md) — AI 编程助手根级约定
- [docs/internal/AGENT_GUIDE.md](AGENT_GUIDE.md) — AI 助手帮用户找 MCP server 的旧指南
- [docs/internal/REPOSITORY_INTRO.md](REPOSITORY_INTRO.md) — 仓库介绍
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — 贡献流程
- [README.md](../../README.md) — 主页

---

**最后更新**: 2026-06-02
**版本**: 2.0
**维护团队**: MCP Hub Contributors

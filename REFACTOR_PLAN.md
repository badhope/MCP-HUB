# MCP-HUB 重构计划书：纯静态前端 + 通用适配器平台

> **状态**：等待用户最后 2 个拍板点（见 §13）。
> **触发**：用户已认可"项目无法支撑起、后端不该有、纯静态前端是正确方向"，并新增需求——"我们是中转/中介，做通用适配器，自己也有自营 MCP 工具板块"。
> **前置**：上一轮质量审计（`QUALITY_AUDIT_PLAN.md`）已 commit 在 `86a3143`，仓库处于"可推荐"状态。
> **目标**：把项目从 "FastAPI 后端 + 双部署" 简化成 "纯静态前端 + GH Pages 部署 + 自营通用适配器平台"。

---

## 1. 重构背景

### 1.1 当前架构的根本问题

| 痛点 | 现实 | 影响 |
|---|---|---|
| FastAPI 后端有状态（user_data 收藏/评分/评论） | 但 99% 请求是只读查目录 | 杀鸡用牛刀 |
| 后端部署选项差 | 容器贵、Serverless 冷启动炸、Vercel 不适合 uvicorn | 部署成本高 |
| 演示版（GH Pages）+ 正式版（后端）两套数据 | 用户看到的不一致 | 容易出 bug |
| `/config/{name}` 动态生成命令 | 命令完全确定性的，可构建期算 | 浪费运行时 |
| AI agent 实际用 `servers-index.json` 就够 | 不需要后端 API | 后端是中间商 |
| 5 个 `servers/{dify,gemini-cli,...}` 上游参考子项目 | 6GB+ 死重，没人维护 | 仓库臃肿 |
| 14 个 GitHub workflow | 其中一半是给后端跑的 | CI 噪音 |
| 53 个平台集成模板（Cherry Studio/Cursor/Claude Desktop…）| 每个客户端字段不一样，53 份配置 | 维护噩梦 + 用户选择困难 |

### 1.2 重构后用户得到什么

| 之前 | 之后 |
|---|---|
| 在 Vercel/容器上跑 | **GH Pages 免费**（单源） |
| 实时数据（不必要） | **每日 sync 一次 commit**（够用）|
| 收藏/评论在后端 | **localStorage**（用户数据归用户）|
| Agent 调 API | **直接 fetch `servers-index.json`**（更简单）|
| 53 份平台配置自己挑 | **一份通用配置全平台通**（核心价值）|
| 演示 ≠ 产品 | **Pages 就是产品** |

---

## 2. 目标产品定位

**一句话**：MCP 服务器的 **"通用适配器平台"**——上游索引 + 我们自营的通用适配 + 添加更多适配的入口。

### 2.1 三层结构

```
┌──────────────────────────────────────────────────────────────┐
│                    MCP-HUB（GH Pages 静态站）                  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 第 1 层：上游目录（索引 4451 个）                       │  │
│  │  - 浏览 / 搜索 / 分类 / 排序 / 筛选                    │  │
│  │  - 详情：原始仓库链接 + 原始安装命令                    │  │
│  │  - 状态：未适配                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                            ▲                                 │
│                            │ 我们挑选                         │
│                            ▼                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 第 2 层：我们的通用适配器（核心价值）⭐                  │  │
│  │  - 我们下载并改造过的 MCP 工具                          │  │
│  │  - 一次安装 = 全平台通用（Claude/Cursor/Cline/...）     │  │
│  │  - 我们的扩展功能、bug 修复、统一文档                   │  │
│  │  - 状态：✅ 已适配 ✅ 已测试                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                            ▲                                 │
│                            │ 社区贡献                         │
│                            ▼                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 第 3 层：更多（admin 入口）                             │  │
│  │  - 添加新的适配器（提交 PR / 表单）                     │  │
│  │  - 查看适配器状态、数据同步状态                         │  │
│  │  - 当前为空，未来填充                                  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 用户价值主张

- **找 MCP 服务器**：去第 1 层，搜 4451 个
- **用起来省事**：去第 2 层，复制我们的通用配置，粘到任意客户端
- **想贡献新适配器**：去第 3 层

### 2.3 不是

- ❌ 不是 MCP 协议代理（不是 client/host）
- ❌ 不是服务器运行平台
- ❌ 不是用户数据后端
- ❌ **不是 53 份平台配置**——我们做的是"一份搞定全部"

---

## 3. 推荐打分算法

**多因子加权（0-100）**：
```
score = 100 × (
    0.30 × norm_log(stars, base=log(1+10000))   # 社区认可
  + 0.15 × recency_decay(updated_at, half_life_days=30)  # 新鲜度
  + 0.15 × lang_coverage(language)              # 语言字段（100% 覆盖 = 1.0）
  + 0.20 × desc_quality(description, min_chars=200)  # 描述完整度
  + 0.20 × our_signal(server)                   # 我们的信号 ⭐ 最重要
)
```

### 3.1 `our_signal` 分四档

| 状态 | 分数 | 含义 | 视觉 |
|---|---|---|---|
| ✅ 适配 + 测试通过 | 1.0 | 进"我们的工具"板块，首页置顶 | 绿色徽章 |
| ⚙️ 适配中 | 0.7 | 进度条可见 | 蓝色徽章 |
| 👀 调研过 | 0.4 | 看过但没动手 | 灰色徽章 |
| 🆕 未处理 | 0.0 | 上游原样收录 | 无徽章 |

### 3.2 首页 6 个分区

| 分区 | 数据源 | 排序 |
|---|---|---|
| 🏆 **精选** | 全部 | score 倒序 top 10 |
| 🛠 **我们的工具** | our_signal ≥ 0.7 | score 倒序 |
| 🔥 **热门** | 全部 | stars 倒序 top 20 |
| 🆕 **新上架** | 全部 | updated_at 7 天内，按 stars 倒序 |
| 📂 **分类浏览** | 全部 | 21 个分类入口 |
| 🔍 **搜索** | 全部 | name + description + topics 全文匹配 |

### 3.3 详情页评分可视化

每个 server 详情页显示：分数、5 个子分数（雷达图）、徽章、所属分区。

---

## 4. 阶段划分（执行顺序）

```
Phase 5 ─► Phase 6 ─► Phase 7 ─► Phase 8 ─► Phase 9
数据管道        后端下线       前端产品化    收尾       首对适配器
(1-2天)         (2-3天)        (3-5天)      (1天)      (1-2天)
   │              │              │            │          │
   └ 含打分算法   └ 100% 删后端   └ 三层 UI     └ 文档      └ 跑通 pipeline
                                                    + v3.0.0 tag
```

每个 Phase 结束都要求：本地能 build、能跑测试、`git commit` 干净。

---

## 5. Phase 5：数据管道 + 打分算法（1-2 天）

**目标**：让 `servers-index.json` 从"运行时拉取"变成"构建期产物"，并把 `install_hint` + `score` + `our_signal` 字段算好。

### 5.1 改动文件

| 文件 | 改动 |
|---|---|
| `tools/sync_index.py` | **强化**：输出从根目录写到 `frontend/public/servers-index.json`（原来写根目录） |
| `tools/gen_static_data.py` | **新增**：把 `servers-index.json` + 评分 + `install_hint` + `our_signal` 合成为前端消费的 `frontend/public/servers-index.json` |
| `tools/completeness_scoring.py` | **强化**：把 5 因子打分合并进 index |
| `tools/_install_hint.py` | **新增**：根据 language + source 算 install 命令（`uvx X` / `npx -y X` / `pip install X` / `git clone` / `docker pull`），抽取成单测友好函数 |
| `tools/_our_signal.py` | **新增**：从 `frontend/public/adapters/` 目录扫描我们已做的适配器，生成 `our_signal` 字段 |
| `frontend/public/adapters/.gitkeep` | **新增**：第 2 层目录骨架（先空着，Phase 9 填） |
| `.github/workflows/sync-data.yml` | **新增**：每日 cron 跑 `sync_index.py` → `gen_static_data.py` → 自动 commit `frontend/public/servers-index.json` |
| `tests/test_install_hint.py` | **新增**：覆盖 `_install_hint()` 5 种语言分支 |
| `tests/test_scoring.py` | **新增**：覆盖 `_scoring()` 5 个因子 + 边界 |

### 5.2 产出物结构

`frontend/public/servers-index.json`（约 4 MB）：
```json
{
  "snapshot_date": "2026-06-11T00:00:00Z",
  "total_servers": 4451,
  "total_categories": 21,
  "our_tools_count": 0,
  "servers": [
    {
      "name": "fastmcp",
      "full_name": "jlowin/fastmcp",
      "owner": "jlowin",
      "description": "A Python framework for building MCP servers",
      "source": "https://github.com/jlowin/fastmcp",
      "language": "python",
      "stars": 12300,
      "topics": [...],
      "license": "MIT",
      "updated_at": "2026-06-10",
      "install_hint": {
        "primary": "uvx fastmcp",
        "alternatives": {
          "pip": "pip install fastmcp",
          "git": "git clone https://github.com/jlowin/fastmcp.git",
          "docker": null
        },
        "zip_url": "https://github.com/jlowin/fastmcp/archive/refs/heads/main.zip"
      },
      "score": 87,
      "score_breakdown": {
        "stars": 0.85,
        "recency": 0.95,
        "lang_coverage": 1.0,
        "desc_quality": 0.7,
        "our_signal": 0.0
      },
      "our_signal": 0.0,
      "our_signal_label": "未处理"
    },
    ...
  ],
  "categories": {...}
}
```

### 5.3 验证命令

```bash
python3 tools/sync_index.py
python3 tools/gen_static_data.py
ls -lh frontend/public/servers-index.json   # 应该 ~4MB
python3 -m pytest tests/ -v
# 期望：test_install_hint.py / test_scoring.py 全过
```

### 5.4 提交策略

一个 commit：
```
feat(data): generate static servers-index.json with scoring + install_hint

- New tools/gen_static_data.py pipeline (sync → score → install_hint)
- tools/sync_index.py writes to frontend/public/ instead of repo root
- New tools/_install_hint.py: uvx/npx/pip/git/docker per language
- New tools/_our_signal.py: scans adapters/ dir for our signal (0/0.4/0.7/1.0)
- New tools/completeness_scoring.py: 5-factor score (0-100)
- Add tests/test_install_hint.py + tests/test_scoring.py
- .github/workflows/sync-data.yml: daily cron rebuilds the JSON
```

---

## 6. Phase 6：后端 100% 删除（2-3 天）

**目标**：删 main.py / services.py / query.py / user_data.py / core/ / 后端 tests / Dockerfile / docker-compose。**不保留 main.py，不做 feature flag 软下线**——按用户要求"直接全删"。

### 6.1 改动文件

| 文件 | 改动 |
|---|---|
| `frontend/src/lib/api.ts` | **重写**：把 `fetch('http://...')` 全删，改成 `import data from '../../public/servers-index.json'`（或动态 `fetch('/servers-index.json')` 走 public/ 静态） |
| `frontend/src/store/*` | **重写**：Zustand store 改成读本地 JSON，favorites/ratings 写 localStorage |
| `main.py` | **🗑️ 删** |
| `services.py` | **🗑️ 删** |
| `query.py` | **🗑️ 删** |
| `user_data.py` | **🗑️ 删** |
| `core/` | **🗑️ 删** |
| `tests/test_api.py` | **🗑️ 删**（已在上一轮删） |
| `tests/test_fastapi.py` | **🗑️ 删** |
| `tests/test_config_builder.py` | **🗑️ 删** |
| `tests/test_install_hint.py` | **保留**（在前端 test 阶段迁到 `frontend/src/test/`） |
| `tests/test_scoring.py` | **保留** |
| `pytest.ini` | **🗑️ 删** |
| `requirements.txt` | **🗑️ 删** |
| `pyproject.toml` | **简化**：删 `[project]` / `[project.optional-dependencies]` / `[tool.setuptools.packages.find]` / `[tool.pytest.ini_options]`，**只保留 `[tool.ruff]` 等轻量配置**；最终整文件可删 |
| `Dockerfile` | **🗑️ 删** |
| `docker-compose.yml` | **🗑️ 删** |
| `docker-entrypoint.sh` | **🗑️ 删** |
| `.dockerignore` | **🗑️ 删** |
| `api.py` | **已删**（上一轮）|
| `.github/workflows/ci.yml` | **简化**：去掉 Python job，只留前端 lint + test + build |
| `.github/workflows/docker.yml` | **🗑️ 删** |
| `.github/workflows/codeql.yml` | **🗑️ 删** |
| `.github/workflows/scorecard.yml` | **🗑️ 删** |
| `.github/workflows/lychee.yml` | **🗑️ 删** |
| `.github/workflows/stale.yml` | **保留** |
| `.github/workflows/gitleaks.yml` | **保留** |
| `.github/workflows/dependabot.yml` | **保留** |
| `.github/workflows/dependabot-merge.yml` | **保留** |
| `.github/workflows/sync-data.yml` | **新增**（Phase 5 加） |
| `.github/workflows/deploy-pages.yml` | **新增**（Phase 7 加） |
| `servers/dify/`、`servers/gemini-cli/`、`servers/memory/`、`servers/filesystem/` | **🗑️ 删**（6GB+ 死重）|
| `servers/` | **🗑️ 删**（清空）|
| `__pycache__/`、`mcp_hub.egg-info/`、`.pytest_cache/` | **🗑️ 删** |
| `comprehensive_mcp_projects.json` (65KB) | **🗑️ 删**（被 sync_index.py 取代）|
| `notable_projects.json` (17KB) | **🗑️ 删**（被 sync_index.py 取代）|
| `server_registry.json` (53KB) | **🗑️ 删**（被 sync_index.py 取代）|
| `templates/`（53 个 JSON）| **🗑️ 删**（被通用配置生成器取代）|
| `docs/` | 删 1 个（`docs/FASTAPI_SETUP.md` 如果有）|
| `CHANGELOG.md` | **加 Refactor section** |
| `README.md` | **重写**：定位改成"通用适配器平台"，三层结构 |
| `README_CN.md` | **重写** |
| `AGENTS.md` | **重写** |
| `docs/ARCHITECTURE.md` | **重写** |
| `docs/API.md` | **重写** |
| `docs/DEVELOPMENT.md` | **重写** |
| `docs/QUICKSTART.md` | **简化** |
| `package.json`（根）| **重写** |
| `Makefile` | **简化** |

### 6.2 验证命令

```bash
# 数据能加载
ls frontend/public/servers-index.json
python3 -c "import json; d=json.load(open('frontend/public/servers-index.json')); print(d['total_servers'])"

# 后端代码确实没了
find . -name "*.py" -not -path "*/node_modules/*" -not -path "*/tools/*"
# 期望：只剩 tools/ 下的 sync_index.py / gen_static_data.py / completeness_scoring.py / _install_hint.py / _our_signal.py

# 53 个 templates 没了
ls templates/ 2>&1
# 期望：No such file or directory

# servers/ 没了
ls servers/ 2>&1
# 期望：No such file or directory

# 前端 build + test 仍然全绿
cd frontend && npm run lint && npm run check && npm test && npm run build
```

### 6.3 提交策略

3 个 commit：
```
1. refactor(frontend): switch from API fetch to local JSON import
2. chore(deps): remove FastAPI/uvicorn/pydantic-stack from pyproject.toml
3. remove(backend): delete main.py / services.py / query.py / user_data.py
                     / core/ / tests/ / Dockerfile / docker-compose
                     / .dockerignore / docker-entrypoint.sh
                     / .github/workflows/{docker,codeql,scorecard,lychee}.yml
                     / servers/{dify,gemini-cli,memory,filesystem}
                     / pytest.ini / requirements.txt / api.py
                     / templates/ / 3 份旧 JSON 索引
   Total: -6 GB
```

---

## 7. Phase 7：前端产品化（3-5 天）

**目标**：把 GH Pages 演示版升级成正式产品，部署到 GH Pages 当唯一发布渠道。三层 UI + 通用配置生成器。

### 7.1 改动文件

| 文件 | 改动 |
|---|---|
| `frontend/src/pages/Home.tsx` | **重写**：6 个分区（精选/我们的工具/热门/新上架/分类/搜索）|
| `frontend/src/pages/Browse.tsx` | **新增**：分类浏览（21 个分类）|
| `frontend/src/pages/OurTools.tsx` | **新增**：第 2 层专属页——只展示 our_signal ≥ 0.7 的 |
| `frontend/src/pages/More.tsx` | **新增**：第 3 层 admin 入口——添加适配器表单 + 数据同步状态 |
| `frontend/src/pages/ServerDetail.tsx` | **重写**：3 个 Copy 按钮 + Open GitHub + Download ZIP + 通用配置（如果有适配）|
| `frontend/src/pages/SubmitServer.tsx` | **🗑️ 删**（被 More.tsx 取代）|
| `frontend/src/pages/Favorites.tsx` | **简化**：纯 localStorage，不再调后端 |
| `frontend/src/pages/About.tsx` | **改文案** |
| `frontend/src/components/server/InstallPanel.tsx` | **新增**：核心 UI 组件——3 个 Copy + Open + Download |
| `frontend/src/components/server/UniversalConfig.tsx` | **新增**：渲染 `config_universal` JSON 块 + 一键复制 |
| `frontend/src/components/server/ScoreRadar.tsx` | **新增**：5 因子雷达图 |
| `frontend/src/components/server/OurSignalBadge.tsx` | **新增**：4 档徽章（未处理/调研/适配中/已适配）|
| `frontend/src/components/integrations/TemplateCard.tsx` | **🗑️ 删**（不再有 53 份模板）|
| `frontend/src/components/shared/CopyButton.tsx` | **新增**：通用复制按钮 |
| `frontend/src/lib/localStorage.ts` | **新增**：favorites/ratings 的 localStorage 封装 |
| `frontend/src/lib/universalConfig.ts` | **新增**：根据 clientType（claude/cursor/cline/...）生成对应格式的适配器 |
| `frontend/src/lib/scoring.ts` | **新增**：前端实时算分（与服务端字段对账） |
| `frontend/src/components/layout/Navbar.tsx` | **重写**：4 个菜单（首页 / 浏览 / 我们的工具 / 更多）|
| `frontend/src/components/layout/Footer.tsx` | **改文案** |
| `frontend/src/components/layout/StaticDemoBanner.tsx` | **🗑️ 删**（不再有"演示版"概念）|
| `frontend/src/test/test_install_hint.py` → `frontend/src/test/scoring.test.ts` | **迁移**：把 Python 测试转 TS（vitest）|
| `frontend/src/test/scoring.test.ts` | **新增** |
| `frontend/src/test/installHint.test.ts` | **新增** |
| `frontend/src/test/universalConfig.test.ts` | **新增** |
| `.github/workflows/deploy-pages.yml` | **新增**：`on: push: branches: [main]` → `npm ci && npm run build → actions/deploy-pages@v4` |

### 7.2 关键 UI 设计

**Home 页（6 分区）**：
```
┌──────────────────────────────────────────────┐
│  [搜索框]   筛选: 全部语言▾  全部状态▾        │
├──────────────────────────────────────────────┤
│ 🏆 精选 (top 10)                             │
│  [Card] [Card] [Card] [Card] [Card]          │
├──────────────────────────────────────────────┤
│ 🛠 我们的工具 (0/4451，先空着)                │
│  (Phase 9 填)                                 │
├──────────────────────────────────────────────┤
│ 🔥 热门 (stars top 20)                       │
│  [Card] [Card] ...                           │
├──────────────────────────────────────────────┤
│ 🆕 新上架 (7 天内)                            │
│  [Card] [Card] ...                           │
├──────────────────────────────────────────────┤
│ 📂 分类浏览 (21 个)                           │
│  AI/LLM (4440) · 开发 (3239) · ...           │
└──────────────────────────────────────────────┘
```

**ServerDetail 页（带通用配置）**：
```
┌──────────────────────────────────────────────┐
│  fastmcp                                    │
│  🏆 87分 | 🆕 未处理 | 🐍 Python             │
│  [雷达图：5 因子]                              │
├──────────────────────────────────────────────┤
│  📦 Install (Python)        [Copy]           │
│  uvx fastmcp                                 │
│                                              │
│  🚀 Run with npx            [Copy]           │
│  npx -y fastmcp                              │
│                                              │
│  🐙 View on GitHub          [Open ↗]         │
│  github.com/jlowin/fastmcp                   │
│                                              │
│  📥 Download source ZIP                      │
│  (GitHub codeload, ~2.1 MB)                  │
│                                              │
│  ⭐ Favorite（localStorage）                  │
├──────────────────────────────────────────────┤
│  🛠 我们的通用适配（if our_signal ≥ 0.7）     │
│  ┌────────────────────────────────────────┐  │
│  │ Universal Config         [Copy]         │  │
│  │ { "mcpServers": { "fastmcp": {...} }}  │  │
│  │ ✅ Tested: Claude/Cursor/Cline/Windsurf│  │
│  │ 📦 Install: curl -fsSL ... | sh        │  │
│  │ 📝 Our extensions: ...                  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**OurTools 页**（空状态 + 未来填充）：
```
┌──────────────────────────────────────────────┐
│  🛠 我们的工具                                │
│  我们下载并改造过的 MCP 服务器，一次安装全平台 │
├──────────────────────────────────────────────┤
│  (空状态)                                     │
│  ┌────────────────────────────────────────┐  │
│  │ 还没有适配器。                          │  │
│  │ 我们正在挑选第一个上游 MCP 服务器做适配。│  │
│  │ 想推荐？去 [更多] 页面提 PR。            │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**More 页**（admin 入口）：
```
┌──────────────────────────────────────────────┐
│  ➕ 更多                                      │
├──────────────────────────────────────────────┤
│  📊 数据状态                                  │
│  - 快照时间：2026-06-11                       │
│  - 服务器数：4451                            │
│  - 我们的工具：0                             │
│  - 同步状态：✅ 正常                          │
├──────────────────────────────────────────────┤
│  🛠 添加新适配器                              │
│  - 方式 1：PR（推荐）                        │
│    在 frontend/public/adapters/{name}/        │
│    创建 adapter.json + install.sh + tests/    │
│  - 方式 2：表单（暂未启用）                   │
│  📖 [适配器规范文档]                          │
└──────────────────────────────────────────────┘
```

### 7.3 通用配置生成器（核心）

`frontend/src/lib/universalConfig.ts`：
```typescript
// 输入：上游 server 对象 + 我们已做的 adapter
// 输出：单份 JSON 配置，全平台通用
export function buildUniversalConfig(
  server: ServerRecord,
  adapter?: AdapterManifest
): { mcpServers: Record<string, McpServerEntry> } {
  const command = adapter?.install_universal ?? server.install_hint.primary
  return {
    mcpServers: {
      [server.name]: { command: command.split(' ')[0], args: command.split(' ').slice(1) }
    }
  }
}
```

### 7.4 验证命令

```bash
cd frontend
npm run dev   # 本地起服务，手动测：
# - 打开 http://localhost:5173
# - 看 Home 6 个分区是否正确
# - 进 OurTools 看空状态
# - 进 More 看数据状态
# - 任意 server 详情页：3 个 Copy 按钮 + Open + Download
npm run build
ls dist/   # 应该有 index.html + assets/ + servers-index.json
```

### 7.5 提交策略

2-3 个 commit：
```
1. feat(ui): 3-layer home + OurTools + More pages
2. feat(config): UniversalConfig + ScoreRadar + OurSignalBadge
3. ci(pages): add deploy-pages workflow
```

---

## 8. Phase 8：收尾（1 天）

| 任务 | 说明 |
|---|---|
| 删 `servers-index.json`（根目录的，已 gitignored 但有缓存）| 反正前端走 `public/` 下的 |
| 更新所有文档（README / API.md / ARCHITECTURE.md / DEVELOPMENT.md）| 反映新架构 |
| `CHANGELOG.md` 写 v3.0.0 的 Removed/Changed 清单 | 给老用户看 |
| 在仓库描述、About 页、GH Pages 主页加显眼"Data updates daily"的徽章 | 让用户知道数据是快照不是实时 |
| 在 OurTools 空状态说明"首批适配器即将推出" | 引导期望 |
| `git tag v3.0.0` | 标记架构转折 |
| 跑完整验证：`npm test` + `npm run build` + `python3 tools/secret_scanner.py` | 全绿 |

---

## 9. Phase 9：首批适配器（1-2 天，可选）

**目标**：证明 pipeline 跑通。选 1-2 个上游 MCP 服务器做通用适配。

| 候选 | 理由 |
|---|---|
| `jlowin/fastmcp` | Python，最流行（12k stars）|
| `modelcontextprotocol/server-git` | 官方，Node.js，覆盖两种语言 |
| `microsoft/playwright-mcp` | 微软官方，质量有保障 |

每个适配器需要产出：
- `frontend/public/adapters/{name}/adapter.json`（元信息 + universal config）
- `frontend/public/adapters/{name}/install.sh`（一行命令装好）
- `frontend/public/adapters/{name}/README.md`（改造说明）
- `frontend/public/adapters/{name}/tests/`（自动测试结果）

提交策略：每个适配器 1 个 commit（同名分支，便于 review）。

---

## 10. 回滚策略

每个 Phase 都是独立 commit，逐阶段可回滚：

| 阶段 | 回滚命令 | 数据损失 |
|---|---|---|
| Phase 9 | `git revert v3.1.0` | 适配器改动 |
| Phase 8 | `git revert v3.0.0` | 文档改动 |
| Phase 7 | `git reset --hard phase6-end` | UI 改动 |
| Phase 6 | 复杂：从 git reflog 恢复 main.py 旧版本 | 老功能回归 |
| Phase 5 | 简单：删 `frontend/public/servers-index.json` | 无 |

**对比原计划的"功能开关"方案**：用户明确要求"100% 删后端"，所以本次**不保留 main.py 作为兜底**。如果上线后出问题，回滚用 git revert。

---

## 11. 风险与对应预案

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| localStorage 容量不够（5-10MB 限制）| 低 | favorites 丢失 | 增量 export / 鼓励浏览器扩展 |
| 4451 servers 详情页首次加载慢 | 中 | 用户体验差 | 路由级 code splitting + `servers-index.json` 走浏览器缓存 |
| 每日 sync 漏跑 | 中 | 数据过期 | workflow `if: failure()` 通知；额外 `workflow_dispatch` 手动触发 |
| GitHub Pages 100MB 软限制 | 低 | 站点无法发布 | 当前 `frontend/public/servers-index.json` ~4MB，离 100MB 远 |
| 用户误以为有"实时"评论 | 中 | 期望管理 | About 页明确写"评论仅本地浏览器" |
| Agent 直接 fetch JSON 不走 API | 极可能 | 不算风险，是收益 | README 显式给 `curl https://.../servers-index.json` 例子 |
| 通用配置不一定真"全平台通用" | 中 | 用户粘到客户端报错 | adapter.json 里写明已测过的平台列表 |
| 首批适配器维护成本 | 中 | 我们跟不上 | 第 9 阶段先只做 1-2 个，跑通流程即可 |

---

## 12. 实施期约定

- **每个 Phase 结束都 commit**，不积攒
- **每个 Phase 结束都跑全量验证**（lint + test + build + secret scan）
- **每个 Phase 结束都不 push**，等用户确认
- **不引新依赖**（除非确有必要，PR 时说明）
- **不删 `servers-index.json` 之外的任何 gitignore 文件**（保留兜底）

---

## 13. 完成定义（Definition of Done）

### 后端 100% 删除
- [ ] `main.py` `services.py` `query.py` `user_data.py` `core/` `api.py` `Dockerfile` `docker-compose.yml` `docker-entrypoint.sh` `.dockerignore` `pytest.ini` `requirements.txt` **全部删除**
- [ ] 5 个 Python 依赖（fastapi / uvicorn / pydantic / httpx / starlette）**全部从 `pyproject.toml` 移除**

### 死重删除
- [ ] `servers/dify/` `servers/gemini-cli/` `servers/memory/` `servers/filesystem/` 全部删除（6GB+）
- [ ] `templates/`（53 个）全部删除
- [ ] `comprehensive_mcp_projects.json` `notable_projects.json` `server_registry.json` 全部删除

### 三层 UI
- [ ] Home 页 6 个分区（精选/我们的工具/热门/新上架/分类/搜索）正常
- [ ] OurTools 页存在，空状态文案到位
- [ ] More 页存在，数据显示同步状态

### 数据管道
- [ ] `frontend/public/servers-index.json` 含 `score` + `score_breakdown` + `our_signal` + `our_signal_label` 字段
- [ ] 推荐打分 5 因子在 `tools/completeness_scoring.py` 实现
- [ ] `our_signal` 由 `tools/_our_signal.py` 扫描 `adapters/` 目录生成

### 部署
- [ ] `.github/workflows/` 只剩 6 个：ci.yml / sync-data.yml / deploy-pages.yml / stale.yml / gitleaks.yml / dependabot.yml
- [ ] 部署到 GH Pages，公开 URL 正常访问
- [ ] README 第一行就是"通用适配器平台：上游索引 + 我们自营的通用适配 + 添加更多适配的入口"

### 文档
- [ ] CHANGELOG 有 `[3.0.0] - 2026-06-XX` 章节，记录 Removed 全部清单
- [ ] `git tag v3.0.0` 打上

---

**总预计**：8-13 天（含 Phase 9）。
**开始条件**：见 §13 末尾的"等你拍板"。

# MCP-HUB 重构计划书：纯静态前端化

> **状态**：待用户确认后开始执行。
> **触发**：用户已认可"项目无法支撑起、后端不该有、纯静态前端是正确方向"。
> **前置**：上一轮质量审计（`QUALITY_AUDIT_PLAN.md`）已 commit 在 `86a3143`，仓库处于"可推荐"状态。
> **目标**：把项目从 "FastAPI 后端 + 双部署" 简化成 "纯静态前端 + GH Pages 部署"。

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

### 1.2 重构后用户得到什么

| 之前 | 之后 |
|---|---|
| 在 Vercel/容器上跑 | **GH Pages 免费**（单源） |
| 实时数据（不必要） | **每日 sync 一次 commit**（够用） |
| 收藏/评论在后端 | **localStorage**（用户数据归用户） |
| Agent 调 API | **直接 fetch `servers-index.json`**（更简单） |
| 演示 ≠ 产品 | **Pages 就是产品** |

---

## 2. 目标产品定位

**一句话**：MCP 服务器的"**命令行/源码调度页**"。

**用户行为**：
- 打开页面 → 搜索/分类浏览 4451 个 MCP 服务器
- 看到一个 server → 看到 4 个动作：
  1. **Copy install command**（`uvx X` / `npx -y X` / `pip install X` / `git clone ...` / `docker pull ...`）
  2. **Open on GitHub**（跳上游仓库）
  3. **Download ZIP**（跳 GitHub codeload）
  4. **Download integration template**（Cherry Studio / Cursor / Claude Desktop 的 JSON 配置）
- 收藏/评分：localStorage 存，纯本地

**不是**：
- ❌ 不是 MCP 协议代理（不是 client/host）
- ❌ 不是服务器运行平台
- ❌ 不是用户数据后端

---

## 3. 阶段划分（执行顺序）

```
Phase 5 ─► Phase 6 ─► Phase 7 ─► Phase 8
数据管道        后端下线       前端产品化    收尾
(1-2天)         (2-3天)        (3-5天)      (1天)
```

每个阶段结束都要求：本地能 build、能跑测试、`git commit` 干净。

---

## 4. Phase 5：数据管道收尾（1-2 天）

**目标**：让 `servers-index.json` 从"运行时拉取"变成"构建期产物"，并把 `install_hint` 字段算好。

### 4.1 改动文件

| 文件 | 改动 |
|---|---|
| `tools/sync_index.py` | **强化**：输出从根目录写到 `frontend/public/servers-index.json`（原来写根目录） |
| `tools/gen_static_data.py` | **新增**：把 `servers-index.json` + 评分 + `install_hint` 合成为前端消费的 `frontend/public/servers-index.json` |
| `tools/completeness_scoring.py` | **保留**：构建期跑，评分合并进 index |
| `tools/_install_hint.py` | **新增**：根据 language + source 算 install 命令（`uvx X` / `npx -y X` / `pip install X` / `git clone` / `docker pull`），抽取成单测友好函数 |
| `.github/workflows/sync-data.yml` | **新增**：每日 cron 跑 `sync_index.py` → `gen_static_data.py` → 自动 commit `frontend/public/servers-index.json` |
| `tests/test_install_hint.py` | **新增**：覆盖 `_install_hint()` 5 种语言分支 |

### 4.2 产出物结构

`frontend/public/servers-index.json`（约 4 MB）：
```json
{
  "snapshot_date": "2026-06-11T00:00:00Z",
  "total_servers": 4451,
  "total_categories": 21,
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
      "quality_score": 0.87
    },
    ...
  ],
  "categories": {...}
}
```

### 4.3 验证命令

```bash
python3 tools/sync_index.py
python3 tools/gen_static_data.py
ls -lh frontend/public/servers-index.json   # 应该 ~4MB
python3 -m pytest tests/test_install_hint.py -v
```

### 4.4 提交策略

一个 commit：
```
feat(data): generate static servers-index.json with install_hint

- New tools/gen_static_data.py pipeline (sync → score → enrich)
- tools/sync_index.py writes to frontend/public/ instead of repo root
- New tools/_install_hint.py computes per-server install commands
  (uvx for Python, npx -y for JS/TS, repo name for Go/Rust,
   git clone fallback, docker pull when source points to ghcr.io)
- Add tests/test_install_hint.py covering all 5 language branches
- .github/workflows/sync-data.yml: daily cron rebuilds the JSON
  and auto-commits it (no manual sync needed)
```

---

## 5. Phase 6：后端下线（2-3 天）

**目标**：删 main.py / services.py / query.py / user_data.py / core/ / 后端 tests；前端改 import 静态 JSON。

### 5.1 改动文件

| 文件 | 改动 |
|---|---|
| `frontend/src/lib/api.ts` | **重写**：把 `fetch('http://...')` 全删，改成 `import data from '../../public/servers-index.json'`（或动态 `fetch('/servers-index.json')` 走 public/ 静态） |
| `frontend/src/store/*` | **重写**：Zustand store 改成读本地 JSON，favorites/ratings 写 localStorage |
| `frontend/src/components/server/InstallPanel.tsx` | **新增**：用 `install_hint` 字段渲染 3 个 Copy 按钮 + Open GitHub + Download ZIP |
| `frontend/src/components/server/Comments.tsx` | **改写**：从 user_data 后端 API 改成 localStorage 数组（key=`mcp-hub:comments:{serverName}`）|
| `main.py` | **🗑️ 删** |
| `services.py` | **🗑️ 删** |
| `query.py` | **🗑️ 删** |
| `user_data.py` | **🗑️ 删** |
| `core/` | **🗑️ 删** |
| `tests/test_api.py` | **🗑️ 删**（已在上一轮删） |
| `tests/test_fastapi.py` | **🗑️ 删** |
| `tests/test_config_builder.py` | **🗑️ 删**（helper 不再需要）|
| `tests/test_install_hint.py` | **保留**（随 Phase 5 一起迁来）|
| `pytest.ini` | **🗑️ 删**（没后端测试了）|
| `requirements.txt` | **🗑️ 删** |
| `pyproject.toml` | **简化**：删 `[project]` / `[project.optional-dependencies]` / `[tool.setuptools.packages.find]`，**只保留 `[tool.pytest.ini_options]` 给遗留用，最终也删** |
| `Dockerfile` | **🗑️ 删** |
| `docker-compose.yml` | **🗑️ 删** |
| `docker-entrypoint.sh` | **🗑️ 删**（上一轮新增的，这次一并删）|
| `.dockerignore` | **🗑️ 删** |
| `api.py` | **已删**（上一轮）|
| `.github/workflows/ci.yml` | **简化**：去掉 Python job，只留前端 lint + test + build |
| `.github/workflows/docker.yml` | **🗑️ 删** |
| `.github/workflows/codeql.yml` | **🗑️ 删**（前端 CodeQL 不如 secret scan 重要）|
| `.github/workflows/scorecard.yml` | **🗑️ 删**（减少 CI 噪音）|
| `.github/workflows/lychee.yml` | **🗑️ 删** |
| `.github/workflows/stale.yml` | **保留**（仍然有用）|
| `.github/workflows/gitleaks.yml` | **保留**（关键安全工具）|
| `.github/workflows/dependabot.yml` | **保留**（依赖更新）|
| `.github/workflows/dependabot-merge.yml` | **保留** |
| `.github/workflows/sync-data.yml` | **新增**（Phase 5 一起加）|
| `.github/workflows/deploy-pages.yml` | **新增**（Phase 7 一起加）|
| `servers/dify/`、`servers/gemini-cli/`、`servers/memory/`、`servers/filesystem/` | **🗑️ 删**（6GB+ 死重）|
| `servers/` | **🗑️ 删**（清空）|
| `__pycache__/`、`mcp_hub.egg-info/`、`.pytest_cache/` | **🗑️ 删**（构建残留）|
| `CHANGELOG.md` | **加 Refactor section**（Removed/Changed 全部列） |
| `README.md` | **重写**：定位改成"MCP 服务器的命令调度页"，删除"FastAPI backend"段落，加"如何贡献（数据/模板）"段落 |
| `README_CN.md` | **重写**：同上 |
| `AGENTS.md` | **重写**：去掉"main.py 是入口"等后端概念，加前端开发流程 |
| `docs/ARCHITECTURE.md` | **重写**：前端 SPA + 静态 JSON + localStorage 架构图 |
| `docs/API.md` | **重写**：从"38 个 REST 端点"改成"前端可直接消费的 JSON schema" |
| `docs/USER_GUIDE.md` | **保留**（核心内容仍适用）|
| `docs/QUICKSTART.md` | **简化**：从"克隆+装依赖+跑后端+跑前端"简化为"克隆+npm install+npm run dev" |
| `docs/DEVELOPMENT.md` | **重写**：去掉 Python 章节，加数据管道（sync → gen → commit）|
| `package.json`（根）| **重写**：从 pytest 编排改成 npm scripts 编排（`npm run sync-data`、`npm run dev`）|
| `Makefile` | **简化**：去掉 `make test`（后端），加 `make sync-data` |

### 5.2 验证命令

```bash
# 数据能加载
ls frontend/public/servers-index.json
python3 -c "import json; d=json.load(open('frontend/public/servers-index.json')); print(d['total_servers'])"

# 后端代码确实没了
find . -name "*.py" -not -path "*/node_modules/*" -not -path "*/tools/*"
# 期望：只剩 tools/ 下的 sync_index.py / gen_static_data.py / completeness_scoring.py / _install_hint.py

# 前端 build + test 仍然全绿
cd frontend && npm run lint && npm run check && npm test && npm run build
```

### 5.3 提交策略

3 个 commit（按依赖顺序）：
```
1. refactor(frontend): switch from API fetch to local JSON import
2. chore(deps): remove FastAPI/uvicorn/pydantic-stack from requirements.txt
3. remove(backend): delete main.py / services.py / query.py / user_data.py
                     / core/ / tests/ / Dockerfile / docker-compose
                     / .dockerignore / docker-entrypoint.sh
                     / .github/workflows/{docker,codeql,scorecard,lychee}.yml
                     / servers/{dify,gemini-cli,memory,filesystem}
                     / pytest.ini / requirements.txt / api.py
   Total: -6 GB
```

---

## 6. Phase 7：前端产品化（3-5 天）

**目标**：把 GH Pages 演示版升级成正式产品，部署到 GH Pages 当唯一发布渠道。

### 6.1 改动文件

| 文件 | 改动 |
|---|---|
| `frontend/src/pages/ServerDetail.tsx` | **重写**：3 个 Copy 按钮 + Open GitHub + Download ZIP + 53 个 template 卡片（替代原来的"fetch 配置"）|
| `frontend/src/components/server/InstallPanel.tsx` | **新增**（已在 Phase 6 起头）：核心 UI 组件 |
| `frontend/src/components/shared/CopyButton.tsx` | **新增**：通用复制按钮（`navigator.clipboard.writeText` + 复制成功提示）|
| `frontend/src/components/integrations/TemplateCard.tsx` | **新增**：单个 integration template 卡片（图标 + 名称 + "Download JSON"）|
| `frontend/src/lib/localStorage.ts` | **新增**：favorites/ratings/comments 的 localStorage 封装（带 type-safe 序列化）|
| `frontend/src/pages/SubmitServer.tsx` | **简化**：删后端提交，改为"fork repo + edit `data/submissions.json` + PR"说明页 |
| `frontend/src/pages/About.tsx` | **改文案**：定位说明从"数据黄页"改成"命令调度页" |
| `frontend/src/pages/Home.tsx` | **改文案**：同上 |
| `frontend/src/components/layout/Navbar.tsx` | **去掉**：GitHub 链接还在（指向仓库），但去掉"API"菜单项 |
| `templates/*.json`（53 个）| **搬到** `frontend/public/templates/`（让前端可直接 fetch 下载）|
| `tools/_install_hint.py` | **强化**：支持 53 个 integration 的模板映射（Cherry Studio / Cursor / Claude Desktop / Cline / Roo-Cline / Boltai / Continue / ...）|
| `.github/workflows/deploy-pages.yml` | **新增**：`on: push: branches: [main]` → `npm ci && npm run build → actions/deploy-pages@v4` |

### 6.2 关键 UI 设计（已画在 Round 4 报告中）

`ServerDetail` 页的"操作三件套"：
- 📦 Install (Python) [Copy] → `uvx fastmcp`
- 🚀 Run with npx [Copy] → `npx -y fastmcp`
- 🐙 View on GitHub [Open ↗] → github.com/jlowin/fastmcp
- 📥 Download source ZIP → github.com/.../archive/refs/heads/main.zip
- ⭐ Rate  💬 Comment  ❤️ Favorite（localStorage）
- 📂 Integrations: 53 个 template 卡片

### 6.3 验证命令

```bash
cd frontend
npm run dev   # 本地起服务，手动测：
# - 打开 http://localhost:5173
# - 进入任意 server 详情页
# - 测 3 个 Copy 按钮是否复制成功
# - 测 Open GitHub 是否开新标签
# - 测 Download ZIP 是否下载 zip
# - 测 favorite 后刷新是否还在
npm run build
# 检查 dist/ 是否有 index.html + assets/ + servers-index.json
```

### 6.4 提交策略

2-3 个 commit：
```
1. feat(ui): rewrite ServerDetail with InstallPanel + 53 integration templates
2. feat(storage): localStorage-based favorites / ratings / comments
3. ci(pages): add deploy-pages workflow (main → GH Pages)
```

---

## 7. Phase 8：收尾（1 天）

| 任务 | 说明 |
|---|---|
| 删 `servers-index.json`（根目录的，已 gitignored 但有缓存）| 反正前端走 `public/` 下的 |
| 更新所有文档（README / API.md / ARCHITECTURE.md / DEVELOPMENT.md）| 反映新架构 |
| `CHANGELOG.md` 写 v3.0.0 的 Removed/Changed 清单 | 给老用户看 |
| 在仓库描述、About 页、GH Pages 主页加显眼"Data updates daily"的徽章 | 让用户知道数据是快照不是实时 |
| `git tag v3.0.0` | 标记架构转折 |
| 跑完整验证：`pytest tests/test_install_hint.py`（如果还留着）+ `npm test` + `npm run build` + `python3 tools/secret_scanner.py` | 全绿 |

---

## 8. 回滚策略

每个 Phase 都是独立 commit，可以逐阶段回滚：

| 阶段 | 回滚命令 | 数据损失 |
|---|---|---|
| Phase 8 | `git revert v3.0.0` | 无 |
| Phase 7 | `git reset --hard 86a3143` | UI 改动 |
| Phase 6 | 复杂：后端代码已删，restore 旧 main.py 即可 | 无（数据还在前端 JSON）|
| Phase 5 | 简单：删 `frontend/public/servers-index.json`，根目录那份还活着 | 无 |

**最低风险切片**：把整个重构当成"功能开关"——保留 main.py 不删，在 `main.py` 顶部加 `MCP_HUB_STATIC_ONLY=1` 环境变量检测：
- 静态模式：后端 503，所有路由交给前端
- 动态模式：老行为
- 部署到 GH Pages 时设 `MCP_HUB_STATIC_ONLY=1`

这样上线后出 bug 可以秒切回老行为。

---

## 9. 风险与对应预案

| 风险 | 概率 | 影响 | 预案 |
|---|---|---|---|
| localStorage 容量不够（5-10MB 限制）| 低 | favorites/comments 丢失 | 增量 export / 鼓励浏览器扩展 |
| 4451 servers 详情页首次加载慢 | 中 | 用户体验差 | 路由级 code splitting + `servers-index.json` 走浏览器缓存 |
| 每日 sync 漏跑 | 中 | 数据过期 | `.github/workflows/sync-data.yml` 加 `if: failure()` 通知；额外 workflow_dispatch 手动触发 |
| GitHub Pages 100MB 软限制 | 低 | 站点无法发布 | 当前 `frontend/public/servers-index.json` ~4MB，templates ~1MB，离 100MB 远 |
| 用户误以为有"实时"评论 | 中 | 期望管理 | About 页明确写"评论仅本地浏览器" |
| Agent 直接 fetch JSON 不走 API | 极可能 | 不算风险，是收益 | README 显式给 `curl https://.../servers-index.json` 例子 |
| 53 个 template 维护成本 | 中 | 模板过期 | 模板就是 JSON 没代码逻辑，社区可 PR |

---

## 10. 实施期约定

- **每个 Phase 结束都 commit**，不积攒
- **每个 Phase 结束都跑全量验证**（lint + test + build + secret scan）
- **每个 Phase 结束都不 push**，等用户确认
- **不引新依赖**（除非确有必要，PR 时说明）
- **不删 `servers-index.json` 之外的任何 gitignore 文件**（保留兜底）

---

## 11. 完成定义（Definition of Done）

- [ ] `main.py` `services.py` `query.py` `user_data.py` `core/` `api.py` `Dockerfile` `docker-compose.yml` `docker-entrypoint.sh` `.dockerignore` `pytest.ini` `requirements.txt` `servers/dify/` `servers/gemini-cli/` `servers/memory/` `servers/filesystem/` **全部删除**
- [ ] 5 个 Python 依赖（fastapi / uvicorn / pydantic / httpx / starlette）**全部从 `pyproject.toml` 移除**
- [ ] 前端 `npm run build` 产出 `dist/index.html` + `dist/servers-index.json` + `dist/templates/*.json`
- [ ] `.github/workflows/` 只剩 5 个：ci.yml / sync-data.yml / deploy-pages.yml / stale.yml / gitleaks.yml / dependabot.yml
- [ ] 部署到 GH Pages，公开 URL 正常访问
- [ ] README 第一行就是"每日更新一次的 MCP 服务器命令调度页"
- [ ] CHANGELOG 有 `[3.0.0] - 2026-06-XX` 章节，记录 Removed 全部清单

---

**总预计**：8-12 天。
**开始条件**：用户确认本计划书。

# 更新日志

本项目的所有重要变更都会记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [3.0.0] - 2026-06-11

> **架构转向：纯静态 SPA，去后端。**
>
> FastAPI 后端（38 个 REST 接口、`core/`、`services.py`、`user_data.py`、`query.py`、GZip 与限流中间件、PyPI 控制台脚本）已全部下线。MCP Hub 现在是一个 Vite + React 19 的静态 SPA，直接部署到 GitHub Pages，用户数据存放在 `localStorage`。一条小 Python 数据管道（`tools/sync_index.py` → `tools/gen_static_data.py`）每天从上游拉取，生成单一的 `frontend/public/servers-index.json`（~4.4 MB，4,400+ 套服务器），SPA 启动时加载一次。
>
> 详见 [`REFACTOR_PLAN.md`](REFACTOR_PLAN.md)：5 阶段重构计划、5 因子打分公式、3 层产品模型（上游索引 → 我们的通用适配器 → "更多"标签页）。

### 新增
- **`tools/sync_index.py`** — 拉取上游 `awesome-mcp` 镜像，用 GitHub API 元信息（stars、语言、topics、`updated_at`、license）补全每个仓库，写入根目录的 `servers-index.json`。仅依赖标准库。
- **`tools/gen_static_data.py`** — 读取根索引，5 因子打分，每种语言生成 `install_hint`，扫描 `frontend/public/adapters/` 得出 `our_signal` 映射，写入 SPA 用的 `frontend/public/servers-index.json`。仅依赖标准库。
- **`tools/completeness_scoring.py`** — 5 因子打分：stars 30% + recency 15% + lang_coverage 15% + desc_quality 20% + our_signal 20% → 0-100。纯函数，测试完备。
- **`tools/_install_hint.py`** — 根据每台服务器的语言和源仓库推导主安装命令 + 4 种备选（`npx -y X` / `uvx X` / `pip install X` / `git clone …`）。Python → `uvx`；JS/TS → `npx -y`；Go/Rust → 克隆仓库。同时推导 `codeload.github.com` 的 zip 下载链接。
- **`tools/_our_signal.py`** — 遍历 `frontend/public/adapters/<name>/adapter.json`，返回 `our_signal` 映射（`✅ adapted=1.0` / `⚙️ in_progress=0.7` / `👀 researched=0.4`）。
- **`frontend/public/adapters/.gitkeep`** — 第二层（我们的通用适配器）骨架；首批适配器在 3.1.0。
- **`.github/workflows/sync-data.yml`** — 每天 04:00 UTC 跑 `sync_index.py` + `gen_static_data.py`，自动 commit 重新生成的 `servers-index.json` 到 `main`。
- **`tests/test_install_hint.py`** — 12 个测试，覆盖 5 种语言分支。
- **`tests/test_scoring.py`** — 21 个测试，锁定打分公式。
- **每日上游数据文件** — `frontend/public/servers-index.json`，作为静态资源下发。顶层结构为 `{ version, snapshot_date, generator, total_servers, total_categories, our_tools_count, categories, languages, source_types, servers[] }`。
- **通用适配器 schema** — `frontend/public/adapters/<name>/adapter.json`：`{ name, platforms: { "claude-desktop", "cursor", "cline", "windsurf" }, notes }`。每条 platform 是 `{ command, args }`，SPA 用一份适配器渲染出多客户端可粘贴的配置块。
- **`Server` 类型上 5 个构建期字段** — `install_hint`、`score`、`score_breakdown`、`our_signal`、`our_signal_label`。
- **`.github/workflows/ci.yml`** — 两个 job：`frontend`（type-check + Vite build）、`data-pipeline`（pytest）。
- **`frontend/.env.example`** — 精简为 `VITE_APP_NAME` / `VITE_APP_VERSION` / `VITE_BASE_PATH`；旧的 `VITE_API_URL` / `VITE_USE_STATIC_DATA` 全部移除。
- **`frontend/vite.config.ts`** — 移除 `/api → :8080` 开发代理。
- **`REFACTOR_PLAN.md`** — 5 阶段重构计划、3 层产品模型、打分公式、每个阶段的 commit 形态。

### 变更
- **`frontend/src/lib/api.ts`** — 重写。800 行的 `requestWithFallback` shim 和 `STATIC_BASE` 演示分支全部删除。`loadIndex()` 拉取唯一的 `servers-index.json`，模块级缓存，对外暴露相同的接口（`getServers`、`getServer`、`getPopularServers`、`getRecentServers`、`getCuratedServers`、`getServerConfig`、`exportServerMarkdown`、`exportBatchJson`、`exportBatchMarkdown` …）。所有过滤/排序都在内存里完成。
- **`frontend/src/types/index.ts`** — `Server` 增加 5 个构建期字段；`full_name`、`owner`、`topics`、`created_at`、`archived`、`license` 改为可选。
- **`Makefile`** — 重写 25+ 目标：`frontend`（开发）、`data` / `sync`（管道）、`test`（pytest）、`build` / `build-frontend` / `build-data`、`deploy`，外加 `clean` / `clean-py` / `clean-frontend`。删除 `make docker-up` / `make dev`（后端+前端一起）。
- **`pyproject.toml`** — 缩成 `[tool.black]` + `[tool.isort]`。`[project]` / `[project.optional-dependencies]` / `[project.scripts]` / `[tool.setuptools.packages.find]` / `[tool.pytest.ini_options]` 全部删除。
- **`.gitignore`** — 删除 `servers/` / `awesome-mcp-list/` 例外（上游镜像现在写到一个 4.4 MB 的 `servers-index.json`，不再 318 MB 克隆树）。
- **`.devcontainer/devcontainer.json`** — 镜像改为 `python:3.11-bullseye` + `devcontainers/features/node:1`；删除旧的 `features: ['docker-in-docker']`。
- **`.flake8`** — `servers/` 移出 `exclude`（目录已删除）。
- **`CODEOWNERS`** — 删除 `main.py / api.py / services.py / user_data.py / query.py / core/ / templates/` 行；保留 `/tools/`、`/frontend/`、`/.github/workflows/`、构建配置组。
- **`README.md`** / **`README_CN.md`** — 按 3 层产品模型重写。
- **`tools/secret_scanner.py`** + **`tools/pre-commit`** — 保留不变；现在是唯一的 Python 质量门禁。
- **`.github/workflows/ci.yml`** — secret-scan job 移到 `.github/workflows/gitleaks.yml`；后端 job 删除。
- **`frontend/src/test/setup.ts`** — 精简；`VITE_API_URL` / `VITE_USE_STATIC_DATA` 的 `import.meta.env` 占位不再需要。

### 删除
- **后端 100%** — `main.py`、`services.py`、`query.py`、`user_data.py`、`core/`、`api.py`。约 120 KB FastAPI 代码，加上对应的测试文件（`tests/test_config_builder.py`、`test_export.py`、`test_fastapi.py`、`test_core.py`、`test_downloader.py`、`test_query.py`、`test_secret_scanner.py`、`test_user_functions.py`、`conftest.py`）。
- **Docker 100%** — `Dockerfile`、`docker-compose.yml`、`docker-entrypoint.sh`、`.dockerignore`、`frontend/Dockerfile`、`frontend/.dockerignore`、`frontend/nginx.conf`。
- **上游参考子项目（318 MB 死重）** — `servers/dify` (181 MB)、`servers/gemini-cli` (132 MB)、`servers/memory` (2.5 MB)、`servers/filesystem` (2.5 MB)。**仓库体积：318 MB → 17 MB**。
- **逐服务器配置模板（50 个）** — `templates/*.json`。同样的 JSON 之前在 `frontend/public/static-data/config/*.json`，两份都删除；安装提示现在从语言/源仓库自动推导。
- **过时的 JSON 索引（3 个）** — `comprehensive_mcp_projects.json` (64 KB)、`notable_projects.json` (20 KB)、`server_registry.json` (56 KB)。
- **前端 `static-data/` 快照** — `frontend/public/static-data/{servers,stats,categories,companies,curated,featured-configs,index,popular,recent}.json` + `static-data/config/*.json` (320 KB)。
- **13 个死代码 CLI 工具** — `tools/auto_updater.py`、`batch_manager.py`、`bench.py`、`collect_domestic_companies.py`、`comprehensive_collector.py`、`download_manager.py`、`downloader.py`、`gen_api_docs.py`、`index_downloader.py`、`index_servers.py`、`notable_projects_navigator.py`、`server_health_checker.py`、`update_index.py`。
- **4 个过时 CI workflow** — `.github/workflows/docker.yml`、`codeql.yml`、`scorecard.yml`、`lychee.yml`。
- **5 个过时文档** — `docs/API.md`、`docs/API_CN.md`、`docs/BENCHMARKS.md`、`docs/internal/AGENT_GUIDE_CN.md`、`docs/internal/NOTABLE_PROJECTS_GUIDE.md`。
- **Python 打包元数据** — `pytest.ini`、`requirements.txt`、`mcp_hub.egg-info/`。
- **MSW mocks** — `frontend/src/test/mocks/handlers.ts`、`frontend/src/test/mocks/server.ts`。

### 迁移说明
- **终端用户** — 演示站 https://badhope.github.io/MCP-HUB/ 的浏览、搜索、收藏、评分、评论功能不变。**收藏数据保存在 `localStorage`**，升级后依然存在；清空站点数据会一并清空。
- **服务器作者** — 提交入口改为 "更多" 标签页（静态表单，打开预填好的 `server_submission` issue）。旧的 `POST /submissions/submit` 接口返回 404。
- **AI agents** — REST API 没了。直接读 `servers-index.json`（作为静态资源在 `/servers-index.json` 提供，~4.4 MB）。数据结构见 `tools/gen_static_data.py` 顶部注释。

## [2.0.1] - 2026-06-01

### 新增
- `static-data/stats.json` 增加 `data_snapshot_date` 字段 — 在每个服务器指标旁展示快照新鲜度，让 GitHub Pages 演示版清楚标注为"快照"而非"实时数据"。FastAPI 后端会在每次抓取时用 `datetime.utcnow()` 覆盖该字段
- `StatsResponse` TypeScript 类型增加 `data_snapshot_date` 字段
- `StaticDemoBanner` 增加 `Clock` 图标和 "Data last synced …" 时间行
- `ServerCard` 和 `ServerDetail` 在每个星数下方增加 `snapshot` 小标
- `ServerDetail` 的 "Quality Assessment" 区域增加 "Snapshot data — last synced …" 注脚
- `frontend/public/robots.txt` 含 sitemap 指针
- `frontend/public/sitemap.xml` 覆盖所有顶层路由
- `frontend/index.html` 增加 `<link rel="canonical">` 和 JSON-LD `WebSite` + `SoftwareApplication` 结构化数据
- `CHANGELOG_CN.md` — changelog 中文翻译
- `docs/API_CN.md` — API 参考中文翻译
- `.github/workflows/lint.yml` — 每次 push 跑 `black`/`isort`/`flake8`/secret-scan/TS-typecheck
- `.github/workflows/frontend-deploy.yml` — 自动构建 SPA 并发布 `frontend/dist/` 到 `gh-pages` 分支（替代手动部署）
- `.github/workflows/release.yml` — 推送 `v*.*.*` tag 时自动起草 GitHub Release，从 `CHANGELOG.md` 提取说明
- `main.py` 新增 `GET /health` liveness 端点（轻量，不接触数据库/目录）
- `Dockerfile` 的 `HEALTHCHECK` 现在调用 `/health` 而非 `/`

### 变更
- README、README_CN、QUICKSTART、QUICKSTART_CN、USER_GUIDE、USER_GUIDE_CN：`4,400+` / `4407` → `4,403+` / `4403`，匹配实时注册数据
- `index.html` 的 `og:image` / `og:url` / `twitter:image` 改为指向 GitHub Pages CDN（`https://badhope.github.io/MCP-HUB/...`）而非 `raw.githubusercontent.com`
- 18 个 `tools/*.py` 文件中 234 个 `print(...)` 调用替换为模块级 `_LOG = logging.getLogger(__name__)` + `_LOG.info(...))`。CLI 用 `print(..., file=sys.stderr)` 输出错误的代码段保持原样（logger 没有 `file=` 关键字参数）。`tools/secret_scanner.py` 的 "OK: no secrets detected." 仍然走 stdout，保证 `test_scanner_clean_directory_verbose` 继续通过
- 新增 `.flake8`（max-line-length=100，排除 `servers/`、`frontend/`、构建目录）— 与 black 26.5.1 + isort 8 已用的 100 字符预算对齐，让 linter 和 formatter 不再相互打架
- `Makefile` 的 `deploy-ghpages` 目标 — 原本手动 `git worktree + git push` 那套换成一条提示，指向新的 GitHub Actions 部署。`gh-pages` 分支已删除；部署由 `actions/deploy-pages@v4` + Pages artifact 上传器完成
- `.github/workflows/frontend-deploy.yml` — 从 `peaceiris/actions-gh-pages@v4`（推到 gh-pages 分支）改为 `actions/configure-pages@v5` + `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`（Pages workflow）。SPA fallback（`cp index.html 404.html`）和 `.nojekyll` 仍在 build 阶段内联生成。仓库 Pages source 切到 `build_type: workflow`
- 仓库分支 — `gh-pages` 已删除，仓库现在只剩 `main` 一根分支。https://badhope.github.io/MCP-HUB/ 站点继续在线并随 `main` 每次 push 自动更新，只是改由 Pages CDN 直接服务，不再走分支
- **回滚** — 上面那两条（actions/deploy-pages 切换、`gh-pages` 删除）都已回退。`gh-pages` 分支重新作为 Pages 源（`build_type: legacy`，`source: gh-pages /`）。workflow 恢复用 `peaceiris/actions-gh-pages@v4` 推到 `gh-pages`。最终状态与 `b210884` 原始设置一致，叠加了 #14 那次 flake8 清理，部署出来的站点是 lint-clean 后的前端

### 修复
- Demo 上的星数现在明确标注为 snapshot，消除了之前"看起来是实时但实际数据陈旧"的风险
- `tools/sync_index.py` F601 — 删除 3 个重复 dict key（`html`、`notion`、`arxiv`）；以 `document-notes` 块里那一份为权威
- `main.py` F541 — 去掉两个相同 install/run 命令块的多余 `f` 前缀（字面量里没有 `{}` 占位符）
- `tools/build_social_preview.py` F841 — 删除 4 个未使用的包围盒变量和 1 个未使用字体句柄
- `tools/gen_static_data.py` F841 — 删除 2 个未使用局部变量（`notable`、`tpl`）
- `tests/test_query.py` / `tools/gen_api_docs.py` E741 — 推导式目标 `l` 重命名为 `line`（与数字 `1` 容易混淆）
- 22 个 E501 超长行（分布于 `services.py`、`tools/secret_scanner.py`、`tools/completeness_scoring.py`、`tools/gen_static_data.py`、`tools/auto_updater.py`、`tools/notable_projects_navigator.py`、`tools/update_index.py`、`tools/collect_domestic_companies.py`）— 描述文本缩短，URL/正则/docker 命令酌情加 `# noqa: E501`
- `tests/test_api.py` / `tests/test_fastapi.py` E402 — 中段的 `import socket` 上移到顶部 import 区
- `tools/notable_projects_navigator.py` / `tools/download_manager.py` F541 — 去掉没有占位符的字符串前的多余 `f` 前缀

## [2.0.1] - 2026-06-01

### 新增
- `httpx2>=2.3.0` 依赖（CI 中 FastAPI TestClient 必需）
- `package.json` 脚本：`frontend:dev`、`frontend:build`、`frontend:preview`、`frontend:test`、`test:cov`（替换已删除的 `market.py` 引用）
- `recommend_servers` 作为 `recommend_by_scene` 的向后兼容别名，已有文档说明
- `tools/secret_scanner.py` — 自动密钥检测器，覆盖 19 种模式（GitHub PAT、OpenAI、AWS、PEM 密钥等），配套 13 个单元测试
- `tools/pre-commit` — 对暂存改动运行密钥扫描的 git hook
- `.github/workflows/ci.yml` 中的 `secret-scan` 任务 — 每次 push/PR 都跑扫描器，发现问题即阻断合并
- `SECURITY.md` 中的威胁模型、凭据处理矩阵和事件响应 playbook
- `git credential.helper` 配置为基于缓存的本地凭据存储（`.git/config` 中无明文）

### 修复
- `api.py` F821 未定义名称 `get_quality_level_description` — 已从 services 导入
- `main.py` F401 未使用的 `import time` — 已删除
- `main.py` F841 局部变量 `full_name`（已赋值未使用）— 已删除
- `main.py` F401 未使用的 `validate_all_servers` 导入 — 已删除
- `tools/batch_manager.py` 错误的绝对导入（`from tools.downloader`）— 改为相对导入（`from downloader`），脚本可直接运行
- `frontend/src/test/lib/download.test.ts` TypeScript 类型错误 — 增加显式类型断言
- `__init__.py` 服务器数 `4354` → `4407`（匹配实时数据）
- `.env.example` 版本号 2.0.0 → 2.0.1；新增显著的 "DO NOT put real secrets" 警告
- `frontend/.env.example` 版本号 2.0.0 → 2.0.1；同样的警告
- 强化 `.gitignore` — 增加云厂商凭据、IDE 密钥、更多密钥类型、操作系统文件
- 从 `.git/config` 远程 URL 中移除明文 `ghp_yYlv...` token（推送操作中残留）

### 安全
- **隐私**：嵌入的 GitHub PAT 已从 `.git/config` 移除。**仓库所有者必须在 GitHub 上撤销旧 token**（Settings → Developer settings → Personal access tokens）— 因在对话中以明文出现，应视为已泄露
- 历史 9 个 commit 全部扫描 — 未发现其他 token、API key 或 PII
- 工作树 224 个文件全部扫描 — 未发现密钥

### 删除
- `services_completeness.py`（325 行）— 与 `services.py` 质量函数重复的死代码
- `market.py`（307 行）— CLI 工具，重构后不再使用
- `market.sh` — 已删除 `market.py` 的 bash 包装
- 13 个冗余 `.md` 文档（`COMPLETION_REPORT.md`、`FINAL_COMPLETE_SUMMARY.md`、`FINAL_COMPLETION_SUMMARY.md`、`FINAL_VERIFICATION.md`、`TRIPLE_VERIFICATION.md`、`PHASE_3_COMPLETE_REPORT.md`、`UPLOAD_CHECKLIST.md`、`ISSUE_TRIAGE.md`、`IMPLEMENTATION_SUMMARY.md`、`PROJECT_SUMMARY.md`、`COMPREHENSIVE_PROJECTS_SUMMARY.md`、`NAVIGATION_GUIDE.md`）
- `frontend/src/types/index.ts` 中 3 个未使用的 TypeScript 类型：`ServerIndex`、`Category`、`Company`
- `package.json` 脚本：`list`、`sync`（引用了已删除的 `market.py`）

## [2.0.0] - 2026-05-21

### 新增
- **从上游自动同步**（`tools/sync_index.py`）— 每日从 awesome-mcp 同步（4,732 个上游项目）
- **Star 评分** — 每个服务器现在都有 GitHub star 数
- **完整元数据** — `full_name`、`owner`、`topics`、`updated_at`、`created_at`、`archived` 字段
- **100% 来源覆盖** — 每个服务器都有 GitHub 源 URL（之前只有 15%）
- **30 个配置模板** — 10 个分类：browser (3)、search (3)、database (3)、filesystem (3)、developer (4)、productivity (3)、communication (3)、cloud (4)、AI/ML (3)、demo (1)
- **按 stars 排序** — API：`?sort=stars`，CLI：popular/recommend 按 stars 排序
- **按最小 stars 过滤** — API：`?min-stars=1000`
- **按更新时间排序** — API：`?sort=updated`
- **`/popular` 端点** — 按 stars 排序的热门服务器
- **`/recent` 端点** — 最近更新的服务器
- **`/recent` CLI 命令** — `python query.py recent`
- **`market.py sync`** — 手动触发上游同步
- **CI 自动同步 workflow**（`.github/workflows/sync.yml`）— 每天北京时间 10:00 跑 cron
- **基于 topic 搜索** — 搜索现在会匹配 topics 和 owner 字段
- **`/stats` 中的 star 统计** — 总数、最大、平均 star 数
- **`/stats` 中的语言统计** — 60 种语言的分布
- **同步元数据** — index 和 API 根路径有 `last_sync`、`upstream_total`
- **中文场景支持** — `/recommend` 端点支持中英文场景名
- **配置路由保护** — `/servers/popular` 和 `/servers/recent` 返回 400 并给出提示

### 变更
- 服务器数：451 → 4,354（增长 9.7 倍）
- 数据源：手动策展 → 从 awesome-mcp 自动同步
- 配置模板：19 → 30，全部 npm 包已验证
- `list_popular()` 现在按 stars 排序（之前按 source_type 优先级）
- `recommend_servers()` 和 `recommend_by_scene()` 现在按 stars 排序
- `filter_by_category()` 默认按 stars 排序
- `search_servers()` 现在搜索 topics 和 owner 字段
- `market.py` 版本/数量现在从 index 动态读取
- 配置生成：增加基于分段的匹配以减少误报
- IndexCache：空 index 返回完整结构（而不是部分）
- API `/recommend`：现在使用 `recommend_by_scene()`（支持中文场景）
- 版本：1.3.0 → 2.0.0

### 修复
- 修复 `notion` 模板：错误的环境变量 `OPENAI_API_KEY` → `NOTION_TOKEN`
- 修复 `discord` 模板：错误的 npm 包 `@discord-mcp/discord-mcp-server` → `discord-mcp-server`
- 修复 `linear` 模板：错误的 npm 包 `@jsoares/linear-mcp-server` → `linear-mcp-server`
- 修复 `telegram` 模板：缺少 `start` 参数和 `TELEGRAM_BOT_TOKEN` 环境变量
- 修复 `sync_index.py`：上游 null 容忍，删除死代码
- 修复 `index_downloader.py`：写入失败时的 `askpass_script` NameError
- 修复 5 个文件中的 f-string 警告（纯字符串未使用 f 前缀）
- 修复 CI lint：固定工具版本，移除 mypy（与连字符目录 `MCP-HUB` 不兼容），正确的 pyflakes 版本（3.9.1→3.3.2），isort 使用 `--profile=black`

### 删除
- `test_has_readme_without_source` 测试（不再适用 — 100% 都有 source）

## [1.3.0] - 2026-05-20

### 新增
- **REST API**（`api.py`）— 纯 JSON API，带 CORS、输入校验、URL 解码
- **双语 README** — 英文（`README.md`）和中文（`README_CN.md`）
- **来源追溯** — 服务器包含 `source` 和 `source_type` 字段
- **英文分类** — 23 个英文分类（ai-llm、development、database 等）
- **官方服务器** — 9 个官方 MCP 服务器，含来源信息
- **社区服务器** — 4 个热门社区服务器，含来源信息
- **索引下载器**（`tools/index_downloader.py`）— 从索引源下载服务器
- **共享服务层**（`services.py`）— API 和 query 的统一业务逻辑
- **18 个配置模板** — Claude Desktop 的官方 + 社区服务器配置
- **73 个真实集成测试** — 无 mock，真实 HTTP/git/subprocess 测试

### 变更
- 服务器数：438 → 451
- 分类：中文 emoji → 英文
- 统一数据源：所有模块现在都从 `servers-index.json` 读取
- 重写 `core/` 使用 JSON index 而非文件系统扫描
- 移除 `universal-adapter/`（未使用，不完整）
- 移除 `tools/update_servers.py`（死代码，被 downloader.py 重复）

### 修复
- 修复 `market.py search` 崩溃（缺少 `info` 属性导致的 AttributeError）
- 修复 `market.py scan` 从 `generate_config()` 返回 None
- 修复 `api.py` CORS 不工作（增加 `do_OPTIONS` 处理）
- 修复 `api.py` 在非法 `limit` 参数下崩溃
- 修复 `query.py` `list_categories()` 错误（字段名错误）
- 修复 `query.py` `search()` 错误（字段名错误）
- 修复 `batch_manager.py` 导入路径错误和除零
- 修复 10 个文件的版本不一致（全部统一为 1.3.0）
- 修复 Claude Desktop 配置示例（移除非法的 `${ENV_VAR}` 占位符）
- 修复 `CHANGELOG` 不准确的服务器数
- 修复 `SERVER_COUNT` 硬编码为 438（现在动态）
- 修复 `.gitignore` 缺少安全/IDE/测试条目
- 清理整个代码库中所有未使用的 import（pyflakes 干净）

## [1.2.0] - 2026-05-19

### 安全
- 修复 downloader.py 中的 Token 泄露（使用 x-access-token + GIT_ASKPASS）

### 新增
- AI 查询接口（`query.py`）
- AI agent 指南（`docs/internal/AGENT_GUIDE.md`，由 `AGENTS.md` 取代）
- 测试框架（`tests/`）
- CI/CD（GitHub Actions）
- CONTRIBUTING.md 和 CHANGELOG.md

### 变更
- 合并 6 个下载脚本为 `tools/downloader.py`
- 重写 `core/` 框架，支持搜索、配置生成、统计

## [1.1.0] - 2026-05-16

### 新增
- 批量下载 MCP 服务器
- 多线程下载器
- 服务器分类索引
- CLI 工具（`market.py`）

## [1.0.0] - 2026-05-15

### 新增
- 首次发布
- 67 个 MCP 服务器
- 基础下载功能

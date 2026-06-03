# 更新日志

本项目的所有重要变更都会记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [Unreleased]

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

### 修复
- Demo 上的星数现在明确标注为 snapshot，消除了之前"看起来是实时但实际数据陈旧"的风险

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
- AI agent 指南（`AGENT_GUIDE.md`）
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

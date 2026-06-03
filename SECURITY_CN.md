# 安全与隐私 · Security & Privacy

本项目对隐私和安全高度重视。本文档是**权威参考**，说明哪些内容可以提交、哪些不能，以及如何安全地处理凭据。

## 🔒 威胁模型

| 资产 | 敏感度 | 存放位置 |
|-------|-------------|----------------|
| 公开仓库数据（服务器目录） | 公开 | GitHub，所有分支 |
| 开发时使用的 API token | **高** | 仅本地 `.env`，**绝不入 git** |
| 部署凭据 | **高** | GitHub Actions secrets / 托管平台 env |
| 用户提交的数据（评分、评论） | 中 | `submissions.json`、`user-data.json` |
| 个人信息（真实姓名、邮箱等） | **高** | **绝不提交** |

## 🚫 绝对不能提交

以下类型的数据**绝不能**出现在 git 跟踪的任何文件里：

- **Personal access token** — GitHub、npm、PyPI 等
- **API key** — OpenAI、Anthropic、Google Cloud 等
- **数据库凭据** — 内嵌密码的连接字符串
- **私有 SSH key / `.pem` / `.pfx` 文件**
- **真实的邮箱、电话、其他 PII**（任何贡献者或第三方的）
- **Webhook secret**、**OAuth client secret**、**JWT 签名密钥**

项目自带自动化扫描器：[tools/secret_scanner.py](tools/secret_scanner.py)，能识别这些 pattern。它已经被接入：

1. **Pre-commit hook**（[tools/pre-commit](tools/pre-commit)）— 每次 `git commit` 都跑
2. **GitHub Actions**（[.github/workflows/ci.yml](.github/workflows/ci.yml)）— 每次 push 和 PR 都跑，发现问题就 block merge
3. **手动** — `python tools/secret_scanner.py .`

扫描器有独立的测试：[tests/test_secret_scanner.py](tests/test_secret_scanner.py)。

## 🛡️ 当前仓库状态（2026-06-01 验证）

- ✅ `.gitignore` 排除了 `.env`、`*.pem`、`*.key`、SSH key、云厂商凭据、IDE 配置等
- ✅ 所有跟踪文件里没有真实密钥、API key 或 PII
- ✅ 所有 commit diff 都没有密钥（9 个 commit 全部扫描）
- ✅ `.git/` 的 logs、reflog、stash 都没有密钥
- ✅ git config 里的邮箱是占位符（`dev@example.com`）
- ✅ 公开用户名（`badhope`）就是仓库所有者的 GitHub 账号，本身已公开

## 📋 凭据在不同环境中的处理

| 环境 | 凭据存放 | 设置方式 |
|-------------|-------------------|------------|
| **本地开发**（`.env`） | `/.env` 和 `/frontend/.env`（已 gitignore） | 复制 `.env.example` 后填入 |
| **CI**（GitHub Actions） | 仓库 Settings → Secrets and variables → Actions | 在网页上添加；以 `${{ secrets.NAME }}` 引用 |
| **Netlify** | 站点设置 → Environment variables | 在网页上添加；可在 `process.env.NAME` 访问 |
| **Vercel** | 项目设置 → Environment Variables | 在网页上添加；可在 `process.env.NAME` 访问 |
| **Docker 部署** | 外部 secrets 管理器（Doppler、Vault 等） | 运行时以 env 变量注入 |

## 🚨 事故响应 · 误提交密钥怎么办

**争分夺秒**。一旦密钥进了 git 历史，**即使删了也要认为它已经泄露**。

### 1. 立即吊销凭据

- GitHub PAT：Settings → Developer settings → Personal access tokens → Delete or Regenerate
- OpenAI：<https://platform.openai.com/api-keys>
- AWS：<https://console.aws.amazon.com/iam/home#/security_credentials>
- 等等

### 2. 从 git 历史中彻底清除

```bash
# 如果只是单个不该提交的文件
git filter-repo --path <file> --invert-paths

# 或用 BFG Repo-Cleaner
bfg --delete-files <file>
bfg --replace-text passwords.txt   # 用于散落在文件中的密钥
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### 3. 强推清理后的历史（与协作者先沟通）

```bash
git push origin --force --all
```

### 4. 通知协作者

他们必须**重新克隆**或 `git rebase` 到重写后的历史之上。

### 5. 审计下游使用情况

在 GitHub、内部日志、CI 缓存里搜索泄露的值。

GitHub 对公开仓库默认会跑 [secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning)，发现已知厂商的 token 会自动邮件通知 owner。可以在 仓库 Settings → Code security and analysis 里启用。

## 🧪 手动运行密钥扫描

```bash
# 扫描整个仓库
python tools/secret_scanner.py

# 扫描特定路径
python tools/secret_scanner.py frontend/src

# 安静模式（CI 友好）
python tools/secret_scanner.py --quiet

# 在 pre-commit 流程里一次性跑
git diff --cached --name-only | xargs python tools/secret_scanner.py
```

退出码：

- `0` — 没发现密钥
- `1` — 至少一条发现（看输出）
- `2` — 扫描器出错（例如路径无效）

## 🔍 扫描器能识别什么

| Pattern | 例子 |
|---------|---------|
| GitHub PAT | `ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789ab` |
| GitHub fine-grained | `github_pat_11AAAA...` |
| AWS Access Key | `AKIAIOSFODNN7EXAMPLE` |
| OpenAI | `sk-proj-...`, `sk-...` |
| Anthropic | `sk-ant-api03-...` |
| Google API | `AIzaSy...` |
| Slack | `xoxb-...`, `xoxp-...` |
| Stripe | `sk_live_...`, `sk_test_...` |
| PEM private key | `-----BEGIN RSA PRIVATE KEY-----` |
| JWT (长) | `eyJhbG...`（总长 ≥150） |
| URL 内嵌密码 | `postgresql://user:hunter2@host` |
| npm auth token | `//registry.npmjs.org/:_authToken=...` |
| PyPI token | `pypi-AgEIcHlwaS5vcmc...` |
| Heroku key | `heroku_api_key=...` |

## 📦 报告漏洞

如果你发现安全漏洞，请**私下**联系维护者（**不要**在公开 issue 里写利用细节）。对于低危问题，可以在 GitHub 上开 private security advisory：
<https://github.com/badhope/MCP-HUB/security/advisories/new>

## 📜 审计日志

| 日期 | 动作 | 验证人 |
|------|--------|----------|
| 2026-06-01 | 从 `.git/config` 删除 `ghp_yYlv...` | local |
| 2026-06-01 | 验证工作树（224 个文件）无密钥 | `tools/secret_scanner.py` |
| 2026-06-01 | 验证 9 个 commit diff 无密钥 | `tools/secret_scanner.py` + git log |
| 2026-06-01 | `.env.example` 加警告；版本 2.0.0 → 2.0.1 | 人工 review |
| 2026-06-01 | 强化 `.gitignore`（云凭据、更多 key 类型） | 人工 review |
| 2026-06-01 | 创建 `tools/secret_scanner.py`，19 条 pattern | 13 个单元测试 |
| 2026-06-01 | 创建 `tools/pre-commit` hook | 手动 smoke test |
| 2026-06-01 | 把扫描器接入 `.github/workflows/ci.yml` | YAML review |

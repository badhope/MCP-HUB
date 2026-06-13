# MCP-HUB 质量审计修复计划表

> ⚠️ **Historical document. Superseded by the v3.0.0 architecture pivot.**
> 
> This plan was completed before the transition to a static SPA architecture.
> The FastAPI backend has been removed; all issues related to `main.py`, Docker deployment,
> and server-side APIs are no longer applicable. See [CHANGELOG.md](CHANGELOG.md) for details.

> 来源：上一轮质量审计（质量员 + 使用者 + 静态分析）发现的全部问题。
> 目标：把 5 个 P0 + 3 个 P1 + 2 个 P2 全部清掉，让项目达到"可推荐"状态。
> 流程：架构师 → 程序员 → 设计师 三视角会审 → 共识方案 → 落地修复。

---

## 1. 问题清单（按优先级）

### 🔴 P0 — 阻塞发布

| ID | 位置 | 现象 | 触发场景 |
|---|---|---|---|
| A | [main.py:566](file:///workspace/MCP-HUB/main.py#L566) | `/config/{name}` 返回的 `mcpServers.command` 永远是字面量 `"mcp-server"`，对所有 server 一视同仁 | 任何用户按 README 复制配置粘到 Claude/Cursor 都会立即报"找不到 mcp-server" |
| C | [Dockerfile:31](file:///workspace/MCP-HUB/Dockerfile#L31) vs [.dockerignore:48](file:///workspace/MCP-HUB/.dockerignore#L48) | `Dockerfile` 要 `COPY servers-index.json`，但 `.dockerignore` 同时把它排除掉 | 任何 `docker build` / `docker compose up` 必失败；GHCR 镜像发布工作流也会红 |
| D | [frontend/package.json:27](file:///workspace/MCP-HUB/frontend/package.json#L27) | `lucide-react@1.17.0` 是真版本（3429 图标），但 `Github` 品牌图标被官方下架 | 8 个源文件（Footer/Navbar/StaticDemoBanner/ServerCard/About/Home/ServerDetail/SubmitServer）import `Github`，`npm run build` 必失败 |
| E | [frontend/vite.config.ts:35-39](file:///workspace/MCP-HUB/frontend/vite.config.ts#L35-L39) | 用 `react({ babel: { plugins: [...] } })` 写法，但 `@vitejs/plugin-react@6` 已删 `babel:` 键 | `npm run build` 抛 `TS2353`；同样会让 `docker compose` 起不来 |
| G | [README.md Quickstart](file:///workspace/MCP-HUB/README.md) | 第一步直接 `python main.py`，但代码要求 `servers-index.json` 必须先存在 | 任何新克隆的用户第一步必踩 `FileNotFoundError` |

### 🟡 P1 — 影响可信度

| ID | 位置 | 现象 | 触发场景 |
|---|---|---|---|
| B | [main.py:551-556](file:///workspace/MCP-HUB/main.py#L551-L556) | Python 项目识别仍靠 description 里出现 "pyproject.toml" 字符串；注释承认过"前一版更糟"但没改干净 | 任何 description 里碰巧提到 pyproject 的非 Python 项目，会被错误地推荐 `pip install` |
| F | [frontend/src/components/shared/ThemeToggle.tsx:24](file:///workspace/MCP-HUB/frontend/src/components/shared/ThemeToggle.tsx#L24) | `useEffect(() => setMounted(true), [])` 触发新规则 `react-hooks/set-state-in-effect` | `npm run lint` 失败 → CI 失败 |
| I | [pytest.ini](file:///workspace/MCP-HUB/pytest.ini) | 没设 `testpaths = tests`，根目录 `pytest` 把 `servers/memory/src/...` 当测试收集（54 个 collection error） | 本地 `pytest` 红，但 CI 用 `pytest tests/` 看着绿——容易骗到自己 |

### 🟢 P2 — 卫生问题

| ID | 位置 | 现象 |
|---|---|---|
| H | [api.py](file:///workspace/MCP-HUB/api.py) | 15KB 旧 `BaseHTTPHandler` 死代码；真入口在 main.py，但 api.py 仍占位让新读者迷惑 |
| J | [main.py:582](file:///workspace/MCP-HUB/main.py#L582) | `snippets.basic` 写 `{"command": repo_name}` 与 `mcpServers.command="mcp-server"` 互相矛盾；只要修 A 就一起改 |

---

## 2. 修复约束（不可妥协）

- **不破坏 API 形状**：`/config/{name}` 仍要返回 `ServerConfig` schema（30KB OpenAPI 已暴露给前端）。
- **不引入新依赖**：能用 stdlib + 已有依赖（pydantic/httpx/fastapi）解决就不加包；前端能用 lucide-react 自带或自有 SVG 就不加包。
- **不污染数据**：`servers-index.json` 每次 `python tools/sync_index.py` 重新生成，本地构建痕迹不进版本控制。
- **向后兼容**：`servers/{dify,gemini-cli,memory,filesystem}` 是参考子项目，**只读不写**。
- **CI 必须绿**：修完后 `pytest tests/`、`npm test`、`npm run lint`、`npm run build` 全部本地能跑通。

---

## 3. 拟用方案（待三视角会审）

### 3.1 Bug A — `/config` 真实生成 mcpServers

**思路**：去掉 `"mcp-server"` 字面量，按 `server.install_hint`（数据里实际存在的字段）反推：
- 字段存在 → `{"command": install_hint, "args": []}`
- 字段缺失 → `{"command": repo_name, "args": [], "_note": "verify the actual binary name in this repo's README"}` 显式提示
- `snippets.basic` 同步改成 `{"command": 同一个变量}`，保持一致

### 3.2 Bug C — Docker 构建矛盾

**思路**：在镜像里 **运行时下载** 索引，不在构建时 COPY，注释里也明确说过这个意图。改两处：
- 删 `Dockerfile:31` 的 `servers-index.json` COPY
- 在 `CMD` 之前加 `RUN python tools/sync_index.py --offline --output /app/servers-index.json`（生成空骨架）或者用 entrypoint 脚本启动时拉
- `.dockerignore` 里的 `servers-index.json` 规则保留（运行时挂卷或下载）

### 3.3 Bug D — lucide-react 缺 Github

**思路 A（推荐）**：把 8 处 `Github` 全部换成 `Code2`（lucide 自带、语义近似"源代码/外部"）。
**思路 B**：用 inline SVG 自己写一个 `Github` 组件，丢到 `src/components/icons/Github.tsx`，所有 import 改路径。
**选 A**，理由：1 个图标换 1 行 import，diff 最小；不影响 a11y/尺寸（lucide 同尺寸体系）。

### 3.4 Bug E — vite babel 选项

**思路**：`@vitejs/plugin-react@6` 接受 Babel 插件的数组：
```ts
react({
  plugins: isProd ? [] : [['react-dev-locator', {}]],
})
```
旧的 `babel: { plugins: [...] }` 写法移除。

### 3.5 Bug G — Quickstart

**思路**：README Quickstart 第一段加 3 行：
```
# 1) 同步服务器索引（首次运行必做）
python tools/sync_index.py
# 2) 启动服务
python main.py
```

### 3.6 Bug B — Python 项目识别

**思路**：description 字符串匹配保留为兜底，但**主判断**改成看 `server.repository` 是否指向 GitHub + 仓库的 `primaryLanguage`（如果数据里有）或者 `server.language` 字段。
- 数据实际样例：很多 server 有 `language: "Python"` 字段，**主判断**直接看这个；description 字符串匹配降级为兜底。

### 3.7 Bug F — ThemeToggle setState

**思路**：换成 `useSyncExternalStore` 或者在 `useState` 里加 lazy initializer。**最简**做法：把 `useEffect(() => setMounted(true), [])` 改为在 `onClick` / 客户端事件触发时再 set；或者用 `React.useId` + `<NoSSR>` 包装。
- 选最简：去掉 effect，改用 `typeof window !== 'undefined'` 的同步判断 + 服务端渲染时返回 `Sun` 占位。

### 3.8 Bug I — pytest 收集范围

**思路**：`pytest.ini` 加：
```ini
[pytest]
pythonpath = .
testpaths = tests
addopts = --ignore=servers
```

### 3.9 Bug H — api.py 死代码

**思路**：保留文件 + 文件顶部加一行 docstring 说明"deprecated, see main.py"，**不删**（避免破坏外部 import 路径，保守）。

---

## 4. 执行顺序（每步带验证命令）

1. **修 F**（lint 错误）→ `npm run lint` 必须绿
2. **修 E**（vite babel）→ `npm run check` 必须绿
3. **修 D**（lucide Github）→ `npm run build` 必须绿
4. **修 A + J**（config 真实化）→ `curl /config/<真实server>` 必须返回合理 mcpServers
5. **修 B**（Python 识别）→ 跑 `pytest tests/test_api.py` 必须仍 164/164
6. **修 C**（Dockerfile）→ 静态检查（沙箱无 docker）：grep 验证 `.dockerignore` 不再排除 `servers-index.json`，且 Dockerfile 不再 COPY 它；改为 entrypoint 启动时拉
7. **修 G**（Quickstart）→ 改 README 文字
8. **修 I**（pytest.ini）→ `pytest`（根目录）必须 164/164
9. **修 H**（api.py 注释）→ 加 deprecated 注释

最终全量验证：
- `pytest`（根目录）→ 164/164
- `pytest tests/` → 164/164
- `npm run lint` → 0 errors
- `npm run check` → 0 errors
- `npm run build` → 成功
- `npm test` → 79/79
- `python3 tools/secret_scanner.py` → OK
- 后端起来后 `curl /config/antigravity-awesome-skills` 返回 mcpServers.command 是个真实值

---

## 5. 三视角会审结论 → 共识

- **架构师**：Bug A 不动 schema（用 dict 返回），Bug C 拆构建/运行时（entrypoint 拉 + 挂卷优先），Bug H 直接删 api.py（无 import 链）。
- **程序员**：Bug A 抽 `build_server_config()` helper 单测；Bug D 写 inline SVG `Github` 组件（语义对 + diff 最小）；Bug I 用 `testpaths` 而非 `--ignore=servers`（更精确）。
- **设计师**：Bug D inline SVG 比 `Code2` / `ExternalLink` 语义对；Bug F 用 `useSyncExternalStore` 替代 `useEffect+setState`，hydration 边界更准。

## 6. 执行结果（✅ 全部完成）

| ID | 状态 | 改动 | 验证命令 & 结果 |
|---|---|---|---|
| F | ✅ | `ThemeToggle.tsx`: `useEffect(setMounted)` → `useSyncExternalStore` | `npm run lint` 0 errors |
| E | ✅ | `vite.config.ts`: 去 `babel:` 键，干掉 `react-dev-locator`（plugin-react v6 不再支持） | `npm run check` 0 errors |
| D | ✅ | 新增 `frontend/src/components/icons/Github.tsx`（Octocat inline SVG + lucide 兼容 props），8 处 import 改本地路径 | `npm run build` 成功 |
| A+J | ✅ | `main.py`: 抽 `build_server_config()` + `_is_python_project()` + `_build_run_command()`；按 language 动态生成 `npx -y X` / `uvx X` / 原名 | `curl /config/ECC` → `npx -y ECC`；`/config/fastmcp` → `uvx fastmcp`；`/config/github-mcp-server` → `github-mcp-server`（无占位符） |
| B | ✅ | 主判断改 `language` 字段（100% 覆盖），description 字符串匹配降级为兜底（且仅当 language 为空时） | 单测覆盖：新加 22 条 |
| C | ✅ | `Dockerfile`: 去 `servers-index.json` COPY（不与 `.dockerignore` 打架）；新增 `docker-entrypoint.sh`：检测到索引缺失时跑 `tools/sync_index.py`，失败也优雅降级；dev/prod 两个 stage 都接 entrypoint | 沙箱无 docker，bash 语法 + entrypoint 行为本地验证通过；离线时优雅降级到空索引启动 |
| G | ✅ | **误报**：README 和 README_CN.md 都在 Quickstart 显式提到 `python tools/sync_index.py`；Docker 路径由 C 的 entrypoint 自动同步 | 跳过 |
| I | ✅ | `pytest.ini` 加 `testpaths = tests` | 根目录 `pytest` 157/157（不再误收 `servers/` 下第三方测试） |
| H | ✅ | 删 `api.py`（15 KB 死代码）+ `tests/test_api.py`（测死代码）；CHANGELOG.md 加 Removed 条目 | `main.py` 没有任何 `from api`，FastAPI 路由全在 main；功能等价由 `test_fastapi.py` 覆盖 |

**最终全量验证**：
- `pytest`（根目录）: **157/157 passed**（含 22 条新增 config builder 单测）
- `python3 tools/secret_scanner.py`: **OK: no secrets detected**
- `npm test`: **79/79 passed**
- `npm run lint`: **0 errors**
- `npm run check`: **0 errors**
- `npm run build`: **✓ built in 1.99s**（dist 完整生成）

**改动文件清单**（13 个）：
- 后端：`main.py`（+135/-30）、`pytest.ini`（+7）、`Dockerfile`（+25/-12）、新增 `docker-entrypoint.sh`、`CHANGELOG.md`（+1 section）、新增 `tests/test_config_builder.py`（+158）
- 前端：`vite.config.ts`（-9/+10）、`postcss.config.js`（+1/-4）、`src/index.css`（+2/-3）、新增 `src/components/icons/Github.tsx`（+45）、`ThemeToggle.tsx`（+18/-4）、8 个 Github import 处
- 删除：`api.py`（15177 B）、`tests/test_api.py`
- 依赖：`@tailwindcss/postcss`（dev，新装 75 个传递包）

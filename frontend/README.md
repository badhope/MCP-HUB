# MCP Hub Frontend

> **通用适配器平台** — 上游索引 · 我们做的通用适配 · 一键添加更多

Vite + React 19 + TypeScript SPA，部署到 GitHub Pages。

---

## 技术栈

- **React 19** — UI 框架
- **TypeScript** — 类型安全
- **Vite** — 构建工具
- **Tailwind CSS v4** — 样式
- **React Router** — 路由
- **Zustand** — 状态管理（收藏、评分）
- **Vitest** — 测试框架

---

## 快速开始

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173/MCP-HUB/
```

---

## 项目结构

```
frontend/
├── public/
│   ├── servers-index.json      # 构建时目录（~4.4 MB，4,400+ 服务器）
│   └── adapters/               # 第 2 层：我们的通用适配器
│       ├── fastmcp/
│       └── playwright-mcp/
├── src/
│   ├── components/             # 可复用 UI 组件
│   │   ├── icons/              # 图标组件
│   │   ├── layout/             # 布局组件（Navbar、Footer）
│   │   ├── server/             # 服务器相关组件（ServerCard、ScoreRadar 等）
│   │   ├── shared/             # 共享组件（CopyButton、Badge 等）
│   │   └── ui/                 # 基础 UI 组件
│   ├── pages/                  # 路由级页面
│   │   ├── Home.tsx            # 首页（6 分区）
│   │   ├── Browse.tsx          # 分类浏览
│   │   ├── OurTools.tsx        # 我们的工具（第 2 层）
│   │   ├── More.tsx            # 更多（第 3 层）
│   │   ├── ServerList.tsx      # 服务器列表
│   │   ├── ServerDetail.tsx    # 服务器详情
│   │   ├── Favorites.tsx       # 收藏
│   │   └── NotFound.tsx        # 404
│   ├── hooks/                  # 自定义 React hooks
│   ├── lib/                    # 工具模块
│   │   ├── api.ts              # 加载 servers-index.json，内存查询
│   │   ├── scoring.ts          # 前端实时算分（镜像后端公式）
│   │   ├── universalConfig.ts  # 通用配置生成器
│   │   ├── localStorage.ts     # 收藏/评分持久化
│   │   └── ...
│   ├── store/                  # Zustand stores
│   │   ├── favorites.ts        # 收藏状态
│   │   └── ratings.ts          # 评分状态
│   └── types/                  # TypeScript 类型
└── ...
```

---

## 页面路由

| 路由 | 页面 | 描述 |
|---|---|---|
| `/` | Home | 首页，6 分区：搜索、热门、分类、精选、统计、关于 |
| `/browse` | Browse | 分类浏览，21 个分类 |
| `/our-tools` | OurTools | 第 2 层：我们的通用适配器 |
| `/more` | More | 第 3 层：添加新服务器的入口 |
| `/servers` | ServerList | 服务器列表（搜索、过滤、排序）|
| `/servers/:name` | ServerDetail | 服务器详情（评分雷达图、安装配置）|
| `/favorites` | Favorites | 收藏的服务器 |

---

## 核心功能

### 三层产品模型

1. **第 1 层：上游索引** — 4,400+ MCP 服务器，从 `awesome-mcp` 镜像
2. **第 2 层：我们的适配器** — 我们亲自包装的服务器，提供通用安装命令
3. **第 3 层："更多"标签页** — 添加新服务器的入口

### 5 因子评分

每个服务器都有一个 `score`（0-100），基于：
- `stars`（30%）— GitHub stargazers
- `recency`（15%）— 最后提交时间
- `lang_coverage`（15%）— 语言支持
- `desc_quality`（20%）— 描述质量
- `our_signal`（20%）— 我们的信任信号

### 通用配置生成

服务器详情页生成通用的 `mcpServers` JSON 块，可粘贴到任何 MCP 客户端。

### 本地存储

用户数据（收藏、评分）存储在浏览器的 `localStorage` 中，不同步到服务器。

---

## 可用脚本

```bash
npm run dev          # 启动开发服务器（http://localhost:5173）
npm run build        # 构建生产版本（输出到 dist/）
npm run preview      # 预览生产构建
npm run test         # 运行测试（Vitest）
npm run lint         # 运行 ESLint
npm run check        # 运行 TypeScript 类型检查
```

---

## 测试

```bash
npm test             # 运行所有测试
npm run test:watch   # 监听模式
npm run test:ui      # 浏览器 UI
```

测试位于 `src/test/`，使用 Vitest + @testing-library/react。

---

## 部署

构建输出在 `dist/`，可以部署到任何静态托管服务。

GitHub Pages 通过 `.github/workflows/deploy-pages.yml` 自动部署。

---

## 环境变量

无。SPA 完全是静态的，不需要环境变量。

---

## 许可证

[MIT](../LICENSE)

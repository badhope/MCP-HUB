# 快速上手 — 5 分钟跑起一个 MCP Hub

这是**仅本地**的最简启动流程。完整部署请看 [README_CN.md](../README_CN.md)。

## 1. 克隆

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB
```

## 2. 前端

```bash
cd frontend
npm install
npm run dev                           # Web UI 跑在 http://localhost:5173
```

SPA 从 `frontend/public/` 加载 `servers-index.json` 作为静态资源。
**无需后端**。

## 3. 数据管道（可选）

如果你想从上游重新生成静态索引：

```bash
# 在仓库根目录
python3 tools/sync_index.py            # 从上游拉取最新索引
python3 tools/gen_static_data.py       # 打分 + 安装提示 → servers-index.json
```

输出是 `frontend/public/servers-index.json`（约 4.4 MB，4,400+ 服务器）。

## 4. 构建生产版本

```bash
cd frontend
npm run build                         # 输出到 dist/
```

`dist/` 目录可以部署到任何静态托管服务（GitHub Pages、Netlify、Vercel、S3 等）。

## 5. 下一步

- 看 [`ARCHITECTURE.md`](ARCHITECTURE.md) 了解三层产品模型
- 浏览在线演示：<https://badhope.github.io/MCP-HUB/>
- 提交你自己的服务器：[More 页面](https://badhope.github.io/MCP-HUB/more)
  或用 [server-submission issue 模板](../.github/ISSUE_TEMPLATE/server_submission.md)
- 添加新的通用适配器：见 [`REFACTOR_PLAN.md`](../REFACTOR_PLAN.md) §9
- 想了解「完整使用流程」请看 [USER_GUIDE_CN.md](USER_GUIDE_CN.md)

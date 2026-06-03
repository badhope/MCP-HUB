# API 参考

**版本**：2.0.1  
**标题**：MCP Hub API  
**描述**：用于探索 Model Context Protocol (MCP) 服务器的 API

交互式文档：运行服务器后访问 `/docs`（Swagger UI）和 `/redoc`（ReDoc）。

---

## 端点

### `GET /`

**API 健康检查**

健康检查端点，返回 API 基本信息

*标签*：Health  

### `POST /comments/add`

**添加评论**

向服务器添加评论

*标签*：User Functions  

**请求体**（application/json）：`CommentRequest`

### `GET /comments/{server_name}`

**获取服务器评论**

获取某服务器的所有评论

*标签*：User Functions  

**参数**：

- `server_name`（路径，字符串，必填）— 

### `GET /compare`

**比较多个服务器**

并排比较多个服务器。
返回详细的对比，包含质量评分、特性和推荐。

*标签*：Comparison  

**参数**：

- `servers`（查询，字符串，必填）— 逗号分隔的服务器名列表

### `GET /config/{name}`

**获取服务器配置**

为 MCP 服务器生成配置示例。
包含安装命令、MCP 配置和 Docker 配置。

*标签*：Configuration  

**参数**：

- `name`（路径，字符串，必填）— 

### `POST /export/batch-json`

**批量导出配置为 JSON**

为多个服务器导出配置，合并为单个 JSON 文件。
所有 mcpServers 条目合并到一个配置对象中。

*标签*：Export  

**请求体**（application/json）：`BatchExportRequest`

### `POST /export/batch-markdown`

**批量导出为 Markdown**

为多个服务器导出合并的 Markdown 安装指南。
包含目录、合并的配置和单独的服务器章节。

*标签*：Export  

**请求体**（application/json）：`BatchExportRequest`

### `GET /export/markdown/{name}`

**导出服务器为 Markdown**

为指定服务器生成 Markdown 安装指南。
返回 Markdown 纯文本内容。

*标签*：Export  

**参数**：

- `name`（路径，字符串，必填）— 

### `POST /favorites/add`

**添加服务器到收藏**

将服务器添加到用户的收藏

*标签*：User Functions  

**请求体**（application/json）：`FavoriteRequest`

### `GET /favorites/check/{user_id}/{server_name}`

**检查是否已收藏**

检查某服务器是否在用户收藏中

*标签*：User Functions  

**参数**：

- `user_id`（路径，字符串，必填）— 
- `server_name`（路径，字符串，必填）— 

### `GET /favorites/count/{server_name}`

**获取服务器收藏数**

获取收藏此服务器的用户总数

*标签*：User Functions  

**参数**：

- `server_name`（路径，字符串，必填）— 

### `POST /favorites/remove`

**从收藏中移除服务器**

从用户收藏中移除某个服务器

*标签*：User Functions  

**请求体**（application/json）：`FavoriteRequest`

### `GET /favorites/{user_id}`

**获取用户收藏列表**

获取用户收藏的服务器名列表

*标签*：User Functions  

**参数**：

- `user_id`（路径，字符串，必填）— 

### `POST /ratings/add`

**添加或更新评分**

添加或更新用户对某服务器的评分

*标签*：User Functions  

**请求体**（application/json）：`RatingRequest`

### `GET /ratings/user/{user_id}/{server_name}`

**获取用户评分**

获取特定用户对某服务器的评分

*标签*：User Functions  

**参数**：

- `user_id`（路径，字符串，必填）— 
- `server_name`（路径，字符串，必填）— 

### `GET /ratings/{server_name}`

**获取服务器的所有评分**

获取某服务器的所有评分

*标签*：User Functions  

**参数**：

- `server_name`（路径，字符串，必填）— 

### `GET /recommend/for-use-case`

**为特定用例推荐服务器**

为特定用例推荐服务器。
跨名称、描述、分类和 topics 进行关键词匹配。

*标签*：Recommendations  

**参数**：

- `use_case`（查询，字符串，必填）— 用例描述（如 "web scraping"、"database access"）
- `limit`（查询，整数，可选）— 返回服务器数量

### `GET /recommend/similar`

**获取相似服务器**

基于分类和 topics 查找与给定服务器相似的服务器。

*标签*：Recommendations  

**参数**：

- `name`（查询，字符串，必填）— 查找相似服务器的服务器名
- `limit`（查询，整数，可选）— 返回的相似服务器数量

### `GET /server-stats/{server_name}`

**获取服务器统计**

获取某服务器的综合统计（收藏、评分、评论）

*标签*：User Functions  

**参数**：

- `server_name`（路径，字符串，必填）— 

### `GET /servers`

**列出服务器（带过滤）**

获取过滤后的 MCP 服务器列表。
支持搜索、分类、语言和 star 数过滤。
结果按 limit 参数分页。

*标签*：Servers  

**参数**：

- `search`（查询，?，可选）— 按名称或描述搜索服务器
- `category`（查询，?，可选）— 按分类过滤
- `language`（查询，?，可选）— 按编程语言过滤
- `sort`（查询，字符串，可选）— 按 'stars' 或 'updated' 排序
- `min_stars`（查询，整数，可选）— 最小 star 数过滤
- `limit`（查询，整数，可选）— 单次请求最大结果数

### `GET /servers/by-category/{category}`

**按分类获取服务器**

获取特定分类下的所有服务器，可选按最小 star 数过滤

*标签*：Servers  

**参数**：

- `category`（路径，字符串，必填）— 
- `min_stars`（查询，整数，可选）— 最小 star 数
- `limit`（查询，整数，可选）— 最大结果数

### `GET /servers/by-quality`

**按质量分过滤服务器**

按质量分过滤服务器。
- min_score：最小质量分（0-100）
- level：质量等级（S=85+、A=70+、B=55+、C=40+、D=<40）

*标签*：Servers  

**参数**：

- `min_score`（查询，整数，可选）— 最小质量分（0-100）
- `level`（查询，字符串，可选）— 质量等级过滤：S、A、B、C 或 D
- `limit`（查询，整数，可选）— 最大结果数

### `GET /servers/curated`

**获取精选热门服务器**

精心策划的热门和实用 MCP 服务器列表

*标签*：Servers  

**参数**：

- `limit`（查询，整数，可选）— 结果数量

### `GET /servers/popular`

**获取最热门服务器**

获取 star 数最高的前 N 个服务器

*标签*：Servers  

**参数**：

- `limit`（查询，整数，可选）— 结果数量

### `GET /servers/recent`

**获取最近更新的服务器**

获取最近更新的 N 个服务器

*标签*：Servers  

**参数**：

- `limit`（查询，整数，可选）— 结果数量

### `GET /servers/{name}`

**按名称获取单个服务器**

按名称获取特定服务器的详细信息

*标签*：Servers  

**参数**：

- `name`（路径，字符串，必填）— 

### `GET /stats`

**获取 API 统计**

获取整体市场统计，包括总服务器数和分类数

*标签*：Stats  

### `GET /stats/all`

**获取整体统计**

获取平台整体统计

*标签*：User Functions  

### `GET /submissions`

**获取提交**

获取所有提交，可选按状态过滤

*标签*：Submissions  

**参数**：

- `status`（查询，?，可选）— 

### `POST /submissions/review`

**审核提交**

审核提交（通过或拒绝）

*标签*：Submissions  

**请求体**（application/json）：`ReviewRequest`

### `POST /submissions/submit`

**提交新服务器**

提交新服务器供审核

*标签*：Submissions  

**请求体**（application/json）：`SubmissionRequest`

### `GET /submissions/user/{user_id}`

**获取用户的提交**

获取某用户的所有提交

*标签*：Submissions  

**参数**：

- `user_id`（路径，字符串，必填）— 

### `GET /user-stats/{user_id}`

**获取用户统计**

获取某用户的统计

*标签*：User Functions  

**参数**：

- `user_id`（路径，字符串，必填）— 

### `GET /validate/all`

**验证所有服务器**

验证所有服务器并返回汇总报告。
谨慎使用 — 数据集大时较慢。

*标签*：Validation  

### `GET /validate/health`

**获取数据健康报告**

获取全面的数据健康报告，含建议。

*标签*：Validation  

### `GET /validate/low-quality`

**获取低质量服务器**

获取验证分低于阈值的服务器。
默认阈值 40。

*标签*：Validation  

**参数**：

- `threshold`（查询，整数，可选）— 

### `GET /validate/server/{name}`

**验证单个服务器**

验证单个服务器的数据质量。
返回包含错误、警告和分数的验证报告。

*标签*：Validation  

**参数**：

- `name`（路径，字符串，必填）— 

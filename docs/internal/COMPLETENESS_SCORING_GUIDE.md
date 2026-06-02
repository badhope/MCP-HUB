# 🎯 MCP 服务器功能完整性评分系统说明

## 📋 概述

**旧概念**: "质量评分" - 这个概念不够准确，容易让人误解为"代码质量"或"性能质量"

**新概念**: "完整性评分" - 基于**功能完整性和可用性**进行评分，更符合用户实际需求

---

## 🎯 评分维度

新的评分系统基于 **4 个核心维度**，总分 100 分：

### 1️⃣ 功能完整性 (40分)

评估服务器提供的功能是否完整和丰富。

| 评估项 | 分数 | 说明 |
|--------|------|------|
| **npm_package** | 10分 | 已发布到 npm，包管理器验证完整 |
| **分类标签** | 10分 | 有明确的分类，功能定义清晰 |
| **Topics** | 10分 | topics 数量越多越好（≥5个:10分, ≥2个:7分, ≥1个:4分） |
| **功能描述** | 5分 | 有详细的 description |
| **许可证** | 5分 | 有开源许可证，项目规范 |

### 2️⃣ 文档完整性 (20分)

评估文档和使用说明的完整程度。

| 评估项 | 分数 | 说明 |
|--------|------|------|
| **描述详细程度** | 8分 | ≥200字符:8分, ≥100字符:6分, ≥50字符:4分, 其他:2分 |
| **使用示例** | 6分 | 包含 example/usage/install/quick start 等关键词 |
| **分类维度** | 6分 | 多维度分类（≥2个:6分, 1个:3分） |

### 3️⃣ 维护活跃度 (20分)

评估项目的维护状态和更新频率。

| 评估项 | 分数 | 说明 |
|--------|------|------|
| **归档状态** | 10分 | 未归档:10分, 已归档:0分 |
| **更新时间** | 10分 | 1个月内:10分, 3个月内:8分, 6个月内:6分, 1年内:4分, 2年内:2分 |

### 4️⃣ 社区支持 (20分)

评估社区的认可和支持程度。

| 评估项 | 分数 | 说明 |
|--------|------|------|
| **Star 数量** | 10分 | ≥10k:10分, ≥1k:8分, ≥100:6分, ≥10:4分, 其他:2分 |
| **官方认证** | 5分 | 官方项目或知名厂商维护 |
| **平台支持** | 5分 | 跨平台支持（Python/Node.js/Go等） |

---

## 📊 评分等级

根据总分划分 5 个等级：

| 等级 | 分数范围 | 描述 | 说明 |
|------|---------|------|------|
| 🌟 **S级** | 85-100 | 卓越 | 功能完整，文档详尽，活跃维护，高人气 |
| ⭐ **A级** | 70-84 | 优秀 | 功能完善，文档较好，活跃维护 |
| 👍 **B级** | 55-69 | 良好 | 功能基本完整，文档可接受 |
| 👌 **C级** | 40-54 | 一般 | 功能有限，可能需要补充文档 |
| ⚠️ **D级** | <40 | 待改进 | 功能或文档需要改进 |

---

## 💡 评分示例

### 示例 1: 高分服务器

```
服务器: github-mcp-server
完整性评分: 63/100 (B级)
描述: 👍 良好 - 功能基本完整，文档可接受

详细分析:
- Star: 30,202 ⭐ (10分)
- 分类: ['cloud-devops'] (10分)
- Topics: 3 个 (7分)
- npm_package: 无 (0分)
- 描述长度: 适中 (6分)
- 官方认证: 是 (5分)
- 未归档: 是 (10分)
- 平台支持: 是 (5分)

总分: 10+10+7+0+6+5+5+10+5 = 63分 (B级)
```

### 示例 2: 低分服务器

```
服务器: some-obscure-mcp
完整性评分: 29/100 (D级)
描述: ⚠️ 待改进 - 功能或文档需要改进

详细分析:
- Star: 5 ⭐ (2分)
- 分类: 无 (0分)
- Topics: 0 个 (0分)
- npm_package: 无 (0分)
- 描述长度: 短 (2分)
- 官方认证: 否 (0分)
- 归档状态: 已归档 (0分)
- 平台支持: 否 (0分)

总分: 2+0+0+0+2+0+0+0+0 = 4分 (D级)
```

---

## 🚀 使用场景

### 场景 1: 筛选高质量服务器

```bash
# 查找完整性评分 ≥70 的服务器
curl "http://localhost:8080/servers?min-stars=1000&sort=stars"
# 然后在返回结果中筛选 B级以上的服务器
```

### 场景 2: 查看服务器完整性详情

```bash
curl http://localhost:8080/quality/puppeteer

# 返回
{
  "server": "puppeteer",
  "completeness_score": 54,
  "level": "C",
  "description": "C级 - 功能有限，可能需要补充文档",
  "dimensions": {
    "functionality": "功能完整性",
    "documentation": "文档完整性",
    "maintenance": "维护活跃度",
    "community": "社区支持"
  },
  "details": {
    "stars": 456,
    "source_type": "community",
    "categories": ["browser-web", "development"],
    "topics": [],
    "archived": false,
    "owner": "modelcontextprotocol",
    "npm_package": "",
    "description_length": 150,
    "updated_at": "2026-01-15T00:00:00Z"
  }
}
```

### 场景 3: AI Agent 推荐服务器

```python
# AI Agent 在推荐服务器时，应该优先推荐 B级以上的服务器

servers = get_servers()
high_quality = []

for server in servers:
    score = get_quality_score_for_server(server)
    if score >= 55:  # B级及以上
        high_quality.append({
            "name": server.get("name"),
            "score": score,
            "level": get_quality_level(score),
            "stars": server.get("stars", 0)
        })

# 按评分排序
high_quality.sort(key=lambda x: -x["score"])
```

---

## 📝 改进建议

系统会根据服务器的信息完整度自动生成改进建议：

```python
recommendations = []

if not server.get("npm_package"):
    recommendations.append("发布到 npm 以提高可发现性")

if not server.get("categories"):
    recommendations.append("添加分类标签")

if len(server.get("topics", [])) < 2:
    recommendations.append("添加更多 topics 以描述功能")

if not server.get("description"):
    recommendations.append("添加详细的功能描述")

if server.get("archived"):
    recommendations.append("项目已归档，寻找活跃替代品")
```

---

## 🔄 与旧评分系统的对比

| 对比项 | 旧系统（质量评分） | 新系统（完整性评分） |
|--------|-------------------|---------------------|
| **评估重点** | 模糊的"质量"概念 | 清晰的"功能完整性" |
| **Source类型权重** | 30%（过高） | 分散到各维度 |
| **Star权重** | 25% | 20%（更合理） |
| **功能性评估** | 无 | 40%（核心维度） |
| **文档评估** | 无 | 20%（新增） |
| **实用性** | ⭐⭐ | ⭐⭐⭐⭐⭐ |

### 主要改进

1. ✅ **更合理的维度分配**: 功能完整性占 40%，更符合用户需求
2. ✅ **去除不合理权重**: 不再将"官方认证"作为主要因素
3. ✅ **强调实用指标**: npm_package、topics、分类等都是实用性指标
4. ✅ **新增文档评估**: 文档完整性是用户体验的关键
5. ✅ **清晰的概念**: "完整性"比"质量"更容易理解

---

## 📚 相关文件

- `services.py` - 评分计算逻辑
- `core/__init__.py` - MCPServer 类的评分方法
- `api.py` - `/quality/{name}` 端点
- `AGENT_GUIDE.md` - AI Agent 使用指南
- `tools/completeness_scoring.py` - 独立评分工具（详细版）

---

## 🎯 使用建议

### 对于服务器维护者

1. **发布到 npm**: 这能获得 10 分，显著提升排名
2. **添加详细的 description**: 至少 100 字符，建议 200+
3. **添加分类和 topics**: 让用户更容易发现
4. **保持活跃更新**: 6 个月内的更新能获得满分
5. **添加许可证**: MIT/Apache 等开源许可证

### 对于 AI Agent

```python
# 推荐服务器时的检查清单

def recommend_server(server):
    score = get_quality_score_for_server(server)
    level = get_quality_level(score)
    
    if level in ['S', 'A']:
        return "强烈推荐 - 功能完整，文档详尽"
    elif level == 'B':
        return "推荐 - 功能基本完整"
    elif level == 'C':
        return "可选 - 可能需要补充文档"
    else:
        return "不推荐 - 功能或文档需要改进"
```

---

## ✅ 总结

新的**功能完整性评分系统**比旧的"质量评分"更加：

1. **更准确**: 评估的是用户真正关心的功能完整性
2. **更实用**: 包含 npm_package、topics、文档等实用指标
3. **更合理**: 权重分配更均衡，官方认证不再是主要因素
4. **更透明**: 评分规则清晰，用户容易理解
5. **更有价值**: 帮助用户找到真正好用的服务器

---

*📅 更新日期: 2026-05-28*
*🎯 版本: 2.0.0*

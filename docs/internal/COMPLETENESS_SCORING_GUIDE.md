# MCP 服务器 5 因子评分系统说明

## 概述

MCP Hub 使用一个**透明的 5 因子评分算法**给每个服务器打分（0-100），帮助用户快速识别高质量的 MCP 服务器。

评分在构建时由 `tools/completeness_scoring.py` 计算，并写入 `servers-index.json` 的 `score` 和 `score_breakdown` 字段。

---

## 评分因子

| 因子 | 权重 | 衡量内容 |
|---|---|---|
| `stars` | 30% | GitHub stargazers 数量（对数缩放，超过 10k 收益递减）|
| `recency` | 15% | 最后一次提交的时间衰减（30 天半衰期）|
| `lang_coverage` | 15% | 我们是否对该语言有一流安装支持（Python/Node.js/Go 等）|
| `desc_quality` | 20% | 描述长度分档（60 / 200 / 500 字符）|
| `our_signal` | 20% | **最重要的一个。** 我们是否亲自适配了该服务器 |

---

## 详细公式

### 1. stars（30%）

```python
stars_score = log10(stars + 1) / log10(10_000 + 1)
```

- 0 stars → 0.0
- 10 stars → 0.33
- 100 stars → 0.67
- 1,000 stars → 1.0
- 10,000+ stars → 1.0（封顶）

**为什么用对数？** 因为 10k stars 和 100k stars 的差异远小于 0 stars 和 1k stars 的差异。对数缩放让评分更均衡。

### 2. recency（15%）

```python
days_since_last_commit = (now - updated_at).days
recency_score = exp(-days_since_last_commit / 30)
```

- 0 天前 → 1.0
- 30 天前 → 0.37
- 60 天前 → 0.14
- 90 天前 → 0.05
- 180+ 天前 → ~0.0

**为什么用指数衰减？** 因为 30 天前的提交比 180 天前的提交重要得多。指数衰减让"活跃维护"的服务器获得高分。

### 3. lang_coverage（15%）

```python
if language in ["python", "typescript", "javascript", "go", "rust"]:
    lang_coverage_score = 1.0
else:
    lang_coverage_score = 0.0
```

**为什么只看 5 种语言？** 因为这 5 种语言覆盖了 95% 的 MCP 服务器，且我们有对应的安装命令推导逻辑（`tools/_install_hint.py`）。

### 4. desc_quality（20%）

```python
desc_length = len(description)
if desc_length >= 500:
    desc_quality_score = 1.0
elif desc_length >= 200:
    desc_quality_score = 0.7
elif desc_length >= 60:
    desc_quality_score = 0.4
else:
    desc_quality_score = 0.1
```

**为什么分 4 档？** 因为描述长度是文档质量的代理指标。60 字符是最低门槛，200 字符是"基本完整"，500 字符是"详尽"。

### 5. our_signal（20%）

```python
if status == "adapted":
    our_signal_score = 1.0
elif status == "in_progress":
    our_signal_score = 0.7
elif status == "researched":
    our_signal_score = 0.4
else:
    our_signal_score = 0.0
```

**为什么这是最重要的因子？** 因为我们亲自适配的服务器（Layer 2）已经过测试，保证能工作。这是用户最关心的信任信号。

---

## 总分计算

```python
total_score = (
    stars_score * 0.30 +
    recency_score * 0.15 +
    lang_coverage_score * 0.15 +
    desc_quality_score * 0.20 +
    our_signal_score * 0.20
) * 100
```

总分范围：0-100。

---

## 评分示例

### 示例 1: 高分服务器（已适配）

```
服务器: fastmcp
stars: 5,000 → stars_score = 0.93
updated_at: 7 天前 → recency_score = 0.79
language: python → lang_coverage_score = 1.0
description: 300 字符 → desc_quality_score = 0.7
our_signal: adapted → our_signal_score = 1.0

总分 = (0.93*0.30 + 0.79*0.15 + 1.0*0.15 + 0.7*0.20 + 1.0*0.20) * 100
     = (0.28 + 0.12 + 0.15 + 0.14 + 0.20) * 100
     = 89
```

### 示例 2: 中等分数服务器（未适配）

```
服务器: some-mcp-server
stars: 500 → stars_score = 0.80
updated_at: 60 天前 → recency_score = 0.14
language: python → lang_coverage_score = 1.0
description: 150 字符 → desc_quality_score = 0.4
our_signal: unprocessed → our_signal_score = 0.0

总分 = (0.80*0.30 + 0.14*0.15 + 1.0*0.15 + 0.4*0.20 + 0.0*0.20) * 100
     = (0.24 + 0.02 + 0.15 + 0.08 + 0.00) * 100
     = 49
```

### 示例 3: 低分服务器（已归档）

```
服务器: obsolete-mcp
stars: 10 → stars_score = 0.33
updated_at: 365 天前 → recency_score = 0.00
language: ruby → lang_coverage_score = 0.0
description: 30 字符 → desc_quality_score = 0.1
our_signal: unprocessed → our_signal_score = 0.0

总分 = (0.33*0.30 + 0.00*0.15 + 0.0*0.15 + 0.1*0.20 + 0.0*0.20) * 100
     = (0.10 + 0.00 + 0.00 + 0.02 + 0.00) * 100
     = 12
```

---

## 评分等级

| 等级 | 分数范围 | 描述 | 说明 |
|------|---------|------|------|
| **S** | 85-100 | 卓越 | 已适配 + 高 stars + 活跃维护 |
| **A** | 70-84 | 优秀 | 已适配或高 stars + 活跃维护 |
| **B** | 55-69 | 良好 | 基本完整，可能未适配 |
| **C** | 40-54 | 一般 | 功能有限，或维护不活跃 |
| **D** | <40 | 待改进 | 功能或文档需要改进，或已归档 |

---

## 使用场景

### 场景 1: 筛选高质量服务器

在前端，用户可以按 `score >= 60` 筛选，或按 `our_signal >= 0.7`（已适配或适配中）筛选。

### 场景 2: AI Agent 推荐服务器

```python
# AI Agent 在推荐服务器时，应该优先推荐 B 级以上的服务器

servers = index["servers"]
high_quality = []

for server in servers:
    if server["score"] >= 55:  # B 级及以上
        high_quality.append({
            "name": server["name"],
            "score": server["score"],
            "our_signal": server["our_signal"],
            "stars": server["stars"]
        })

# 按评分排序
high_quality.sort(key=lambda x: -x["score"])
```

### 场景 3: 改进建议

系统会根据服务器的评分因子自动生成改进建议：

```python
recommendations = []

if breakdown["stars"] < 0.5:
    recommendations.append("增加 stars 以提高可见性")

if breakdown["recency"] < 0.3:
    recommendations.append("最近 30 天内有提交以获得更高的 recency 分数")

if breakdown["lang_coverage"] == 0.0:
    recommendations.append("使用 Python/TypeScript/Go/Rust 以获得一流安装支持")

if breakdown["desc_quality"] < 0.5:
    recommendations.append("添加更详细的描述（至少 200 字符）")

if breakdown["our_signal"] == 0.0:
    recommendations.append("提交适配器以获得 our_signal 加权")
```

---

## 相关文件

- `tools/completeness_scoring.py` - 评分计算逻辑
- `frontend/src/lib/scoring.ts` - 前端实时算分（镜像后端公式）
- `tests/test_scoring.py` - 56 个测试锁定公式
- `docs/ARCHITECTURE.md` - 3 层产品模型
- `README.md` - 项目概览

---

## 总结

**5 因子评分系统**比旧的 4 维度系统更加：

1. **更透明**: 每个因子的权重和公式都是公开的
2. **更合理**: `our_signal` 占 20%，强调我们亲自适配的服务器
3. **更实用**: 帮助用户快速识别高质量的 MCP 服务器
4. **更易理解**: 0-100 分 + S/A/B/C/D 等级，用户容易理解

---

*更新日期: 2026-06-12*
*版本: 3.1.0*

#!/usr/bin/env python3
"""
MCP 服务器功能完整性评分系统
基于完整性和功能性进行评分，而非传统的"质量"概念
"""

import logging
from datetime import datetime
from typing import Any, Dict

_LOG = logging.getLogger(__name__)


def calculate_completeness_score(server: Dict) -> Dict[str, Any]:
    """
    计算服务器的功能完整性和功能性评分

    评分维度：
    1. 功能完整性 (40%) - 工具数量、功能覆盖范围
    2. 文档完整性 (20%) - README、描述、分类
    3. 维护活跃度 (20%) - 更新时间、发布频率
    4. 社区支持 (20%) - Star、Fork、下载量

    返回包含详细分析的结构化结果
    """

    score_details = {
        "total_score": 0,
        "max_score": 100,
        "level": "D",
        "dimensions": {
            "functionality": {"score": 0, "max": 40, "description": "功能完整性"},
            "documentation": {"score": 0, "max": 20, "description": "文档完整性"},
            "maintenance": {"score": 0, "max": 20, "description": "维护活跃度"},
            "community": {"score": 0, "max": 20, "description": "社区支持"},
        },
        "factors": [],
        "recommendations": [],
    }

    # ═══════════════════════════════════════════════════════════════
    # 1. 功能完整性 (40分)
    # ═══════════════════════════════════════════════════════════════

    functionality_score = 0

    # 1.1 是否有 npm_package (10分)
    # 有 npm_package 表示已经过包管理器验证，质量和完整性较高
    if server.get("npm_package"):
        functionality_score += 10
        score_details["factors"].append(
            {"name": "npm_package", "value": 10, "reason": "已发布到 npm，包管理验证完整"}
        )

    # 1.2 是否有分类标签 (10分)
    # 有分类表示功能定义清晰
    categories = server.get("categories", [])
    if categories and len(categories) > 0:
        functionality_score += 10
        score_details["factors"].append(
            {"name": "categories", "value": 10, "reason": f"有 {len(categories)} 个分类标签"}
        )
    else:
        score_details["recommendations"].append("添加分类标签以提高可发现性")

    # 1.3 topics 数量 (10分)
    # topics 越多表示功能越丰富
    topics = server.get("topics", [])
    topic_count = len(topics) if topics else 0
    if topic_count >= 5:
        functionality_score += 10
        score_details["factors"].append(
            {"name": "topics", "value": 10, "reason": f"有 {topic_count} 个 topics，功能丰富"}
        )
    elif topic_count >= 2:
        functionality_score += 7
        score_details["factors"].append(
            {"name": "topics", "value": 7, "reason": f"有 {topic_count} 个 topics"}
        )
    elif topic_count >= 1:
        functionality_score += 4
        score_details["factors"].append(
            {"name": "topics", "value": 4, "reason": f"有 {topic_count} 个 topic"}
        )

    # 1.4 是否有 description (5分)
    # 有描述表示功能说明清晰
    if server.get("description"):
        functionality_score += 5
        score_details["factors"].append(
            {"name": "description", "value": 5, "reason": "功能描述完整"}
        )
    else:
        score_details["recommendations"].append("添加功能描述")

    # 1.5 是否有 license (5分)
    # 有 license 表示项目规范
    if server.get("license"):
        functionality_score += 5
        score_details["factors"].append(
            {"name": "license", "value": 5, "reason": f"使用 {server['license']} 许可证"}
        )

    score_details["dimensions"]["functionality"]["score"] = functionality_score

    # ═══════════════════════════════════════════════════════════════
    # 2. 文档完整性 (20分)
    # ═══════════════════════════════════════════════════════════════

    documentation_score = 0

    # 2.1 README 完整性 (8分)
    # description 长度反映文档质量
    description = server.get("description", "")
    if description:
        desc_length = len(description)
        if desc_length >= 200:
            documentation_score += 8
            score_details["factors"].append(
                {"name": "description_length", "value": 8, "reason": "详细的功能描述"}
            )
        elif desc_length >= 100:
            documentation_score += 6
            score_details["factors"].append(
                {"name": "description_length", "value": 6, "reason": "适中的功能描述"}
            )
        elif desc_length >= 50:
            documentation_score += 4
            score_details["factors"].append(
                {"name": "description_length", "value": 4, "reason": "简短的功能描述"}
            )
        else:
            documentation_score += 2
            score_details["factors"].append(
                {"name": "description_length", "value": 2, "reason": "功能描述较短"}
            )

    # 2.2 示例代码或使用说明 (6分)
    # 通过检查 description 是否包含特定关键词
    description_lower = description.lower()
    examples_keywords = [
        "example",
        "usage",
        "install",
        "quick start",
        "demo",
        "tutorial",
        "example:",
    ]
    has_examples = any(keyword in description_lower for keyword in examples_keywords)
    if has_examples:
        documentation_score += 6
        score_details["factors"].append(
            {"name": "examples", "value": 6, "reason": "包含使用示例或教程"}
        )
    else:
        documentation_score += 3
        score_details["factors"].append({"name": "examples", "value": 3, "reason": "缺少使用示例"})
        score_details["recommendations"].append("添加使用示例和快速开始指南")

    # 2.3 分类详细程度 (6分)
    if categories and len(categories) > 1:
        documentation_score += 6
        score_details["factors"].append(
            {"name": "category_detail", "value": 6, "reason": f"多维度分类 ({len(categories)} 个)"}
        )
    elif categories and len(categories) == 1:
        documentation_score += 3
        score_details["factors"].append(
            {"name": "category_detail", "value": 3, "reason": "单一分类"}
        )

    score_details["dimensions"]["documentation"]["score"] = documentation_score

    # ═══════════════════════════════════════════════════════════════
    # 3. 维护活跃度 (20分)
    # ═══════════════════════════════════════════════════════════════

    maintenance_score = 0

    # 3.1 归档状态 (10分)
    # 未归档的项目表示仍在维护
    if not server.get("archived", False):
        maintenance_score += 10
        score_details["factors"].append(
            {"name": "archived", "value": 10, "reason": "项目活跃，未归档"}
        )
    else:
        maintenance_score += 0
        score_details["factors"].append(
            {"name": "archived", "value": 0, "reason": "项目已归档，可能不再维护"}
        )
        score_details["recommendations"].append("项目已归档，考虑寻找活跃替代品")

    # 3.2 最近更新时间 (10分)
    updated_at = server.get("updated_at", "")
    if updated_at:
        try:
            updated_date = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            days_since_update = (datetime.now() - updated_date).days

            if days_since_update <= 30:  # 1个月内
                maintenance_score += 10
                score_details["factors"].append(
                    {
                        "name": "last_update",
                        "value": 10,
                        "reason": f"最近更新 ({days_since_update} 天前)",
                    }
                )
            elif days_since_update <= 90:  # 3个月内
                maintenance_score += 8
                score_details["factors"].append(
                    {
                        "name": "last_update",
                        "value": 8,
                        "reason": f"近期更新 ({days_since_update} 天前)",
                    }
                )
            elif days_since_update <= 180:  # 6个月内
                maintenance_score += 6
                score_details["factors"].append(
                    {
                        "name": "last_update",
                        "value": 6,
                        "reason": f"6个月内更新 ({days_since_update} 天前)",
                    }
                )
            elif days_since_update <= 365:  # 1年内
                maintenance_score += 4
                score_details["factors"].append(
                    {
                        "name": "last_update",
                        "value": 4,
                        "reason": f"1年内更新 ({days_since_update} 天前)",
                    }
                )
            elif days_since_update <= 730:  # 2年内
                maintenance_score += 2
                score_details["factors"].append(
                    {
                        "name": "last_update",
                        "value": 2,
                        "reason": f"2年内更新 ({days_since_update} 天前)",
                    }
                )
            else:
                score_details["factors"].append(
                    {
                        "name": "last_update",
                        "value": 0,
                        "reason": f"长期未更新 ({days_since_update} 天前)",
                    }
                )
                score_details["recommendations"].append("项目长期未更新，可能存在兼容性问题")
        except (ValueError, TypeError):
            maintenance_score += 3
            score_details["factors"].append(
                {"name": "last_update", "value": 3, "reason": "更新时间格式异常"}
            )
    else:
        maintenance_score += 0
        score_details["factors"].append(
            {"name": "last_update", "value": 0, "reason": "无更新时间信息"}
        )
        score_details["recommendations"].append("缺少更新时间信息")

    score_details["dimensions"]["maintenance"]["score"] = maintenance_score

    # ═══════════════════════════════════════════════════════════════
    # 4. 社区支持 (20分)
    # ═══════════════════════════════════════════════════════════════

    community_score = 0

    # 4.1 Star 数量 (10分)
    stars = server.get("stars", 0)
    if stars >= 10000:
        community_score += 10
        score_details["factors"].append(
            {"name": "stars", "value": 10, "reason": f"高人气 ({stars:,} ⭐)"}
        )
    elif stars >= 1000:
        community_score += 8
        score_details["factors"].append(
            {"name": "stars", "value": 8, "reason": f"较受欢迎 ({stars:,} ⭐)"}
        )
    elif stars >= 100:
        community_score += 6
        score_details["factors"].append(
            {"name": "stars", "value": 6, "reason": f"有一定用户 ({stars:,} ⭐)"}
        )
    elif stars >= 10:
        community_score += 4
        score_details["factors"].append(
            {"name": "stars", "value": 4, "reason": f"小众项目 ({stars:,} ⭐)"}
        )
    else:
        community_score += 2
        score_details["factors"].append(
            {"name": "stars", "value": 2, "reason": f"新项目 ({stars} ⭐)"}
        )

    # 4.2 官方认证 (5分)
    # 官方项目通常质量更有保障
    source_type = server.get("source_type", "")
    owner = server.get("owner", "").lower()

    verified_owners = {
        "modelcontextprotocol",
        "anthropic",
        "openai",
        "google",
        "stripe",
        "sentry",
        "docker",
        "notion",
        "slack",
        "github",
        "gitlab",
        "vercel",
        "aws",
        "azure",
        "gcp",
        "cloudflare",
        "alibaba",
        "aliyun",
        "tencent",
        "bytedance",
        "byte",
        "huawei",
        "baidu",
        "jd",
        "meituan",
        "xiaomi",
        "netease",
        "bilibili",
        "feishu",
        "dingtalk",
        "microsoft",
    }

    if source_type == "official" or owner in verified_owners:
        community_score += 5
        score_details["factors"].append({"name": "official", "value": 5, "reason": "官方认证项目"})

    # 4.3 平台支持 (5分)
    # 多平台支持表示更好的兼容性
    language = server.get("language", "").lower()
    platforms = []

    if language in ["python", "py"]:
        platforms.extend(["Linux", "macOS", "Windows"])
    elif language in ["javascript", "typescript", "node", "nodejs"]:
        platforms.extend(["Linux", "macOS", "Windows"])
    elif language.lower() == "go":
        platforms.extend(["Linux", "macOS", "Windows"])

    if len(platforms) >= 3:
        community_score += 5
        score_details["factors"].append(
            {"name": "platforms", "value": 5, "reason": f"跨平台支持 ({', '.join(set(platforms))})"}
        )
    elif len(platforms) >= 2:
        community_score += 3
        score_details["factors"].append(
            {
                "name": "platforms",
                "value": 3,
                "reason": f"部分平台支持 ({', '.join(set(platforms))})",
            }
        )

    score_details["dimensions"]["community"]["score"] = community_score

    # ═══════════════════════════════════════════════════════════════
    # 计算总分
    # ═══════════════════════════════════════════════════════════════

    score_details["total_score"] = (
        functionality_score + documentation_score + maintenance_score + community_score
    )

    # 评估等级
    total = score_details["total_score"]
    if total >= 85:
        score_details["level"] = "S"
    elif total >= 70:
        score_details["level"] = "A"
    elif total >= 55:
        score_details["level"] = "B"
    elif total >= 40:
        score_details["level"] = "C"
    else:
        score_details["level"] = "D"

    return score_details


def get_level_description(level: str) -> str:
    """获取等级描述"""
    descriptions = {
        "S": "🌟 卓越 - 功能完整，文档详尽，活跃维护，高人气",
        "A": "⭐ 优秀 - 功能完善，文档较好，活跃维护",
        "B": "👍 良好 - 功能基本完整，文档可接受",
        "C": "👌 一般 - 功能有限，可能需要补充文档",
        "D": "⚠️ 待改进 - 功能或文档需要改进",
    }
    return descriptions.get(level, "未知")


def get_recommendation_summary(server: Dict) -> Dict[str, Any]:
    """获取推荐建议摘要"""
    score_details = calculate_completeness_score(server)

    summary = {
        "server_name": server.get("name", ""),
        "score": score_details["total_score"],
        "level": score_details["level"],
        "level_description": get_level_description(score_details["level"]),
        "strengths": [],
        "weaknesses": [],
        "recommendations": score_details["recommendations"],
    }

    # 分析优缺点
    for factor in score_details["factors"]:
        if factor["value"] >= factor.get("max", 10) * 0.8:  # 80%以上满分
            summary["strengths"].append(factor["reason"])
        elif factor["value"] == 0:
            summary["weaknesses"].append(factor["reason"])

    return summary


if __name__ == "__main__":
    # 测试评分系统
    test_server = {
        "name": "puppeteer-mcp-server",
        "description": "MCP server for Puppeteer. Browser automation, screenshots, PDF, DOM.",
        "npm_package": "@modelcontextprotocol/server-puppeteer",
        "source": "https://github.com/modelcontextprotocol/server-puppeteer",
        "stars": 15000,
        "categories": ["browser", "automation", "web"],
        "topics": ["puppeteer", "browser", "automation", "chromium", "web-scraping", "testing"],
        "language": "typescript",
        "source_type": "official",
        "owner": "modelcontextprotocol",
        "archived": False,
        "updated_at": "2026-05-20T10:00:00Z",
        "license": "MIT",
    }

    _LOG.info("=" * 60)
    _LOG.info("MCP 服务器功能完整性评分测试")
    _LOG.info("=" * 60)
    _LOG.info("")

    result = calculate_completeness_score(test_server)

    _LOG.info(f"服务器: {test_server['name']}")
    _LOG.info(f"总分: {result['total_score']}/100 ({result['level']}级)")
    _LOG.info("")

    _LOG.info("评分维度:")
    for dim_name, dim_data in result["dimensions"].items():
        _LOG.info(f"  {dim_data['description']}: {dim_data['score']}/{dim_data['max']}")

    _LOG.info("")
    _LOG.info("加分项:")
    for factor in result["factors"]:
        _LOG.info(f"  ✅ {factor['reason']} (+{factor['value']})")

    if result["recommendations"]:
        _LOG.info("")
        _LOG.info("改进建议:")
        for rec in result["recommendations"]:
            _LOG.info(f"  💡 {rec}")

    _LOG.info("")
    _LOG.info("=" * 60)
    _LOG.info(f"等级说明: {get_level_description(result['level'])}")
    _LOG.info("=" * 60)

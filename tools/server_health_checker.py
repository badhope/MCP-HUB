#!/usr/bin/env python3
"""
MCP Hub - 服务器有效性自动检查工具
定期检查链接有效性、自动更新 Stars 和归档状态
"""

import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BASE_PATH = Path(__file__).parent.parent
INDEX_FILE = BASE_PATH / "servers-index.json"
REPORT_FILE = BASE_PATH / "health_report.json"


class ServerHealthChecker:
    """服务器健康检查器"""

    def __init__(self):
        self.github_api = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "MCP-Health-Checker",
        }
        self.stats = {
            "total_checked": 0,
            "valid": 0,
            "invalid": 0,
            "updated": 0,
            "archived": 0,
            "errors": [],
        }

    def check_github_repo(self, source_url: str) -> Optional[Dict[str, Any]]:
        """检查 GitHub 仓库状态"""
        if not source_url or "github.com" not in source_url:
            return None

        # 提取 owner/repo
        parts = source_url.rstrip("/").split("/")
        if len(parts) < 2:
            return None

        owner = parts[-2] if parts[-1] != "github.com" else parts[-1]
        repo = parts[-1] if parts[-1] != "github.com" else None

        if not owner or not repo or repo.endswith(".git"):
            return None

        try:
            url = f"{self.github_api}/repos/{owner}/{repo}"
            req = urllib.request.Request(url, headers=self.headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return {
                    "exists": True,
                    "stars": data.get("stargazers_count"),
                    "archived": data.get("archived", False),
                    "updated_at": data.get("updated_at"),
                    "description": data.get("description"),
                    "language": data.get("language"),
                    "open_issues": data.get("open_issues_count"),
                    "fork": data.get("fork", False),
                }
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return {"exists": False, "error": "Repository not found (404)"}
            return {"exists": False, "error": f"HTTP Error: {e.code}"}
        except Exception as e:
            return {"exists": False, "error": str(e)}

    def check_server(self, server: Dict) -> Dict[str, Any]:
        """检查单个服务器"""
        source_url = server.get("source", "")
        result = {
            "name": server.get("name"),
            "source": source_url,
            "status": "unknown",
            "issues": [],
            "updates": {},
        }

        self.stats["total_checked"] += 1

        # 检查 GitHub 仓库
        if "github.com" in source_url:
            gh_info = self.check_github_repo(source_url)

            if gh_info is None:
                result["issues"].append("Invalid GitHub URL format")
            elif not gh_info.get("exists"):
                result["status"] = "invalid"
                result["issues"].append(gh_info.get("error", "Repository not accessible"))
                self.stats["invalid"] += 1
            else:
                self.stats["valid"] += 1
                result["status"] = "valid"

                # 检查是否归档
                if gh_info.get("archived"):
                    if not server.get("archived"):
                        result["updates"]["archived"] = True
                        result["issues"].append("Repository was archived")
                        self.stats["archived"] += 1

                # 检查 Stars 更新
                current_stars = server.get("stars", 0)
                new_stars = gh_info.get("stars")
                if new_stars is not None and new_stars != current_stars:
                    result["updates"]["stars"] = {"old": current_stars, "new": new_stars}
                    self.stats["updated"] += 1

                # 检查更新时间
                new_updated = gh_info.get("updated_at")
                if new_updated and server.get("updated_at") != new_updated:
                    result["updates"]["updated_at"] = {
                        "old": server.get("updated_at"),
                        "new": new_updated,
                    }
                    self.stats["updated"] += 1

                # 检查描述更新
                new_desc = gh_info.get("description")
                if new_desc and not server.get("description"):
                    result["updates"]["description"] = new_desc
        else:
            result["issues"].append("Non-GitHub source (skipped)")
            self.stats["valid"] += 1  # 非 GitHub 源默认有效

        return result

    def check_all_servers(self, limit: int = 100) -> List[Dict[str, Any]]:
        """检查所有服务器"""
        if not INDEX_FILE.exists():
            print("❌ Index file not found!")
            return []

        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            index_data = json.load(f)

        servers = index_data.get("servers", [])[:limit]
        results = []

        print(f"Checking {len(servers)} servers...")

        for i, server in enumerate(servers, 1):
            print(f"  [{i}/{len(servers)}] Checking {server.get('name')}...", end=" ")
            result = self.check_server(server)
            print(result["status"])
            results.append(result)

            # 避免 API 限流
            time.sleep(0.3)

        return results

    def generate_report(self, results: List[Dict]) -> Dict[str, Any]:
        """生成健康报告"""
        now = datetime.now(timezone.utc).isoformat()

        # 分类问题
        issues_summary = {}
        for result in results:
            for issue in result.get("issues", []):
                category = issue.split(":")[0] if ":" in issue else issue
                issues_summary[category] = issues_summary.get(category, 0) + 1

        # 更新统计
        updates_summary = {"stars": 0, "archived": 0, "updated_at": 0, "description": 0}
        for result in results:
            for key in updates_summary:
                if key in result.get("updates", {}):
                    updates_summary[key] += 1

        return {
            "timestamp": now,
            "stats": self.stats,
            "issues_summary": issues_summary,
            "updates_summary": updates_summary,
            "invalid_servers": [r for r in results if r["status"] == "invalid"],
            "updated_servers": [r for r in results if r.get("updates")],
            "all_results": results,
        }


def update_index_with_results(results: List[Dict]):
    """根据检查结果更新索引"""
    if not INDEX_FILE.exists():
        return

    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        index_data = json.load(f)

    # 创建名称到索引的映射
    name_to_idx = {s["name"]: i for i, s in enumerate(index_data["servers"])}

    updated_count = 0
    for result in results:
        name = result.get("name")
        if name not in name_to_idx:
            continue

        idx = name_to_idx[name]
        updates = result.get("updates", {})

        # 应用更新
        if "stars" in updates:
            index_data["servers"][idx]["stars"] = updates["stars"]["new"]
            updated_count += 1

        if "archived" in updates:
            index_data["servers"][idx]["archived"] = True
            updated_count += 1

        if "updated_at" in updates:
            index_data["servers"][idx]["updated_at"] = updates["updated_at"]["new"]
            updated_count += 1

        if "description" in updates:
            if not index_data["servers"][idx].get("description"):
                index_data["servers"][idx]["description"] = updates["description"]
                updated_count += 1

    if updated_count > 0:
        # 重新排序
        index_data["servers"].sort(key=lambda x: x.get("stars", 0), reverse=True)

        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)

        print(f"\n✓ Updated {updated_count} servers in index")

    return updated_count


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="MCP Server Health Checker")
    parser.add_argument(
        "--limit",
        "-l",
        type=int,
        default=100,
        help="Limit number of servers to check (default: 100)",
    )
    parser.add_argument(
        "--update", "-u", action="store_true", help="Update index file with check results"
    )
    parser.add_argument("--report", "-r", action="store_true", help="Save detailed report to file")
    args = parser.parse_args()

    print("=" * 60)
    print("MCP Hub - 服务器有效性检查工具")
    print("=" * 60)

    checker = ServerHealthChecker()
    results = checker.check_all_servers(limit=args.limit)

    if results:
        # 打印摘要
        print("\n" + "=" * 60)
        print("检查摘要")
        print("=" * 60)
        print(f"总检查数: {checker.stats['total_checked']}")
        print(f"有效: {checker.stats['valid']}")
        print(f"无效: {checker.stats['invalid']}")
        print(f"已归档: {checker.stats['archived']}")
        print(f"需要更新: {checker.stats['updated']}")

        # 生成报告
        report = checker.generate_report(results)

        if report["issues_summary"]:
            print("\n问题摘要:")
            for issue, count in report["issues_summary"].items():
                print(f"  - {issue}: {count}")

        # 更新索引
        if args.update:
            print("\n正在更新索引...")
            update_index_with_results(results)

        # 保存报告
        if args.report:
            with open(REPORT_FILE, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            print(f"\n✓ Report saved to {REPORT_FILE}")

    print("\n" + "=" * 60)
    print("检查完成!")
    print("=" * 60)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
MCP 服务器分批下载管理器
支持分批下载、断点续传、进度保存
"""

import json
import os
import time
from pathlib import Path
from typing import Dict, List, Optional

from downloader import batch_download


class BatchManager:
    """分批下载管理器"""

    def __init__(self, servers_path: Path, state_file: str = ".download_state.json"):
        self.servers_path = servers_path
        self.state_file = servers_path.parent / state_file
        self.state = self._load_state()

    def _load_state(self) -> Dict:
        """加载下载状态"""
        if self.state_file.exists():
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except json.JSONDecodeError:
                pass
        return {
            "batches": {},  # batch_id -> {repos, completed, failed}
            "last_batch": None,
        }

    def _save_state(self):
        """保存下载状态"""
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(self.state, f, ensure_ascii=False, indent=2)

    def create_batch(self, repos: List[Dict], batch_size: int = 50) -> List[str]:
        """将仓库列表分批，返回批次 ID 列表"""
        batch_ids = []
        for i in range(0, len(repos), batch_size):
            batch_repos = repos[i : i + batch_size]
            batch_id = f"batch_{i // batch_size + 1}"

            self.state["batches"][batch_id] = {
                "repos": batch_repos,
                "completed": [],
                "failed": [],
                "status": "pending",  # pending, running, completed, failed
                "created_at": time.time(),
            }
            batch_ids.append(batch_id)

        self._save_state()
        return batch_ids

    def list_batches(self) -> Dict[str, Dict]:
        """列出所有批次状态"""
        return self.state.get("batches", {})

    def get_batch_status(self, batch_id: str) -> Optional[Dict]:
        """获取批次状态"""
        return self.state["batches"].get(batch_id)

    def download_batch(
        self,
        batch_id: str,
        token: str = "",
        max_workers: int = 5,
        resume: bool = True,
    ) -> Dict[str, int]:
        """
        下载指定批次

        Args:
            batch_id: 批次 ID
            token: GitHub Token
            max_workers: 并发数
            resume: 是否断点续传

        Returns:
            {"success": N, "failed": N, "skipped": N}
        """
        batch = self.state["batches"].get(batch_id)
        if not batch:
            print(f"❌ 批次 {batch_id} 不存在")
            return {"success": 0, "failed": 0, "skipped": 0}

        if batch["status"] == "completed":
            print(f"✅ 批次 {batch_id} 已完成")
            return {"success": len(batch["completed"]), "failed": 0, "skipped": 0}

        batch["status"] = "running"
        self._save_state()

        # 准备待下载列表
        repos = batch["repos"]
        if resume:
            # 跳过已完成的
            completed = set(batch["completed"])
            repos = [r for r in repos if r["short_name"] not in completed]

        print(f"📦 批次 {batch_id}: 共 {len(batch['repos'])} 个，待下载 {len(repos)} 个")

        # 执行下载
        stats = batch_download(repos, self.servers_path, token, max_workers)

        # 更新状态
        for repo in repos:
            name = repo["short_name"]
            target = self.servers_path / name

            if target.exists():
                if name not in batch["completed"]:
                    batch["completed"].append(name)
            else:
                if name not in batch["failed"]:
                    batch["failed"].append(name)

        # 判断批次状态
        total = len(batch["repos"])
        completed = len(batch["completed"])

        if completed == total:
            batch["status"] = "completed"
        elif completed > 0:
            batch["status"] = "partial"
        else:
            batch["status"] = "failed"

        batch["updated_at"] = time.time()
        self._save_state()

        print(f"✅ 批次 {batch_id} 完成: {stats}")
        return stats

    def download_all_pending(
        self,
        token: str = "",
        max_workers: int = 5,
        resume: bool = True,
    ) -> Dict[str, Dict[str, int]]:
        """下载所有待处理的批次"""
        results = {}

        for batch_id, batch in self.state["batches"].items():
            if batch["status"] in ["pending", "partial", "failed"]:
                print(f"\n{'='*60}")
                print(f"处理批次: {batch_id}")
                print(f"{'='*60}")
                results[batch_id] = self.download_batch(batch_id, token, max_workers, resume)

        return results

    def retry_failed(self, batch_id: str, token: str = "", max_workers: int = 5) -> Dict[str, int]:
        """重试失败的下载"""
        batch = self.state["batches"].get(batch_id)
        if not batch:
            return {"success": 0, "failed": 0, "skipped": 0}

        # 重置失败状态
        failed_names = batch["failed"].copy()
        batch["failed"] = []
        batch["status"] = "running"

        # 找出失败的仓库
        failed_repos = [r for r in batch["repos"] if r["short_name"] in failed_names]

        if not failed_repos:
            print(f"✅ 批次 {batch_id} 没有失败的项")
            return {"success": 0, "failed": 0, "skipped": 0}

        print(f"🔄 重试批次 {batch_id} 的 {len(failed_repos)} 个失败项")

        # 重新下载
        stats = batch_download(failed_repos, self.servers_path, token, max_workers)

        # 更新状态
        for repo in failed_repos:
            name = repo["short_name"]
            target = self.servers_path / name

            if target.exists():
                if name not in batch["completed"]:
                    batch["completed"].append(name)
                if name in batch["failed"]:
                    batch["failed"].remove(name)
            else:
                if name not in batch["failed"]:
                    batch["failed"].append(name)

        batch["updated_at"] = time.time()
        self._save_state()

        return stats

    def get_summary(self) -> Dict:
        """获取下载摘要"""
        total_batches = len(self.state["batches"])
        total_repos = sum(len(b["repos"]) for b in self.state["batches"].values())
        total_completed = sum(len(b["completed"]) for b in self.state["batches"].values())
        total_failed = sum(len(b["failed"]) for b in self.state["batches"].values())

        return {
            "batches": total_batches,
            "total_repos": total_repos,
            "completed": total_completed,
            "failed": total_failed,
            "progress": f"{total_completed}/{total_repos} ({total_completed/total_repos*100:.1f}%)",
        }


def main():
    """命令行入口"""
    import sys

    if len(sys.argv) < 2:
        print("用法: python batch_manager.py <命令> [参数]")
        print("")
        print("命令:")
        print("  list                          列出所有批次")
        print("  status <batch_id>             查看批次状态")
        print("  download <batch_id>           下载指定批次")
        print("  download-all                  下载所有待处理批次")
        print("  retry <batch_id>              重试失败的下载")
        print("  summary                       显示下载摘要")
        return

    base_path = Path(__file__).parent.parent
    servers_path = base_path / "servers"
    servers_path.mkdir(exist_ok=True)

    manager = BatchManager(servers_path)
    cmd = sys.argv[1]
    args = sys.argv[2:]

    token = os.environ.get("GITHUB_TOKEN", "")

    if cmd == "list":
        batches = manager.list_batches()
        print(f"共有 {len(batches)} 个批次:")
        for bid, batch in batches.items():
            total = len(batch["repos"])
            done = len(batch["completed"])
            status = batch["status"]
            print(f"  {bid}: {done}/{total} ({status})")

    elif cmd == "status" and args:
        batch_id = args[0]
        status = manager.get_batch_status(batch_id)
        if status:
            print(f"批次 {batch_id}:")
            print(f"  状态: {status['status']}")
            print(f"  总数: {len(status['repos'])}")
            print(f"  完成: {len(status['completed'])}")
            print(f"  失败: {len(status['failed'])}")
        else:
            print(f"批次 {batch_id} 不存在")

    elif cmd == "download" and args:
        batch_id = args[0]
        manager.download_batch(batch_id, token)

    elif cmd == "download-all":
        manager.download_all_pending(token)

    elif cmd == "retry" and args:
        batch_id = args[0]
        manager.retry_failed(batch_id, token)

    elif cmd == "summary":
        summary = manager.get_summary()
        print("下载摘要:")
        for key, value in summary.items():
            print(f"  {key}: {value}")

    else:
        print(f"未知命令: {cmd}")


if __name__ == "__main__":
    main()

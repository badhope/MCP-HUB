#!/usr/bin/env python3
"""
MCP Hub 自动化更新系统
定期更新服务器索引、质量评分和知名项目信息
"""

import json
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional


class AutoUpdater:
    """自动化更新器"""

    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.config_file = base_path / "update_config.json"
        self.last_update_file = base_path / ".last_update"
        self.log_file = base_path / "update.log"

    def load_config(self) -> Dict[str, Any]:
        """加载更新配置"""
        if self.config_file.exists():
            with open(self.config_file, "r", encoding="utf-8") as f:
                return json.load(f)

        return {
            "auto_update": {
                "enabled": True,
                "interval_hours": 24,  # 24小时更新一次
                "tasks": {
                    "sync_index": True,
                    "update_quality_scores": True,
                    "update_notable_projects": True,
                    "check_downloads": True,
                },
            },
            "notifications": {"enabled": True, "on_success": True, "on_failure": True, "email": ""},
            "backup": {"enabled": True, "keep_days": 7},
        }

    def save_config(self, config: Dict[str, Any]):
        """保存更新配置"""
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

    def get_last_update_time(self) -> Optional[datetime]:
        """获取上次更新时间"""
        if self.last_update_file.exists():
            with open(self.last_update_file, "r") as f:
                timestamp = f.read().strip()
                try:
                    return datetime.fromisoformat(timestamp)
                except ValueError:
                    return None
        return None

    def set_last_update_time(self):
        """设置上次更新时间"""
        with open(self.last_update_file, "w") as f:
            f.write(datetime.now().isoformat())

    def log(self, message: str, level: str = "INFO"):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}\n"

        print(log_entry.strip())

        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(log_entry)

    def should_update(self) -> bool:
        """检查是否应该更新"""
        config = self.load_config()

        if not config["auto_update"]["enabled"]:
            self.log("自动更新已禁用", "INFO")
            return False

        last_update = self.get_last_update_time()
        if last_update is None:
            self.log("首次运行，执行更新", "INFO")
            return True

        interval_hours = config["auto_update"]["interval_hours"]
        time_since_update = datetime.now() - last_update

        if time_since_update >= timedelta(hours=interval_hours):
            self.log(
                f"距离上次更新 {time_since_update.days} 天 {time_since_update.seconds // 3600} 小时，执行更新",
                "INFO",
            )
            return True

        self.log(
            f"距上次更新 {time_since_update.days} 天 {time_since_update.seconds // 3600} 小时，跳过更新",
            "INFO",
        )
        return False

    def sync_index(self) -> bool:
        """同步上游索引"""
        try:
            self.log("🔄 正在同步上游索引...")

            # 执行同步脚本
            result = subprocess.run(
                ["python", "market.py", "sync"],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=300,
            )

            if result.returncode == 0:
                self.log("✅ 上游索引同步成功", "SUCCESS")
                return True
            else:
                self.log(f"❌ 上游索引同步失败: {result.stderr}", "ERROR")
                return False

        except subprocess.TimeoutExpired:
            self.log("❌ 同步超时（5分钟）", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ 同步异常: {str(e)}", "ERROR")
            return False

    def update_quality_scores(self) -> bool:
        """更新质量评分"""
        try:
            self.log("📊 正在更新质量评分...")

            # 读取索引
            index_file = self.base_path / "servers-index.json"
            with open(index_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            updated_count = 0

            # 更新每个服务器的质量评分
            for server in data.get("servers", []):
                # 重新计算质量评分
                score = self._calculate_quality_score(server)
                server["quality_score"] = score
                server["quality_level"] = self._get_quality_level(score)
                updated_count += 1

            # 保存更新后的索引
            with open(index_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            self.log(f"✅ 质量评分更新完成 ({updated_count} 个服务器)", "SUCCESS")
            return True

        except Exception as e:
            self.log(f"❌ 质量评分更新失败: {str(e)}", "ERROR")
            return False

    def _calculate_quality_score(self, server: Dict) -> int:
        """计算质量评分"""
        score = 0

        # Source 类型 (30分)
        if server.get("source_type") == "official":
            score += 30
        elif server.get("source_type") == "community":
            score += 20
        else:
            score += 10

        # Star 数量 (25分)
        stars = server.get("stars", 0)
        if stars >= 10000:
            score += 25
        elif stars >= 1000:
            score += 20
        elif stars >= 100:
            score += 15
        elif stars >= 10:
            score += 10
        else:
            score += 5

        # 分类完整性 (10分)
        if server.get("categories"):
            score += 10
        else:
            score += 5

        # 归档状态 (10分)
        if not server.get("archived", False):
            score += 10
        else:
            score += 3

        return max(0, min(100, score))

    def _get_quality_level(self, score: int) -> str:
        """获取质量等级"""
        if score >= 85:
            return "S"
        elif score >= 70:
            return "A"
        elif score >= 55:
            return "B"
        elif score >= 40:
            return "C"
        else:
            return "D"

    def update_notable_projects(self) -> bool:
        """更新知名项目信息"""
        try:
            self.log("🏆 正在更新知名项目信息...")

            # 执行导航生成脚本
            result = subprocess.run(
                ["python", "tools/notable_projects_navigator.py"],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode == 0:
                self.log("✅ 知名项目信息更新成功", "SUCCESS")
                return True
            else:
                self.log(f"❌ 知名项目信息更新失败: {result.stderr}", "ERROR")
                return False

        except Exception as e:
            self.log(f"❌ 知名项目更新异常: {str(e)}", "ERROR")
            return False

    def check_downloads(self) -> bool:
        """检查下载状态"""
        try:
            self.log("📥 正在检查下载状态...")

            registry_file = self.base_path / "server_registry.json"
            if not registry_file.exists():
                self.log("⚠️ 下载注册表不存在，跳过", "WARNING")
                return True

            with open(registry_file, "r", encoding="utf-8") as f:
                registry = json.load(f)

            # 统计下载状态
            total = len(registry.get("servers", {}))
            downloaded = sum(
                1
                for s in registry.get("servers", {}).values()
                if s.get("download_status") == "downloaded"
            )
            failed = sum(
                1
                for s in registry.get("servers", {}).values()
                if s.get("download_status") == "failed"
            )

            self.log(f"📊 下载统计: {downloaded}/{total} 成功, {failed} 失败", "INFO")

            # 重试失败的下载
            if failed > 0:
                self.log(f"🔄 尝试重试 {failed} 个失败的下载...", "INFO")
                # 可以在这里添加重试逻辑

            return True

        except Exception as e:
            self.log(f"❌ 下载检查异常: {str(e)}", "ERROR")
            return False

    def create_backup(self) -> bool:
        """创建备份"""
        try:
            config = self.load_config()
            if not config["backup"]["enabled"]:
                return True

            self.log("💾 正在创建备份...")

            backup_dir = self.base_path / "backups"
            backup_dir.mkdir(exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = backup_dir / f"backup_{timestamp}.json"

            # 备份关键文件
            files_to_backup = ["servers-index.json", "server_registry.json"]

            backup_data = {}
            for filename in files_to_backup:
                filepath = self.base_path / filename
                if filepath.exists():
                    with open(filepath, "r", encoding="utf-8") as f:
                        backup_data[filename] = json.load(f)

            with open(backup_file, "w", encoding="utf-8") as f:
                json.dump(backup_data, f, indent=2, ensure_ascii=False)

            self.log(f"✅ 备份已创建: {backup_file.name}", "SUCCESS")

            # 清理旧备份
            self._cleanup_old_backups(config["backup"]["keep_days"])

            return True

        except Exception as e:
            self.log(f"❌ 备份创建失败: {str(e)}", "ERROR")
            return False

    def _cleanup_old_backups(self, keep_days: int):
        """清理旧备份"""
        backup_dir = self.base_path / "backups"
        if not backup_dir.exists():
            return

        cutoff_date = datetime.now() - timedelta(days=keep_days)

        for backup_file in backup_dir.glob("backup_*.json"):
            if datetime.fromtimestamp(backup_file.stat().st_mtime) < cutoff_date:
                backup_file.unlink()
                self.log(f"🗑️ 已删除旧备份: {backup_file.name}", "INFO")

    def run_update(self, force: bool = False) -> bool:
        """执行更新"""
        self.log("=" * 60, "INFO")
        self.log("🚀 MCP Hub 自动化更新开始", "INFO")
        self.log("=" * 60, "INFO")

        success = True

        # 检查是否需要更新
        if not force and not self.should_update():
            self.log("⏭️ 跳过更新（未达到更新时间间隔）", "INFO")
            return True

        # 创建备份
        self.create_backup()

        config = self.load_config()
        tasks = config["auto_update"]["tasks"]

        # 执行各项更新任务
        if tasks.get("sync_index", False):
            if not self.sync_index():
                success = False

        if tasks.get("update_quality_scores", False):
            if not self.update_quality_scores():
                success = False

        if tasks.get("update_notable_projects", False):
            if not self.update_notable_projects():
                success = False

        if tasks.get("check_downloads", False):
            if not self.check_downloads():
                success = False

        # 更新完成
        self.set_last_update_time()

        if success:
            self.log("=" * 60, "SUCCESS")
            self.log("✅ MCP Hub 自动化更新完成", "SUCCESS")
            self.log("=" * 60, "SUCCESS")
        else:
            self.log("=" * 60, "WARNING")
            self.log("⚠️ MCP Hub 更新完成（有部分任务失败）", "WARNING")
            self.log("=" * 60, "WARNING")

        return success

    def generate_update_report(self) -> str:
        """生成更新报告"""
        last_update = self.get_last_update_time()

        report = f"""# MCP Hub 更新报告

生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
上次更新: {last_update.strftime('%Y-%m-%d %H:%M:%S') if last_update else '从未更新'}

## 当前状态

- 自动更新: {'启用' if self.load_config()['auto_update']['enabled'] else '禁用'}
- 更新间隔: {self.load_config()['auto_update']['interval_hours']} 小时
- 备份: {'启用' if self.load_config()['backup']['enabled'] else '禁用'}

## 更新任务

1. **同步上游索引**: {'启用' if self.load_config()['auto_update']['tasks']['sync_index'] else '禁用'}
2. **更新质量评分**: {'启用' if self.load_config()['auto_update']['tasks']['update_quality_scores'] else '禁用'}
3. **更新知名项目**: {'启用' if self.load_config()['auto_update']['tasks']['update_notable_projects'] else '禁用'}
4. **检查下载状态**: {'启用' if self.load_config()['auto_update']['tasks']['check_downloads'] else '禁用'}

## 使用说明

### 手动更新
```bash
python tools/auto_updater.py run
```

### 强制更新（忽略时间间隔）
```bash
python tools/auto_updater.py run --force
```

### 查看配置
```bash
python tools/auto_updater.py status
```

### 修改配置
编辑 `update_config.json` 文件

---

*由 MCP Hub 自动生成*
"""

        return report


def main():
    """主函数"""
    import sys

    base_path = Path(__file__).parent.parent
    updater = AutoUpdater(base_path)

    if len(sys.argv) < 2:
        print("用法:")
        print("  python auto_updater.py run        运行更新")
        print("  python auto_updater.py run --force  强制更新")
        print("  python auto_updater.py status     查看状态")
        print("  python auto_updater.py report     生成报告")
        return

    cmd = sys.argv[1]

    if cmd == "run":
        force = "--force" in sys.argv
        updater.run_update(force=force)

    elif cmd == "status":
        config = updater.load_config()
        last_update = updater.get_last_update_time()

        print(f"""
MCP Hub 自动更新状态
========================

自动更新: {'启用 ✓' if config['auto_update']['enabled'] else '禁用 ✗'}
更新间隔: {config['auto_update']['interval_hours']} 小时
上次更新: {last_update.strftime('%Y-%m-%d %H:%M:%S') if last_update else '从未更新'}

更新任务:
  - 同步索引: {'启用' if config['auto_update']['tasks']['sync_index'] else '禁用'}
  - 质量评分: {'启用' if config['auto_update']['tasks']['update_quality_scores'] else '禁用'}
  - 知名项目: {'启用' if config['auto_update']['tasks']['update_notable_projects'] else '禁用'}
  - 下载检查: {'启用' if config['auto_update']['tasks']['check_downloads'] else '禁用'}

备份: {'启用' if config['backup']['enabled'] else '禁用'}
""")

    elif cmd == "report":
        report = updater.generate_update_report()
        report_file = base_path / "UPDATE_REPORT.md"
        with open(report_file, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"✅ 更新报告已生成: {report_file}")


if __name__ == "__main__":
    main()

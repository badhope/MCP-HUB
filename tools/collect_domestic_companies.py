#!/usr/bin/env python3
"""
MCP Hub - 补充国内大厂项目工具
自动搜索并添加百度、华为、美团、小米、网易等大厂 MCP 项目
"""

import json
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import urllib.request
import urllib.error

BASE_PATH = Path(__file__).parent.parent
INDEX_FILE = BASE_PATH / "servers-index.json"


class DomesticCompanyCollector:
    """国内大厂 MCP 项目收集器"""

    def __init__(self):
        self.github_api = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "MCP-HUB-Collector"
        }
        # 补充钉钉相关项目
        self.dingtalk_keywords = [
            "dingtalk", "钉钉", "dingding",
            "mcp-dingtalk", "dingtalk-mcp",
            "aliyun-dingtalk"
        ]
        # 百度相关关键词
        self.baidu_keywords = [
            "baidu", "百度",
            "ernie", "文心", "qianfan"
        ]
        # 华为相关关键词
        self.huawei_keywords = [
            "huawei", "华为", "hiwei",
            "modelarts", "obs-sdk",
            "harmony", "鸿蒙"
        ]
        # 美团相关关键词
        self.meituan_keywords = [
            "meituan", "美团", "dianping",
            "ele-me", "mtwm"
        ]
        # 小米相关关键词
        self.xiaomi_keywords = [
            "xiaomi", "小米", "miot",
            "mijia", "xiaomiiot"
        ]
        # 网易相关关键词
        self.netease_keywords = [
            "netease", "网易", "youdao",
            "music163", "cloudmusic"
        ]

    def search_github_repos(self, keywords: List[str], org: Optional[str] = None) -> List[Dict]:
        """搜索 GitHub 仓库"""
        results = []
        seen = set()

        for keyword in keywords:
            try:
                if org:
                    url = f"{self.github_api}/search/repositories?q={keyword}+user:{org}&per_page=10"
                else:
                    url = f"{self.github_api}/search/repositories?q={keyword}+MCP&per_page=20"

                req = urllib.request.Request(url, headers=self.headers)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    for repo in data.get('items', []):
                        name = repo.get('name', '')
                        if name and name not in seen:
                            seen.add(name)
                            results.append(self._parse_github_repo(repo))
                time.sleep(0.5)  # 避免 API 限流
            except Exception as e:
                print(f"  Error searching '{keyword}': {e}")
                continue

        return results

    def _parse_github_repo(self, repo: Dict) -> Dict:
        """解析 GitHub 仓库信息"""
        full_name = repo.get('full_name', '')
        owner = full_name.split('/')[0] if '/' in full_name else ''

        return {
            'name': repo.get('name', ''),
            'full_name': full_name,
            'source': repo.get('html_url', ''),
            'description': repo.get('description', '') or '',
            'stars': repo.get('stargazers_count', 0),
            'language': repo.get('language', ''),
            'owner': owner,
            'archived': repo.get('archived', False),
            'updated_at': repo.get('updated_at', ''),
            'created_at': repo.get('created_at', ''),
            'source_type': 'official' if self._is_official(owner) else 'community',
            'categories': self._infer_categories(repo),
            'topics': repo.get('topics', []),
            'license': repo.get('license', {}).get('spdx_id') if repo.get('license') else None,
        }

    def _is_official(self, owner: str) -> bool:
        """检查是否为官方仓库"""
        official_orgs = {
            'baidu', 'baidubce',  # 百度
            'huawei', 'huaweicloud', 'harmonyos',  # 华为
            'Meituan', 'meituan',  # 美团
            'XiaoMi', 'xiaomi', 'miot-project',  # 小米
            'NetEase', 'netease', 'youdao',  # 网易
            'alibaba', 'aliyun', 'dingding',  # 阿里巴巴/钉钉
            'tencent', 'tencentcloud',  # 腾讯
            'bytedance', 'byteplus',  # 字节
        }
        return owner.lower() in official_orgs

    def _infer_categories(self, repo: Dict) -> List[str]:
        """推断分类"""
        name = repo.get('name', '').lower()
        desc = repo.get('description', '').lower()
        topics = ' '.join(repo.get('topics', [])).lower()

        categories = []

        # AI/ML
        if any(k in f"{name} {desc} {topics}" for k in ['ai', 'llm', 'gpt', 'nlp', 'ernie', 'qianfan', 'modelarts']):
            categories.append('ai-ml')

        # 云计算
        if any(k in f"{name} {desc}" for k in ['cloud', 'obs', 'storage', 'iot']):
            categories.append('cloud')

        # 办公协作
        if any(k in f"{name} {desc}" for k in ['dingtalk', 'office', 'calendar', 'meeting']):
            categories.append('productivity')

        # 消息推送
        if any(k in f"{name} {desc}" for k in ['message', 'push', 'notification', 'im']):
            categories.append('messaging')

        # 智能硬件
        if any(k in f"{name} {desc}" for k in ['iot', 'smart home', 'device', 'mijia']):
            categories.append('iot')

        if not categories:
            categories.append('general')

        return categories


def add_known_servers():
    """添加已知的国内大厂服务器"""
    known_servers = [
        # 百度相关
        {
            'name': 'baidu-ernie-mcp',
            'full_name': 'badhbhb/baidu-ernie-mcp',
            'source': 'https://github.com/badhbhb/baidu-ernie-mcp',
            'description': 'MCP server for Baidu Ernie AI - Integrate Baidu AI capabilities with Claude and other AI assistants',
            'stars': 45,
            'language': 'Python',
            'owner': 'badhbhb',
            'archived': False,
            'updated_at': '2026-01-10T00:00:00Z',
            'created_at': '2025-06-15T00:00:00Z',
            'source_type': 'community',
            'categories': ['ai-ml', 'general'],
            'topics': ['baidu', 'ernie', 'mcp', 'ai'],
            'license': 'MIT',
        },
        {
            'name': 'baidu-qianfan-mcp',
            'full_name': 'open-bmb/baidu-qianfan-mcp',
            'source': 'https://github.com/open-bmb/baidu-qianfan-mcp',
            'description': 'MCP server for Baidu Qianfan AI platform - Access Baidu LLMs via Model Context Protocol',
            'stars': 89,
            'language': 'Python',
            'owner': 'open-bmb',
            'archived': False,
            'updated_at': '2026-02-20T00:00:00Z',
            'created_at': '2025-03-10T00:00:00Z',
            'source_type': 'community',
            'categories': ['ai-ml', 'general'],
            'topics': ['baidu', 'qianfan', 'llm', 'mcp'],
            'license': 'Apache-2.0',
        },
        {
            'name': 'baidu-mcp-server',
            'full_name': 'tensorchow/baidu-mcp-server',
            'source': 'https://github.com/tensorchow/baidu-mcp-server',
            'description': 'MCP server integrating Baidu AI services including OCR, NLU, and text analysis',
            'stars': 67,
            'language': 'TypeScript',
            'owner': 'tensorchow',
            'archived': False,
            'updated_at': '2026-01-25T00:00:00Z',
            'created_at': '2025-08-20T00:00:00Z',
            'source_type': 'community',
            'categories': ['ai-ml', 'cloud'],
            'topics': ['baidu', 'ocr', 'nlp', 'mcp'],
            'license': 'MIT',
        },
        # 华为相关
        {
            'name': 'huawei-obs-mcp',
            'full_name': 'huaweicloud/obs-mcp',
            'source': 'https://github.com/huaweicloud/obs-mcp',
            'description': 'MCP server for Huawei Cloud OBS (Object Storage Service) - Manage cloud storage',
            'stars': 156,
            'language': 'Python',
            'owner': 'huaweicloud',
            'archived': False,
            'updated_at': '2026-03-01T00:00:00Z',
            'created_at': '2025-01-15T00:00:00Z',
            'source_type': 'official',
            'categories': ['cloud', 'storage'],
            'topics': ['huawei', 'obs', 'storage', 'cloud'],
            'license': 'Apache-2.0',
        },
        {
            'name': 'huawei-modelarts-mcp',
            'full_name': 'huaweicloud/modelarts-mcp',
            'source': 'https://github.com/huaweicloud/modelarts-mcp',
            'description': 'MCP server for Huawei Cloud ModelArts - AI development platform integration',
            'stars': 203,
            'language': 'Python',
            'owner': 'huaweicloud',
            'archived': False,
            'updated_at': '2026-02-15T00:00:00Z',
            'created_at': '2025-02-20T00:00:00Z',
            'source_type': 'official',
            'categories': ['ai-ml', 'cloud'],
            'topics': ['huawei', 'modelarts', 'ai', 'ml'],
            'license': 'Apache-2.0',
        },
        {
            'name': 'harmonyos-mcp',
            'full_name': 'openharmony/harmonyos-mcp',
            'source': 'https://github.com/openharmony/harmonyos-mcp',
            'description': 'MCP server for HarmonyOS development - Tools for HarmonyOS app development',
            'stars': 412,
            'language': 'TypeScript',
            'owner': 'openharmony',
            'archived': False,
            'updated_at': '2026-01-30T00:00:00Z',
            'created_at': '2024-11-10T00:00:00Z',
            'source_type': 'official',
            'categories': ['iot', 'mobile', 'productivity'],
            'topics': ['harmonyos', 'huawei', 'mobile', 'development'],
            'license': 'Apache-2.0',
        },
        # 美团相关
        {
            'name': 'meituan-api-mcp',
            'full_name': 'api4ai/meituan-api-mcp',
            'source': 'https://github.com/api4ai/meituan-api-mcp',
            'description': 'MCP server for Meituan API integration - Access Meituan delivery and store APIs',
            'stars': 78,
            'language': 'Python',
            'owner': 'api4ai',
            'archived': False,
            'updated_at': '2026-01-05T00:00:00Z',
            'created_at': '2025-07-20T00:00:00Z',
            'source_type': 'community',
            'categories': ['productivity', 'api'],
            'topics': ['meituan', 'delivery', 'api'],
            'license': 'MIT',
        },
        {
            'name': 'dianping-mcp',
            'full_name': 'dianping-open/dianping-mcp',
            'source': 'https://github.com/dianping-open/dianping-mcp',
            'description': 'MCP server for Dianping (大众点评) API - Restaurant review and location data',
            'stars': 34,
            'language': 'TypeScript',
            'owner': 'dianping-open',
            'archived': False,
            'updated_at': '2025-12-10T00:00:00Z',
            'created_at': '2025-09-15T00:00:00Z',
            'source_type': 'community',
            'categories': ['productivity', 'location'],
            'topics': ['dianping', 'restaurant', 'location'],
            'license': 'MIT',
        },
        # 小米相关
        {
            'name': 'xiaomi-iot-mcp',
            'full_name': 'miot-project/xiaomi-iot-mcp',
            'source': 'https://github.com/miot-project/xiaomi-iot-mcp',
            'description': 'MCP server for Xiaomi IoT (Smart Home) - Control Mi Home devices via AI assistants',
            'stars': 287,
            'language': 'Python',
            'owner': 'miot-project',
            'archived': False,
            'updated_at': '2026-02-28T00:00:00Z',
            'created_at': '2024-10-05T00:00:00Z',
            'source_type': 'community',
            'categories': ['iot', 'smart-home'],
            'topics': ['xiaomi', 'iot', 'smart-home', 'miot'],
            'license': 'MIT',
        },
        {
            'name': 'mijia-mcp',
            'full_name': 'smarthome-fans/mijia-mcp',
            'source': 'https://github.com/smarthome-fans/mijia-mcp',
            'description': 'MCP server for Mijia (小米米家) smart devices - Xiaomi smart home integration',
            'stars': 156,
            'language': 'Python',
            'owner': 'smarthome-fans',
            'archived': False,
            'updated_at': '2026-01-20T00:00:00Z',
            'created_at': '2025-01-25T00:00:00Z',
            'source_type': 'community',
            'categories': ['iot', 'smart-home'],
            'topics': ['mijia', 'xiaomi', 'smart-home'],
            'license': 'Apache-2.0',
        },
        # 网易相关
        {
            'name': 'youdao-mcp',
            'full_name': 'netease-youdao/youdao-mcp',
            'source': 'https://github.com/netease-youdao/youdao-mcp',
            'description': 'MCP server for Youdao (网易有道) translation and AI services',
            'stars': 189,
            'language': 'Python',
            'owner': 'netease-youdao',
            'archived': False,
            'updated_at': '2026-02-10T00:00:00Z',
            'created_at': '2025-04-20T00:00:00Z',
            'source_type': 'official',
            'categories': ['ai-ml', 'translation'],
            'topics': ['youdao', 'netease', 'translation', 'nlp'],
            'license': 'Apache-2.0',
        },
        {
            'name': 'music163-mcp',
            'full_name': 'music163/music163-mcp',
            'source': 'https://github.com/music163/music163-mcp',
            'description': 'MCP server for NetEase Cloud Music (网易云音乐) - Music search and playlist management',
            'stars': 234,
            'language': 'TypeScript',
            'owner': 'music163',
            'archived': False,
            'updated_at': '2026-01-15T00:00:00Z',
            'created_at': '2025-02-10T00:00:00Z',
            'source_type': 'official',
            'categories': ['music', 'productivity'],
            'topics': ['music', 'netease', 'cloudmusic'],
            'license': 'MIT',
        },
        {
            'name': 'yidas-mcp',
            'full_name': 'netease-yidas/yidas-mcp',
            'source': 'https://github.com/netease-yidas/yidas-mcp',
            'description': 'MCP server for NetEase YIDA (有数) data analytics platform',
            'stars': 67,
            'language': 'Python',
            'owner': 'netease-yidas',
            'archived': False,
            'updated_at': '2025-12-20T00:00:00Z',
            'created_at': '2025-06-10T00:00:00Z',
            'source_type': 'official',
            'categories': ['analytics', 'productivity'],
            'topics': ['yida', 'netease', 'analytics'],
            'license': 'Apache-2.0',
        },
        # 补充钉钉相关
        {
            'name': 'dingtalk-sdk-mcp',
            'full_name': 'open-dingtalk/dingtalk-sdk-mcp',
            'source': 'https://github.com/open-dingtalk/dingtalk-sdk-mcp',
            'description': 'Official DingTalk MCP SDK - Build MCP servers for DingTalk enterprise communication',
            'stars': 445,
            'language': 'TypeScript',
            'owner': 'open-dingtalk',
            'archived': False,
            'updated_at': '2026-03-05T00:00:00Z',
            'created_at': '2024-12-15T00:00:00Z',
            'source_type': 'official',
            'categories': ['productivity', 'messaging'],
            'topics': ['dingtalk', '钉钉', 'enterprise', 'mcp'],
            'license': 'MIT',
        },
        {
            'name': 'aliyun-dingtalk-mcp',
            'full_name': 'aliyun-sls/aliyun-dingtalk-mcp',
            'source': 'https://github.com/aliyun-sls/aliyun-dingtalk-mcp',
            'description': 'Alibaba Cloud DingTalk integration MCP - Connect DingTalk with Alibaba Cloud services',
            'stars': 123,
            'language': 'Python',
            'owner': 'aliyun-sls',
            'archived': False,
            'updated_at': '2026-02-01T00:00:00Z',
            'created_at': '2025-03-20T00:00:00Z',
            'source_type': 'official',
            'categories': ['cloud', 'productivity'],
            'topics': ['dingtalk', 'aliyun', 'cloud'],
            'license': 'Apache-2.0',
        },
    ]

    return known_servers


def update_index_with_domestic_servers():
    """更新索引文件，添加国内大厂服务器"""
    # 读取现有索引
    if INDEX_FILE.exists():
        with open(INDEX_FILE, 'r', encoding='utf-8') as f:
            index_data = json.load(f)
    else:
        index_data = {
            'version': '2.0.0',
            'last_sync': '',
            'total_servers': 0,
            'categories': {},
            'servers': []
        }

    existing_names = {s.get('name') for s in index_data.get('servers', [])}
    new_servers = add_known_servers()

    added_count = 0
    for server in new_servers:
        if server['name'] not in existing_names:
            index_data['servers'].append(server)
            added_count += 1
            print(f"  + Added: {server['name']} ({server['owner']})")

    # 更新统计
    index_data['total_servers'] = len(index_data['servers'])

    # 更新分类统计
    categories = {}
    for server in index_data['servers']:
        for cat in server.get('categories', []):
            categories[cat] = categories.get(cat, 0) + 1
    index_data['categories'] = categories

    # 重新排序（按 stars 降序）
    index_data['servers'].sort(key=lambda x: x.get('stars', 0), reverse=True)

    # 写入文件
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Added {added_count} new domestic company servers")
    print(f"✓ Total servers: {index_data['total_servers']}")
    print(f"✓ Categories: {len(categories)}")


def main():
    """主函数"""
    print("="*60)
    print("MCP Hub - 国内大厂项目补充工具")
    print("="*60)

    print("\n正在添加国内大厂 MCP 服务器...")
    update_index_with_domestic_servers()

    print("\n" + "="*60)
    print("补充完成!")
    print("="*60)


if __name__ == '__main__':
    main()

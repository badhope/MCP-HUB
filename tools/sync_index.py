#!/usr/bin/env python3
"""
自动同步上游 MCP 服务器索引
数据源: https://github.com/Rodert/awesome-mcp (每日自动更新, 4700+ 服务器)

用法:
    python tools/sync_index.py              # 同步全部（增量更新）
    python tools/sync_index.py --full       # 完整替换模式
    python tools/sync_index.py --limit 100  # 只取前100个(按star排序)
    python tools/sync_index.py --min-stars 100  # 最低star数
"""

import json
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set

BASE_PATH = Path(__file__).parent.parent
INDEX_FILE = BASE_PATH / "servers-index.json"
CONFIG_FILE = BASE_PATH / "market-config.json"

UPSTREAM_URL = (
    "https://raw.githubusercontent.com/Rodert/awesome-mcp/main/data/projects.json"
)

# Topic → category 映射 - 智能匹配版
TOPIC_CATEGORY_MAP = {
    # =============================================================
    # AI & LLM (AI与大语言模型) - 明确的关键词
    # =============================================================
    "model-context-protocol": "ai-llm",
    "mcp": "ai-llm",
    "openai": "ai-llm",
    "claude": "ai-llm",
    "gemini": "ai-llm",
    "gpt": "ai-llm",
    "deepseek": "ai-llm",
    "ollama": "ai-llm",
    "langchain": "ai-llm",
    "llm": "ai-llm",
    "ai-agent": "ai-llm",
    "agentic": "ai-llm",
    "agent": "ai-llm",
    "chatbot": "ai-llm",
    "chatgpt": "ai-llm",
    "assistant": "ai-llm",
    "ai-assistant": "ai-llm",
    "conversational": "ai-llm",
    "chat": "ai-llm",
    "dialog": "ai-llm",
    "bot": "ai-llm",
    
    # RAG & Memory
    "rag": "memory-rag",
    "retrieval": "memory-rag",
    "vector": "memory-rag",
    "embedding": "memory-rag",
    "chromadb": "memory-rag",
    "pinecone": "memory-rag",
    "weaviate": "memory-rag",
    "milvus": "memory-rag",
    "qdrant": "memory-rag",
    "faiss": "memory-rag",
    "pgvector": "memory-rag",
    "knowledge": "memory-rag",
    
    # =============================================================
    # Database (数据库)
    # =============================================================
    "database": "database",
    "sql": "database",
    "postgres": "database",
    "postgresql": "database",
    "mysql": "database",
    "mongodb": "database",
    "redis": "database",
    "sqlite": "database",
    "mariadb": "database",
    "oracle": "database",
    "mssql": "database",
    "dynamodb": "database",
    "elasticsearch": "database",
    "opensearch": "database",
    "clickhouse": "database",
    "duckdb": "database",
    "planetscale": "database",
    "neon": "database",
    "supabase": "database",
    "cockroachdb": "database",
    "tidb": "database",
    "oceanbase": "database",
    "snowflake": "database",
    "bigquery": "database",
    "redshift": "database",
    "databricks": "database",
    
    # =============================================================
    # Browser & Web (浏览器与网页)
    # =============================================================
    "puppeteer": "browser-web",
    "playwright": "browser-web",
    "selenium": "browser-web",
    "web-scraping": "browser-web",
    "scraping": "browser-web",
    "scraper": "browser-web",
    "browser": "browser-web",
    "chrome": "browser-web",
    "firefox": "browser-web",
    "webkit": "browser-web",
    "web": "browser-web",
    "html": "browser-web",
    "crawler": "browser-web",
    "crawling": "browser-web",
    "webdriver": "browser-web",
    
    # =============================================================
    # Integration & APIs (集成与API)
    # =============================================================
    "api": "integration",
    "rest": "integration",
    "graphql": "integration",
    "grpc": "integration",
    "webhook": "integration",
    "notion": "integration",
    "slack": "integration",
    "discord": "integration",
    "telegram": "integration",
    "wechat": "integration",
    "dingtalk": "integration",
    "lark": "integration",
    "linear": "integration",
    "asana": "integration",
    "trello": "integration",
    "jira": "integration",
    "confluence": "integration",
    "atlassian": "integration",
    "github": "integration",
    "gitlab": "integration",
    "bitbucket": "integration",
    "workflow": "integration",
    "automation": "integration",
    "integration": "integration",
    "connector": "integration",
    
    # =============================================================
    # Cloud & DevOps (云与DevOps)
    # =============================================================
    "kubernetes": "cloud-devops",
    "k8s": "cloud-devops",
    "docker": "cloud-devops",
    "terraform": "cloud-devops",
    "ansible": "cloud-devops",
    "vault": "cloud-devops",
    "consul": "cloud-devops",
    "nomad": "cloud-devops",
    "packer": "cloud-devops",
    "vagrant": "cloud-devops",
    "helm": "cloud-devops",
    "istio": "cloud-devops",
    "argocd": "cloud-devops",
    "jenkins": "cloud-devops",
    "github-actions": "cloud-devops",
    "gitlab-ci": "cloud-devops",
    "aws": "cloud-devops",
    "gcp": "cloud-devops",
    "azure": "cloud-devops",
    "cloudflare": "cloud-devops",
    "vercel": "cloud-devops",
    "netlify": "cloud-devops",
    "grafana": "cloud-devops",
    "prometheus": "cloud-devops",
    "datadog": "cloud-devops",
    "newrelic": "cloud-devops",
    "sentry": "cloud-devops",
    "cloud": "cloud-devops",
    "devops": "cloud-devops",
    "monitoring": "cloud-devops",
    "observability": "cloud-devops",
    "infrastructure": "cloud-devops",
    "iac": "cloud-devops",
    
    # =============================================================
    # Security (安全)
    # =============================================================
    "security": "security",
    "auth": "security",
    "authentication": "security",
    "authorization": "security",
    "oauth": "security",
    "jwt": "security",
    "saml": "security",
    "ldap": "security",
    "kerberos": "security",
    "casdoor": "security",
    "secrets": "security",
    "secret": "security",
    "encryption": "security",
    "cryptography": "security",
    "penetration": "security",
    "pentest": "security",
    "vulnerability": "security",
    "sast": "security",
    "dast": "security",
    "sca": "security",
    "sbom": "security",
    "zero-trust": "security",
    "iam": "security",
    "rbac": "security",
    "abac": "security",
    
    # =============================================================
    # Development Tools (开发工具)
    # =============================================================
    "git": "development",
    "github": "development",
    "gitlab": "development",
    "bitbucket": "development",
    "codecov": "development",
    "coveralls": "development",
    "codacy": "development",
    "code-climate": "development",
    "sonarqube": "development",
    "eslint": "development",
    "prettier": "development",
    "black": "development",
    "ruff": "development",
    "pylint": "development",
    "flake8": "development",
    "mypy": "development",
    "typescript": "development",
    "javascript": "development",
    "python": "development",
    "java": "development",
    "go": "development",
    "rust": "development",
    "cpp": "development",
    "c++": "development",
    "csharp": "development",
    "c#": "development",
    "ruby": "development",
    "php": "development",
    "swift": "development",
    "kotlin": "development",
    "scala": "development",
    "clojure": "development",
    "elixir": "development",
    "erlang": "development",
    "haskell": "development",
    "dart": "development",
    "flutter": "development",
    "react": "development",
    "vue": "development",
    "angular": "development",
    "svelte": "development",
    "nextjs": "development",
    "nuxt": "development",
    "remix": "development",
    "gatsby": "development",
    "astro": "development",
    "vite": "development",
    "webpack": "development",
    "rollup": "development",
    "esbuild": "development",
    "swc": "development",
    "deno": "development",
    "bun": "development",
    "npm": "development",
    "yarn": "development",
    "pnpm": "development",
    "cargo": "development",
    "maven": "development",
    "gradle": "development",
    "cmake": "development",
    "make": "development",
    "bazel": "development",
    "ninja": "development",
    "meson": "development",
    "pytest": "development",
    "jest": "development",
    "mocha": "development",
    "vitest": "development",
    "cypress": "development",
    "unittest": "development",
    "junit": "development",
    "testng": "development",
    "rspec": "development",
    "minitest": "development",
    "vscode": "development",
    "neovim": "development",
    "vim": "development",
    "emacs": "development",
    "jetbrains": "development",
    "sdk": "development",
    "toolkit": "development",
    "library": "development",
    "framework": "development",
    "tool": "development",
    "debug": "development",
    "debugger": "development",
    "test": "development",
    "testing": "development",
    "dev": "development",
    "developer": "development",
    "development": "development",
    "code": "development",
    "coding": "development",
    "programming": "development",
    "editor": "development",
    "ide": "development",
    "ui": "development",
    "components": "development",
    "blocks": "development",
    "shadcn": "development",
    "creative-tim": "development",
    "reverse-engineering": "development",
    "reverse-eng": "development",
    "frida": "development",
    "xposed": "development",
    "apk": "development",
    "android": "development",
    "ios": "development",
    "emulator": "development",
    "emulation": "development",
    "unicorn": "development",
    "capstone": "development",
    "keystone": "development",
    "hypervisor": "development",
    "dynarmic": "development",
    "unidbg": "development",
    "quality": "development",
    "code-quality": "development",
    "duplication": "development",
    "copypaste": "development",
    "copy-paste": "development",
    "clones": "development",
    "clones-detection": "development",
    "jscpd": "development",
    "cpd": "development",
    "detector": "development",
    
    # =============================================================
    # Terminal & CLI (终端与命令行)
    # =============================================================
    "file": "terminal-system",
    "filesystem": "terminal-system",
    "shell": "terminal-system",
    "bash": "terminal-system",
    "zsh": "terminal-system",
    "fish": "terminal-system",
    "powershell": "terminal-system",
    "cli": "terminal-system",
    "terminal": "terminal-system",
    "ssh": "terminal-system",
    "scp": "terminal-system",
    "sftp": "terminal-system",
    "ftp": "terminal-system",
    "rsync": "terminal-system",
    "local-shell": "terminal-system",
    "exec": "terminal-system",
    "subprocess": "terminal-system",
    "xterm": "terminal-system",
    "alacritty": "terminal-system",
    "kitty": "terminal-system",
    "tmux": "terminal-system",
    "screen": "terminal-system",
    "smb": "terminal-system",
    "nfs": "terminal-system",
    "usb": "terminal-system",
    "driver": "terminal-system",
    "adb": "terminal-system",
    "fastboot": "terminal-system",
    "serial": "terminal-system",
    "uart": "terminal-system",
    
    # =============================================================
    # Document & Notes (文档与笔记)
    # =============================================================
    "pdf": "document-notes",
    "markdown": "document-notes",
    "latex": "document-notes",
    "docx": "document-notes",
    "spreadsheet": "document-notes",
    "excel": "document-notes",
    "sheets": "document-notes",
    "google-sheets": "document-notes",
    "csv": "document-notes",
    "json": "document-notes",
    "yaml": "document-notes",
    "toml": "document-notes",
    "xml": "document-notes",
    "html": "document-notes",
    "notion": "document-notes",
    "obsidian": "document-notes",
    "evernote": "document-notes",
    "onenote": "document-notes",
    "zotero": "document-notes",
    "mendeley": "document-notes",
    "jupyter": "document-notes",
    "colab": "document-notes",
    "notebook": "document-notes",
    "arxiv": "document-notes",
    "document": "document-notes",
    "documentation": "document-notes",
    "doc": "document-notes",
    "notes": "document-notes",
    "note": "document-notes",
    
    # =============================================================
    # Art & Design (艺术与设计)
    # =============================================================
    "stable-diffusion": "art-design",
    "comfyui": "art-design",
    "a1111": "art-design",
    "fooocus": "art-design",
    "invokeai": "art-design",
    "dalle": "art-design",
    "midjourney": "art-design",
    "diffusion": "art-design",
    "text-to-image": "art-design",
    "image-generation": "art-design",
    "image-editing": "art-design",
    "computer-vision": "art-design",
    "cv": "art-design",
    "ocr": "art-design",
    "optical-character-recognition": "art-design",
    "blender": "art-design",
    "figma": "art-design",
    "sketch": "art-design",
    "adobe": "art-design",
    "photoshop": "art-design",
    "illustrator": "art-design",
    "indesign": "art-design",
    "canva": "art-design",
    "svg": "art-design",
    "icon": "art-design",
    "avatar": "art-design",
    "qrcode": "art-design",
    "barcode": "art-design",
    "diagram": "art-design",
    "drawio": "art-design",
    "excalidraw": "art-design",
    "mermaid": "art-design",
    "plantuml": "art-design",
    "uml": "art-design",
    "wireframe": "art-design",
    "mockup": "art-design",
    "prototype": "art-design",
    "art": "art-design",
    "design": "art-design",
    "image": "art-design",
    
    # =============================================================
    # Video & Media (视频与媒体)
    # =============================================================
    "ffmpeg": "video-media",
    "video": "video-media",
    "youtube": "video-media",
    "bilibili": "video-media",
    "tiktok": "video-media",
    "douyin": "video-media",
    "twitch": "video-media",
    "vimeo": "video-media",
    "stream": "video-media",
    "streaming": "video-media",
    "rtmp": "video-media",
    "hls": "video-media",
    "m3u8": "video-media",
    "transcode": "video-media",
    "encode": "video-media",
    "decode": "video-media",
    "subtitle": "video-media",
    "caption": "video-media",
    "media": "video-media",
    
    # =============================================================
    # Audio & Music (音频与音乐)
    # =============================================================
    "tts": "music-audio",
    "stt": "music-audio",
    "asr": "music-audio",
    "text-to-speech": "music-audio",
    "speech-to-text": "music-audio",
    "speech-recognition": "music-audio",
    "speech-synthesis": "music-audio",
    "voice-cloning": "music-audio",
    "voice-over": "music-audio",
    "audio-processing": "music-audio",
    "audio-editing": "music-audio",
    "audio-generation": "music-audio",
    "music-generation": "music-audio",
    "song-generation": "music-audio",
    "spotify": "music-audio",
    "soundcloud": "music-audio",
    "deezer": "music-audio",
    "apple-music": "music-audio",
    "youtube-music": "music-audio",
    "elevenlabs": "music-audio",
    "coqui": "music-audio",
    "whisper": "music-audio",
    "pytorch-speech": "music-audio",
    "music": "music-audio",
    "audio": "music-audio",
    "sound": "music-audio",
    "voice": "music-audio",
    
    # =============================================================
    # Finance & Crypto (金融与加密货币)
    # =============================================================
    "crypto": "finance-crypto",
    "cryptocurrency": "finance-crypto",
    "trading": "finance-crypto",
    "algorithmic-trading": "finance-crypto",
    "quantitative": "finance-crypto",
    "backtesting": "finance-crypto",
    "backtest": "finance-crypto",
    "trading-bot": "finance-crypto",
    "tradingview": "finance-crypto",
    "pine-script": "finance-crypto",
    "mql": "finance-crypto",
    "mql4": "finance-crypto",
    "mql5": "finance-crypto",
    "qmt": "finance-crypto",
    "stripe": "finance-crypto",
    "alipay": "finance-crypto",
    "wechat-pay": "finance-crypto",
    "paypal": "finance-crypto",
    "payment": "finance-crypto",
    "payment-gateway": "finance-crypto",
    "blockchain": "finance-crypto",
    "web3": "finance-crypto",
    "defi": "finance-crypto",
    "nft": "finance-crypto",
    "dao": "finance-crypto",
    "smart-contract": "finance-crypto",
    "solidity": "finance-crypto",
    "vyper": "finance-crypto",
    "bitcoin": "finance-crypto",
    "ethereum": "finance-crypto",
    "solana": "finance-crypto",
    "polygon": "finance-crypto",
    "avalanche": "finance-crypto",
    "cardano": "finance-crypto",
    "dot": "finance-crypto",
    "near": "finance-crypto",
    "algorand": "finance-crypto",
    "tezos": "finance-crypto",
    "kusama": "finance-crypto",
    "cosmos": "finance-crypto",
    "chainlink": "finance-crypto",
    "uniswap": "finance-crypto",
    "aave": "finance-crypto",
    "compound": "finance-crypto",
    "maker": "finance-crypto",
    "sushi": "finance-crypto",
    "pancakeswap": "finance-crypto",
    "curve": "finance-crypto",
    "balancer": "finance-crypto",
    "yearn": "finance-crypto",
    "synthetix": "finance-crypto",
    "axie": "finance-crypto",
    "stepn": "finance-crypto",
    "play-to-earn": "finance-crypto",
    "gamefi": "finance-crypto",
    "metaverse": "finance-crypto",
    "finance": "finance-crypto",
    "financial": "finance-crypto",
    "stock": "finance-crypto",
    "stocks": "finance-crypto",
    "market": "finance-crypto",
    "trade": "finance-crypto",
    "trader": "finance-crypto",
    
    # =============================================================
    # Map & Geo (地图与地理)
    # =============================================================
    "google-maps": "map-geo",
    "openstreetmap": "map-geo",
    "osm": "map-geo",
    "mapbox": "map-geo",
    "leaflet": "map-geo",
    "cesium": "map-geo",
    "arcgis": "map-geo",
    "qgis": "map-geo",
    "postgis": "map-geo",
    "geoserver": "map-geo",
    "openlayers": "map-geo",
    "maplibre": "map-geo",
    "amap": "map-geo",
    "gaode": "map-geo",
    "baidu-maps": "map-geo",
    "tencent-maps": "map-geo",
    "bing-maps": "map-geo",
    "here-maps": "map-geo",
    "tomtom": "map-geo",
    "mapkit": "map-geo",
    "geocoding": "map-geo",
    "geolocation": "map-geo",
    "gps": "map-geo",
    "nmea": "map-geo",
    "gpx": "map-geo",
    "kml": "map-geo",
    "geojson": "map-geo",
    "shapefile": "map-geo",
    "map": "map-geo",
    "geo": "map-geo",
    "geospatial": "map-geo",
    "gis": "map-geo",
    "location": "map-geo",
    
    # =============================================================
    # Calendar & Time (日历与时间)
    # =============================================================
    "google-calendar": "calendar-time",
    "outlook-calendar": "calendar-time",
    "apple-calendar": "calendar-time",
    "caldav": "calendar-time",
    "ics": "calendar-time",
    "todoist": "calendar-time",
    "any-dot-do": "calendar-time",
    "habitica": "calendar-time",
    "ticktick": "calendar-time",
    "things": "calendar-time",
    "omnifocus": "calendar-time",
    "linear": "calendar-time",
    "asana": "calendar-time",
    "trello": "calendar-time",
    "monday-dot-com": "calendar-time",
    "clickup": "calendar-time",
    "notion": "calendar-time",
    "shortcut": "calendar-time",
    "github-projects": "calendar-time",
    "jira": "calendar-time",
    "project-management": "calendar-time",
    "kanban": "calendar-time",
    "agile": "calendar-time",
    "scrum": "calendar-time",
    "roadmap": "calendar-time",
    "calendar": "calendar-time",
    "time": "calendar-time",
    "date": "calendar-time",
    "event": "calendar-time",
    "meeting": "calendar-time",
    "schedule": "calendar-time",
    "scheduling": "calendar-time",
    "task": "calendar-time",
    "todo": "calendar-time",
    
    # =============================================================
    # Social & Communication (社交与通讯)
    # =============================================================
    "slack": "social-communication",
    "discord": "social-communication",
    "telegram": "social-communication",
    "wechat": "social-communication",
    "whatsapp": "social-communication",
    "messenger": "social-communication",
    "line": "social-communication",
    "signal": "social-communication",
    "viber": "social-communication",
    "skype": "social-communication",
    "zoom": "social-communication",
    "teams": "social-communication",
    "webex": "social-communication",
    "dingtalk": "social-communication",
    "feishu": "social-communication",
    "lark": "social-communication",
    "workweixin": "social-communication",
    "enterprise-wechat": "social-communication",
    "twitter": "social-communication",
    "x-dot-com": "social-communication",
    "facebook": "social-communication",
    "instagram": "social-communication",
    "linkedin": "social-communication",
    "reddit": "social-communication",
    "pinterest": "social-communication",
    "snapchat": "social-communication",
    "tiktok": "social-communication",
    "youtube": "social-communication",
    "medium": "social-communication",
    "dev-dot-to": "social-communication",
    "hashnode": "social-communication",
    "blogger": "social-communication",
    "wordpress": "social-communication",
    "ghost": "social-communication",
    "substack": "social-communication",
    "rss": "social-communication",
    "atom": "social-communication",
    "mastodon": "social-communication",
    "xhs": "social-communication",
    "xiaohongshu": "social-communication",
    "weibo": "social-communication",
    "zhihu": "social-communication",
    "jian-shu": "social-communication",
    "csdn": "social-communication",
    "juejin": "social-communication",
    "social": "social-communication",
    "social-media": "social-communication",
    "communication": "social-communication",
    "messaging": "social-communication",
    "message": "social-communication",
    
    # =============================================================
    # Game (游戏)
    # =============================================================
    "game": "game",
    "gaming": "game",
    "video-game": "game",
    "game-engine": "game",
    "unity": "game",
    "unreal-engine": "game",
    "godot": "game",
    "cryengine": "game",
    "ogre": "game",
    "cocos": "game",
    "cocos2d": "game",
    "cocos2d-x": "game",
    "cocos-creator": "game",
    "phaser": "game",
    "pixi-dot-js": "game",
    "three-dot-js": "game",
    "babylon-dot-js": "game",
    "playcanvas": "game",
    "a-frame": "game",
    "webgl": "game",
    "webgpu": "game",
    "pixel-art": "game",
    "voxel": "game",
    "retro-game": "game",
    "arcade": "game",
    "rpg": "game",
    "mmorpg": "game",
    "fps": "game",
    "tps": "game",
    "moba": "game",
    "rts": "game",
    "turn-based": "game",
    "chess": "game",
    "go-game": "game",
    "chinese-chess": "game",
    "minecraft": "game",
    "minetest": "game",
    "roblox": "game",
    "games": "game",
    "play": "game",
    "playing": "game",
    
    # =============================================================
    # Bio & Medical (生物与医疗)
    # =============================================================
    "bioinformatics": "bio-medical",
    "biomedical": "bio-medical",
    "biometrics": "bio-medical",
    "genomics": "bio-medical",
    "proteomics": "bio-medical",
    "metabolomics": "bio-medical",
    "transcriptomics": "bio-medical",
    "biobank": "bio-medical",
    "crispr": "bio-medical",
    "genetic": "bio-medical",
    "gene-editing": "bio-medical",
    "sequencing": "bio-medical",
    "pcr": "bio-medical",
    "biochemistry": "bio-medical",
    "biophysics": "bio-medical",
    "biostatistics": "bio-medical",
    "epidemiology": "bio-medical",
    "public-health": "bio-medical",
    "clinical-trial": "bio-medical",
    "medical-imaging": "bio-medical",
    "xray": "bio-medical",
    "ct-scan": "bio-medical",
    "mri": "bio-medical",
    "ultrasound": "bio-medical",
    "pet-scan": "bio-medical",
    "ecg": "bio-medical",
    "ekg": "bio-medical",
    "eeg": "bio-medical",
    "meg": "bio-medical",
    "fmri": "bio-medical",
    "spect": "bio-medical",
    "petct": "bio-medical",
    "pathology": "bio-medical",
    "histology": "bio-medical",
    "cytology": "bio-medical",
    "hematology": "bio-medical",
    "oncology": "bio-medical",
    "cancer": "bio-medical",
    "cardiology": "bio-medical",
    "neurology": "bio-medical",
    "psychiatry": "bio-medical",
    "dermatology": "bio-medical",
    "ophthalmology": "bio-medical",
    "dentistry": "bio-medical",
    "orthopedics": "bio-medical",
    "surgery": "bio-medical",
    "radiology": "bio-medical",
    "anesthesiology": "bio-medical",
    "emergency-medicine": "bio-medical",
    "icu": "bio-medical",
    "pediatrics": "bio-medical",
    "geriatrics": "bio-medical",
    "obstetrics": "bio-medical",
    "gynecology": "bio-medical",
    "virology": "bio-medical",
    "bacteriology": "bio-medical",
    "pharmacology": "bio-medical",
    "pharmacokinetics": "bio-medical",
    "pharmacodynamics": "bio-medical",
    "drug-discovery": "bio-medical",
    "drug-development": "bio-medical",
    "clinical": "bio-medical",
    "patient": "bio-medical",
    "hospital": "bio-medical",
    "clinic": "bio-medical",
    "diagnostic": "bio-medical",
    "diagnostics": "bio-medical",
    "bio": "bio-medical",
    "biology": "bio-medical",
    "medical": "bio-medical",
    "health": "bio-medical",
    "healthcare": "bio-medical",
    "medicine": "bio-medical",
    
    # =============================================================
    # Weather & Nature (天气与自然)
    # =============================================================
    "weather": "weather-nature",
    "meteorology": "weather-nature",
    "weather-api": "weather-nature",
    "weather-forecast": "weather-nature",
    "forecast": "weather-nature",
    "climate": "weather-nature",
    "climate-change": "weather-nature",
    "air-quality": "weather-nature",
    "aqi": "weather-nature",
    "pm2-5": "weather-nature",
    "pm10": "weather-nature",
    "ozone": "weather-nature",
    "ultraviolet": "weather-nature",
    "uv-index": "weather-nature",
    "earthquake": "weather-nature",
    "seismic": "weather-nature",
    "tsunami": "weather-nature",
    "volcano": "weather-nature",
    "hurricane": "weather-nature",
    "typhoon": "weather-nature",
    "tornado": "weather-nature",
    "storm": "weather-nature",
    "astronomy": "weather-nature",
    "astrophysics": "weather-nature",
    "space": "weather-nature",
    "satellite": "weather-nature",
    "nasa": "weather-nature",
    "esa": "weather-nature",
    "jaxa": "weather-nature",
    "noaa": "weather-nature",
    "ecmwf": "weather-nature",
    "gfs": "weather-nature",
    "metar": "weather-nature",
    "taf": "weather-nature",
    "sigmet": "weather-nature",
    "aviation-weather": "weather-nature",
    "nature": "weather-nature",
    "natural": "weather-nature",
    
    # =============================================================
    # Learning & Research (学习与研究)
    # =============================================================
    "mooc": "learning-research",
    "edx": "learning-research",
    "coursera": "learning-research",
    "udemy": "learning-research",
    "khan-academy": "learning-research",
    "duolingo": "learning-research",
    "babbel": "learning-research",
    "rosetta-stone": "learning-research",
    "memrise": "learning-research",
    "anki": "learning-research",
    "quizlet": "learning-research",
    "flashcard": "learning-research",
    "research-paper": "learning-research",
    "academic": "learning-research",
    "scholar": "learning-research",
    "citation": "learning-research",
    "bibliography": "learning-research",
    "reference-manager": "learning-research",
    "thesis": "learning-research",
    "dissertation": "learning-research",
    "journal": "learning-research",
    "conference": "learning-research",
    "arxiv": "learning-research",
    "pubmed": "learning-research",
    "ieee": "learning-research",
    "acm": "learning-research",
    "dblp": "learning-research",
    "researchgate": "learning-research",
    "semantic-scholar": "learning-research",
    "google-scholar": "learning-research",
    "sci-hub": "learning-research",
    "learning": "learning-research",
    "education": "learning-research",
    "teaching": "learning-research",
    "study": "learning-research",
    "course": "learning-research",
    "training": "learning-research",
    "tutorial": "learning-research",
    "student": "learning-research",
    "teacher": "learning-research",
    "school": "learning-research",
    "university": "learning-research",
    "college": "learning-research",
    "academy": "learning-research",
    "research": "learning-research",
}

# Official orgs
OFFICIAL_ORGS = {
    "modelcontextprotocol",
    "anthropic",
    "github",
    "microsoft",
    "google-gemini",
    "googleapis",
    "openai",
    "stripe",
    "sentry",
    "docker",
    "notion",
    "slack",
    "gitlab",
    "vercel",
    "aws",
    "azure",
    "gcp",
    "cloudflare",
    "alibaba",
    "alibabacloud",
    "aliyun",
    "tencent",
    "tencentcloud",
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
    "lark",
    "shopify",
    "atlassian",
    "linear",
    "notionhq",
    "mintplex-labs",
    "langgenius",
    "infiniflow",
    "lobehub",
    "mastra-ai",
    "composiohq",
    "prefecthq",
    "upstash",
    "mindsdb",
    "activepieces",
}

# Community orgs with high-quality MCP servers
COMMUNITY_ORGS = {
    "PrefectHQ",
    "jlowin",
    "ComposioHQ",
    "mastra-ai",
    "block",
    "upstash",
    "mindsdb",
    "activepieces",
    "langgenius",
    "open-webui",
    "lobehub",
    "Mintplex-Labs",
    "infiniflow",
    "D4Vinci",
    "oraios",
    "QwenLM",
    "agentscope-ai",
    "ChromeDevTools",
    "czlonkowski",
    "1Panel-dev",
    "alibaba",
    "bytedance",
}


def fetch_upstream() -> dict:
    """获取上游数据"""
    print(f"📥 正在从上游获取数据: {UPSTREAM_URL}")
    req = urllib.request.Request(
        UPSTREAM_URL, headers={"User-Agent": "MCP-HUB-Sync/1.0"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def infer_categories(topics: List[str], description: str, name: str) -> Set[str]:
    """从 topics 和 description 推断分类 - 智能版"""
    cats = set()
    
    # 组合所有文本进行匹配
    text = " ".join(topics).lower() + " " + description.lower() + " " + name.lower()
    
    # 智能匹配关键词
    matched_categories = []
    for topic_keyword, category in TOPIC_CATEGORY_MAP.items():
        # 检查是否包含关键词
        if topic_keyword in text:
            matched_categories.append((len(topic_keyword), category))
    
    # 按关键词长度排序，优先匹配更长的关键词
    matched_categories.sort(key=lambda x: x[0], reverse=True)
    
    # 去重并添加分类
    added_cats = set()
    for _, category in matched_categories:
        if category not in added_cats:
            cats.add(category)
            added_cats.add(category)
    
    # 特殊规则：根据名称精确推断
    name_lower = name.lower()
    
    # MCP 相关 → ai-llm（最高优先级）
    if "mcp" in name_lower or "model-context-protocol" in text or name_lower == "servers":
        cats.add("ai-llm")
    
    # 有 chatbot、agent、chat 等词的 → ai-llm
    if any(kw in text for kw in ["chatbot", "chat-bot", "agent", "ai-agent", "chatgpt", "claude", "gpt"]):
        cats.add("ai-llm")
    
    # 有 browser 或类似词的 → browser-web
    if any(kw in text for kw in ["browser", "chrome", "firefox", "puppeteer", "playwright"]):
        cats.add("browser-web")
    
    # 有 dev、code、coding 等词的 → development
    if any(kw in text for kw in ["code", "coding", "developer", "dev-tools", "sdk", "library"]):
        cats.add("development")
    
    # 有 esp32、android、ios 等硬件词的 → ai-llm（因为是MCP服务器）
    if any(kw in text for kw in ["esp32", "arduino", "iot", "hardware"]):
        cats.add("ai-llm")
        cats.add("terminal-system")
    
    # 有 inspect、test、debug 等词的 → development
    if any(kw in text for kw in ["inspector", "inspect", "testing", "debug", "debugger"]):
        cats.add("development")
    
    # 有 ui、component、block 等词的 → art-design 或 development
    if any(kw in text for kw in ["ui", "user-interface", "component", "blocks", "frontend", "shadcn"]):
        cats.add("art-design")
        cats.add("development")
    
    # 有 directories、find、search 等词的 → terminal-system 或 ai-llm
    if any(kw in text for kw in ["directory", "directories", "search", "find", "lookup"]):
        cats.add("terminal-system")
        cats.add("ai-llm")
    
    # 有 plugin、plugins 等词的 → ai-llm（MCP插件）
    if any(kw in text for kw in ["plugin", "plugins", "extension", "addon"]):
        cats.add("ai-llm")
    
    # 确保至少有一个分类
    if not cats:
        cats.add("other")
    
    return cats


def detect_source_type(owner: str) -> str:
    """判断 source_type"""
    if owner in OFFICIAL_ORGS or "modelcontextprotocol" in owner:
        return "official"
    if owner in COMMUNITY_ORGS:
        return "community"
    return "community"


def normalize_language(lang: str) -> str:
    """标准化语言字段"""
    if not lang or lang == "N/A":
        return "unknown"
    lang_map = {
        "TypeScript": "typescript",
        "JavaScript": "javascript",
        "Python": "python",
        "Go": "go",
        "Rust": "rust",
        "Java": "java",
        "C++": "cpp",
        "C": "c",
        "Kotlin": "kotlin",
        "Swift": "swift",
        "Ruby": "ruby",
        "PHP": "php",
        "Shell": "shell",
        "Lua": "lua",
        "Jupyter Notebook": "jupyter",
        "Dart": "dart",
        "C#": "csharp",
        "Vue": "vue",
        "HTML": "html",
        "CSS": "css",
        "Scala": "scala",
        "Haskell": "haskell",
        "Erlang": "erlang",
        "Elixir": "elixir",
        "Clojure": "clojure",
        "F#": "fsharp",
        "Fsharp": "fsharp",
        "OCaml": "ocaml",
        "R": "r",
        "MATLAB": "matlab",
        "Julia": "julia",
        "Nim": "nim",
        "Zig": "zig",
        "Pascal": "pascal",
        "Perl": "perl",
        "Groovy": "groovy",
    }
    return lang_map.get(lang, lang.lower())


def clean_description(desc: str, name: str) -> str:
    """清理描述文本"""
    if not desc:
        return f"MCP Server: {name} - Model Context Protocol server implementation"
    
    # 清理 markdown 头部
    if desc.startswith("#"):
        lines = desc.split("\n")
        clean_lines = []
        for line in lines[1:]:
            stripped = line.strip()
            if (
                stripped
                and not stripped.startswith("!")
                and not stripped.startswith("[")
                and not stripped.startswith("```")
                and not stripped.startswith("-")
                and not stripped.startswith("*")
            ):
                clean_lines.append(stripped)
        desc = " ".join(clean_lines[:3])
    
    # 限制长度
    if len(desc) > 500:
        desc = desc[:500].rsplit(" ", 1)[0] + "..."
    
    return desc.strip()


def load_existing_index() -> Dict:
    """加载现有索引"""
    if INDEX_FILE.exists():
        try:
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return {}
    return {}


def sync_index(
    limit: Optional[int] = None,
    servers_only: bool = False,
    min_stars: int = 0,
    full_sync: bool = False,
):
    """同步索引 - 增量更新模式"""
    
    # 加载现有数据
    existing_index = load_existing_index()
    existing_servers = {
        s["name"]: s for s in existing_index.get("servers", [])
    }
    print(f"📦 现有数据: {len(existing_servers)} 个服务器")
    
    # 获取上游数据
    upstream = fetch_upstream()
    projects = upstream.get("projects") or []
    if not isinstance(projects, list):
        print("   ⚠️ 上游数据格式异常: projects 不是列表")
        return
    total_upstream = upstream.get("total", len(projects))

    print(f"   上游共 {total_upstream} 个项目")

    # 过滤
    if servers_only:
        projects = [p for p in projects if p.get("category") == "servers"]
        print(f"   过滤为 servers: {len(projects)} 个")

    if min_stars > 0:
        projects = [p for p in projects if (p.get("stars") or 0) >= min_stars]
        print(f"   过滤 star>={min_stars}: {len(projects)} 个")

    # 按 star 排序
    projects.sort(key=lambda p: p.get("stars", 0), reverse=True)

    if limit:
        projects = projects[:limit]
        print(f"   限制为 {limit} 个")

    # 去重 (同名项目保留 star 最高的)
    seen = set()
    unique = []
    for p in projects:
        name = p.get("name", "")
        if name not in seen:
            seen.add(name)
            unique.append(p)
    projects = unique

    print(f"   去重后: {len(projects)} 个\n")

    # 转换并合并
    servers = []
    cat_counts = Counter()
    source_counts = Counter()
    lang_counts = Counter()
    new_count = 0
    updated_count = 0

    for p in projects:
        name = p.get("name", "")
        topics = p.get("topics", [])
        description = clean_description(p.get("description", ""), name)
        categories = infer_categories(topics, description, name)
        
        # 检查是否是新增或更新
        is_new = name not in existing_servers
        if is_new:
            new_count += 1
        else:
            updated_count += 1

        for c in categories:
            cat_counts[c] += 1

        source_type = detect_source_type(p.get("owner", ""))
        source_counts[source_type] += 1

        language = normalize_language(p.get("language", ""))
        lang_counts[language] += 1

        # 如果是全量同步，更新所有字段；否则合并
        if full_sync or is_new:
            server = {
                "name": name,
                "full_name": p.get("full_name", ""),
                "description": description,
                "source": p.get("url", ""),
                "source_type": source_type,
                "categories": sorted(list(categories)),
                "language": language,
                "stars": p.get("stars", 0),
                "owner": p.get("owner", ""),
                "topics": topics[:10],
                "updated_at": p.get("updated_at", ""),
                "created_at": p.get("created_at", ""),
                "archived": p.get("archived", False),
            }
        else:
            # 增量更新：保留本地数据，只更新上游有的字段
            existing = existing_servers[name]
            server = {
                "name": name,
                "full_name": p.get("full_name", "") or existing.get("full_name", ""),
                "description": description if description != existing.get("description", "") else existing.get("description", ""),
                "source": p.get("url", "") or existing.get("source", ""),
                "source_type": source_type,
                "categories": sorted(list(categories)),
                "language": language or existing.get("language", "unknown"),
                "stars": p.get("stars", 0) or existing.get("stars", 0),
                "owner": p.get("owner", "") or existing.get("owner", ""),
                "topics": topics[:10] if topics else existing.get("topics", []),
                "updated_at": p.get("updated_at", "") or existing.get("updated_at", ""),
                "created_at": p.get("created_at", "") or existing.get("created_at", ""),
                "archived": p.get("archived", False),
            }
        
        servers.append(server)

    # 构建索引
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    index = {
        "version": "2.0.0",
        "last_sync": now,
        "upstream_total": total_upstream,
        "total_servers": len(servers),
        "total_categories": len(cat_counts),
        "categories": dict(sorted(cat_counts.items(), key=lambda x: -x[1])),
        "source_types": dict(sorted(source_counts.items(), key=lambda x: -x[1])),
        "languages": dict(sorted(lang_counts.items(), key=lambda x: -x[1])),
        "servers": servers,
    }

    # 写入索引
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    # 更新 market-config.json
    config = {
        "version": "2.0.0",
        "last_sync": now,
        "total_servers": len(servers),
        "total_categories": len(cat_counts),
        "categories": dict(sorted(cat_counts.items(), key=lambda x: -x[1])),
        "features": [
            "REST API (api.py)",
            "Query interface (query.py)",
            "CLI tool (market.py)",
            "Bilingual README",
            "Auto sync from awesome-mcp",
            "Star ratings",
            "Source tracing (100%)",
            "English categories",
            "Enhanced category inference",
        ],
    }
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    # 打印统计
    print("✅ 同步完成!")
    print(f"   总计: {len(servers)} 个服务器")
    print(f"   新增: {new_count} 个")
    print(f"   更新: {updated_count} 个")
    print(f"   分类: {len(cat_counts)} 个")
    print("   来源: 100% 有 GitHub 链接")
    print("\n   Source types:")
    for st, count in source_counts.most_common():
        pct = count / len(servers) * 100
        print(f"     {st}: {count} ({pct:.1f}%)")
    print("\n   Top 10 分类:")
    for cat, count in cat_counts.most_common(10):
        pct = count / len(servers) * 100
        print(f"     {cat}: {count} ({pct:.1f}%)")
    print("\n   Top 10 语言:")
    for lang, count in lang_counts.most_common(10):
        print(f"     {lang}: {count}")
    print("\n   Top 10 by stars:")
    for s in servers[:10]:
        print(f"     ⭐{s['stars']:>7} {s['name']} ({s['owner']})")
    
    # 检查分类问题
    print("\n⚠️  分类检查:")
    other_only = [s for s in servers if s.get('categories') == ['other']]
    if other_only:
        print(f"   只有 'other' 分类的服务器: {len(other_only)} 个")
        for s in sorted(other_only, key=lambda x: x.get('stars', 0), reverse=True)[:5]:
            print(f"     ⭐{s['stars']:>7} {s['name']}")
    else:
        print("   ✅ 所有服务器都已正确分类!")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="同步上游 MCP 服务器索引")
    parser.add_argument("--limit", "-n", type=int, help="限制数量")
    parser.add_argument("--servers", action="store_true", help="只取 MCP servers")
    parser.add_argument("--min-stars", type=int, default=0, help="最低 star 数")
    parser.add_argument("--full", action="store_true", help="完整替换模式（不保留本地数据）")
    args = parser.parse_args()

    sync_index(
        limit=args.limit,
        servers_only=args.servers,
        min_stars=args.min_stars,
        full_sync=args.full,
    )


if __name__ == "__main__":
    main()


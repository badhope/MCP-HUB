#!/usr/bin/env python3
"""
MCP Hub 用户数据管理
收藏、评分、评论等用户功能
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_PATH = Path(__file__).parent
USER_DATA_FILE = BASE_PATH / "user-data.json"
SUBMISSIONS_FILE = BASE_PATH / "submissions.json"


def ensure_user_data_file():
    """确保用户数据文件存在"""
    if not USER_DATA_FILE.exists():
        initial_data = {
            "version": "1.0.0",
            "favorites": {},  # user_id -> List[server_name]
            "ratings": {},    # server_name -> List[rating_info]
            "comments": {},   # server_name -> List[comment_info]
        }
        with open(USER_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(initial_data, f, ensure_ascii=False, indent=2)
    return USER_DATA_FILE


def ensure_submissions_file():
    """确保提交数据文件存在"""
    if not SUBMISSIONS_FILE.exists():
        initial_data = {
            "version": "1.0.0",
            "submissions": [],  # List[submission_info]
        }
        with open(SUBMISSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(initial_data, f, ensure_ascii=False, indent=2)
    return SUBMISSIONS_FILE


def load_user_data() -> Dict:
    """加载用户数据"""
    ensure_user_data_file()
    with open(USER_DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_user_data(data: Dict):
    """保存用户数据"""
    with open(USER_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_submissions() -> Dict:
    """加载提交数据"""
    ensure_submissions_file()
    with open(SUBMISSIONS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_submissions(data: Dict):
    """保存提交数据"""
    with open(SUBMISSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ======================================
# FAVORITES (收藏功能)
# ======================================

def add_favorite(user_id: str, server_name: str) -> bool:
    """添加收藏
    Returns: True if added, False if already exists
    """
    data = load_user_data()
    favorites = data.get("favorites", {})
    user_favorites = favorites.get(user_id, [])
    
    if server_name not in user_favorites:
        user_favorites.append(server_name)
        favorites[user_id] = user_favorites
        data["favorites"] = favorites
        save_user_data(data)
        return True
    return False


def remove_favorite(user_id: str, server_name: str) -> bool:
    """移除收藏
    Returns: True if removed, False if not exists
    """
    data = load_user_data()
    favorites = data.get("favorites", {})
    user_favorites = favorites.get(user_id, [])
    
    if server_name in user_favorites:
        user_favorites.remove(server_name)
        favorites[user_id] = user_favorites
        data["favorites"] = favorites
        save_user_data(data)
        return True
    return False


def get_favorites(user_id: str) -> List[str]:
    """获取用户的收藏列表"""
    data = load_user_data()
    return data.get("favorites", {}).get(user_id, [])


def is_favorite(user_id: str, server_name: str) -> bool:
    """检查是否已收藏"""
    return server_name in get_favorites(user_id)


def get_favorites_count(server_name: str) -> int:
    """获取某个服务器的收藏数"""
    data = load_user_data()
    count = 0
    for user_favs in data.get("favorites", {}).values():
        if server_name in user_favs:
            count += 1
    return count


# ======================================
# RATINGS (评分功能)
# ======================================

def add_rating(user_id: str, server_name: str, rating: int, comment: Optional[str] = None) -> Dict:
    """添加评分 (1-5)
    Returns: rating info
    """
    rating = max(1, min(5, rating))  # Clamp 1-5
    data = load_user_data()
    ratings = data.get("ratings", {})
    server_ratings = ratings.get(server_name, [])
    
    # Remove existing rating from this user
    server_ratings = [r for r in server_ratings if r.get("user_id") != user_id]
    
    rating_info = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "server_name": server_name,
        "rating": rating,
        "comment": comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    server_ratings.append(rating_info)
    ratings[server_name] = server_ratings
    data["ratings"] = ratings
    save_user_data(data)
    
    return rating_info


def get_ratings(server_name: str) -> List[Dict]:
    """获取服务器的所有评分"""
    data = load_user_data()
    return data.get("ratings", {}).get(server_name, [])


def get_user_rating(user_id: str, server_name: str) -> Optional[Dict]:
    """获取用户对某服务器的评分"""
    ratings = get_ratings(server_name)
    for r in ratings:
        if r.get("user_id") == user_id:
            return r
    return None


def get_average_rating(server_name: str) -> float:
    """获取服务器的平均评分"""
    ratings = get_ratings(server_name)
    if not ratings:
        return 0.0
    total = sum(r.get("rating", 0) for r in ratings)
    return round(total / len(ratings), 2)


def get_ratings_count(server_name: str) -> int:
    """获取评分人数"""
    return len(get_ratings(server_name))


# ======================================
# COMMENTS (评论功能)
# ======================================

def add_comment(user_id: str, server_name: str, text: str) -> Dict:
    """添加评论"""
    data = load_user_data()
    comments = data.get("comments", {})
    server_comments = comments.get(server_name, [])
    
    comment_info = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "server_name": server_name,
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    server_comments.append(comment_info)
    comments[server_name] = server_comments
    data["comments"] = comments
    save_user_data(data)
    
    return comment_info


def get_comments(server_name: str) -> List[Dict]:
    """获取服务器的所有评论"""
    data = load_user_data()
    return data.get("comments", {}).get(server_name, [])


def get_comments_count(server_name: str) -> int:
    """获取评论数"""
    return len(get_comments(server_name))


# ======================================
# SUBMISSIONS (服务器提交与审核)
# ======================================

def submit_server(
    user_id: str,
    name: str,
    source: str,
    description: str,
    categories: Optional[List[str]] = None,
    npm_package: Optional[str] = None,
) -> Dict:
    """提交新服务器"""
    data = load_submissions()
    submissions = data.get("submissions", [])
    
    submission = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name,
        "source": source,
        "description": description,
        "categories": categories or [],
        "npm_package": npm_package,
        "status": "pending",  # pending, approved, rejected
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_at": None,
        "reviewer": None,
        "review_comment": None,
    }
    
    submissions.append(submission)
    data["submissions"] = submissions
    save_submissions(data)
    
    return submission


def get_submissions(status: Optional[str] = None) -> List[Dict]:
    """获取提交列表，可按状态过滤"""
    data = load_submissions()
    submissions = data.get("submissions", [])
    
    if status:
        return [s for s in submissions if s.get("status") == status]
    return submissions


def get_user_submissions(user_id: str) -> List[Dict]:
    """获取用户的提交"""
    submissions = get_submissions()
    return [s for s in submissions if s.get("user_id") == user_id]


def review_submission(submission_id: str, status: str, reviewer: str, comment: Optional[str] = None) -> Optional[Dict]:
    """审核提交 (status: approved, rejected)"""
    data = load_submissions()
    submissions = data.get("submissions", [])
    
    for i, s in enumerate(submissions):
        if s.get("id") == submission_id:
            submissions[i]["status"] = status
            submissions[i]["reviewed_at"] = datetime.now(timezone.utc).isoformat()
            submissions[i]["reviewer"] = reviewer
            submissions[i]["review_comment"] = comment
            
            data["submissions"] = submissions
            save_submissions(data)
            return submissions[i]
    
    return None


# ======================================
# STATS (统计数据)
# ======================================

def get_user_stats(user_id: str) -> Dict:
    """Get statistics for a user"""
    favorites = get_favorites(user_id)
    ratings = get_ratings_count_for_user(user_id)
    comments = get_comments_count_for_user(user_id)
    return {
        "favorites_count": len(favorites),
        "ratings_count": ratings,
        "comments_count": comments,
    }


def get_ratings_count_for_user(user_id: str) -> int:
    """Count ratings written by a user across all servers."""
    data = load_user_data()
    count = 0
    for ratings in data.get("ratings", {}).values():
        count += sum(1 for r in ratings if r.get("user_id") == user_id)
    return count


def get_comments_count_for_user(user_id: str) -> int:
    """Count comments written by a user across all servers."""
    data = load_user_data()
    count = 0
    for comments in data.get("comments", {}).values():
        count += sum(1 for c in comments if c.get("user_id") == user_id)
    return count


def get_server_stats(server_name: str) -> Dict:
    """获取服务器统计"""
    return {
        "favorites_count": get_favorites_count(server_name),
        "average_rating": get_average_rating(server_name),
        "ratings_count": get_ratings_count(server_name),
        "comments_count": get_comments_count(server_name),
    }


def get_all_stats() -> Dict:
    """获取所有统计"""
    data = load_user_data()
    submissions_data = load_submissions()
    
    total_favorites = sum(len(favs) for favs in data.get("favorites", {}).values())
    total_ratings = sum(len(rats) for rats in data.get("ratings", {}).values())
    total_comments = sum(len(comms) for comms in data.get("comments", {}).values())
    total_submissions = len(submissions_data.get("submissions", []))
    
    return {
        "total_users": len(data.get("favorites", {})),
        "total_favorites": total_favorites,
        "total_ratings": total_ratings,
        "total_comments": total_comments,
        "total_submissions": total_submissions,
    }

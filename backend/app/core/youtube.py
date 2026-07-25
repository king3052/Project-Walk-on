"""
Thin wrapper around the YouTube Data API v3 search endpoint. This is the
ONLY source of video URLs for the personalized Learning Center feed — the
LLM is only ever used to generate short search query strings, never to
invent a video title or URL itself. That distinction matters: an LLM
asked to "recommend a video" will confidently hallucinate a plausible-
looking title and link that doesn't exist. Real video data only ever
comes from this module's actual API call.
"""
import os

import requests

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


def is_configured() -> bool:
    return bool(YOUTUBE_API_KEY)


def search_youtube(query: str, max_results: int = 2) -> list[dict]:
    """Returns a list of {title, video_url, channel_title, thumbnail_url}.
    Returns an empty list on any failure (missing key, quota exceeded,
    network error) rather than raising — a missing personalized pick
    should never break the rest of the Learning Center page."""
    if not YOUTUBE_API_KEY:
        return []
    try:
        resp = requests.get(
            SEARCH_URL,
            params={
                "key": YOUTUBE_API_KEY,
                "q": query,
                "part": "snippet",
                "type": "video",
                "maxResults": max_results,
                "safeSearch": "strict",
                "relevanceLanguage": "en",
            },
            timeout=8,
        )
        if resp.status_code != 200:
            return []
        items = resp.json().get("items", [])
        results = []
        for item in items:
            video_id = item.get("id", {}).get("videoId")
            snippet = item.get("snippet", {})
            if not video_id:
                continue
            results.append({
                "title": snippet.get("title", "Untitled"),
                "video_url": f"https://www.youtube.com/watch?v={video_id}",
                "channel_title": snippet.get("channelTitle", ""),
                "thumbnail_url": (snippet.get("thumbnails", {}).get("medium", {}) or {}).get("url", ""),
            })
        return results
    except requests.RequestException:
        return []

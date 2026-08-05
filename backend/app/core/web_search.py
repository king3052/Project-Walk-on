"""
Tavily web search wrapper. Same principle as app/core/youtube.py: this is
the ONLY source of real web information for the assistant — the LLM
proposes a search query as a tool call, this module does the actual live
lookup, and the LLM only ever summarizes what comes back. It never
invents a web result.
"""
import os

import requests

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
SEARCH_URL = "https://api.tavily.com/search"


def is_configured() -> bool:
    return bool(TAVILY_API_KEY)


def web_search(query: str, max_results: int = 4) -> dict:
    """Returns {"answer": str | None, "results": [{"title", "url", "content"}], "error": str | None}.
    Returns an empty-but-valid shape on any failure rather than raising —
    the assistant should be able to say "couldn't search right now" instead
    of the whole chat request failing."""
    if not TAVILY_API_KEY:
        return {"answer": None, "results": [], "error": "Web search isn't configured yet."}
    try:
        resp = requests.post(
            SEARCH_URL,
            json={
                "api_key": TAVILY_API_KEY,
                "query": query,
                "max_results": max_results,
                "include_answer": True,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return {"answer": None, "results": [], "error": f"Search failed ({resp.status_code})"}
        data = resp.json()
        return {
            "answer": data.get("answer"),
            "results": [
                {"title": r.get("title", ""), "url": r.get("url", ""), "content": r.get("content", "")[:500]}
                for r in data.get("results", [])
            ],
            "error": None,
        }
    except requests.RequestException as e:
        return {"answer": None, "results": [], "error": str(e)}

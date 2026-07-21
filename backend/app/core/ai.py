import os
import requests
from fastapi import HTTPException

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def call_groq(prompt: str, max_tokens: int = 500, json_mode: bool = False) -> str:
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY is not set in backend/.env — add it to enable AI features.",
        )
    body = {
        "model": GROQ_MODEL,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"AI request failed: {e}")

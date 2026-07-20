"""
Verifies Supabase Auth JWTs on incoming requests.

Every protected endpoint depends on get_current_user_id, which decodes the
bearer token and returns the verified user id (the token's "sub" claim).
This id is then used INSTEAD OF any user_id the client puts in a path or
request body — the client can no longer claim to be a different user than
the one it authenticated as.

Supabase projects sign tokens one of two ways:
  - Legacy: a shared HS256 secret (Project Settings -> API -> JWT Secret)
  - Newer: rotating asymmetric keys (ES256/RS256), verified via the
    project's public JWKS endpoint — no shared secret involved at all.
This checks the token's own header to see which one it is and verifies
accordingly, so it works either way without you needing to know which
mode your project uses.
"""
import os
import time

import requests
from fastapi import Header, HTTPException
from jose import jwt, JWTError

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")

_jwks_cache: dict = {"keys": None, "fetched_at": 0}
_JWKS_TTL_SECONDS = 3600


def _get_jwks() -> list[dict]:
    now = time.time()
    if _jwks_cache["keys"] is not None and now - _jwks_cache["fetched_at"] < _JWKS_TTL_SECONDS:
        return _jwks_cache["keys"]

    if not SUPABASE_URL:
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_URL is not set in backend/.env — needed to verify asymmetric tokens.",
        )

    resp = requests.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json", timeout=10)
    resp.raise_for_status()
    keys = resp.json().get("keys", [])
    _jwks_cache["keys"] = keys
    _jwks_cache["fetched_at"] = now
    return keys


def get_current_user_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg == "HS256":
            if not SUPABASE_JWT_SECRET:
                raise HTTPException(
                    status_code=503,
                    detail="SUPABASE_JWT_SECRET is not set in backend/.env — auth cannot be verified.",
                )
            payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        else:
            kid = header.get("kid")
            matching_key = next((k for k in _get_jwks() if k.get("kid") == kid), None)
            if not matching_key:
                raise HTTPException(status_code=401, detail="No matching signing key found for this token")
            payload = jwt.decode(
                token, matching_key, algorithms=[alg], audience="authenticated"
            )
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {e}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject claim")
    return user_id

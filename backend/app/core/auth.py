"""
Verifies Supabase Auth JWTs on incoming requests.

Every protected endpoint depends on get_current_user_id, which decodes the
bearer token using the project's JWT secret (Supabase dashboard -> Project
Settings -> API -> JWT Settings -> JWT Secret) and returns the verified
user id (the token's "sub" claim). This id is then used INSTEAD OF any
user_id the client puts in a path or request body — the client can no
longer claim to be a different user than the one it authenticated as.
"""
import os

from fastapi import Header, HTTPException
from jose import jwt, JWTError

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")


def get_current_user_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()

    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_JWT_SECRET is not set in backend/.env — auth cannot be verified.",
        )

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {e}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject claim")
    return user_id

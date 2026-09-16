from fastapi import HTTPException, Request
from firebase_admin import auth as firebase_auth


async def verify_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header."
        )

    token = auth_header.removeprefix("Bearer ")

    try:
        decoded_token = firebase_auth.verify_id_token(token)
    except Exception as exc:
        raise HTTPException(
            status_code=401, detail=f"Invalid or expired token: {exc}"
        ) from exc

    return decoded_token["uid"]

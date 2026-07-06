from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from app.config import config
import logging

logger = logging.getLogger(__name__)

# Validate critical env vars at import time so misconfiguration is caught
# immediately (as a clear startup error) instead of at request time with a
# cryptic "Request URL is missing an 'http://' or 'https://'" message.
if not config.SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is not set. "
        "Ensure the backend/.env file exists and contains SUPABASE_URL=https://<project>.supabase.co"
    )

security = HTTPBearer()

def verify_tenant(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies the Supabase JWT by calling the Supabase Auth API.
    Works with both email/password and Google OAuth tokens.
    """
    token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authentication Token")

    # Dev bypass for testing
    if token == "dev-token":
        return {
            "tenant_id": "tenant_dev",
            "user_id": "dev-user-id",
            "email": "dev@example.com",
            "provider": "dev"
        }

    try:
        # Verify the token against Supabase's Auth API
        response = httpx.get(
            f"{config.SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": config.SUPABASE_KEY,
            },
            timeout=10.0
        )

        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user_data = response.json()
        user_id = user_data.get("id", "")
        email = user_data.get("email", "")
        provider = user_data.get("app_metadata", {}).get("provider", "email")

        return {
            "tenant_id": f"tenant_{user_id}",
            "user_id": user_id,
            "email": email,
            "provider": provider
        }

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Auth service unreachable: {str(e)}")

def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies that the provided API key (Authorization Bearer sk-rfa-...) is valid
    and returns the associated server context.
    Checks in-memory ACTIVE_SERVERS first, then falls back to Supabase for persistence.
    """
    token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Missing API Key")

    # Direct dev bypass for testing
    if token == "dev-token" or token == "sk-rfa-dev":
        return {
            "server_id": "test-07f2",
            "name": "Dev Test Server",
            "tenant_id": "tenant_dev"
        }

    # 1. Check in-memory ACTIVE_SERVERS first (fastest)
    from app.state import ACTIVE_SERVERS
    for s_id, s_data in ACTIVE_SERVERS.items():
        keys = s_data.get("api_keys", [])
        for k in keys:
            if k["key"] == token:
                return {
                    "server_id": s_id,
                    "name": s_data["name"],
                    "tenant_id": s_data.get("tenant_id", "tenant_active")
                }

    # 2. Fall back to Supabase lookup (survives restarts)
    try:
        from app.services import supabase_client
        row = supabase_client.get_api_key_by_value(token)
        if row:
            return {
                "server_id": row["server_key"],
                "name": row["server_key"],
                "tenant_id": row["tenant_id"]
            }
    except Exception as e:
        logger.warning(f"Supabase API key lookup failed: {e}")

    raise HTTPException(status_code=401, detail="Invalid or unauthorized API key")

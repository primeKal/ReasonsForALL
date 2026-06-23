from app.services.email_service import send_welcome_email, send_login_notification, send_trial_expiration_warning
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.dependencies import verify_tenant
from app.services.db_extractor import DBExtractor
from app.services import supabase_client
from app.config import config
from app.state import ACTIVE_SERVERS
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tenant",
    tags=["tenant"]
)


class ConnectionRequest(BaseModel):
    server_name: str
    connection_string: str
    repo_url: str | None = None
    llm_provider: str | None = "gemini"
    llm_api_key: str | None = None
    custom_policies: str | None = None


@router.post("/connect")
def connect_database(request: ConnectionRequest, tenant_context: dict = Depends(verify_tenant)):
    """
    Connects to the provided database, extracts the schema,
    runs the two-step AI enrichment (identifying class hierarchies
    and generating example logical rules), and saves everything to Supabase.
    """
    tenant_id = tenant_context.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Invalid tenant context")

    # Determine rule cap based on premium status
    is_premium = supabase_client.is_tenant_premium(tenant_id)
    rule_cap = 100000 if is_premium else config.FREE_TRIAL_RULE_CAP
    logger.info(
        f"Extracting schema for tenant {tenant_id} (is_premium={is_premium}). Rule cap: {rule_cap}")

    extractor = DBExtractor(tenant_id=tenant_id)

    result = extractor.extract_schema(
        connection_string=request.connection_string,
        rule_cap=rule_cap,
        repo_url=request.repo_url,
    )

    if result["status"] == "simulated":
        logger.warning(
            f"Database connection failed. Proceeding with simulated sandbox extraction: {result.get('message')}")

    # Parse scheme/dialect
    dialect = request.connection_string.split("://")[0].split("+")[0]

    # URL-safe server key used in routes like /dashboard/servers/{server_key}
    server_key = request.server_name.lower().replace(" ", "-") + \
        "-" + str(uuid.uuid4())[:4]
    rules = result.get("rules", [])

    # Rules and statement are now fully compiled by the multi-agent system in DBExtractor
    rules = result.get("rules", [])
    example_statement = result.get(
        "example_statement", "A Waiter is a subclass of Employee. Waiters are disjoint from Buyers.")

    # ── 2. Cache in-memory ──
    ACTIVE_SERVERS[server_key] = {
        "name": request.server_name,
        "rules": rules,
        "status": "Connected",
        "dialect": dialect,
        "tenant_id": tenant_id,
        "server_config_id": None,
        "example_statement": example_statement,
        "connection_string": request.connection_string,
        "repo_url": request.repo_url,
        "llm_provider": request.llm_provider or "gemini",
        "llm_api_key": request.llm_api_key,
    }

    # ── 3. Persist server config to tenant_configurations ──
    server_config_id: int | None = None
    try:
        row = supabase_client.insert_server_config(
            tenant_id=tenant_id,
            server_key=server_key,
            name=request.server_name,
            dialect=dialect,
            rules_extracted=len(rules),
            example_statement=example_statement,
            repo_url=request.repo_url,
            llm_provider=request.llm_provider or "gemini",
            llm_api_key=request.llm_api_key,
        )
        server_config_id = row.get("id")
        ACTIVE_SERVERS[server_key]["server_config_id"] = server_config_id
        logger.info(
            f"Server '{server_key}' (id={server_config_id}) saved to tenant_configurations")
    except Exception as e:
        logger.error(f"Failed to persist server config to Supabase: {e}")

    # ── 4. Persist rules + subsumptions + quantifiers to tenant_quad_store ──
    if server_config_id and rules:
        try:
            supabase_client.save_quad_store_rules(
                tenant_id=tenant_id,
                server_config_id=server_config_id,
                rules=rules,
            )
            logger.info(
                f"Saved {len(rules)} quads to tenant_quad_store for server {server_config_id}")
        except Exception as e:
            logger.error(f"Failed to persist quad rules: {e}")

    # ── 5. Persist text-based business policies to tenant_text_policies ──
    text_policies = result.get("text_policies", [])
    
    # Extract custom policies if copy-pasted at creation time
    if request.custom_policies and request.custom_policies.strip() and server_config_id:
        try:
            llm_key = request.llm_api_key or __import__("os").getenv("GEMINI_API_KEY", __import__("os").getenv("GOOGLE_API_KEY", ""))
            if llm_key:
                from app.services.gemini_service import GeminiService
                gemini_svc = GeminiService(api_key=llm_key, provider=request.llm_provider or "gemini")
                prompt = (
                    "You are an expert policy analyst. Given the following raw text file content representing "
                    "business logic or guardrail rules, parse and synthesize them into clean, structured plain-English policies.\n\n"
                    f"Raw Input:\n{request.custom_policies}\n\n"
                    "Return strictly a machine-parseable JSON array of objects (no markdown blocks or wrappers). "
                    "Each object must have: 'title', 'body', 'source_type' (trigger|function|inferred)."
                )
                import json
                text_response = gemini_svc._call_llm(prompt, json_mode=True)
                parsed = json.loads(text_response)
                for p in (parsed if isinstance(parsed, list) else []):
                    if isinstance(p, dict) and p.get("title") and p.get("body"):
                        text_policies.append({
                            "title": p["title"].strip(),
                            "body": p["body"].strip(),
                            "source_type": p.get("source_type", "inferred")
                        })
        except Exception as custom_err:
            logger.error(f"Failed to parse custom policies at creation time: {custom_err}")

    if server_config_id and text_policies:
        try:
            supabase_client.save_text_policies(
                tenant_id=tenant_id,
                server_config_id=server_config_id,
                policies=text_policies,
            )
            logger.info(
                f"Saved {len(text_policies)} text policies for server {server_config_id}")
        except Exception as e:
            logger.error(f"Failed to persist text policies: {e}")

    return {
        "status": result["status"],
        "server_id": server_key,
        "server_name": request.server_name,
        "rules_extracted": len(rules),
        "text_policies_extracted": len(text_policies),
        "example_statement": example_statement,
        "message": result.get("message", "Extraction and enrichment successful.")
    }


@router.get("/servers")
def list_servers(tenant_context: dict = Depends(verify_tenant)):
    """
    Returns all connected servers (tenant_configurations rows) for this tenant.
    Loads from Supabase and hydrates the in-memory cache.
    Falls back to in-memory if Supabase is unavailable.
    """
    tenant_id = tenant_context.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Invalid tenant context")

    # ── Try Supabase ──
    try:
        db_servers = supabase_client.get_servers_for_tenant(tenant_id)
        result = []
        for s in db_servers:
            key = s["server_key"]
            # Hydrate in-memory cache so /server/{key} routes work
            if key not in ACTIVE_SERVERS:
                ACTIVE_SERVERS[key] = {
                    "name": s["name"],
                    "rules": [],
                    "status": s["status"],
                    "dialect": s["dialect"],
                    "tenant_id": tenant_id,
                    "server_config_id": s["id"],
                    "example_statement": s.get("example_statement", ""),
                    "repo_url": s.get("repo_url", ""),
                    "llm_provider": s.get("llm_provider", "gemini"),
                    "llm_api_key": s.get("llm_api_key", ""),
                }
            else:
                ACTIVE_SERVERS[key]["llm_provider"] = s.get(
                    "llm_provider", "gemini")
                ACTIVE_SERVERS[key]["llm_api_key"] = s.get("llm_api_key", "")
            result.append({
                "id": key,
                "name": s["name"],
                "dialect": s["dialect"],
                "status": s["status"],
                "rules": s["rules_extracted"],
                "synced": s.get("synced_at", "recently"),
                "example_statement": s.get("example_statement", ""),
            })
        return result
    except Exception as e:
        logger.warning(f"Supabase unavailable, falling back to in-memory: {e}")

    # ── Fallback: in-memory ──
    return [
        {
            "id": key,
            "name": data["name"],
            "dialect": data["dialect"],
            "status": data["status"],
            "rules": len(data["rules"]),
            "synced": "Just now",
            "example_statement": data.get("example_statement", ""),
        }
        for key, data in ACTIVE_SERVERS.items()
        if data.get("tenant_id") == tenant_id
    ]


@router.post("/onboarding/welcome")
def onboarding_welcome(tenant_context: dict = Depends(verify_tenant)):
    email = tenant_context.get("email")
    user_id = tenant_context.get("user_id")
    if not email:
        raise HTTPException(
            status_code=400, detail="Missing email in tenant context")

    full_name = "User"
    try:
        profile = supabase_client.get_profile_by_id(user_id)
        if profile:
            full_name = profile.get("full_name", "User")
    except Exception as e:
        logger.warning(f"Failed to fetch profile for welcome email: {e}")

    try:
        send_welcome_email(email, full_name)
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "success", "message": "Welcome email triggered."}


@router.post("/onboarding/login-notification")
def onboarding_login(request: Request, tenant_context: dict = Depends(verify_tenant)):
    email = tenant_context.get("email")
    user_id = tenant_context.get("user_id")
    if not email:
        raise HTTPException(
            status_code=400, detail="Missing email in tenant context")

    user_agent = request.headers.get("user-agent", "Unknown Browser")
    ip_address = request.client.host if request.client else "Unknown IP"

    full_name = "User"
    try:
        profile = supabase_client.get_profile_by_id(user_id)
        if profile:
            full_name = profile.get("full_name", "User")
    except Exception as e:
        logger.warning(f"Failed to fetch profile for login email: {e}")

    # Trigger trial expiration warning check on login
    try:
        _check_and_trigger_trial_warning(user_id, email, full_name)
    except Exception as trial_err:
        logger.warning(f"Failed to check trial status: {trial_err}")

    try:
        send_login_notification(email, full_name, user_agent, ip_address)
    except Exception as e:
        logger.error(f"Failed to send login notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "success", "message": "Login notification email triggered."}


def _check_and_trigger_trial_warning(user_id: str, email: str, full_name: str):
    """
    Checks if any server trial is expiring in less than 7 days, and fires a warning.
    Disallowed/No-op since payments/trials are removed.
    """
    return

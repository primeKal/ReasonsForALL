from fastapi import APIRouter, Depends, HTTPException
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


@router.post("/connect")
def connect_database(request: ConnectionRequest, tenant_context: dict = Depends(verify_tenant)):
    """
    Connects to the provided database, extracts the schema,
    runs the two-step AI ontological enrichment (identifying subsumes relations
    and generating example logical rules), and saves everything to Supabase.
    """
    tenant_id = tenant_context.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Invalid tenant context")

    extractor = DBExtractor(tenant_id=tenant_id)

    result = extractor.extract_schema(
        connection_string=request.connection_string,
        rule_cap=config.FREE_TRIAL_RULE_CAP
    )

    if result["status"] == "simulated":
        logger.warning(f"Database connection failed. Proceeding with simulated sandbox ontology: {result.get('message')}")

    # Derive dialect from the connection string scheme
    dialect = request.connection_string.split("://")[0].split("+")[0]

    # URL-safe server key used in routes like /dashboard/servers/{server_key}
    server_key = request.server_name.lower().replace(" ", "-") + "-" + str(uuid.uuid4())[:4]
    rules = result.get("rules", [])

    # Rules and statement are now fully compiled by the multi-agent system in DBExtractor
    rules = result.get("rules", [])
    example_statement = result.get("example_statement", "A Waiter is a subclass of Employee. Waiters are disjoint from Buyers.")

    # ── 2. Cache in-memory ──
    ACTIVE_SERVERS[server_key] = {
        "name": request.server_name,
        "rules": rules,
        "status": "Connected",
        "dialect": dialect,
        "tenant_id": tenant_id,
        "server_config_id": None,
        "example_statement": example_statement,
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
        )
        server_config_id = row.get("id")
        ACTIVE_SERVERS[server_key]["server_config_id"] = server_config_id
        logger.info(f"Server '{server_key}' (id={server_config_id}) saved to tenant_configurations")
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
            logger.info(f"Saved {len(rules)} quads to tenant_quad_store for server {server_config_id}")
        except Exception as e:
            logger.error(f"Failed to persist quad rules: {e}")

    # ── 5. Persist text-based business policies to tenant_text_policies ──
    text_policies = result.get("text_policies", [])
    if server_config_id and text_policies:
        try:
            supabase_client.save_text_policies(
                tenant_id=tenant_id,
                server_config_id=server_config_id,
                policies=text_policies,
            )
            logger.info(f"Saved {len(text_policies)} text policies for server {server_config_id}")
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
                }
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

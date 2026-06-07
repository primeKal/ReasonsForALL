"""
Supabase client for backend use.

Data model:
  profiles              → company identity (one per auth user)
  tenant_configurations → one row per connected server (name, dialect, settings)
  tenant_quad_store     → extracted concepts/roles, linked to a server via server_config_id

Uses the service role key so writes bypass Row Level Security.
"""
import httpx
from datetime import datetime, timezone
from app.config import config


def _headers(use_service_key: bool = True) -> dict:
    key = config.SUPABASE_SERVICE_KEY if use_service_key else config.SUPABASE_KEY
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Server CRUD  (tenant_configurations — one row per server)
# ─────────────────────────────────────────────────────────────────────────────

def insert_server_config(
    tenant_id: str,
    server_key: str,
    name: str,
    dialect: str,
    rules_extracted: int,
    max_rules: int = 1000,
    row_scan_depth: int = 500,
    status: str = "Connected",
    example_statement: str = None,
) -> dict:
    """
    Insert a new row in tenant_configurations for a connected server.
    Returns the created row (including its auto-generated bigint id).
    """
    url = f"{config.SUPABASE_URL}/rest/v1/tenant_configurations"
    payload = {
        "tenant_id": tenant_id,
        "server_key": server_key,
        "name": name,
        "dialect": dialect,
        "status": status,
        "rules_extracted": rules_extracted,
        "max_rules": max_rules,
        "row_scan_depth": row_scan_depth,
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "example_statement": example_statement,
    }
    response = httpx.post(url, json=payload, headers=_headers(), timeout=10.0)
    response.raise_for_status()
    rows = response.json()
    return rows[0] if rows else {}


def get_servers_for_tenant(tenant_id: str) -> list:
    """
    Return all server configs for a given tenant, ordered newest first.
    Only rows with a server_key (i.e. real server connections) are returned.
    """
    url = f"{config.SUPABASE_URL}/rest/v1/tenant_configurations"
    params = {
        "tenant_id": f"eq.{tenant_id}",
        "server_key": "not.is.null",       # exclude legacy blank rows
        "order": "created_at.desc",
        "select": "id,tenant_id,server_key,name,dialect,status,rules_extracted,synced_at,max_rules,row_scan_depth,is_premium,trial_expires_at,example_statement",
    }
    response = httpx.get(url, params=params, headers=_headers(), timeout=10.0)
    response.raise_for_status()
    return response.json()


def get_server_config_by_key(tenant_id: str, server_key: str) -> dict | None:
    """Fetch a single server config by its server_key."""
    url = f"{config.SUPABASE_URL}/rest/v1/tenant_configurations"
    params = {
        "tenant_id": f"eq.{tenant_id}",
        "server_key": f"eq.{server_key}",
        "select": "*",
    }
    response = httpx.get(url, params=params, headers=_headers(), timeout=10.0)
    response.raise_for_status()
    rows = response.json()
    return rows[0] if rows else None


def get_server_config_by_key_global(server_key: str) -> dict | None:
    """Fetch a single server config by its server_key globally (without tenant_id)."""
    url = f"{config.SUPABASE_URL}/rest/v1/tenant_configurations"
    params = {
        "server_key": f"eq.{server_key}",
        "select": "*",
    }
    response = httpx.get(url, params=params, headers=_headers(), timeout=10.0)
    response.raise_for_status()
    rows = response.json()
    return rows[0] if rows else None


def update_server_status(tenant_id: str, server_key: str, status: str) -> None:
    """Update the connection status on a server config row."""
    url = f"{config.SUPABASE_URL}/rest/v1/tenant_configurations"
    params = {"tenant_id": f"eq.{tenant_id}", "server_key": f"eq.{server_key}"}
    headers = _headers()
    headers["Prefer"] = "return=minimal"
    httpx.patch(url, params=params, json={"status": status}, headers=headers, timeout=10.0).raise_for_status()


def delete_server_config(tenant_id: str, server_key: str) -> None:
    """
    Delete a server configuration row. Cascades to tenant_quad_store via FK.
    """
    url = f"{config.SUPABASE_URL}/rest/v1/tenant_configurations"
    params = {"tenant_id": f"eq.{tenant_id}", "server_key": f"eq.{server_key}"}
    httpx.delete(url, params=params, headers=_headers(), timeout=10.0).raise_for_status()


# ─────────────────────────────────────────────────────────────────────────────
# Quad-store  (tenant_quad_store — concepts & roles per server)
# ─────────────────────────────────────────────────────────────────────────────

def save_quad_store_rules(tenant_id: str, server_config_id: int, rules: list) -> None:
    """
    Persist extracted ontology rules (concepts & roles) for a server.
    Deletes any existing quads for this server first, then inserts fresh ones.
    The server_config_id FK ensures they cascade-delete when the server is removed.
    """
    # 1. Delete existing quads for this server
    del_url = f"{config.SUPABASE_URL}/rest/v1/tenant_quad_store"
    del_params = {
        "tenant_id": f"eq.{tenant_id}",
        "server_config_id": f"eq.{server_config_id}",
    }
    del_headers = _headers()
    del_headers["Prefer"] = "return=minimal"
    httpx.delete(del_url, params=del_params, headers=del_headers, timeout=10.0)

    if not rules:
        return

    # 2. Insert fresh quads, linking each to the server config
    records = [
        {
            "tenant_id": tenant_id,
            "server_config_id": server_config_id,
            "subject": r.get("subject", ""),
            "predicate": r.get("predicate", ""),
            "object_val": r.get("object", ""),
            "rule_type": r.get("type", "Unknown"),
            "quantifier": r.get("quantifier"),
            "cardinality_value": r.get("cardinality_value"),
            "description": r.get("description"),
        }
        for r in rules
    ]

    ins_url = f"{config.SUPABASE_URL}/rest/v1/tenant_quad_store"
    headers = _headers()
    headers["Prefer"] = "return=minimal"
    httpx.post(ins_url, json=records, headers=headers, timeout=15.0).raise_for_status()


def get_quads_for_server(tenant_id: str, server_config_id: int) -> list:
    """Fetch all concepts/rules for a specific server."""
    url = f"{config.SUPABASE_URL}/rest/v1/tenant_quad_store"
    params = {
        "tenant_id": f"eq.{tenant_id}",
        "server_config_id": f"eq.{server_config_id}",
        "order": "id.asc",
    }
    response = httpx.get(url, params=params, headers=_headers(), timeout=10.0)
    response.raise_for_status()
    return response.json()

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
import secrets
import logging
from pydantic import BaseModel
from app.state import ACTIVE_SERVERS
from app.services import supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/server",
    tags=["Server Dashboard"]
)

# Mocked API Key storage for demo purposes
MOCK_API_KEYS = []

class APIKeyResponse(BaseModel):
    id: str
    key: str
    created_at: str

def _ensure_rules_loaded(server: dict) -> None:
    """Hydrates server['rules'] and other attributes from Supabase if empty."""
    if (not server.get("rules") or not server.get("example_statement")) and server.get("server_config_id"):
        try:
            db_servers = supabase_client.get_servers_for_tenant(server["tenant_id"])
            matching_server = next((s for s in db_servers if s["id"] == server["server_config_id"]), None)
            if matching_server:
                server["example_statement"] = matching_server.get("example_statement", "")

            if not server.get("rules"):
                db_quads = supabase_client.get_quads_for_server(server["tenant_id"], server["server_config_id"])
                server["rules"] = [
                    {
                        "subject": q["subject"],
                        "predicate": q["predicate"],
                        "object": q["object_val"],
                        "type": q["rule_type"],
                        "quantifier": q.get("quantifier", "none"),
                        "cardinality_value": q.get("cardinality_value"),
                        "description": q.get("description", "")
                    }
                    for q in db_quads
                ]
            logger.info(f"Loaded server rules & statement from Supabase for server {server.get('server_config_id')}")
        except Exception as e:
            logger.error(f"Failed to fetch quads/metadata from Supabase for server {server.get('server_config_id')}: {e}")


def _get_or_hydrate_server(server_id: str) -> dict:
    """Retrieves server from ACTIVE_SERVERS or hydrates it from Supabase globally."""
    server = ACTIVE_SERVERS.get(server_id)
    if not server:
        # Try finding in Supabase globally
        try:
            db_server = supabase_client.get_server_config_by_key_global(server_id)
            if db_server:
                server = {
                    "name": db_server["name"],
                    "rules": [],
                    "status": db_server["status"],
                    "dialect": db_server["dialect"],
                    "tenant_id": db_server["tenant_id"],
                    "server_config_id": db_server["id"],
                    "example_statement": db_server.get("example_statement", ""),
                }
                ACTIVE_SERVERS[server_id] = server
                logger.info(f"Dynamically hydrated server '{server_id}' cache from Supabase")
        except Exception as e:
            logger.error(f"Failed to dynamically hydrate server '{server_id}' from Supabase: {e}")
            
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
        
    _ensure_rules_loaded(server)
    return server


@router.get("/{server_id}")
def get_server_overview(server_id: str):
    """
    Returns the high-level overview metrics for the specified reasoning server.
    """
    server = _get_or_hydrate_server(server_id)

    return {
        "server_id": server_id,
        "name": server["name"],
        "status": server["status"],
        "active_policies_count": len(server["rules"]),
        "active_policies_limit": 1000,
        "avg_inference_time_ms": 3.2,
        "recent_blocks": 12,
        "example_statement": server.get("example_statement", "A Waiter is a subclass of Employee. Waiters are disjoint from Buyers.")
    }

@router.delete("/{server_id}")
def delete_server(server_id: str):
    """
    Disconnects and deletes the reasoning server from memory and Supabase.
    Deleting the tenant_configurations row cascades to tenant_quad_store.
    """
    server = _get_or_hydrate_server(server_id)
    tenant_id = server.get("tenant_id", "")
    
    if server_id in ACTIVE_SERVERS:
        del ACTIVE_SERVERS[server_id]

    # Delete from Supabase (cascades quads via FK)
    if tenant_id:
        try:
            supabase_client.delete_server_config(tenant_id=tenant_id, server_key=server_id)
            logger.info(f"Server '{server_id}' deleted from tenant_configurations (quads cascade-deleted)")
        except Exception as e:
            logger.error(f"Failed to delete server from Supabase: {e}")

    return {"status": "deleted"}

@router.get("/{server_id}/concepts")
def get_server_concepts(server_id: str):
    """
    Returns the Business Entities discovered from the mapped database.
    """
    server = _get_or_hydrate_server(server_id)

    # Extract unique business entities (classes) from the rules
    entities = list(set([r["subject"] for r in server["rules"] if r.get("type") == "ClassDefinition" or r.get("type") == "ObjectProperty"]))
    
    return {
        "server_id": server_id,
        "entities": [{"name": e, "status": "Mapped"} for e in entities]
    }

@router.get("/{server_id}/rules")
def get_server_rules(server_id: str):
    """
    Returns the Guardrail Rules mapped from database constraints.
    """
    server = _get_or_hydrate_server(server_id)

    return {
        "server_id": server_id,
        "rules": [r for r in server["rules"] if r.get("type") != "ClassDefinition"] # Filter out plain class definitions
    }

@router.get("/{server_id}/text_policies")
def get_server_text_policies(server_id: str):
    """
    Returns the plain-English business rules (text-based policies) for the server.
    """
    server = _get_or_hydrate_server(server_id)
    try:
        policies = supabase_client.get_text_policies_for_server(
            server["tenant_id"], server["server_config_id"]
        )
        return {
            "server_id": server_id,
            "policies": [
                {
                    "id": p.get("id"),
                    "title": p.get("title"),
                    "body": p.get("body"),
                    "source_type": p.get("source_type", "inferred"),
                    "created_at": p.get("created_at")
                }
                for p in policies
            ]
        }
    except Exception as e:
        logger.error(f"Failed to fetch text policies for server {server_id}: {e}")
        return {"server_id": server_id, "policies": []}

@router.get("/{server_id}/api_keys", response_model=List[APIKeyResponse])
def list_api_keys(server_id: str):
    """
    Lists all API keys generated for the server to be used by autonomous agents.
    """
    server = _get_or_hydrate_server(server_id)
    
    if "api_keys" not in server:
        server["api_keys"] = []
    return server["api_keys"]

@router.post("/{server_id}/api_keys", response_model=APIKeyResponse)
def generate_api_key(server_id: str):
    """
    Generates a new secure API key for agent injection.
    """
    server = _get_or_hydrate_server(server_id)
        
    if "api_keys" not in server:
        server["api_keys"] = []
        
    new_key = {
        "id": secrets.token_hex(4),
        "key": f"sk-rfa-{secrets.token_hex(16)}",
        "created_at": "2026-05-29T12:00:00Z"
    }
    server["api_keys"].append(new_key)
    return new_key


class ChatMessageRequest(BaseModel):
    message: str
    reasoning_mode: str = "text"  # "text" (default) | "logical" (beta)

@router.post("/{server_id}/chat")
def server_chat(server_id: str, request: ChatMessageRequest):
    """
    Evaluates a user message using either:
    - 'text' mode (default): LLM judges query against stored text-based business policies.
    - 'logical' mode (beta): Formal Description Logic reasoning via owlready2.
    Returns is_valid, explanation, violations, and a structured analysis breakdown.
    """
    import json
    server = _get_or_hydrate_server(server_id)
    mode = (request.reasoning_mode or "text").lower()

    logger.info(f"--- [CHAT START | mode={mode}] ---")
    logger.info(f"[Step 1] User message: '{request.message}'")

    # ── Fetch quads (needed by both modes for context) ──────────────────────
    try:
        db_quads = supabase_client.get_quads_for_server(server["tenant_id"], server["server_config_id"])
        quads = [
            {
                "subject": q["subject"],
                "predicate": q["predicate"],
                "object": q["object_val"],
                "type": q["rule_type"],
                "quantifier": q.get("quantifier", "none"),
                "cardinality_value": q.get("cardinality_value"),
                "description": q.get("description", "")
            }
            for q in db_quads
        ]
        server["rules"] = quads
        logger.info(f"[Step 2] Fetched {len(quads)} schema quads from Supabase.")
    except Exception as e:
        logger.warning(f"[Step 2] Failed to fetch quads: {e}. Using cached.")
        quads = server.get("rules", [])

    from app.services.gemini_service import GeminiService
    gemini_svc = GeminiService()

    # ════════════════════════════════════════════════════════════════════════
    # TEXT MODE (default) — LLM policy comparison
    # ════════════════════════════════════════════════════════════════════════
    if mode == "text":
        logger.info("[Step 3] Mode: TEXT — fetching stored text policies...")
        try:
            raw_policies = supabase_client.get_text_policies_for_server(
                server["tenant_id"], server["server_config_id"]
            )
            policies = [{"title": p["title"], "body": p["body"], "source_type": p.get("source_type", "inferred")} for p in raw_policies]
        except Exception as e:
            logger.warning(f"[Step 3] Failed to fetch text policies: {e}. Using empty list.")
            policies = []

        logger.info(f"[Step 3] Loaded {len(policies)} text policies. Calling LLM judge...")
        result = gemini_svc.analyze_with_text_policies(
            user_query=request.message,
            policies=policies,
            quads=quads,
        )

        is_allowed = result.get("is_allowed")
        verdict = result.get("verdict_label", "unclear")
        confidence = result.get("confidence", 0.0)
        summary = result.get("summary", "")
        violated = result.get("violated_policies", [])
        supporting = result.get("supporting_policies", [])
        steps = result.get("analysis_steps", [])

        logger.info(f"[Step 4] Text verdict: {verdict} | confidence: {confidence}")

        # Verdict → is_valid mapping
        is_valid = (is_allowed is True) or (verdict in ("allowed", "conditional"))

        violated_text = ""
        if violated:
            violated_text = "\n**Violated Policies:**\n" + "\n".join(f"- ❌ {v}" for v in violated) + "\n"
        supporting_text = ""
        if supporting:
            supporting_text = "\n**Supporting Policies:**\n" + "\n".join(f"- ✅ {v}" for v in supporting) + "\n"
        steps_text = ""
        if steps:
            steps_text = "\n**Analysis Steps:**\n" + "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps)) + "\n"
        policies_text = ""
        if policies:
            policies_text = "\n**Active Business Policies Checked:** " + str(len(policies)) + "\n"

        verdict_emoji = {"allowed": "✅", "blocked": "🚫", "conditional": "⚠️", "unclear": "❓"}.get(verdict, "❓")
        confidence_pct = f"{int(confidence * 100)}%"

        explanation = (
            f"{verdict_emoji} **Text Policy Analysis — {verdict.upper()}** (Confidence: {confidence_pct})\n\n"
            f"### 💬 1. User Query\n> \"{request.message}\"\n\n"
            f"### 📋 2. Policy Evaluation\n"
            f"*{summary}*\n"
            f"{violated_text}"
            f"{supporting_text}"
            f"{policies_text}\n"
            f"### 🔍 3. Reasoning Steps\n"
            f"{steps_text}\n"
            f"### 🎯 4. Verdict\n"
            f"**{verdict.upper()}** — {'Action is permitted under active policies.' if is_valid else 'Action is blocked or restricted by active policies.'}"
        )

        return {
            "is_valid": is_valid,
            "explanation": explanation,
            "violations": [f"{v}" for v in violated],
            "reasoning_mode": "text",
            "analysis": {
                "mode": "text",
                "verdict_label": verdict,
                "confidence": confidence,
                "summary": summary,
                "violated_policies": violated,
                "supporting_policies": supporting,
                "analysis_steps": steps,
                "policies_checked": len(policies),
            }
        }

    # ════════════════════════════════════════════════════════════════════════
    # LOGICAL MODE (beta) — owlready2 Description Logic reasoning
    # ════════════════════════════════════════════════════════════════════════
    logger.info("[Step 3] Mode: LOGICAL (beta) — NLU parsing with Gemini...")
    parsed_ai = gemini_svc.ask_logical_statement(statement=request.message, quads=quads)

    payload = parsed_ai.get("payload", {})
    extracted_logic_summary = parsed_ai.get("extracted_logic_summary", "Extraction completed.")
    logical_assertions = parsed_ai.get("logical_assertions", [])

    logger.info(f"[Step 4] NLU: subject='{payload.get('subject_class') if isinstance(payload, dict) else '?'}', assertions={logical_assertions}")

    if not (isinstance(payload, dict) and "expression_tree" in payload):
        nlu_ok = parsed_ai.get("nlu_ok", True)
        if not nlu_ok or not payload:
            return {
                "is_valid": False,
                "explanation": f"⚠️ **NLU Parsing Failed**\n\nThe AI parser could not extract a structured logical statement.\n**Reason**: {extracted_logic_summary}",
                "violations": ["NLU parsing unavailable."],
                "reasoning_mode": "logical",
                "analysis": {"mode": "logical", "error": "NLU parsing failed", "summary": extracted_logic_summary}
            }

    from app.services.ontology_engine import OntologyEngine
    engine = OntologyEngine(tenant_id=server["tenant_id"])
    logger.info("[Step 5] Running owlready2 DL reasoning...")
    validation_result = engine.validate_payload(agent_intent="other", payload_data=payload, quads=quads)

    is_valid = validation_result["is_valid"]
    violations = validation_result["violations"]
    inference_time = validation_result.get("inference_time_ms", 0.0)
    generated_dl = validation_result.get("generated_dl_statement", "")
    tbox_list = validation_result.get("connecting_tbox", [])
    transitions_list = validation_result.get("owl_inference_transitions", [])

    logger.info(f"[Step 6] DL Verdict: {'SATISFIABLE' if is_valid else 'UNSATISFIABLE'} in {inference_time}ms")

    tbox_text = ("\n**Loaded TBox Axioms:**\n" + "\n".join(f"- `{t}`" for t in tbox_list) + "\n") if tbox_list else ""
    transitions_text = ("\n**OWL Inference Trace:**\n" + "\n".join(f"{i+1}. {t}" for i, t in enumerate(transitions_list)) + "\n") if transitions_list else ""
    assertions_text = ("\n**Extracted Logical Assertions:**\n" + "\n".join(f"- `{a}`" for a in logical_assertions) + "\n") if logical_assertions else ""
    dl_block = f"\n**DL Formula:** `{generated_dl}`\n" if generated_dl else ""

    explanation = (
        f"🧭 **Logical Reasoning (Beta) — {'SATISFIABLE ✅' if is_valid else 'UNSATISFIABLE 🚫'}**\n\n"
        f"### 💬 1. User Query\n> \"{request.message}\"\n\n"
        f"### 📝 2. NLU Translation\n*{extracted_logic_summary}*\n{assertions_text}\n"
        f"### ⚙️ 3. owlready2 DL Reasoning\n- Inference time: **{inference_time}ms**\n{dl_block}\n{tbox_text}\n{transitions_text}\n"
        f"### 🎯 4. Verdict\n{'✓ Consistent & Allowed.' if is_valid else '✗ Contradictory & Blocked.'}"
    )

    return {
        "is_valid": is_valid,
        "explanation": explanation,
        "violations": violations,
        "reasoning_mode": "logical",
        "analysis": {
            "mode": "logical",
            "verdict_label": "allowed" if is_valid else "blocked",
            "confidence": 1.0,
            "summary": extracted_logic_summary,
            "generated_dl_statement": generated_dl,
            "tbox_axioms": tbox_list,
            "inference_transitions": transitions_list,
            "logical_assertions": logical_assertions,
            "inference_time_ms": inference_time,
            "violated_policies": [v for v in violations],
            "supporting_policies": [],
            "analysis_steps": transitions_list,
            "policies_checked": len(quads),
        }
    }


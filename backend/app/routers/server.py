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

@router.post("/{server_id}/chat")
def server_chat(server_id: str, request: ChatMessageRequest):
    """
    Evaluates a user-submitted logical statement against the active server's quads.
    Uses Gemini strictly as an NLU semantic parser to extract the intent and parameters,
    then executes description logic reasoning locally using owlready2.
    """
    import json
    server = _get_or_hydrate_server(server_id)

    logger.info("--- [REASONING CHAT TRANSITION START] ---")
    logger.info(f"[Step 1: Input Received] User Message: '{request.message}'")

    # 1. Gather all rules / quads from Supabase directly to ensure latest ontology rules are used
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
        logger.info(f"[Step 2: Schema Context] Fetched {len(quads)} fresh quads from Supabase for server '{server_id}'")
        type_counts = {}
        for q in quads:
            t = q.get("type", "Unknown")
            type_counts[t] = type_counts.get(t, 0) + 1
        for rule_type, count in type_counts.items():
            logger.info(f"  - {rule_type}: {count} quad(s)")
    except Exception as e:
        logger.warning(f"[Step 2: Schema Context] Failed to fetch fresh quads from Supabase, using cached: {e}")
        quads = server["rules"]
        logger.info(f"[Step 2: Schema Context] Using {len(quads)} cached quads")

    # 2. Call Gemini Service to parse the logical statement
    from app.services.gemini_service import GeminiService
    gemini_svc = GeminiService()
    
    logger.info("[Step 3: NLU Parsing] Sending user message to Gemini NLU parser...")
    parsed_ai = gemini_svc.ask_logical_statement(
        statement=request.message,
        quads=quads
    )
    
    agent_intent = "other"
    payload = parsed_ai.get("payload", {})
    extracted_logic_summary = parsed_ai.get("extracted_logic_summary", "Semantic extraction completed.")
    logical_assertions = parsed_ai.get("logical_assertions", [])

    logger.info("[Step 4: NLU Result]")
    logger.info(f"  - Subject class: '{payload.get('subject_class', '(none)') if isinstance(payload, dict) else '(none)'}'")
    logger.info(f"  - Logical assertions: {logical_assertions}")
    logger.info(f"  - Logic summary: '{extracted_logic_summary}'")
    if isinstance(payload, dict) and "expression_tree" in payload:
        logger.info(f"  - Expression tree: {json.dumps(payload['expression_tree'])}")
    else:
        # NLU failed to produce a parseable expression — do NOT pass silently as valid
        nlu_ok = parsed_ai.get("nlu_ok", True)
        if not nlu_ok or not payload:
            logger.error("[Step 4: NLU FAILURE] No expression_tree extracted. Aborting reasoning — cannot default to valid.")
            return {
                "is_valid": False,
                "explanation": (
                    f"⚠️ **NLU Parsing Failed — Reasoning Aborted**\n\n"
                    f"The AI parser could not extract a structured logical statement from your input.\n"
                    f"**Reason**: {extracted_logic_summary}\n\n"
                    f"Please try again in a moment, or rephrase your query."
                ),
                "violations": ["NLU parsing unavailable: no expression tree could be extracted from the input."]
            }

    # 3. Instantiate local OntologyEngine and execute formal owlready2 reasoning
    from app.services.ontology_engine import OntologyEngine
    engine = OntologyEngine(tenant_id=server["tenant_id"])
    
    logger.info("[Step 5: owlready2 Hydration & Evaluation] Initializing OntologyEngine and executing validation...")
    validation_result = engine.validate_payload(
        agent_intent=agent_intent,
        payload_data=payload,
        quads=quads
    )
    
    # 4. Log and assemble the full verdict
    is_valid = validation_result["is_valid"]
    violations = validation_result["violations"]
    inference_time = validation_result.get("inference_time_ms", 0.0)
    generated_dl = validation_result.get("generated_dl_statement", "")
    tbox_list = validation_result.get("connecting_tbox", [])
    transitions_list = validation_result.get("owl_inference_transitions", [])

    logger.info("[Step 6: Reasoning Verdict]")
    logger.info(f"  - Satisfiability: {'✓ Consistent & Satisfiable' if is_valid else '✗ Contradictory / Unsatisfiable'}")
    logger.info(f"  - DL Formula: '{generated_dl}'")
    logger.info(f"  - Inference time: {inference_time}ms")
    if tbox_list:
        logger.info(f"  - TBox axioms rehydrated ({len(tbox_list)}):")
        for axiom in tbox_list:
            logger.info(f"      {axiom}")
    if violations:
        logger.info(f"  - Violations ({len(violations)}):")
        for v in violations:
            logger.info(f"      {v}")
    if transitions_list:
        logger.info(f"  - OWL inference transitions ({len(transitions_list)}):")
        for step in transitions_list:
            logger.info(f"      {step}")
    logger.info("--- [REASONING CHAT TRANSITION END] ---")

    tbox_text = ""
    if tbox_list:
        tbox_text = "\n**Loaded TBox Axioms (Schema Rules)**:\n" + "\n".join(f"- `{t}`" for t in tbox_list) + "\n"

    transitions_text = ""
    if transitions_list:
        transitions_text = "\n**OWL Inference & Transition Trace**:\n" + "\n".join(f"{i+1}. {t}" for i, t in enumerate(transitions_list)) + "\n"

    assertions_text = ""
    if logical_assertions:
        assertions_text = "\n**Extracted Logical Assertions**:\n" + "\n".join(f"- `{a}`" for a in logical_assertions) + "\n"
    
    dl_statement_block = ""
    if generated_dl:
        dl_statement_block = f"\n**Final Evaluated Description Logic Formula**:\n> `{generated_dl}`\n"

    explanation = (
        f"🧭 **Transition Trace: From Conversational Query to Logical Verdict**\n\n"
        f"### 💬 1. Conversational Input\n"
        f"User query text:\n> \"{request.message}\"\n\n"
        f"### 📝 2. AI NLU Parser Translation\n"
        f"Mapped conversational statement to variables: `{json.dumps(payload)}`.\n"
        f"*{extracted_logic_summary}*\n"
        f"{assertions_text}\n"
        f"### ⚙️ 3. owlready2 Description Logic Hydration & Solver\n"
        f"- Dynamic Class restrictions bound from active schema rules.\n"
        f"- Subclass and disjointness relations rehydrated in-memory.\n"
        f"- Executed Pellet/HermiT DL satisfiability analysis in **{inference_time}ms**.\n"
        f"{dl_statement_block}\n"
        f"{tbox_text}\n"
        f"{transitions_text}\n"
        f"### 🎯 4. Final Verdict\n"
        f"Status: {'✓ Consistent & Allowed - No logical clashes detected.' if is_valid else '✗ Contradictory & Blocked - Logical rule violation.'}"
    )

    return {
        "is_valid": is_valid,
        "explanation": explanation,
        "violations": violations,
    }

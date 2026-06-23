from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict
import logging
from app.dependencies import verify_api_key
from app.services.ontology_engine import OntologyEngine
from app.services import supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reasoning",
    tags=["reasoning"]
)


class VerifyPayloadRequest(BaseModel):
    agent_intent: str
    payload: Dict[str, Any]
    server_id: str
    include_details: bool | None = False


@router.post("/verify")
def verify_payload(request: VerifyPayloadRequest, server_context: dict = Depends(verify_api_key)):
    """
    Validates real-time transactional record instances against stored rules.
    Retrieves the server's rules from Supabase and runs verification.
    """
    tenant_id = server_context.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Invalid tenant context")

    try:
        # 1. Fetch server config to get the correct server_config_id globally
        db_server = supabase_client.get_server_config_by_key_global(
            request.server_id)
        if not db_server:
            raise HTTPException(
                status_code=404, detail="Server not found")

        # 2. Fetch all quads/rules associated with this server config from Supabase
        db_quads = supabase_client.get_quads_for_server(
            db_server["tenant_id"], db_server["id"])

        # 3. Map db quads to standard ontology rules format
        quads = [
            {
                "subject": q["subject"],
                "predicate": q["predicate"],
                "object": q["object_val"],
                "type": q["rule_type"]
            }
            for q in db_quads
        ]
        logger.info(
            f"Loaded {len(quads)} database rules for verify API request on server {request.server_id}")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to load rules for verify API request: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch rules for verification: {e}")

    # Re-hydrate the ontology, validate, and tear down memory context
    engine = OntologyEngine(tenant_id=db_server["tenant_id"])
    validation_result = engine.validate_payload(
        agent_intent=request.agent_intent,
        payload_data=request.payload,
        quads=quads
    )

    # Save verification API audit log to Supabase
    try:
        supabase_client.save_api_log(
            tenant_id=db_server["tenant_id"],
            server_config_id=db_server["id"],
            agent_intent=request.agent_intent,
            payload=request.payload,
            is_valid=validation_result["is_valid"],
            violations=validation_result["violations"],
            inference_time_ms=validation_result.get("inference_time_ms", 0.0),
        )
    except Exception as log_err:
        logger.warning(f"Failed to log verify API request: {log_err}")

    response_data = {
        "agent_intent": request.agent_intent,
        "is_valid": validation_result["is_valid"],
        "violations": validation_result["violations"],
        "inference_time_ms": validation_result["inference_time_ms"],
        "message": "Payload validation complete."
    }

    # Generate detailed description and recommendation if requested
    if request.include_details:
        description = "Query successfully validated and matched active security policies."
        recommendation = "No action required. Safe to execute transaction query."
        
        if not validation_result["is_valid"]:
            description = f"Query blocked due to policy violations: {', '.join(validation_result['violations'])}."
            recommendation = "Revise transaction joins, ensure authentication contexts are supplied, or verify user role permissions."
            
            # Enrich using custom LLM if possible
            llm_key = db_server.get("llm_api_key", "").strip() or __import__("os").getenv("GEMINI_API_KEY", __import__("os").getenv("GOOGLE_API_KEY", ""))
            if llm_key:
                try:
                    from app.services.gemini_service import GeminiService
                    gemini_svc = GeminiService(api_key=llm_key, provider=db_server.get("llm_provider", "gemini"))
                    prompt = (
                        "You are an AI Security Guardrail analyst. Analyze the following blocked query "
                        "and its violations, then provide a detailed explanation of why it was blocked "
                        "and an actionable recommendation for correcting it.\n\n"
                        f"Query/Intent: {request.agent_intent}\n"
                        f"Payload Context: {request.payload}\n"
                        f"Violations Detected: {validation_result['violations']}\n\n"
                        "Return strictly a JSON object with: 'description' (why it was blocked) and 'recommendation' (how the agent or developer can resolve it)."
                    )
                    import json
                    text_response = gemini_svc._call_llm(prompt, json_mode=True)
                    parsed = json.loads(text_response)
                    description = parsed.get("description", description)
                    recommendation = parsed.get("recommendation", recommendation)
                except Exception as llm_err:
                    logger.warning(f"Failed to enrich details with LLM: {llm_err}")

        response_data["description"] = description
        response_data["recommendation"] = recommendation

    return response_data

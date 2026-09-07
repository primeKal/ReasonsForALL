from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
import logging
from app.dependencies import verify_api_key
from app.services.validator_agent import ValidatorAgent
from app.services.gemini_service import GeminiService
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
    threshold: Optional[float] = 0.70
    include_details: Optional[bool] = False


@router.post("/verify")
@router.post("/validate")
def verify_payload(request: VerifyPayloadRequest, server_context: dict = Depends(verify_api_key)):
    """
    Validates incoming AI agent requests using a dedicated Validator Agent.
    Evaluates compliance against stored business rules and policies, generating
    a confidence score and comparing it against a threshold to block or accept the application.
    """
    tenant_id = server_context.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Invalid tenant context")

    try:
        # 1. Fetch server config by server_id (server_key)
        db_server = supabase_client.get_server_config_by_key_global(request.server_id)
        if not db_server:
            raise HTTPException(status_code=404, detail="Server not found")

        # 2. Fetch all rules (quads) and text policies associated with this server
        db_quads = supabase_client.get_quads_for_server(
            db_server["tenant_id"], db_server["id"]
        )

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

        raw_policies = supabase_client.get_text_policies_for_server(
            db_server["tenant_id"], db_server["id"]
        )
        policies = [
            {
                "title": p.get("title", ""),
                "body": p.get("body", ""),
                "source_type": p.get("source_type", "inferred")
            }
            for p in (raw_policies or [])
        ]

        logger.info(
            f"Loaded {len(quads)} rules and {len(policies)} text policies for verification on server {request.server_id}"
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to load rules for verify API request: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch rules for verification: {e}"
        )

    # Configure LLM service with server-specific key or system default
    llm_key = (db_server.get("llm_api_key") or "").strip()
    llm_provider = db_server.get("llm_provider", "gemini")
    gemini_svc = GeminiService(api_key=llm_key, provider=llm_provider) if llm_key else GeminiService()

    # Run validation via ValidatorAgent
    validator = ValidatorAgent(gemini_service=gemini_svc)
    threshold = request.threshold if request.threshold is not None else 0.70

    validation_result = validator.validate(
        agent_intent=request.agent_intent,
        payload_data=request.payload,
        quads=quads,
        policies=policies,
        threshold=threshold
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
            inference_time_ms=0.0,
        )
    except Exception as log_err:
        logger.warning(f"Failed to log verify API request: {log_err}")

    response_data = {
        "agent_intent": request.agent_intent,
        "is_valid": validation_result["is_valid"],
        "verdict": validation_result["verdict"],
        "confidence_score": validation_result["confidence_score"],
        "threshold": validation_result["threshold"],
        "violations": validation_result["violations"],
        "message": validation_result["message"],
        "description": validation_result["description"],
        "recommendation": validation_result["recommendation"],
    }

    if request.include_details:
        response_data["evaluation_breakdown"] = validation_result.get("evaluation_breakdown", {})

    return response_data

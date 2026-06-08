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
        db_server = supabase_client.get_server_config_by_key_global(request.server_id)
        if not db_server:
            raise HTTPException(status_code=404, detail="Reasoning server not found")
            
        # 2. Fetch all quads/rules associated with this server config from Supabase
        db_quads = supabase_client.get_quads_for_server(db_server["tenant_id"], db_server["id"])
        
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
        logger.info(f"Loaded {len(quads)} database rules for verify API request on server {request.server_id}")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to load rules for verify API request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch rules for verification: {e}")

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
    
    return {
        "agent_intent": request.agent_intent,
        "is_valid": validation_result["is_valid"],
        "violations": validation_result["violations"],
        "inference_time_ms": validation_result["inference_time_ms"],
        "message": "Payload validation complete."
    }

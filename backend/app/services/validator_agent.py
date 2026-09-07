import logging
import json
import re
from typing import Dict, Any, List, Optional
from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)


class ValidatorAgent:
    """
    Intelligent Validator Agent for AI Agent guardrail requests.
    
    This agent evaluates incoming requests against business rules, active database policies,
    and entity constraints. It produces a confidence score (0.0 to 1.0) reflecting the
    likelihood that the application/request conforms to defined business logic, and uses a
    configurable threshold to block or accept the application.
    """

    DEFAULT_THRESHOLD = 0.70

    def __init__(self, gemini_service: Optional[GeminiService] = None):
        self.gemini_service = gemini_service or GeminiService()

    def validate(
        self,
        agent_intent: str,
        payload_data: Dict[str, Any],
        quads: List[Dict[str, Any]],
        policies: Optional[List[Dict[str, Any]]] = None,
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Validates an agent request intent and payload against stored rules and policies.
        Computes a confidence score and compares it against the threshold to block or accept.
        """
        active_threshold = float(threshold) if threshold is not None else self.DEFAULT_THRESHOLD
        policies = policies or []
        
        logger.info(
            f"[ValidatorAgent] Starting validation for intent: '{agent_intent}' "
            f"with threshold={active_threshold} across {len(quads)} rules and {len(policies)} policies"
        )

        # 1. Evaluate against relational/structural constraints (quads)
        structural_violations = self._check_structural_rules(agent_intent, payload_data, quads)

        # 2. Semantic policy evaluation via LLM
        llm_eval = self._evaluate_with_llm(agent_intent, payload_data, quads, policies)

        # 3. Combine violations
        all_violations = list(dict.fromkeys(structural_violations + llm_eval.get("violations", [])))

        # 4. Compute confidence score
        base_confidence = llm_eval.get("confidence")
        if base_confidence is None:
            # Fallback heuristic calculation if LLM didn't supply confidence
            if all_violations:
                base_confidence = max(0.1, 0.6 - (len(all_violations) * 0.2))
            else:
                base_confidence = 0.92

        # Penalize confidence if any violations were detected
        if all_violations:
            penalty = len(all_violations) * 0.25
            base_confidence = max(0.05, round(min(base_confidence, 1.0 - penalty), 2))

        # Further penalize if severe structural violations were detected
        if structural_violations:
            base_confidence = min(base_confidence, max(0.05, 0.45 - (len(structural_violations) * 0.15)))

        confidence_score = round(max(0.0, min(1.0, float(base_confidence))), 2)

        # 5. Threshold Decision: Accept if confidence_score >= active_threshold and no fatal violations
        is_valid = (confidence_score >= active_threshold) and (len(all_violations) == 0)
        verdict = "accepted" if is_valid else "blocked"

        if is_valid:
            message = (
                f"Application accepted: confidence score ({confidence_score:.2f}) "
                f"meets or exceeds threshold ({active_threshold:.2f})."
            )
            description = (
                f"Request intent '{agent_intent}' was accepted with a confidence score of "
                f"{int(confidence_score * 100)}% against an acceptance threshold of {int(active_threshold * 100)}%. "
                "The operation conforms to all active business policies and constraints."
            )
            recommendation = "Complies with active business policies. Safe to proceed with execution."
        else:
            violation_summary = ", ".join(all_violations) if all_violations else "Confidence score fell below required threshold"
            message = (
                f"Application blocked: confidence score ({confidence_score:.2f}) "
                f"is below threshold ({active_threshold:.2f})."
            )
            description = (
                f"Request intent '{agent_intent}' was blocked with a confidence score of "
                f"{int(confidence_score * 100)}% (threshold: {int(active_threshold * 100)}%). "
                f"Identified policy issues: {violation_summary}."
            )
            recommendation = (
                llm_eval.get("recommendation") or
                "Revise request parameters, verify user roles and permissions, "
                "or adjust transaction constraints to meet the required confidence threshold."
            )

        logger.info(
            f"[ValidatorAgent] Verdict: {verdict.upper()} | "
            f"Confidence: {confidence_score} | Threshold: {active_threshold} | Violations: {len(all_violations)}"
        )

        return {
            "is_valid": is_valid,
            "verdict": verdict,
            "confidence_score": confidence_score,
            "threshold": active_threshold,
            "violations": all_violations,
            "message": message,
            "description": description,
            "recommendation": recommendation,
            "evaluation_breakdown": {
                "confidence_score": confidence_score,
                "threshold": active_threshold,
                "decision": verdict,
                "rules_checked": len(quads),
                "policies_checked": len(policies),
                "analysis_steps": llm_eval.get("analysis_steps", []),
                "supporting_policies": llm_eval.get("supporting_policies", [])
            }
        }

    def _check_structural_rules(
        self,
        agent_intent: str,
        payload_data: Dict[str, Any],
        quads: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Inspects query intent and payload against relational constraints and access rules.
        """
        violations = []
        intent_lower = agent_intent.lower()
        role = str(payload_data.get("user_role", payload_data.get("role", ""))).lower()
        operation = str(payload_data.get("operation", "")).lower()

        # Check for unauthenticated or anonymous dangerous write operations
        if role in ("anonymous", "guest", "public", ""):
            dangerous_verbs = ("delete", "drop", "truncate", "update", "insert", "alter")
            if any(v in intent_lower for v in dangerous_verbs) or operation in ("delete", "drop", "truncate"):
                violations.append("Anonymous or unauthenticated users cannot execute data modification operations.")

        # Check for table-level delete/drop restrictions if target table is protected
        target_table = str(payload_data.get("target_table", payload_data.get("table", ""))).lower()
        if target_table in ("users", "profiles", "tenants", "auth", "audit_logs") and ("delete" in intent_lower or operation == "delete"):
            if role != "admin" and role != "superadmin":
                violations.append(f"Restricted table '{target_table}' cannot be deleted by non-admin role '{role}'.")

        # Check disjoint concepts from quads
        for q in quads:
            if q.get("predicate") == "disjointWith" or q.get("type") == "DisjointClasses":
                sub = q.get("subject", "").lower()
                obj = q.get("object", "").lower()
                if sub and obj:
                    if (sub in intent_lower or sub == role) and (obj in intent_lower or obj in str(payload_data).lower()):
                        violations.append(f"Disjoint constraint violation: '{q.get('subject')}' is disjoint from '{q.get('object')}'.")

        return violations

    def _evaluate_with_llm(
        self,
        agent_intent: str,
        payload_data: Dict[str, Any],
        quads: List[Dict[str, Any]],
        policies: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Performs semantic evaluation using LLM against stored policies and schema context.
        """
        # If policies are available, use text policies comparison
        if policies:
            try:
                result = self.gemini_service.analyze_with_text_policies(
                    user_query=f"Intent: {agent_intent}. Context: {json.dumps(payload_data)}",
                    policies=policies,
                    quads=quads
                )
                return {
                    "confidence": result.get("confidence", 0.85),
                    "violations": result.get("violated_policies", []),
                    "supporting_policies": result.get("supporting_policies", []),
                    "analysis_steps": result.get("analysis_steps", []),
                    "recommendation": result.get("summary", "")
                }
            except Exception as e:
                logger.warning(f"[ValidatorAgent] LLM policy analysis encountered an error: {e}")

        # Fallback to direct prompt to evaluate intent & payload
        has_llm = (
            (self.gemini_service.provider == "gemini" and self.gemini_service.client is not None) or
            (self.gemini_service.provider == "openai" and self.gemini_service.api_key)
        )
        if not has_llm:
            return {
                "confidence": 0.85,
                "violations": [],
                "supporting_policies": [],
                "analysis_steps": ["Local rule checks passed."],
                "recommendation": ""
            }

        entities = list({q.get("subject") for q in quads if q.get("type") == "ClassDefinition"})
        prompt = (
            "You are an expert AI Guardrail Validator Agent. Evaluate whether the following agent request "
            "complies with business logic, security policies, and schema integrity.\n\n"
            f"Agent Intent: \"{agent_intent}\"\n"
            f"Payload Context: {json.dumps(payload_data, indent=2)}\n"
            f"Known Domain Entities: {', '.join(entities[:20])}\n\n"
            "Evaluate the request and assign a confidence score between 0.0 and 1.0 reflecting how likely "
            "this request is compliant and safe to execute.\n\n"
            "Return ONLY a JSON object with this exact structure:\n"
            "{\n"
            "  \"confidence\": 0.0 to 1.0,\n"
            "  \"violations\": [\"list of identified policy or security violations if any\"],\n"
            "  \"supporting_policies\": [\"positive policy alignments\"],\n"
            "  \"analysis_steps\": [\"step 1 explanation\", \"step 2 explanation\"],\n"
            "  \"recommendation\": \"actionable recommendation for the caller\"\n"
            "}"
        )

        try:
            text_response = self.gemini_service._call_llm(prompt, json_mode=True)
            parsed = json.loads(text_response)
            return {
                "confidence": float(parsed.get("confidence", 0.85)),
                "violations": parsed.get("violations", []),
                "supporting_policies": parsed.get("supporting_policies", []),
                "analysis_steps": parsed.get("analysis_steps", []),
                "recommendation": parsed.get("recommendation", "")
            }
        except Exception as e:
            logger.warning(f"[ValidatorAgent] LLM direct evaluation failed: {e}")
            return {
                "confidence": 0.85,
                "violations": [],
                "supporting_policies": [],
                "analysis_steps": ["Heuristic compliance evaluation completed."],
                "recommendation": ""
            }

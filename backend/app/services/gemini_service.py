import os
import json
import logging
import httpx
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self, api_key: str = None, provider: str = None):
        # Read API key from parameter or environment
        self.provider = provider or "gemini"
        if api_key:
            self.api_key = api_key
        else:
            self.api_key = os.getenv(
                "GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
            self.provider = "gemini"
        self.model_name = "gemini-2.5-flash"

        if self.provider == "gemini":
            from google import genai
            if self.api_key:
                self.client = genai.Client(api_key=self.api_key)
            else:
                gcp_project = os.getenv("GCP_PROJECT_ID", "dart-madness")
                self.client = genai.Client(vertexai=True, project=gcp_project, location="us-central1")

    def _call_llm(self, prompt: str, json_mode: bool = False) -> str:
        """
        Unified LLM caller that directs the query to either Gemini or OpenAI API
        depending on the configured provider, with automatic retry handling on 429 errors.
        """
        import time as _time
        if self.provider == "openai" and not self.api_key:
            raise ValueError("No API key available for OpenAI service call.")

        max_attempts = 3
        last_error = None

        for attempt in range(1, max_attempts + 1):
            try:
                if self.provider == "openai":
                    url = "https://api.openai.com/v1/chat/completions"
                    headers = {
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.api_key}"
                    }
                    payload = {
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "user", "content": prompt}
                        ]
                    }
                    if json_mode:
                        payload["response_format"] = {"type": "json_object"}
                    
                    response = httpx.post(
                        url, json=payload, headers=headers, timeout=40.0)

                    if response.status_code == 429:
                        retry_after = int(response.headers.get(
                            "Retry-After", 5 * attempt))
                        logger.warning(
                            f"[LLM Call] Rate limited (429). Waiting {retry_after}s before retry...")
                        _time.sleep(retry_after)
                        continue

                    response.raise_for_status()
                    result_json = response.json()
                    return result_json["choices"][0]["message"]["content"]
                else:
                    # Use official google-genai Client (supporting Vertex AI fallback)
                    config = {}
                    if json_mode:
                        config["response_mime_type"] = "application/json"
                    
                    response = self.client.models.generate_content(
                        model=self.model_name,
                        contents=prompt,
                        config=config
                    )
                    return response.text

            except Exception as e:
                logger.error(
                    f"[LLM Call] Attempt {attempt}/{max_attempts} failed: {e}")
                last_error = e
                if attempt < max_attempts:
                    wait = 2 ** attempt
                    logger.info(f"[LLM Call] Retrying in {wait}s...")
                    _time.sleep(wait)

        if last_error:
            raise last_error
        raise RuntimeError("LLM call failed after all retries.")

    def analyze_schema_and_subsumes(self, concepts: List[Dict[str, Any]], rules: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze provided `concepts` and `rules` to identify subsumption (subClassOf) relations.
        Accepts both the extracted concepts (classes) and any preliminary rules (object properties, quads).
        """
        has_llm = (self.provider == "gemini" and self.client is not None) or (self.provider == "openai" and self.api_key)
        if not has_llm:
            logger.warning(
                "No LLM API key or client configured. Using local fallback rule analysis.")
            return self._fallback_local_analysis(rules)

        prompt = (
            "You are an AI Logical Reasoning Agent. Your task is to analyze an extracted database logical schema "
            "(a set of concepts and schema-derived rules) and identify logical subsumption "
            "(subClassOf / ClassHierarchy) relationships.\n\n"
            "Context Provided:\n"
            f"Concepts (classes):\n{json.dumps(concepts, indent=2)}\n\n"
            f"Preliminary Rules / Quads:\n{json.dumps(rules, indent=2)}\n\n"
            "For each identified subsumption relationship, return a quad in this format:\n"
            "- subject: the subclass\n"
            "- predicate: 'subClassOf'\n"
            "- object: the superclass\n"
            "- type: 'ClassHierarchy'\n\n"
            "Also, formulate one concise 'example_logic_statement' showing an actionable guardrail policy derived from these hierarchies.\n\n"
            "Return JSON in exactly this format:\n"
            "{\n"
            "  \"subsumes_relations\": [ {\"subject\": \"<subclass>\", \"predicate\": \"subClassOf\", \"object\": \"<superclass>\", \"type\": \"ClassHierarchy\"} ],\n"
            "  \"example_logic_statement\": \"<string>\"\n"
            "}"
        )

        try:
            text_response = self._call_llm(prompt, json_mode=True)
            parsed_data = json.loads(text_response)
            # parsed_data may be a dict or a list; normalize to dict with 'subsumes_relations'
            if isinstance(parsed_data, dict):
                subsumes = parsed_data.get(
                    "subsumes_relations") or parsed_data.get("subsumes") or []
                example_stmt = parsed_data.get("example_logic_statement") or parsed_data.get(
                    "example_statement") or "Logical schema extraction completed."
            elif isinstance(parsed_data, list):
                subsumes = parsed_data
                example_stmt = "Logical schema extraction completed."
            else:
                subsumes = []
                example_stmt = "Logical schema extraction completed."

            logger.info(
                "Successfully analyzed concepts+rules and retrieved subsumption relations from LLM.")
            return {
                "subsumes_relations": subsumes,
                "example_logic_statement": example_stmt,
                "raw": parsed_data
            }
        except Exception as e:
            logger.error(
                f"Failed to communicate with LLM API: {e}. Falling back to local analysis.")
            return self._fallback_local_analysis(rules)

    def extract_class_hierarchy_from_repo(self, repo_urls: List[str] | str, concepts: List[Dict[str, Any]] | None = None, rules: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
        """
        Given one or more repository URLs, optionally with concept and rule context, attempt to extract
        class hierarchy (subsumption) relations by scanning README / domain model files via LLM.
        Returns a dict with 'subsumes_relations' and optional metadata.
        """
        if isinstance(repo_urls, str):
            repo_urls = [repo_urls]

        has_llm = (self.provider == "gemini" and self.client is not None) or (self.provider == "openai" and self.api_key)
        if not has_llm:
            logger.warning(
                "No LLM API key or client configured. Repo-based extraction unavailable.")
            return {"subsumes_relations": [], "note": "no_api_key"}

        prompt = (
            "You are an AI engineer skilled at extracting domain class hierarchies from code repositories. "
            "Given the following repository URLs, look for README files, docs, or model definitions that indicate class hierarchies, domain models, or taxonomy information.\n\n"
            f"Repo URLs:\n{json.dumps(repo_urls, indent=2)}\n\n"
            "Optionally the following logical schema context is provided (concepts and preliminary rules):\n"
            f"Concepts:\n{json.dumps(concepts or [], indent=2)}\n\n"
            f"Rules:\n{json.dumps(rules or [], indent=2)}\n\n"
            "Return a JSON object with 'subsumes_relations' array in the form {subject, predicate, object, type}."
        )

        try:
            text_response = self._call_llm(prompt, json_mode=True)
            parsed = json.loads(text_response)
            # Normalize parsed responses (allow lists or dicts)
            if isinstance(parsed, dict):
                subs = parsed.get("subsumes_relations") or parsed.get(
                    "subsumes") or parsed.get("subsumes_relations", [])
            elif isinstance(parsed, list):
                subs = parsed
            else:
                subs = []
            return {"subsumes_relations": subs, "raw": parsed}
        except Exception as e:
            logger.error(f"Repo-based class hierarchy extraction failed: {e}")
            return {"subsumes_relations": []}

    def ask_logical_statement(self, statement: str, quads: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sends the user's entered logical statement and active quads to LLM
        to extract general logical assertions and expression tree parameter structures for local owlready2 DL reasoning.
        """
        has_llm = (self.provider == "gemini" and self.client is not None) or (self.provider == "openai" and self.api_key)
        if not has_llm:
            logger.warning(
                "No LLM API key or client configured. Cannot parse logical statement without API access.")
            return {
                "agent_intent": "other",
                "payload": {},
                "logical_assertions": [],
                "extracted_logic_summary": "LLM API key not configured. Logical parsing unavailable."
            }

        prompt = (
            "You are an AI Logical Natural Language Understanding (NLU) Parser.\n"
            "Your task is to parse a natural language message from a user and extract the structured logical statements/assertions inferred from it.\n"
            "Do NOT evaluate or solve the logical consistency yourself. "
            "Instead, extract the semantic parameters representing the query as a general Description Logic 'expression_tree' so that a formal local Description Logic reasoner (owlready2) can execute validation.\n\n"

            "--- Expression Tree JSON Grammar Specification ---\n"
            "Construct a nested JSON 'expression_tree' representing the logical statement. The grammar supports:\n"
            "1. Class leaf concept: {\"class_name\": \"<ClassName>\"} (e.g. {\"class_name\": \"Buyer\"})\n"
            "2. Existential restriction (∃prop.filler): {\"operator\": \"Exists\", \"property_name\": \"<propertyName>\", \"filler\": <ExpressionTree>}\n"
            "3. Universal restriction (∀prop.filler): {\"operator\": \"ForAll\", \"property_name\": \"<propertyName>\", \"filler\": <ExpressionTree>}\n"
            "4. Negation (¬operand): {\"operator\": \"Not\", \"operand\": <ExpressionTree>}\n"
            "5. Subsumption assertion (left ⊑ right): {\"operator\": \"SubClassOf\", \"left\": <ExpressionTree>, \"right\": <ExpressionTree>}\n"
            "6. Conjunction (AND) / Disjunction (OR): {\"operator\": \"And\" | \"Or\", \"conditions\": [<ExpressionTree>, ...]}\n\n"
            "Below is anexample only. TO show the format, t has no relation to the logic"
            "--- Examples ---\n"
            "- 'Evaluate if Waiter is disjoint from Buyer and cannot execute buy_product' ->\n"
            "  - subject_class: 'Waiter'\n"
            "  - expression_tree: {\"operator\": \"SubClassOf\", \"left\": {\"class_name\": \"Waiter\"}, \"right\": {\"class_name\": \"Buyer\"}}\n"
            "  - logical_assertions: ['Waiter ⊑ Buyer']\n"
            "- 'an order with no products' ->\n"
            "  - subject_class: 'orders'\n"
            "  - expression_tree: {\"operator\": \"SubClassOf\", \"left\": {\"class_name\": \"orders\"}, \"right\": {\"operator\": \"ForAll\", \"property_name\": \"has_order_lines\", \"filler\": {\"operator\": \"Not\", \"operand\": {\"operator\": \"Exists\", \"property_name\": \"has_product\", \"filler\": {\"class_name\": \"product\"}}}}}\n"
            "  - logical_assertions: ['orders ⊑ ∀has_order_lines.(¬∃has_product.product)']\n\n"

            f"Active Logical Quads (Domain Logical Schema):\n{json.dumps(quads, indent=2)}\n\n"
            f"User Logical Statement: \"{statement}\"\n\n"

            "Extract the parameters and logical assertions from the statement.\n"
            "Return your response in this exact JSON schema:\n"
            "{\n"
            "  \"subject_class\": \"string class name (e.g. Waiter, orders, User)\",\n"
            "  \"payload\": {\n"
            "    \"subject_class\": \"string class name\",\n"
            "    \"expression_tree\": { <structured expression tree matching the grammar above> }\n"
            "  },\n"
            "  \"logical_assertions\": [\"assertion_1\", \"assertion_2\"],\n"
            "  \"extracted_logic_summary\": \"A short description of the extracted logical statement.\"\n"
            "}"
        )

        logger.info(
            f"[NLU Parser] Dispatching logical statement to LLM ({self.provider})...")
        logger.info(f"[NLU Parser] Statement: '{statement}'")
        logger.info(
            f"[NLU Parser] Active logical quads supplied: {len(quads)}")

        try:
            text_response = self._call_llm(prompt, json_mode=True)
            logger.info(
                f"[NLU Parser] Raw model response (first 300 chars): {text_response[:300]}")
            parsed_data = json.loads(text_response)

            subject_class = parsed_data.get("subject_class", "(none)")
            assertions = parsed_data.get("logical_assertions", [])
            summary = parsed_data.get("extracted_logic_summary", "")
            logger.info(f"[NLU Parser] ✓ Parsed successfully.")
            logger.info(f"[NLU Parser]   Subject class: '{subject_class}'")
            logger.info(f"[NLU Parser]   Logical assertions: {assertions}")
            logger.info(f"[NLU Parser]   Summary: '{summary}'")
            return {
                "agent_intent": parsed_data.get("agent_intent", "other"),
                "payload": parsed_data.get("payload", {}),
                "logical_assertions": assertions,
                "extracted_logic_summary": summary,
                "nlu_ok": True
            }

        except Exception as e:
            logger.error(f"[NLU Parser] ✗ NLU parsing failed: {e}")
            return {
                "agent_intent": "other",
                "payload": {},
                "logical_assertions": [],
                "extracted_logic_summary": f"LLM parsing error: {str(e)}",
                "nlu_ok": False
            }

    def _fallback_local_analysis(self, rules: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Locally detects simple subsumption patterns (like subclass relationships)
        when Gemini API is not available or not configured.
        """
        # Generic fallback: do not apply domain-specific naming heuristics.
        subsumes = []
        # Provide a simple generic statement if we can identify top-level classes
        entities = [r["subject"]
                    for r in rules if r.get("type") == "ClassDefinition"]
        if entities:
            primary = entities[0]
            stmt = f"Detected top-level domain entity: {primary}. Run with an LLM-enabled server or provide a repository URL to extract richer class hierarchies."
        else:
            stmt = "No class hierarchies detected by local analysis. Enable an LLM or supply a repository URL for improved extraction."

        return {
            "subsumes_relations": subsumes,
            "example_logic_statement": stmt
        }

    def generate_logic_statement(self, rules: List[Dict[str, Any]]) -> str:
        """
        Calls LLM to generate a high-quality human-readable Description Logic statement
        summarizing all concepts, rules, and subsumptions.
        """
        has_llm = (self.provider == "gemini" and self.client is not None) or (self.provider == "openai" and self.api_key)
        if not has_llm:
            logger.warning(
                "No LLM API key or client configured. Using local fallback for logic statement generation.")
            return self._fallback_generate_logic_statement(rules)

        prompt = (
            "You are an AI Logical Reasoning Agent. Your task is to generate one high-quality, compelling, and professional "
            "human-readable guardrail policy logic statement summarizing all concepts, rules, and subsumption relationships "
            "found in the active logical schema.\n\n"
            "Here is the list of active concepts, rules, and subclass/subsumption axioms (represented as RDF-like quads):\n"
            f"{json.dumps(rules, indent=2)}\n\n"
            "Format requirements:\n"
            "1. The statement should be 1-3 sentences. It must be highly polished and read like a production guardrail policy.\n"
            "2. Integrate formal Description Logic (DL) notation where appropriate (e.g. use '⊑' for subClassOf, '¬' for negation, '∃' for existential restriction, etc. - e.g. 'Waiter ⊑ Employee').\n"
            "3. Formulate a compelling example policy, such as how certain roles are subclasses of others, disjointness barriers, or specific required relations (e.g. order lines requiring products).\n"
            "4. Return ONLY the plain text of the statement. Do not include markdown blocks, HTML, or JSON wrapper."
        )

        logger.info(
            f"[Logic Generator] Requesting logic statement from LLM...")
        try:
            text_response = self._call_llm(prompt, json_mode=False)
            logger.info(
                f"[Logic Generator] ✓ Generated logic statement: '{text_response[:200]}'")
            return text_response.strip()
        except Exception as e:
            logger.error(
                f"[Logic Generator] ✗ API call failed: {e}. Using local fallback.")
            return self._fallback_generate_logic_statement(rules)

    def _fallback_generate_logic_statement(self, rules: List[Dict[str, Any]]) -> str:
        subclasses = [r for r in rules if r.get("type") == "ClassHierarchy"]
        quantified = [r for r in rules if r.get(
            "type") == "ObjectProperty" and r.get("quantifier") in ["min", "max"]]

        stmt = ""
        if subclasses:
            r = subclasses[0]
            stmt += f"A {r['subject']} is a subclass of {r['object']} ({r['subject']} ⊑ {r['object']}). "
        else:
            stmt += "No class hierarchies detected in base tables. "

        if quantified:
            q = quantified[0]
            stmt += f"A {q['subject']} has a quantified relation '{q['predicate']}' to {q['object']} (quantifier: {q['quantifier']} {q['cardinality_value']})."
        else:
            stmt += "Relations are modeled with default existential 'some' quantifiers."

        stmt += ""
        return stmt

    def extract_text_policies_from_db_objects(self, triggers, functions, table_names, schema_metadata=None, concepts=None, rules=None):
        """Synthesize plain-English business policies from SQL triggers, functions, schema metadata, and extracted concepts/rules."""
        has_llm = (self.provider == "gemini" and self.client is not None) or (self.provider == "openai" and self.api_key)
        if not has_llm:
            logger.warning("[PolicyExtract] No active LLM client or key configured.")
            return []

        def _sanitize_sql(snippet: str) -> str:
            if not snippet:
                return ""
            import re
            s = re.sub(r"'[^']*'", "'<redacted>'", snippet)
            s = re.sub(r'"[^"]*"', '"<redacted>"', s)
            s = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "<redacted_email>", s)
            s = re.sub(r"(api[_-]?key|secret|password)\s*=\s*[^\s;]+", "<redacted>", s, flags=re.IGNORECASE)
            return s

        safe_triggers = [ _sanitize_sql(t.get("body", "") if isinstance(t, dict) else t) for t in (triggers or []) ]
        safe_functions = [ _sanitize_sql(f.get("body", "") if isinstance(f, dict) else f) for f in (functions or []) ]

        schema_block = json.dumps(schema_metadata if schema_metadata else table_names, indent=2)
        concepts_block = json.dumps((concepts or [])[:40], indent=2)
        rules_block = json.dumps((rules or [])[:40], indent=2)

        prompt = (
            "You are a business policy compliance engine. Given SQL triggers, functions, database schema, "
            "along with extracted concepts and rules, synthesize a comprehensive set of plain-English "
            "business policies that represent the core logic and security guardrails of this database.\n\n"
            "Ground the rules explicitly in the following inputs:\n"
            f"Tables/Schema:\n{schema_block}\n\n"
            f"Extracted Entity Concepts:\n{concepts_block}\n\n"
            f"Extracted Relationship Rules:\n{rules_block}\n\n"
            f"Sanitized Triggers:\n{json.dumps(safe_triggers, indent=2)}\n\n"
            f"Sanitized Functions:\n{json.dumps(safe_functions, indent=2)}\n\n"
            "Format requirements:\n"
            "1. Focus on security, constraints, roles, actions, and table relations.\n"
            "2. Policies MUST follow a business workflow style (step-by-step or operational stage flow, e.g. 'Order Placement Stage', 'Inventory Reservation Stage', 'Billing Invoice Generation Stage').\n"
            "3. Each policy description ('body') MUST be very brief (exactly 1 sentence).\n"
            "4. You MUST extract a minimum of 15 policies and a MAXIMUM of 40 policies to cover the business case.\n\n"
            "Return strictly a machine-parseable JSON array of objects (no markdown wrappers). "
            "Each object must have: 'title', 'body', 'source_type' (trigger|function|inferred)."
        )

        try:
            text_response = self._call_llm(prompt, json_mode=True)
            parsed = json.loads(text_response)

            valid_policies = []
            allowed_sources = {"trigger", "function", "inferred"}
            for idx, p in enumerate(parsed if isinstance(parsed, list) else []):
                if not isinstance(p, dict):
                    continue
                title = p.get("title")
                body = p.get("body")
                src = p.get("source_type", "inferred")
                if not title or not body:
                    continue
                if src not in allowed_sources:
                    src = "inferred"
                valid_policies.append({"title": title.strip(), "body": body.strip(), "source_type": src})

            logger.info(f"[PolicyExtract] Extracted {len(valid_policies)} validated text policies focusing on business rules.")
            return valid_policies
        except Exception as e:
            logger.error(f"[PolicyExtract] Extraction failed: {e}")
            return []


    def analyze_with_text_policies(self, user_query: str, policies: list, quads: list = None) -> dict:
        """
        Default reasoning mode: LLM-judge comparing user query against stored text policies.
        Returns structured verdict with full analysis breakdown.
        """
        from fastapi import HTTPException
        has_llm = (self.provider == "gemini" and self.client is not None) or (self.provider == "openai" and self.api_key)
        if not has_llm:
            raise HTTPException(
                status_code=500, detail="LLM API key or GCP Vertex credentials not configured on the server.")
        if not policies:
            return {"is_allowed": True, "confidence": 0.5, "verdict_label": "allowed", "summary": "No text policies stored yet. Run a schema resync to extract policies.", "violated_policies": [], "supporting_policies": [], "analysis_steps": ["No policies found — defaulting to allowed."], "reasoning_mode": "text"}

        policies_block = "\n".join(
            f"[P{i+1}] {p['title']}: {p['body']}" for i, p in enumerate(policies))
        entity_ctx = ""
        if quads:
            ents = list({q["subject"]
                        for q in quads if q.get("type") == "ClassDefinition"})
            entity_ctx = f"\nDatabase entities: {', '.join(ents[:20])}\n"

        prompt = (
            "You are a business policy compliance engine. Evaluate whether the user query is permitted.\n\n"
            f"POLICIES:\n{policies_block}\n{entity_ctx}\n"
            f"USER QUERY: \"{user_query}\"\n\n"
            "Return ONLY this JSON (no markdown):\n"
            "{\"is_allowed\": true|false|null, \"confidence\": 0.0-1.0, "
            "\"verdict_label\": \"allowed|blocked|conditional|unclear\", "
            "\"summary\": \"...\", \"violated_policies\": [], \"supporting_policies\": [], \"analysis_steps\": []}"
        )
        logger.info(
            f"[TextAnalysis] Checking query against {len(policies)} text policies...")

        try:
            text_response = self._call_llm(prompt, json_mode=True)
            result = json.loads(text_response)
            result["reasoning_mode"] = "text"
            logger.info(
                f"[TextAnalysis] Verdict: {result.get('verdict_label')} ({result.get('confidence')})")
            return result
        except httpx.HTTPStatusError as http_err:
            if http_err.response.status_code == 429:
                raise HTTPException(
                    status_code=429, detail="LLM API rate limit exceeded (429). Please wait a moment before trying again.")
            raise HTTPException(
                status_code=500, detail=f"LLM API request failed: {str(http_err)}")
        except Exception as e:
            logger.error(f"[TextAnalysis] Failed to evaluate policies: {e}")
            raise HTTPException(
                status_code=500, detail=f"LLM API request failed: {str(e)}")

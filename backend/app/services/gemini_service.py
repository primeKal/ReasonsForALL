import os
import json
import logging
import httpx
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        # Read API key from environment
        self.api_key = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
        self.model_name = "gemini-2.5-flash"
        
    def analyze_schema_and_subsumes(self, rules: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Takes the raw extracted schema rules, calls Gemini to identify
        subsumption (subClassOf) relations, and returns the relations and an example logic statement.
        """
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not found. Using local fallback rule analysis.")
            return self._fallback_local_analysis(rules)
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        
        prompt = (
            "You are an AI Ontology Agent. Your task is to analyze an extracted database schema "
            "(represented as a list of RDF-like JSON quads of classes and properties) and identify logical subsumption "
            "(subClassOf / ClassHierarchy) relationships.\n\n"
            "Look for:\n"
            "1. Naming patterns suggesting hierarchies (e.g. 'Waiter', 'Staff', or 'Manager' are subclasses of 'Employee' or 'User').\n"
            "2. Table-subtable relationships or explicit categorization.\n\n"
            "For each identified subsumption relationship, return a quad in this format:\n"
            "- subject: the subclass (e.g., 'Waiter')\n"
            "- predicate: 'subClassOf'\n"
            "- object: the superclass (e.g., 'Employee')\n"
            "- type: 'ClassHierarchy'\n\n"
            "Also, formulate one human-readable, compelling 'example_logic_statement' showing an advanced guardrail policy "
            "that can be derived from these classes (e.g., 'A Waiter is a subclass of Employee. Waiters are disjoint from "
            "Buyers, meaning they are formally barred from placing product orders.').\n\n"
            f"Extracted Schema JSON:\n{json.dumps(rules, indent=2)}\n\n"
            "Return your response in this exact JSON schema:\n"
            "{\n"
            "  \"subsumes_relations\": [\n"
            "    {\n"
            "      \"subject\": \"subclass_name\",\n"
            "      \"predicate\": \"subClassOf\",\n"
            "      \"object\": \"superclass_name\",\n"
            "      \"type\": \"ClassHierarchy\"\n"
            "    }\n"
            "  ],\n"
            "  \"example_logic_statement\": \"Your generated example logic statement string.\"\n"
            "}"
        )
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=20.0)
            response.raise_for_status()
            result_json = response.json()
            
            # Parse Gemini response
            text_response = result_json["candidates"][0]["content"]["parts"][0]["text"]
            parsed_data = json.loads(text_response)
            
            logger.info("Successfully analyzed schema and retrieved subsumption relations from Gemini.")
            return {
                "subsumes_relations": parsed_data.get("subsumes_relations", []),
                "example_logic_statement": parsed_data.get("example_logic_statement", "Ontological extraction completed.")
            }
            
        except Exception as e:
            logger.error(f"Failed to communicate with Gemini API: {e}. Falling back to local analysis.")
            return self._fallback_local_analysis(rules)

    def ask_logical_statement(self, statement: str, quads: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sends the user's entered logical statement and active quads to Gemini
        to extract general logical assertions and expression tree parameter structures for local owlready2 DL reasoning.
        """
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not found. Cannot parse logical statement without API access.")
            return {
                "agent_intent": "other",
                "payload": {},
                "logical_assertions": [],
                "extracted_logic_summary": "Gemini API key not configured. Logical parsing unavailable."
            }
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        
        prompt = (
            "You are an AI Ontology Natural Language Understanding (NLU) Parser.\n"
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
            
            f"Active Ontology Quads (Domain Ontology):\n{json.dumps(quads, indent=2)}\n\n"
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
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        logger.info(f"[Gemini NLU] Dispatching logical statement to {self.model_name}...")
        logger.info(f"[Gemini NLU] Statement: '{statement}'")
        logger.info(f"[Gemini NLU] Active ontology quads supplied: {len(quads)}")

        import time as _time
        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                response = httpx.post(url, json=payload, headers=headers, timeout=20.0)
                logger.info(f"[Gemini NLU] Attempt {attempt}/{max_attempts} - HTTP {response.status_code}")

                # Respect 429 Retry-After and back off
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 5 * attempt))
                    logger.warning(f"[Gemini NLU] Rate limited (429). Waiting {retry_after}s before retry...")
                    _time.sleep(retry_after)
                    continue

                response.raise_for_status()
                result_json = response.json()

                # Parse Gemini response
                text_response = result_json["candidates"][0]["content"]["parts"][0]["text"]
                logger.info(f"[Gemini NLU] Raw model response (first 300 chars): {text_response[:300]}")
                parsed_data = json.loads(text_response)

                subject_class = parsed_data.get("subject_class", "(none)")
                assertions = parsed_data.get("logical_assertions", [])
                summary = parsed_data.get("extracted_logic_summary", "")
                logger.info(f"[Gemini NLU] ✓ Parsed successfully on attempt {attempt}.")
                logger.info(f"[Gemini NLU]   Subject class: '{subject_class}'")
                logger.info(f"[Gemini NLU]   Logical assertions: {assertions}")
                logger.info(f"[Gemini NLU]   Summary: '{summary}'")
                return {
                    "agent_intent": parsed_data.get("agent_intent", "other"),
                    "payload": parsed_data.get("payload", {}),
                    "logical_assertions": assertions,
                    "extracted_logic_summary": summary,
                    "nlu_ok": True
                }

            except Exception as e:
                logger.error(f"[Gemini NLU] ✗ Attempt {attempt}/{max_attempts} failed: {e}")
                if attempt < max_attempts:
                    wait = 2 ** attempt
                    logger.info(f"[Gemini NLU] Retrying in {wait}s...")
                    _time.sleep(wait)

        logger.error("[Gemini NLU] All retry attempts exhausted. NLU parsing unavailable.")
        return {
            "agent_intent": "other",
            "payload": {},
            "logical_assertions": [],
            "extracted_logic_summary": "Gemini API error after retries. Logical parsing unavailable.",
            "nlu_ok": False
        }

    def _fallback_local_analysis(self, rules: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Locally detects simple subsumption patterns (like subclass relationships)
        when Gemini API is not available or not configured.
        """
        subsumes = []
        subjects = [r["subject"] for r in rules if r.get("type") == "ClassDefinition"]
        
        # Naming rule heuristic: e.g. "Waiter" or "Staff" subsumed by "Employee" or "User"
        # Or look for classes loaded in our schemas
        for s in subjects:
            if s.lower() == "waiter" or s.lower() == "staff":
                subsumes.append({
                    "subject": s,
                    "predicate": "subClassOf",
                    "object": "Employee",
                    "type": "ClassHierarchy"
                })
            elif s.lower() == "employee":
                subsumes.append({
                    "subject": s,
                    "predicate": "subClassOf",
                    "object": "User",
                    "type": "ClassHierarchy"
                })
        
        # Default fallback example statement
        stmt = (
            "A Waiter is a subclass of Employee (Waiter ⊑ Employee). "
            "Staff is a subclass of Employee (Staff ⊑ Employee). "
            "Employees are disjoint from Buyers, preventing waiters from performing transactions."
        )
        if rules:
            entities = [r["subject"] for r in rules if r.get("type") == "ClassDefinition"]
            if entities:
                primary = entities[0]
                stmt = f"A {primary} is declared as a top-level business concept. Relationships mapped: {', '.join(entities[:3])}."
                
        return {
            "subsumes_relations": subsumes,
            "example_logic_statement": stmt
        }



    def generate_logic_statement(self, rules: List[Dict[str, Any]]) -> str:
        """
        Calls Gemini to generate a high-quality human-readable Description Logic statement
        summarizing all concepts, rules, and subsumptions.
        """
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not found. Using local fallback for logic statement generation.")
            return self._fallback_generate_logic_statement(rules)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        prompt = (
            "You are an AI Ontology Agent. Your task is to generate one high-quality, compelling, and professional "
            "human-readable guardrail policy logic statement summarizing all concepts, rules, and subsumption relationships "
            "found in the active ontology.\n\n"
            "Here is the list of active concepts, rules, and subclass/subsumption axioms (represented as RDF-like quads):\n"
            f"{json.dumps(rules, indent=2)}\n\n"
            "Format requirements:\n"
            "1. The statement should be 1-3 sentences. It must be highly polished and read like a production guardrail policy.\n"
            "2. Integrate formal Description Logic (DL) notation where appropriate (e.g. use '⊑' for subClassOf, '¬' for negation, '∃' for existential restriction, etc. - e.g. 'Waiter ⊑ Employee').\n"
            "3. Formulate a compelling example policy, such as how certain roles are subclasses of others, disjointness barriers, or specific required relations (e.g. order lines requiring products).\n"
            "4. Return ONLY the plain text of the statement. Do not include markdown blocks, HTML, or JSON wrapper."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }

        logger.info(f"[Gemini Logic] Requesting dynamic logic statement from {self.model_name}...")
        logger.info(f"[Gemini Logic] Sending {len(rules)} ontology rules/quads to Gemini.")
        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=15.0)
            logger.info(f"[Gemini Logic] HTTP response status: {response.status_code}")
            response.raise_for_status()
            result_json = response.json()
            
            text_response = result_json["candidates"][0]["content"]["parts"][0]["text"].strip()
            logger.info(f"[Gemini Logic] ✓ Generated logic statement: '{text_response[:200]}'")
            return text_response
        except Exception as e:
            logger.error(f"[Gemini Logic] ✗ API call failed: {e}. Using local fallback.")
            return self._fallback_generate_logic_statement(rules)

    def _fallback_generate_logic_statement(self, rules: List[Dict[str, Any]]) -> str:
        subclasses = [r for r in rules if r.get("type") == "ClassHierarchy"]
        quantified = [r for r in rules if r.get("type") == "ObjectProperty" and r.get("quantifier") in ["min", "max"]]
        
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
            
        stmt += " In our reasoning system, staff and buyers are disjoint classes, preventing transaction clashes."
        return stmt

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class SubsumptionAgent:
    """
    Ontological agent focused on discovering class subsumption hierarchies (subClassOf / ClassHierarchy)
    from database schemas by analyzing 'type' / 'role' / 'category' columns and master lookup tables,
    leveraging Gemini AI or high-fidelity local heuristics.
    """

    def __init__(self, gemini_service=None):
        self.gemini_service = gemini_service

    def extract_subsumptions(
        self,
        schema_metadata: Dict[str, Any],
        extracted_concepts: List[Dict[str, Any]],
        extracted_rules: List[Dict[str, Any]] | None = None,
        repo_url: str | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Identifies class subsumption relations.

        Priority:
        - If `repo_url` is provided, attempt to extract class hierarchies from the repo (via Gemini service if available).
        - Otherwise, prefer explicit `extracted_rules` that already contain ClassHierarchy entries.
        - Finally, fall back to local heuristics over `schema_metadata` and `extracted_concepts`.
        """
        subsumptions: List[Dict[str, Any]] = []
        tables = schema_metadata.get("tables", [])
        concept_names = {c["subject"] for c in extracted_concepts}

        # 1. Repo-based extraction (preferred if repo_url provided)
        if repo_url and self.gemini_service:
            try:
                repo_result = self.gemini_service.extract_class_hierarchy_from_repo(
                    repo_url, concepts=extracted_concepts, rules=extracted_rules or [])
                repo_rules = repo_result.get("subsumes_relations", [])
                for r in repo_rules:
                    subsumptions.append({
                        "subject": r["subject"],
                        "predicate": "subClassOf",
                        "object": r["object"],
                        "type": "ClassHierarchy",
                        "quantifier": "none",
                        "cardinality_value": None,
                        "description": f"Repo-Inferred Hierarchy from {repo_url}: {r.get('subject')} ⊑ {r.get('object')}"
                    })
                logger.info(
                    f"SubsumptionAgent: Extracted {len(subsumptions)} subclass relations from repo {repo_url}.")
                if subsumptions:
                    return subsumptions
            except Exception as e:
                logger.warning(
                    f"SubsumptionAgent: Repo analysis failed ({repo_url}): {e}")

        # 2. Try Gemini with schema+concepts as context
        if self.gemini_service and getattr(self.gemini_service, "api_key", None):
            try:
                gemini_data = self.gemini_service.analyze_schema_and_subsumes(
                    extracted_concepts, extracted_rules or [])
                ai_rules = gemini_data.get("subsumes_relations", [])
                for r in ai_rules:
                    subsumptions.append({
                        "subject": r["subject"],
                        "predicate": "subClassOf",
                        "object": r["object"],
                        "type": "ClassHierarchy",
                        "quantifier": "none",
                        "cardinality_value": None,
                        "description": f"AI-Inferred Hierarchy: '{r['subject']}' ⊑ '{r['object']}'."
                    })
                logger.info(
                    f"SubsumptionAgent: Extracted {len(subsumptions)} subclass relations using Gemini.")
                if subsumptions:
                    return subsumptions
            except Exception as e:
                logger.error(
                    f"SubsumptionAgent: Gemini analysis failed, using local heuristics: {e}")

        # 3. Local Fallback Heuristics
        for table in tables:
            table_name = table["name"]
            columns = [c["name"].lower() for c in table.get("columns", [])]

            # (Domain-specific name heuristics removed)

            # Pattern C: Parent-like foreign key
            for fk in table.get("foreign_keys", []):
                ref_table = fk.get("referred_table")
                constrained = fk.get("constrained_columns", [])
                if any("parent" in c.lower() or "super" in c.lower() for c in constrained):
                    desc = f"Self-referential or taxonomic hierarchy discovered on '{table_name}' linking to super-concept '{ref_table}'."
                    subsumptions.append({
                        "subject": table_name,
                        "predicate": "subClassOf",
                        "object": ref_table,
                        "type": "ClassHierarchy",
                        "quantifier": "none",
                        "cardinality_value": None,
                        "description": desc + f" Axiom: {table_name} ⊑ {ref_table}"
                    })

        logger.info(
            f"SubsumptionAgent: Extracted {len(subsumptions)} subclass relations using local heuristics.")
        return subsumptions

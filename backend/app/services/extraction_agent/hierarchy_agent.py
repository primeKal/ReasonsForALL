import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class HierarchyAgent:
    """
    Ontological agent focused on discovering class hierarchies (is-a, is child of, is parent of, etc.)
    from database schemas by analyzing 'type' / 'role' / 'category' columns and master lookup tables,
    leveraging Gemini AI or high-fidelity local heuristics.
    """

    def __init__(self, gemini_service=None):
        self.gemini_service = gemini_service

    def extract_hierarchies(
        self,
        schema_metadata: Dict[str, Any],
        extracted_concepts: List[Dict[str, Any]],
        extracted_rules: List[Dict[str, Any]] | None = None
    ) -> List[Dict[str, Any]]:
        """
        Identifies class hierarchical (parent/child/is-a) relations.

        Priority:
        - Prefer explicit extracted_rules that already contain ClassHierarchy entries.
        - Use Gemini to deduce subclass hierarchies.
        - Fall back to local heuristics over schema_metadata and extracted_concepts.
        """
        hierarchies: List[Dict[str, Any]] = []
        tables = schema_metadata.get("tables", [])
        concept_names = {c["subject"] for c in extracted_concepts}

        # 1. Try Gemini with schema+concepts as context
        if self.gemini_service and getattr(self.gemini_service, "api_key", None):
            try:
                gemini_data = self.gemini_service.analyze_schema_and_subsumes(
                    extracted_concepts, extracted_rules or [])
                ai_rules = gemini_data.get("subsumes_relations", [])
                for r in ai_rules:
                    hierarchies.append({
                        "subject": r["subject"],
                        "predicate": "subClassOf",
                        "object": r["object"],
                        "type": "ClassHierarchy",
                        "quantifier": "none",
                        "cardinality_value": None,
                        "description": f"AI-Inferred Hierarchy: '{r['subject']}' is a child/subclass of '{r['object']}'."
                    })
                logger.info(
                    f"HierarchyAgent: Extracted {len(hierarchies)} hierarchical relations using Gemini.")
                if hierarchies:
                    return hierarchies
            except Exception as e:
                logger.error(
                    f"HierarchyAgent: Gemini analysis failed, using local heuristics: {e}")

        # 3. Local Fallback Heuristics
        for table in tables:
            table_name = table["name"]
            columns = [c["name"].lower() for c in table.get("columns", [])]

            # Pattern: Parent-like foreign key
            for fk in table.get("foreign_keys", []):
                ref_table = fk.get("referred_table")
                constrained = fk.get("constrained_columns", [])
                if any("parent" in c.lower() or "super" in c.lower() for c in constrained):
                    desc = f"Self-referential or taxonomic hierarchy discovered on '{table_name}' linking to super-concept '{ref_table}'."
                    hierarchies.append({
                        "subject": table_name,
                        "predicate": "subClassOf",
                        "object": ref_table,
                        "type": "ClassHierarchy",
                        "quantifier": "none",
                        "cardinality_value": None,
                        "description": desc + f" Axiom: {table_name} ⊑ {ref_table}"
                    })

        logger.info(
            f"HierarchyAgent: Extracted {len(hierarchies)} hierarchical relations using local heuristics.")
        # Cap hierarchies to a reasonable default (40)
        if len(hierarchies) > 40:
            logger.warning(
                f"HierarchyAgent: Truncating hierarchies from {len(hierarchies)} to 40.")
            return hierarchies[:40]
        return hierarchies

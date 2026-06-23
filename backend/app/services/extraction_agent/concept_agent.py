import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class ConceptAgent:
    """
    Ontological agent focused on discovering business concepts (OWL Classes)
    from database table definitions, mapping them to base axioms with rich metadata.
    """

    def __init__(self, gemini_service=None):
        self.gemini_service = gemini_service

    def extract_concepts(self, schema_metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Analyzes table structures and outputs ClassDefinition concepts.
        """
        concepts = []
        tables = schema_metadata.get("tables", [])

        for table in tables:
            table_name = table["name"]

            # Formulate concept description
            columns = [c["name"] for c in table.get("columns", [])]
            description = f"Core business concept mapped from table '{table_name}'. Key attributes: {', '.join(columns[:4])}."

            concept_quad = {
                "subject": table_name,
                "predicate": "is_a",
                "object": "Class",
                "type": "ClassDefinition",
                "quantifier": "none",
                "cardinality_value": None,
                "description": description
            }
            concepts.append(concept_quad)

        logger.info(
            f"ConceptAgent: Identified {len(concepts)} ontology concepts.")
        # Enforce a safe default cap of 40 concepts to avoid overwhelming downstream systems
        if len(concepts) > 40:
            logger.warning(
                f"ConceptAgent: Truncating concepts list from {len(concepts)} to 40.")
            return concepts[:40]
        return concepts

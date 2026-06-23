import logging
from typing import Dict, List, Any
from app.services.gemini_service import GeminiService
from app.services.extraction_agent.concept_agent import ConceptAgent
from app.services.extraction_agent.rules_agent import RulesAgent
from app.services.extraction_agent.hierarchy_agent import HierarchyAgent
from app.services.extraction_agent.git_agent import GitAgent

logger = logging.getLogger(__name__)


class MultiAgentOntologySystem:
    """
    Orchestrator that coordinates the multi-agent ontology extraction system.
    Runs specialized agents for Concept extraction, Rules/Cardinality extraction,
    Hierarchy mapping, and Git codebase augmentation.
    """

    def __init__(self):
        self.gemini_service = GeminiService()
        self.concept_agent = ConceptAgent(self.gemini_service)
        self.rules_agent = RulesAgent(self.gemini_service)
        self.hierarchy_agent = HierarchyAgent(self.gemini_service)
        self.git_agent = GitAgent(self.gemini_service)

    def extract_enriched_ontology(self, schema_metadata: Dict[str, Any], repo_url: str | None = None, concept_cap: int = 40, rules_cap: int = 40, hierarchy_cap: int = 40) -> Dict[str, Any]:
        """
        Coordinates the Concept, Rules, Hierarchy, and Git agents to extract, 
        map, and quantify a complete relational database ontology schema.
        """
        logger.info("Multi-Agent System: Beginning ontology extraction...")

        # Step 1: Concept Agent maps database tables to classes
        concepts = self.concept_agent.extract_concepts(schema_metadata)
        concept_truncated = False
        if len(concepts) > concept_cap:
            concept_truncated = True
            concepts = concepts[:concept_cap]

        # Step 2: Rules Agent maps foreign keys, cardinality, and quantifiers (Horizontal)
        relationship_rules = self.rules_agent.extract_rules(schema_metadata)
        rules_truncated = False
        if len(relationship_rules) > rules_cap:
            rules_truncated = True
            relationship_rules = relationship_rules[:rules_cap]

        # Step 3: Hierarchy Agent identifies subclass/parent/child hierarchies (Vertical)
        hierarchy_rules = self.hierarchy_agent.extract_hierarchies(
            schema_metadata, concepts, relationship_rules)
        hierarchy_truncated = False
        if len(hierarchy_rules) > hierarchy_cap:
            hierarchy_truncated = True
            hierarchy_rules = hierarchy_rules[:hierarchy_cap]

        # Step 4: Git Agent augments horizontal and vertical rules using codebase patterns
        all_rules = self.git_agent.augment_ontology(
            repo_url, concepts, relationship_rules, hierarchy_rules)

        # Step 5: Draft the logic placeholder statement based on final augmented rules
        example_statement = self._generate_logic_statement(all_rules)

        logger.info(
            f"Multi-Agent System completed. Mapped {len(all_rules)} ontological axioms.")
        return {
            "rules": all_rules,
            "example_logic_statement": example_statement,
            "truncation": {
                "concepts_truncated": concept_truncated,
                "rules_truncated": rules_truncated,
                "hierarchies_truncated": hierarchy_truncated,
                "counts": {
                    "concepts": len(concepts),
                    "rules": len(relationship_rules),
                    "hierarchies": len(hierarchy_rules)
                }
            }
        }

    def _generate_logic_statement(self, rules: List[Dict[str, Any]]) -> str:
        """
        Generates a human-readable description-logic statement summarizing the extracted rules.
        """
        return self.gemini_service.generate_logic_statement(rules)

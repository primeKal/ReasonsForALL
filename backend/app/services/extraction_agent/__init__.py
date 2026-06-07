import logging
from typing import Dict, List, Any
from app.services.gemini_service import GeminiService
from app.services.extraction_agent.concept_agent import ConceptAgent
from app.services.extraction_agent.rules_agent import RulesAgent
from app.services.extraction_agent.subsumption_agent import SubsumptionAgent

logger = logging.getLogger(__name__)

class MultiAgentOntologySystem:
    """
    Orchestrator that coordinates the multi-agent ontology extraction system.
    Runs specialized agents for Concept extraction, Rules/Cardinality extraction,
    and Subsumption hierarchy mapping.
    """
    def __init__(self):
        self.gemini_service = GeminiService()
        self.concept_agent = ConceptAgent(self.gemini_service)
        self.rules_agent = RulesAgent(self.gemini_service)
        self.subsumption_agent = SubsumptionAgent(self.gemini_service)

    def extract_enriched_ontology(self, schema_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Coordinates the Concept, Rules, and Subsumption agents to extract, 
        map, and quantify a complete relational database ontology schema.
        """
        logger.info("Multi-Agent System: Beginning ontology extraction...")
        
        # Step 1: Concept Agent maps database tables to classes
        concepts = self.concept_agent.extract_concepts(schema_metadata)
        
        # Step 2: Rules Agent maps foreign keys, cardinality, and quantifiers
        relationship_rules = self.rules_agent.extract_rules(schema_metadata)
        
        # Step 3: Subsumption Agent identifies subclass hierarchies
        subClassOf_rules = self.subsumption_agent.extract_subsumptions(schema_metadata, concepts)
        
        # Step 4: Merge all agent outputs
        all_rules = concepts + relationship_rules + subClassOf_rules
        
        # Step 5: Draft the logic placeholder statement based on identified subsumptions
        example_statement = self._generate_logic_statement(all_rules)
        
        logger.info(f"Multi-Agent System completed. Mapped {len(all_rules)} ontological axioms.")
        return {
            "rules": all_rules,
            "example_logic_statement": example_statement
        }

    def _generate_logic_statement(self, rules: List[Dict[str, Any]]) -> str:
        """
        Generates a human-readable description-logic statement summarizing the extracted rules.
        """
        return self.gemini_service.generate_logic_statement(rules)

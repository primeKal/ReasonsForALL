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

    def extract_subsumptions(self, schema_metadata: Dict[str, Any], extracted_concepts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Scans tables and columns to identify class subsumption rules.
        """
        subsumptions = []
        tables = schema_metadata.get("tables", [])
        concept_names = {c["subject"] for c in extracted_concepts}
        
        # 1. Try Gemini first if the service is loaded and has an active key
        if self.gemini_service and self.gemini_service.api_key:
            try:
                # Merge current concepts for Gemini analysis context
                gemini_data = self.gemini_service.analyze_schema_and_subsumes(extracted_concepts)
                ai_rules = gemini_data.get("subsumes_relations", [])
                for r in ai_rules:
                    subsumptions.append({
                        "subject": r["subject"],
                        "predicate": "subClassOf",
                        "object": r["object"],
                        "type": "ClassHierarchy",
                        "quantifier": "none",
                        "cardinality_value": None,
                        "description": f"AI-Inferred Hierarchy: '{r['subject']}' is a formal subclass of '{r['object']}'."
                    })
                logger.info(f"SubsumptionAgent: Extracted {len(subsumptions)} subclass relations using Gemini.")
                if subsumptions:
                    return subsumptions
            except Exception as e:
                logger.error(f"SubsumptionAgent: Gemini analysis failed, using local heuristics: {e}")
                
        # 2. Local Fallback Heuristics
        # Scan for type/role categorization columns or hierarchical naming structures
        for table in tables:
            table_name = table["name"]
            columns = [c["name"].lower() for c in table.get("columns", [])]
            
            # Pattern A: Table represents a specific role/subclass (e.g. Waiter, Staff) 
            # and another table represents a parent concept (e.g. Employee, User)
            if table_name.lower() in ["waiter", "staff", "manager"]:
                parent = "Employee" if "employee" in concept_names else "User" if "user" in concept_names else None
                if parent:
                    desc = f"Hierarchical classification: '{table_name}' is a sub-concept of '{parent}' (subClassOf)."
                    subsumptions.append({
                        "subject": table_name,
                        "predicate": "subClassOf",
                        "object": parent,
                        "type": "ClassHierarchy",
                        "quantifier": "none",
                        "cardinality_value": None,
                        "description": desc + f" Axiom: {table_name} ⊑ {parent}"
                    })
                    
            # Pattern B: Employee table maps to User concept
            elif table_name.lower() == "employee" and "user" in concept_names:
                subsumptions.append({
                    "subject": "Employee",
                    "predicate": "subClassOf",
                    "object": "User",
                    "type": "ClassHierarchy",
                    "quantifier": "none",
                    "cardinality_value": None,
                    "description": "Hierarchical classification: 'Employee' is a sub-concept of 'User' (Employee ⊑ User)."
                })
                
            # Pattern C: Table has column 'parent_id' referencing itself or a parent table
            for fk in table.get("foreign_keys", []):
                ref_table = fk["referred_table"]
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

        logger.info(f"SubsumptionAgent: Extracted {len(subsumptions)} subclass relations using local heuristics.")
        return subsumptions

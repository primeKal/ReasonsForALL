import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class RulesAgent:
    """
    Ontological agent focused on translating foreign key constraints and indexes
    into logical relationship properties, modeling cardinality, relationship types (1:M, M:N),
    and description logic quantifiers (some, only, min, max, exactly).
    """

    def __init__(self, gemini_service=None):
        self.gemini_service = gemini_service

    def extract_rules(self, schema_metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Analyzes constraints, foreign keys, and column types to build formal guardrail rules.
        """
        rules = []
        tables = schema_metadata.get("tables", [])
        table_names = {t["name"] for t in tables}

        # Track potential junction tables for Many-to-Many discovery
        for table in tables:
            table_name = table["name"]
            columns = table.get("columns", [])
            fkeys = table.get("foreign_keys", [])

            # Heuristic for Junction Tables (Many-to-Many)
            # Typically has exactly 2 foreign keys, and very few or no other non-key columns
            is_junction = len(fkeys) == 2 and len(columns) <= 4

            if is_junction:
                fk1, fk2 = fkeys[0], fkeys[1]
                t1, t2 = fk1["referred_table"], fk2["referred_table"]

                if t1 in table_names and t2 in table_names:
                    # Map as a Many-to-Many quantified rule
                    desc = f"Many-to-Many relation between '{t1}' and '{t2}' bridged by '{table_name}'."

                    rules.append({
                        "subject": t1,
                        "predicate": f"has_{t2}_via_{table_name}",
                        "object": t2,
                        "type": "ObjectProperty",
                        "quantifier": "some",
                        "cardinality_value": None,
                        "description": desc + f" Model: {t1} ⊑ ∃has_{t2}.{t2}"
                    })
                    continue

            # Standard Foreign Keys (One-to-Many / Many-to-One)
            for fk in fkeys:
                target_table = fk["referred_table"]
                constrained_cols = fk.get("constrained_columns", [])

                # Check if the constraining column is nullable
                is_nullable = True
                is_unique = False

                for col_name in constrained_cols:
                    col_info = next(
                        (c for c in columns if c["name"] == col_name), None)
                    if col_info:
                        if not col_info.get("nullable", True):
                            is_nullable = False
                        if col_info.get("unique", False):
                            is_unique = True

                # Deduce Quantifiers and Cardinalities
                if is_unique:
                    # One-to-One: A subject is mapped to exactly or maximum 1 target
                    quantifier = "max"
                    cardinality = 1
                    relation_type = "One-to-One"
                elif not is_nullable:
                    # Non-nullable: A subject MUST have at least 1 target
                    quantifier = "min"
                    cardinality = 1
                    relation_type = "Many-to-One (Mandatory)"
                else:
                    # Standard nullable: May have 0 or more targets
                    quantifier = "some"
                    cardinality = None
                    relation_type = "Many-to-One (Optional)"

                desc = (
                    f"{relation_type} relationship from '{table_name}' to '{target_table}'. "
                    f"Mapped via foreign key on '{', '.join(constrained_cols)}'."
                )

                dl_symbol = "⊑ ∃" if quantifier == "some" else f"⊑ ≥{cardinality}" if quantifier == "min" else f"⊑ ≤{cardinality}"

                rules.append({
                    "subject": table_name,
                    "predicate": f"has_{target_table}",
                    "object": target_table,
                    "type": "ObjectProperty",
                    "quantifier": quantifier,
                    "cardinality_value": cardinality,
                    "description": desc + f" DL Axiom: {table_name} {dl_symbol}has_{target_table}.{target_table}"
                })

        logger.info(
            f"RulesAgent: Extracted {len(rules)} quantified ontological rules.")
        # Enforce a safe default cap of 40 rules to avoid overwhelming downstream systems
        if len(rules) > 40:
            logger.warning(
                f"RulesAgent: Truncating rules list from {len(rules)} to 40.")
            return rules[:40]
        return rules

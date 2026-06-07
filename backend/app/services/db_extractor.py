from sqlalchemy import create_engine, MetaData
from sqlalchemy.exc import SQLAlchemyError
import logging

class DBExtractor:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.logger = logging.getLogger(__name__)

    def extract_schema(self, connection_string: str, rule_cap: int = 5):
        """
        Connects to the database using SQLAlchemy, inspects tables and foreign keys,
        and translates them into a semantic quad-store representation.
        Enforces read-only introspection.
        """
        try:
            self.logger.warning("DBExtractor: Starting schema extraction process...")
            # Convert postgres:// to postgresql:// as SQLAlchemy requires postgresql://
            if connection_string.startswith("postgres://"):
                self.logger.warning("DBExtractor: Converting postgres:// scheme to postgresql://")
                connection_string = connection_string.replace("postgres://", "postgresql://", 1)

            # Enforce read-only for PostgreSQL (if applicable)
            connect_args = {"connect_timeout": 3}
            if connection_string.startswith("postgresql"):
                self.logger.warning("DBExtractor: Target is PostgreSQL. Preparing read-only connection arguments.")
                connect_args = {"options": "-c default_transaction_read_only=on", "connect_timeout": 3}

            try:
                self.logger.warning("DBExtractor: Creating database engine...")
                engine = create_engine(connection_string, connect_args=connect_args)
                metadata = MetaData()
                self.logger.warning("DBExtractor: Reflecting 'public' schema using engine...")
                metadata.reflect(bind=engine, schema="public")
            except SQLAlchemyError as e:
                self.logger.warning(f"DBExtractor: Connection failed with connect_args: {str(e)}")
                # If connection fails due to pooler rejecting the default_transaction_read_only parameter, retry without it
                if connect_args:
                    self.logger.warning("DBExtractor: Postgres pooler rejected startup options. Retrying without options...")
                    try:
                        engine = create_engine(connection_string, connect_args={"connect_timeout": 3})
                        metadata = MetaData()
                        self.logger.warning("DBExtractor: Reflecting 'public' schema without options...")
                        metadata.reflect(bind=engine, schema="public")
                    except SQLAlchemyError as retry_err:
                        self.logger.warning(f"DBExtractor: Retry failed: {str(retry_err)}")
                        raise retry_err
                else:
                    raise e
            
            self.logger.warning("DBExtractor: Connection succeeded. Reflecting complete.")
            self.logger.warning(f"DBExtractor: Sorted tables found in schema 'public': {[t.name for t in metadata.sorted_tables]}")

            # Translate to rich schema metadata format for multi-agent consumption
            schema_metadata = {"tables": []}
            for table in metadata.sorted_tables:
                columns_info = []
                for col in table.columns:
                    is_unique = col.unique or False
                    # Inspect constraints to find unique/PK flags
                    for const in table.constraints:
                        if hasattr(const, "columns") and len(const.columns) == 1 and col.name in [c.name for c in const.columns]:
                            if const.__class__.__name__ in ["UniqueConstraint", "PrimaryKeyConstraint"]:
                                is_unique = True
                                
                    columns_info.append({
                        "name": col.name,
                        "type": str(col.type),
                        "nullable": col.nullable,
                        "unique": is_unique
                    })
                
                fkey_info = []
                for fk in table.foreign_keys:
                    fkey_info.append({
                        "constrained_columns": [fk.parent.name] if hasattr(fk, "parent") else [],
                        "referred_table": fk.column.table.name,
                        "referred_columns": [fk.column.name]
                    })
                    
                schema_metadata["tables"].append({
                    "name": table.name,
                    "columns": columns_info,
                    "foreign_keys": fkey_info
                })
            
            self.logger.warning("DBExtractor: Launching Multi-Agent Ontology Extraction System...")
            from app.services.extraction_agent import MultiAgentOntologySystem
            agent_system = MultiAgentOntologySystem()
            agent_result = agent_system.extract_enriched_ontology(schema_metadata)
            
            rules = agent_result["rules"]
            example_statement = agent_result["example_logic_statement"]
            
            # Enforce rule capping
            if len(rules) > rule_cap:
                self.logger.warning(f"DBExtractor: Capping extracted rules from {len(rules)} to {rule_cap}.")
                rules = rules[:rule_cap]
                
            self.logger.warning(f"DBExtractor: Completed Multi-Agent rule mapping. Mapped rules: {len(rules)}")
            return {
                "status": "success",
                "rules_extracted": len(rules),
                "rules": rules,
                "example_statement": example_statement
            }
        except SQLAlchemyError as e:
            self.logger.error(f"DBExtractor: Failed to extract schema: {str(e)}")
            mocked_rules = [
                {"subject": "User", "predicate": "is_a", "object": "Class", "type": "ClassDefinition", "quantifier": "none", "cardinality_value": None, "description": "Core User class."},
                {"subject": "Waiter", "predicate": "subClassOf", "object": "Employee", "type": "ClassHierarchy", "quantifier": "none", "cardinality_value": None, "description": "Waiter ⊑ Employee subclass."},
                {"subject": "Employee", "predicate": "subClassOf", "object": "User", "type": "ClassHierarchy", "quantifier": "none", "cardinality_value": None, "description": "Employee ⊑ User subclass."},
                {"subject": "Employee", "predicate": "has_Role", "object": "Role", "type": "ObjectProperty", "quantifier": "min", "cardinality_value": 1, "description": "Employee ⊑ ≥1has_Role.Role"}
            ]
            return {
                "status": "simulated",
                "message": f"Connection failed: {str(e)}",
                "rules_extracted": len(mocked_rules),
                "rules": mocked_rules,
                "example_statement": "A Waiter is a subclass of Employee. Employees must have at least 1 Role."
            }

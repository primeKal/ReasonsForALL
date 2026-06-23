import os
from typing import Any, Dict, List
from typing_extensions import override
from collections.abc import AsyncGenerator
from pydantic import BaseModel, Field
from google.adk.agents import LlmAgent
from google.adk.apps import App
from google.adk.agents.context import Context
from google.adk.workflow import START, Workflow, node, JoinNode
from google.adk.events.event import Event
from app.services.db_extractor import DBExtractor
from app.services.extraction_agent.concept_agent import ConceptAgent
from app.services.extraction_agent.rules_agent import RulesAgent
from app.services.extraction_agent.hierarchy_agent import HierarchyAgent
from app.services.extraction_agent.git_agent import GitAgent
from app.services.gemini_service import GeminiService


class WorkflowOutput(BaseModel):
    concepts: List[Dict[str, Any]] = Field(description="Extracted class concepts")
    rules: List[Dict[str, Any]] = Field(description="Extracted relationship rules and hierarchies")
    text_policies: List[Dict[str, Any]] = Field(description="Extracted plain-English business policies")
    example_logic_statement: str = Field(description="A synthesized logic policy statement")


# 1. DB Extraction Node
@node(name="db_extraction")
def db_extraction_node(node_input: str) -> Dict[str, Any]:
    print(f"\n>>> [Step 1: Database Extraction] Connecting to database...")
    
    connection_string = node_input.strip()
    repo_url = None
    if "," in node_input:
        parts = [p.strip() for p in node_input.split(",", 1)]
        connection_string = parts[0]
        repo_url = parts[1]

    if connection_string.startswith("postgres://"):
        connection_string = connection_string.replace("postgres://", "postgresql://", 1)

    from sqlalchemy import create_engine, MetaData
    connect_args = {"connect_timeout": 3}
    
    try:
        engine = create_engine(connection_string, connect_args=connect_args)
        metadata = MetaData()
        metadata.reflect(bind=engine, schema="public")
    except Exception:
        engine = create_engine(connection_string, connect_args={"connect_timeout": 3})
        metadata = MetaData()
        metadata.reflect(bind=engine, schema="public")

    schema_metadata = {"tables": []}
    for table in metadata.sorted_tables:
        columns_info = []
        for col in table.columns:
            is_unique = col.unique or False
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

    # Fetch Triggers and Functions for Text-Policy extraction
    table_names = [t["name"] for t in schema_metadata["tables"]]
    triggers, functions = [], []
    try:
        with engine.connect() as conn:
            try:
                trig_rows = conn.execute(
                    __import__("sqlalchemy").text(
                        "SELECT trigger_name, event_manipulation, event_object_table, action_statement "
                        "FROM information_schema.triggers WHERE trigger_schema='public' LIMIT 30"
                    )
                ).fetchall()
                triggers = [{"name": r[0], "event": r[1], "table": r[2], "body": r[3][:500]} for r in trig_rows]
            except Exception:
                pass
            try:
                func_rows = conn.execute(
                    __import__("sqlalchemy").text(
                        "SELECT routine_name, routine_type, routine_definition "
                        "FROM information_schema.routines "
                        "WHERE routine_schema='public' AND routine_type IN ('FUNCTION','PROCEDURE') LIMIT 20"
                    )
                ).fetchall()
                functions = [{"name": r[0], "type": r[1], "body": (r[2] or "")[:500]} for r in func_rows]
            except Exception:
                pass
    except Exception:
        pass

    print(f"Sorted tables reflected successfully: {table_names}")
    return {
        "schema_metadata": schema_metadata,
        "repo_url": repo_url,
        "triggers": triggers,
        "functions": functions,
        "table_names": table_names
    }


# 2. Concept Extraction Node
@node(name="concept_extraction")
def concept_extraction_node(node_input: Dict[str, Any]) -> Dict[str, Any]:
    print(f"\n>>> [Step 2: Concept Extraction] Mapping tables to class entities...")
    gemini_svc = GeminiService()
    agent = ConceptAgent(gemini_svc)
    concepts = agent.extract_concepts(node_input["schema_metadata"])
    print(f"Concept Agent mapped {len(concepts)} entities.")
    return {
        "schema_metadata": node_input["schema_metadata"],
        "repo_url": node_input["repo_url"],
        "concepts": concepts,
        "triggers": node_input["triggers"],
        "functions": node_input["functions"],
        "table_names": node_input["table_names"]
    }


# 3. Rules & Relationships Extraction Node (Parallel Branch A)
@node(name="rules_extraction")
def rules_extraction_node(node_input: Dict[str, Any]) -> Dict[str, Any]:
    print(f"\n>>> [Step 3A: Relationship & Cardinality Extraction] Mapping foreign keys to logic constraints...")
    gemini_svc = GeminiService()
    agent = RulesAgent(gemini_svc)
    rules = agent.extract_rules(node_input["schema_metadata"])
    rules = rules[:40]
    print(f"Rules Agent mapped {len(rules)} relationship rules (capped at 40).")
    return {
        "relationship_rules": rules,
        "concepts": node_input["concepts"],
        "repo_url": node_input["repo_url"],
        "schema_metadata": node_input["schema_metadata"],
        "triggers": node_input["triggers"],
        "functions": node_input["functions"],
        "table_names": node_input["table_names"]
    }


# 4. Hierarchy Extraction Node (Parallel Branch B)
@node(name="hierarchy_extraction")
def hierarchy_extraction_node(node_input: Dict[str, Any]) -> Dict[str, Any]:
    print(f"\n>>> [Step 3B: Subclass Hierarchy Extraction] Mapping parent-child roles...")
    gemini_svc = GeminiService()
    agent = HierarchyAgent(gemini_svc)
    hierarchies = agent.extract_hierarchies(
        node_input["schema_metadata"],
        node_input["concepts"],
        None
    )
    hierarchies = hierarchies[:40]
    print(f"Hierarchy Agent mapped {len(hierarchies)} subclass hierarchies (capped at 40).")
    return {
        "hierarchy_rules": hierarchies
    }


# 5. Join Node to Merge Parallel Outputs
class MergeRulesAndHierarchiesNode(JoinNode):
    name: str = "merge_rules_and_hierarchies"

    @override
    async def _run_impl(self, *, ctx: Context, node_input: Any) -> AsyncGenerator[Any, None]:
        rules_data = node_input.get("rules_extraction", {})
        hierarchy_data = node_input.get("hierarchy_extraction", {})
        
        relationship_rules = rules_data.get("relationship_rules", []) if isinstance(rules_data, dict) else []
        hierarchy_rules = hierarchy_data.get("hierarchy_rules", []) if isinstance(hierarchy_data, dict) else []
        concepts = rules_data.get("concepts", []) if isinstance(rules_data, dict) else []
        repo_url = rules_data.get("repo_url")
        schema_metadata = rules_data.get("schema_metadata")
        triggers = rules_data.get("triggers", [])
        functions = rules_data.get("functions", [])
        table_names = rules_data.get("table_names", [])
        
        # Deduplicate/resolve relations overridden by subClassOf hierarchies
        hierarchy_pairs = {(h["subject"], h["object"]) for h in hierarchy_rules if h.get("type") == "ClassHierarchy"}
        
        filtered_relations = []
        for r in relationship_rules:
            if (r["subject"], r["object"]) in hierarchy_pairs:
                print(f"Merge Node: Replacing relationship rule '{r['subject']} -> {r['predicate']} -> {r['object']}' with ClassHierarchy rule.")
                continue
            filtered_relations.append(r)
            
        merged_rules = hierarchy_rules + filtered_relations
        print(f"Merge Node completed. Total rules merged: {len(merged_rules)}.")
        
        yield Event(
            output={
                "concepts": concepts,
                "all_rules": merged_rules,
                "repo_url": repo_url,
                "schema_metadata": schema_metadata,
                "triggers": triggers,
                "functions": functions,
                "table_names": table_names
            },
            branch=ctx._invocation_context.branch
        )

merge_rules_and_hierarchies = MergeRulesAndHierarchiesNode()


# 6. Git Augmentation Node
@node(name="git_augmentation")
def git_augmentation_node(node_input: Dict[str, Any]) -> Dict[str, Any]:
    print(f"\n>>> [Step 4: Codebase Context Augmentation] Augmenting logic rules from repository...")
    gemini_svc = GeminiService()
    agent = GitAgent(gemini_svc)
    all_rules = agent.augment_ontology(
        node_input["repo_url"],
        node_input["concepts"],
        node_input["all_rules"],
        []
    )
    print(f"Git Agent completed. Total mapped axioms: {len(all_rules)}.")
    return {
        "concepts": node_input["concepts"],
        "all_rules": all_rules,
        "schema_metadata": node_input["schema_metadata"],
        "triggers": node_input["triggers"],
        "functions": node_input["functions"],
        "table_names": node_input["table_names"]
    }


# 7. Policy Generation Node
@node(name="policy_generation")
def policy_generation_node(node_input: Dict[str, Any]) -> WorkflowOutput:
    print(f"\n>>> [Step 5: Policy Synthesis] Synthesizing logic statement and text policies...")
    gemini_svc = GeminiService()
    
    # 1. Synthesize logic policy statement
    statement = gemini_svc.generate_logic_statement(node_input["all_rules"])
    print(f"Logic Policy Statement: {statement}")

    # 2. Extract plain-English business workflow-style policies using LLM agent
    raw_concepts = [r for r in node_input["all_rules"] if r.get("type") == "ClassDefinition"]
    raw_relations = [r for r in node_input["all_rules"] if r.get("type") != "ClassDefinition"]
    text_policies = gemini_svc.extract_text_policies_from_db_objects(
        node_input["triggers"],
        node_input["functions"],
        node_input["table_names"],
        node_input["schema_metadata"],
        concepts=raw_concepts,
        rules=raw_relations
    )
    print(f"Policy Generation: Extracted {len(text_policies)} workflow policies.")

    return WorkflowOutput(
        concepts=node_input["concepts"],
        rules=node_input["all_rules"],
        text_policies=text_policies,
        example_logic_statement=statement
    )


# Define the Multi-Agent Workflow
class MultiAgentExtractionWorkflow(Workflow):
    input_schema: Any = str

    edges: list = [
        (START, db_extraction_node, concept_extraction_node),
        (concept_extraction_node, (rules_extraction_node, hierarchy_extraction_node)),
        ((rules_extraction_node, hierarchy_extraction_node), merge_rules_and_hierarchies),
        (merge_rules_and_hierarchies, git_augmentation_node, policy_generation_node)
    ]


# Setup App
app = App(
    root_agent=MultiAgentExtractionWorkflow(name="multi_agent_extraction"),
    name="app",
)

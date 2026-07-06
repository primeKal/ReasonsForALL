import os
import json
from typing import Any, Dict, List, Union
from typing_extensions import override
from collections.abc import AsyncGenerator
from pydantic import BaseModel, Field
from google.adk.agents import LlmAgent, Context
from google.adk.apps import App
from google.adk.workflow import START, Workflow, node, JoinNode
from google.adk.events.event import Event
from app.services.db_extractor import DBExtractor
from app.services.extraction_agent.concept_agent import ConceptAgent
from app.services.extraction_agent.rules_agent import RulesAgent
from app.services.extraction_agent.hierarchy_agent import HierarchyAgent
from app.services.extraction_agent.git_agent import GitAgent
from app.services.gemini_service import GeminiService



# ─────────────────────────────────────────────────────────────────────────────
# Output Schemas
# ─────────────────────────────────────────────────────────────────────────────

class WorkflowOutput(BaseModel):
    concepts: List[Dict[str, Any]] = Field(description="Extracted class concepts")
    rules: List[Dict[str, Any]] = Field(description="Extracted relationship rules and hierarchies")
    text_policies: List[Dict[str, Any]] = Field(description="Extracted plain-English business policies")
    example_logic_statement: str = Field(description="A synthesized logic policy statement")


class VerifyOutput(BaseModel):
    intent: str = Field(description="The detected intent: 'verify'")
    agent_intent: str = Field(description="The agent intent string that was verified")
    is_valid: bool = Field(description="Whether the payload passed all business rules")
    violations: List[str] = Field(description="List of policy violations (empty if valid)")
    inference_time_ms: float = Field(description="Time taken for ontology inference (ms)")
    reasoning: str = Field(description="LLM reasoning summary of the verification result")
    message: str = Field(description="Human-readable result message")


# ─────────────────────────────────────────────────────────────────────────────
# NODE 0: Intent Detection Node — LLM-based classifier (no heuristics)
# ─────────────────────────────────────────────────────────────────────────────

@node(name="intent_detection")
def intent_detection_node(node_input: str) -> Dict[str, Any]:
    """
    Uses an LLM to classify the incoming free-form input string as one of:

      - 'extract': The user is providing a database connection URL, asking
                   the system to connect to a database and extract business rules.
                   May include a git repo URL for code augmentation.

      - 'verify':  The user is asking a business rules question, checking
                   whether a certain action/transaction is permitted, or
                   providing a structured verification request. The user's
                   question becomes the agent_intent for ontology validation.

    The LLM extracts all relevant fields from the raw input — no string pattern
    matching, no JSON prefix checks, no heuristics of any kind.
    """
    print("\n>>> [Intent Detection] Asking LLM to classify input intent...")
    raw = node_input.strip()

    prompt = f"""You are an intent classification engine for a business rules AI system.

Your job is to classify a user's raw input into exactly one of two intents:

1. "extract" — The user wants to connect a database and extract business rules from it.
   This means the input contains or refers to a database connection string (e.g., a PostgreSQL URL,
   a MySQL URL, or similar database DSN). It may also include a git repository URL for code augmentation.

2. "verify" — The user wants to check or validate whether a business action or transaction
   is permitted according to stored rules. This includes:
   - Natural language questions about business permissions (e.g., "Can a company with is_active=false create products?")
   - Structured JSON verification requests containing server_id and agent_intent
   - Any question about what is or isn't allowed according to business rules

For "verify" intent, also extract:
- server_id: the server key if explicitly mentioned (e.g., "my-db-a3f2"), otherwise null
- agent_intent: the core action or question being validated (reformulated as a clear intent statement)
- payload: any specific data values mentioned (e.g., field=value pairs as a dict), otherwise {{}}

For "extract" intent, also extract:
- connection_string: the database URL found in the input, normalized to start with postgresql:// or mysql://, otherwise null
- repo_url: a git/github URL if present, otherwise null

User input:
{raw}

Respond ONLY with a valid JSON object. No markdown, no explanation. Example outputs:

For extract:
{{"intent": "extract", "connection_string": "postgresql://user:pass@host:5432/db", "repo_url": null, "server_id": null, "agent_intent": null, "payload": {{}}, "include_details": false}}

For verify:
{{"intent": "verify", "connection_string": null, "repo_url": null, "server_id": null, "agent_intent": "check if a company with is_active=false can create products", "payload": {{"is_active": false}}, "include_details": true}}"""

    try:
        gemini_svc = GeminiService()
        raw_response = gemini_svc._call_llm(prompt, json_mode=True)
        classified = json.loads(raw_response)
    except Exception as e:
        print(f"[Intent Detection] LLM classification failed: {e}. Defaulting to verify with raw input as intent.")
        classified = {
            "intent": "verify",
            "connection_string": None,
            "repo_url": None,
            "server_id": None,
            "agent_intent": raw,
            "payload": {},
            "include_details": True,
        }

    intent = classified.get("intent", "verify")
    print(f"[Intent Detection] LLM classified as: {intent.upper()}")
    print(f"[Intent Detection] Result: {classified}")

    # Normalize: ensure all keys are present regardless of intent
    return {
        "intent": intent,
        "connection_string": classified.get("connection_string"),
        "repo_url": classified.get("repo_url"),
        "server_id": classified.get("server_id"),
        "agent_intent": classified.get("agent_intent") or raw,
        "payload": classified.get("payload") or {},
        "include_details": classified.get("include_details", True),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Verify Logic — plain callable so both the @node wrapper AND IntentRouterNode
# can invoke it directly (FunctionNode objects are NOT callable).
# ─────────────────────────────────────────────────────────────────────────────

def _run_verify(node_input: Dict[str, Any]) -> VerifyOutput:
    """
    Executes the business rules verification pipeline:
      1. Fetches the server config from Supabase by server_id (server_key)
      2. Loads all stored TBox quads/rules for that server
      3. Re-hydrates the OWL ontology in memory
      4. Validates the payload against the active rules
      5. Uses LLM reasoning to produce a human-readable explanation

    This node is only executed when intent == 'verify'.
    If intent == 'extract', this node is skipped by the IntentRouterNode.
    """
    print("\n>>> [Verify Branch] Starting business rules verification...")

    if node_input.get("intent") != "verify":
        # This should not happen in normal flow (router handles routing),
        # but as a safety guard return a passthrough marker.
        print("[Verify Branch] Skipping — intent is not 'verify'.")
        return VerifyOutput(
            intent="extract",
            agent_intent="",
            is_valid=False,
            violations=["Internal routing error: verify_branch called on non-verify intent."],
            inference_time_ms=0.0,
            reasoning="N/A",
            message="Routing error. Please retry."
        )

    server_id = (node_input.get("server_id") or "").strip()
    agent_intent = (node_input.get("agent_intent") or "").strip()
    payload = node_input.get("payload") or {}
    include_details = node_input.get("include_details", True)

    if not server_id:
        return VerifyOutput(
            intent="verify",
            agent_intent=agent_intent,
            is_valid=False,
            violations=["No server_id provided. Cannot fetch business rules without a valid server ID."],
            inference_time_ms=0.0,
            reasoning="The verify request is missing a 'server_id'. Provide the server ID from your ReasonsForAll dashboard.",
            message="Verification failed: missing server_id."
        )

    # --- 1. Fetch server config from Supabase ---
    try:
        from app.services import supabase_client
        db_server = supabase_client.get_server_config_by_key_global(server_id)
    except Exception as e:
        return VerifyOutput(
            intent="verify",
            agent_intent=agent_intent,
            is_valid=False,
            violations=[f"Failed to connect to Supabase: {e}"],
            inference_time_ms=0.0,
            reasoning="Could not reach the Supabase database to load server config. Check SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.",
            message="Verification failed: Supabase connection error."
        )

    if not db_server:
        return VerifyOutput(
            intent="verify",
            agent_intent=agent_intent,
            is_valid=False,
            violations=[f"Server '{server_id}' not found in ReasonsForAll. Has it been trained yet?"],
            inference_time_ms=0.0,
            reasoning=f"No server configuration found for server_id='{server_id}'. You need to first run the extraction workflow to train the server, or verify the server_id is correct.",
            message=f"Verification failed: server '{server_id}' not found."
        )

    tenant_id = db_server.get("tenant_id", "")
    server_config_id = db_server.get("id")

    # --- 2. Load quads from Supabase ---
    try:
        db_quads = supabase_client.get_quads_for_server(tenant_id, server_config_id)
    except Exception as e:
        return VerifyOutput(
            intent="verify",
            agent_intent=agent_intent,
            is_valid=False,
            violations=[f"Failed to fetch rules from Supabase: {e}"],
            inference_time_ms=0.0,
            reasoning="Could not retrieve the stored business rules from Supabase.",
            message="Verification failed: could not load rules."
        )

    if not db_quads:
        return VerifyOutput(
            intent="verify",
            agent_intent=agent_intent,
            is_valid=False,
            violations=[f"No rules found for server '{server_id}'. The server may not have been trained yet."],
            inference_time_ms=0.0,
            reasoning="The server exists but has no extracted rules in the quad store. Run the extraction workflow first by supplying a PostgreSQL URL to train this server.",
            message=f"Verification failed: no rules found for server '{server_id}'."
        )

    print(f"[Verify Branch] Loaded {len(db_quads)} rules for server '{server_id}'.")

    # Map Supabase quads to standard ontology rule format
    quads = [
        {
            "subject": q["subject"],
            "predicate": q["predicate"],
            "object": q["object_val"],
            "type": q["rule_type"]
        }
        for q in db_quads
    ]

    # --- 3. Re-hydrate ontology and validate ---
    from app.services.ontology_engine import OntologyEngine
    engine = OntologyEngine(tenant_id=tenant_id)
    validation_result = engine.validate_payload(
        agent_intent=agent_intent,
        payload_data=payload,
        quads=quads
    )

    is_valid = validation_result.get("is_valid", False)
    violations = validation_result.get("violations", [])
    inference_time_ms = validation_result.get("inference_time_ms", 0.0)

    print(f"[Verify Branch] Validation complete. is_valid={is_valid}, violations={violations}")

    # --- 4. LLM Reasoning Mode: Generate a human-readable explanation ---
    reasoning = ""
    try:
        gemini_svc = GeminiService()
        if is_valid:
            reasoning_prompt = (
                "You are a business rules compliance AI. A transactional payload has been validated "
                "against the active ontology-based business rules and PASSED.\n\n"
                f"Agent Intent: {agent_intent}\n"
                f"Payload: {json.dumps(payload, indent=2)}\n"
                f"Rules Checked: {len(quads)} total rules loaded\n"
                f"Inference Time: {inference_time_ms:.1f}ms\n\n"
                "Provide a concise 2-3 sentence reasoning summary explaining WHY this transaction is "
                "valid and compliant with the business rules. Be specific and professional."
            )
        else:
            reasoning_prompt = (
                "You are a business rules compliance AI. A transactional payload has FAILED validation "
                "against the active ontology-based business rules.\n\n"
                f"Agent Intent: {agent_intent}\n"
                f"Payload: {json.dumps(payload, indent=2)}\n"
                f"Violations Detected: {violations}\n"
                f"Rules Checked: {len(quads)} total rules loaded\n"
                f"Inference Time: {inference_time_ms:.1f}ms\n\n"
                "Provide a concise 2-3 sentence reasoning summary explaining WHICH rules were violated, "
                "WHY this transaction is non-compliant, and what the agent should do to correct it. "
                "Be specific and actionable."
            )
        reasoning = gemini_svc._call_llm(reasoning_prompt, json_mode=False)
        print(f"[Verify Branch] LLM reasoning generated ({len(reasoning)} chars).")
    except Exception as e:
        reasoning = f"LLM reasoning unavailable: {e}"
        print(f"[Verify Branch] Warning: LLM reasoning failed: {e}")

    if is_valid:
        message = f"✅ VALID — The transaction '{agent_intent}' complies with all {len(quads)} business rules."
    else:
        message = f"❌ BLOCKED — The transaction '{agent_intent}' violates {len(violations)} business rule(s)."

    return VerifyOutput(
        intent="verify",
        agent_intent=agent_intent,
        is_valid=is_valid,
        violations=violations,
        inference_time_ms=inference_time_ms,
        reasoning=reasoning,
        message=message
    )


@node(name="verify_branch")
def verify_branch_node(node_input: Dict[str, Any]) -> VerifyOutput:
    """Thin @node wrapper around _run_verify so the ADK workflow graph can reference it."""
    return _run_verify(node_input)


# ─────────────────────────────────────────────────────────────────────────────
# Intent Router Node — branches to verify or extract path
# ─────────────────────────────────────────────────────────────────────────────

class IntentRouterNode(JoinNode):
    """
    Routes the workflow based on detected intent:
    - 'verify' → calls verify_branch_node and yields the final result (short-circuits extraction)
    - 'extract' → passes through to db_extraction_node to continue the full extraction pipeline
    """
    name: str = "intent_router"

    @override
    async def _run_impl(self, *, ctx: Context, node_input: Any) -> AsyncGenerator[Any, None]:
        # node_input comes from a single upstream node (intent_detection)
        # When used as a JoinNode after a single node, the input is wrapped by node name
        intent_data = node_input
        if isinstance(node_input, dict) and "intent_detection" in node_input:
            intent_data = node_input["intent_detection"]

        intent = intent_data.get("intent", "extract") if isinstance(intent_data, dict) else "extract"
        print(f"\n>>> [Intent Router] Routing to branch: {intent.upper()}")

        if intent == "verify":
            yield Event(
                output=intent_data,
                route="verify"
            )
        else:
            # Pass through the LLM-extracted connection string for the extraction pipeline
            connection_string = intent_data.get("connection_string") or "" if isinstance(intent_data, dict) else str(intent_data)
            repo_url = intent_data.get("repo_url") if isinstance(intent_data, dict) else None
            # Normalize postgres:// → postgresql:// (LLM may return the URL verbatim from user input)
            if connection_string.startswith("postgres://"):
                connection_string = connection_string.replace("postgres://", "postgresql://", 1)
            passthrough = connection_string
            if repo_url:
                passthrough = f"{connection_string}, {repo_url}"
            yield Event(
                output=passthrough,
                route="extract"
            )


intent_router = IntentRouterNode()


# ─────────────────────────────────────────────────────────────────────────────
# EXTRACTION PIPELINE NODES (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

# 1. DB Extraction Node
@node(name="db_extraction")
def db_extraction_node(node_input: Any) -> Dict[str, Any]:
    print(f"\n>>> [Step 1: Database Extraction] Connecting to database...")

    connection_string = str(node_input).strip()
    repo_url = None
    if "," in connection_string:
        parts = [p.strip() for p in connection_string.split(",", 1)]
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
def concept_extraction_node(node_input: Any) -> Dict[str, Any]:
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
def rules_extraction_node(node_input: Any) -> Dict[str, Any]:
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
def hierarchy_extraction_node(node_input: Any) -> Dict[str, Any]:
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
def git_augmentation_node(node_input: Any) -> Dict[str, Any]:
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


# 7. Policy Generation Node — also serves as the terminal exit for the verify path
@node(name="policy_generation")
def policy_generation_node(node_input: Any) -> Any:
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


# ─────────────────────────────────────────────────────────────────────────────
# Multi-Agent Workflow Definition
# ─────────────────────────────────────────────────────────────────────────────
#
# Flow:
#   START
#     → intent_detection_node     (classifies: 'extract' or 'verify')
#     → intent_router             (JoinNode: routes to verify_branch OR passes string to extraction)
#
#   VERIFY path (short-circuits here):
#     intent_router               (calls verify_branch_node internally, yields VerifyOutput as final result)
#
#   EXTRACT path (full pipeline):
#     intent_router → db_extraction_node → concept_extraction_node
#       → [rules_extraction_node ∥ hierarchy_extraction_node]
#       → merge_rules_and_hierarchies → git_augmentation_node → policy_generation_node
#
# ─────────────────────────────────────────────────────────────────────────────

class MultiAgentExtractionWorkflow(Workflow):
    input_schema: Any = str
    output_schema: Any = Union[WorkflowOutput, VerifyOutput]

    edges: list = [
        # Entry: detect intent
        (START, intent_detection_node, intent_router),
        # Routing map from intent_router
        (intent_router, {"extract": db_extraction_node, "verify": verify_branch_node}),
        # Extraction path
        (db_extraction_node, concept_extraction_node),
        # Parallel extraction branches
        (concept_extraction_node, (rules_extraction_node, hierarchy_extraction_node)),
        # Merge parallel branches
        ((rules_extraction_node, hierarchy_extraction_node), merge_rules_and_hierarchies),
        # Final synthesis
        (merge_rules_and_hierarchies, git_augmentation_node, policy_generation_node)
    ]


# Setup App
app = App(
    root_agent=MultiAgentExtractionWorkflow(name="multi_agent_extraction"),
    name="app",
)

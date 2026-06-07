# FEATURE DOCUMENTATION & SYSTEM ARCHITECTURE SPECIFICATION

Product: Multi-Tenant Ontology Guardrail SaaS
Version: 1.0.0.1
Target Environment: Antigravity AI Engine
Project Structure: Decoupled Monorepo (/backend & /frontend)

🧭 1. OVERVIEW & CORE VALUE PROPOSITION
The Multi-Tenant Ontology Guardrail SaaS provides an advanced semantic logic and inference verification layer designed to turn unpredictable, autonomous AI agents into deterministic decision-makers. In production AI environments, agents operating directly over raw relational schemas or natural language layers frequently experience "hallu-relation"—inventing non-existent business connections, generating illegal database operations, or bypassing hidden corporate data compliance logic.

By intercepting agent intents and validating them against an explicit Web Ontology Language (OWL) knowledge base programmatically extracted from relational structures, this system acts as a real-time logical firewall.

The Core Architectural Advantage
Unlike legacy semantic architectures that require massive, permanently running graph databases continuously syncing enterprise data records—which spikes infrastructure costs and introduces synchronization lag—this platform utilizes a highly optimized Hybrid Quad-Store Architecture:

Stateless Rules Layer ($T\text{Box}$): Relational schema architecture definitions (tables, relationships, unique constraints) are automatically discovered, mapped to formal logic axioms, and stored as a flattened, high-speed triple index in a unified PostgreSQL backend under a strict partition key (tenant_id).

Live Payload Instances ($A\text{Box}$): Real-time transactional record instances are never cached or stored in a bloated centralized graph database. Instead, the calling environment or AI Agent passes current transaction state parameters directly within the incoming API payload. The Python backend dynamically re-hydrates the ontological blueprint in application memory, runs rapid Description Logic (DL) validation via the bundled reasoner, and tears down the graph instance context in single-digit milliseconds.

📁 2. REPOSITORY DIRECTORY STRUCTURE
The project workspace is organized into two primary directory blocks to ensure clean operational isolation and ease of parsing for the Antigravity engine.

/backend (FastAPI Reasoning Core)
app/main.py: API Gateway Initialization & Router Mounting.
app/config.py: Server Environment Variable Bindings.
app/dependencies.py: Supabase JWT Verification & Multi-Tenancy Extraction Middleware.
app/routers/tenant.py: DB Extraction Connection Tasks & Server Control Settings.
app/routers/reasoning.py: Real-Time Ontology Re-hydration & DL Inference Gateway.
app/services/db_extractor.py: SQLAlchemy Dialect Schema Extractor.
app/services/ontology_engine.py: Owlready2 Graph Manipulation Engine.

/frontend (Next.js SaaS Portal)
src/app/layout.tsx: Root Layout with Global App Context & Supabase Session Provider.
src/app/page.tsx: B2B Product Landing & Marketing Page.
src/app/login/page.tsx: Secure User Sign-In / Registration Screen.
src/app/dashboard/page.tsx: Multi-Tenant Workspace Overview & Cluster Metrics.
src/app/dashboard/profile/page.tsx: Enterprise Team, User Profile, & Company Configuration Center.
src/app/dashboard/servers/page.tsx: Relational Linker, Ontology Server Management, & Constraint Threshold UI.
src/utils/supabase.ts: Supabase Component & Server-Side Clients Configuration.

🗄️ 3. DATABASE SCHEMA ROLES & RESPONSIBILITIES
The global database layer, hosted within Supabase (PostgreSQL), uses explicit single-table partitioning rather than spawning dynamic tables to ensure absolute customer workspace isolation, system threshold guardrails, and rapid lookups.

Profiles Table: Automatically extends the core authentication framework. It collects, maps, and stores non-sensitive user metadata including full names and registered company names to provide multi-tenant enterprise isolation context.
Tenant Configurations Table: Houses the core optimization and system constraint settings for each account. It establishes parameters like the maximum business rules caps, context evaluation profiles, and the current trial expiration state, adjusting active server capabilities dynamically based on tier rights.
Tenant Quad-Store Table: Functions as the multi-tenant compressed triple-store index. It stores all auto-generated schema rules ($T\text{Box}$) as flat, high-speed relational rows (Subject, Predicate, Object) separated strictly by an indexed tenant_id and structural true/false flags to enable sub-millisecond retrieval.

🏗️ 4. BACKEND COMPONENT RESPONSIBILITIES
The Python backend (FastAPI) handles the heavy-lifting of reasoning operations, schema inspection, and secure token verification.

Supabase JWT Verification Gateway (app/dependencies.py): Intercepts incoming API requests from the web app, validates the cryptographic signature of the frontend user session token, and extracts the unique identity context to prevent cross-tenant security leaks.
Multi-Dialect Metadata Inspector Service (app/services/db_extractor.py): Manages the automated relational database mapping phase. It establishes a generic, read-only session over the client's architecture, normalizes table structural relations across multiple engine dialects (PostgreSQL, MySQL, SQL Server), translates discovered foreign keys into semantic property constraints, and cuts off processing once the tenant's safety rule limit is reached.
In-Memory Re-hydration Engine & Verification Routing (app/routers/reasoning.py): Responsible for real-time transaction query processing. It pulls static quad rules from Supabase, builds a temporary runtime ontology class framework within application memory, attaches the incoming agent's payload parameters, runs description logic inference via the reasoner, and flags logical violations before wiping the temporary memory context completely.

💻 5. FRONTEND INTERFACE REQUIREMENTS
The Next.js frontend handles profile management, cluster metric tracking, and the progressive onboarding setup wizard.

Account & Corporate Profiles Console (/dashboard/profile): Captures corporate team profiles, business attributes, and contact preferences. It displays clear countdown banners highlighting subscription trial limits and updates interface elements dynamically when evaluation states expire.
Ontology Server Connection Manager (/dashboard/servers): Provides a drop-down database wizard featuring explicit visual connection templates for various relational dialects. It triggers the background progressive setup flow, providing real-time terminal status alerts until the worker finishes compilation and turns the status light to green.
Concepts & Constraints Inspector UI: Renders an interactive browser showing all currently compiled ontology classes and relation pairs. For free trial users, it enforces a visual wall after the 5th compiled rule, alerting them of the system restriction and prompting premium profile expansion upgrades.

💰 6. TIERED PRODUCT FEATURE MATRIX & SUBSCRIPTION LOGIC
The platform limits configuration parameters on standard profiles to manage compute overhead while unlocking advanced processing on premium setups.

⏳ The 30-Day Evaluation Boundary (Free Tier Only)
The Free Trial Tier is strictly restricted to a 30-Day Evaluation Window. This allows platform architects and engineers to run database metadata schema discovery tasks, construct baseline proof-of-concept AI tools, and check verification latencies safely. Upon expiration of the 30-day trial window, all write mutations to the schema extractor, active API gateway query routing, and real-time reasoner loops are systematically locked down until a premium tier plan is initialized.

Product Capability Allocation Matrix
Supported DB Engines:
Free Trial: PostgreSQL, MySQL, and SQL Server connection capability.
Paid Premium: Access to all standard relational dialects, enterprise engines, and custom connection drivers.

Active Rules Cap ($T\text{Box}$):
Free Trial: Hard cap of 5 rules (automatically terminates schema extraction after processing the first 5 foreign keys).
Paid Premium: Uncapped expression fields, supporting 50+ nested logical relational business rules per database.

Schema Sync Strategy:
Free Trial: Manual update triggers only via the dashboard's schema refresh button.
Paid Premium: Automated update hooks and scheduled cron triggers to auto-sync schemas whenever database migrations deploy.

Logic Expressivity Profile:
Free Trial: Standard RDFS profile covering basic class hierarchies, property ranges, domains, and core properties.
Paid Premium: Hard Mode description logic including universal and existential quantifiers, property chains, and explicit structural negations.

Environmental Context Mode:
Free Trial: Payload-driven only (the incoming agent payload must natively supply all extra context parameters required for the check).
Paid Premium: Hybrid Flex-mode, unlocking automated backend 'Virtual Fetch' lookups where the server reads isolated context values on demand.

Row Scan Sampling Depth:
Free Trial: Limits schema tracing to a sample depth of the first 500 rows per entity during type indexing.
Paid Premium: Deep structural trace processing up to 50,000+ data rows to uncover implicit schema constraints.

🔒 7. OPERATIONAL PRINCIPLES & SYSTEM GUARDRAILS
Payload-Driven Isolation: To guarantee sub-millisecond reasoning latencies, the live validation API layer runs completely stateless and decoupled from external data dependencies. Rather than executing continuous, slow network crawls to check user data states across client infrastructure at runtime, incoming payloads must bring their own data context. This design choice eliminates remote database connectivity lag during live agent queries, ensuring consistent, high-availability validation speeds.
Transient Memory Lifecycle Management: To enable high scalability and prevent server memory bloating, graph instances loaded in the FastAPI server context exist strictly for the duration of a single verification request function. Once the endpoint evaluates logic truths and returns its final verification response (is_valid: true/false), the localized virtual graph memory space is systematically wiped out by the system garbage collector.
Read-Only Structural Introspection: During the progressive server setup phase, the backend metadata extractor connects to client systems using strict, enforced read-only session profiles. When connecting to a PostgreSQL target database, the service forces read-only connection limits (-c default_transaction_read_only=on). This ensures the platform can never accidentally rewrite, modify, or truncate any schema elements on production systems.

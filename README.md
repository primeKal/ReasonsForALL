# Ralles — *Reasons for All*
> **Multi-Agent Business Logic Guardrail Platform for AI Agents**

[![Backend: FastAPI + Google ADK](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Google%20ADK-009688?style=flat-square)](https://fastapi.tiangolo.com/)
[![Frontend: Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=flat-square)](https://nextjs.org/)
[![Database: Supabase](https://img.shields.io/badge/DB-Supabase-3ECF8E?style=flat-square)](https://supabase.com/)
[![AI: Gemini / Google GenAI](https://img.shields.io/badge/AI-Gemini%20%2F%20Google%20GenAI-4285F4?style=flat-square)](https://ai.google.dev/)

---

## The Problem

Modern AI agents are powerful — but they operate without any awareness of your actual business rules.

When you deploy an LLM-powered agent against your production database or business systems, there is no reliable, centralised mechanism to prevent it from:

- Executing destructive write operations it shouldn't be allowed to run
- Violating complex multi-table business constraints buried in your schema
- Performing privilege escalation (e.g. an anonymous user deleting records)
- Bypassing domain logic that only exists implicitly in your database triggers or application code

Standard approaches — prompt engineering, LLM content filters, or RAG-based semantic search — are probabilistic, expensive, and brittle. They require you to manually maintain rules in every agent prompt, every system, and every downstream context call. There is no single source of truth for your business logic.

---

## The Solution

**Ralles** is a multi-agent SaaS platform that:

1. **Reads your database schema** (PostgreSQL, MySQL, SQL Server) — structure only, never row data.
2. **Extracts your business rules** using a cooperative agent swarm powered by Google's ADK.
3. **Builds a centralised guardrail server** — a living, queryable logic memory for your AI stack.
4. **Enforces rules in real-time** via a REST API that any agent can call before executing operations.

Every AI agent in your organisation checks the same guardrail server. Rules change in one place. Violations are blocked and logged automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js 15)                  │
│  Dashboard · Server Config · Chat · API Logs · API Key Mgmt     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / REST
┌──────────────────────────────▼──────────────────────────────────┐
│                  Backend (FastAPI + Google ADK)                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Google ADK Agent Workflow (agent.py)                   │    │
│  │  ┌─────────────┐  ┌───────────┐  ┌────────────────┐   │    │
│  │  │ ConceptAgent│  │ RulesAgent│  │HierarchyAgent  │   │    │
│  │  └──────┬──────┘  └─────┬─────┘  └───────┬────────┘   │    │
│  │         └───────────────┴────────────────┘            │    │
│  │              Multi-agent extraction pipeline           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ /tenant      │  │ /reasoning/verify│  │ /server          │  │
│  │ connect DB   │  │ API key-protected │  │ dashboard CRUD   │  │
│  │ extract rules│  │ agent integration│  │ chat · rules view│  │
│  └──────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GeminiService  (Gemini / OpenAI adaptor)                │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                        Supabase (PostgreSQL)                     │
│  tenant_profiles · tenant_configurations · tenant_quad_store    │
│  tenant_text_policies · tenant_api_keys · tenant_api_logs       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 15 (App Router), Tailwind CSS, shadcn/ui, Framer Motion | Dashboard, server management, chat interface |
| **Backend** | FastAPI + [Google ADK](https://google.github.io/adk-docs/) | REST API, agent orchestration, rule extraction |
| **Agent Workflow** | Google ADK `Workflow` with parallel nodes | Multi-agent cooperative schema extraction |

| **LLM Layer** | Google GenAI (Gemini 2.0 Flash) | NLU parsing, policy generation, text-mode judgement |
| **Database** | Supabase (PostgreSQL) | Multi-tenant quad-store, auth, audit logs |
| **Auth** | Supabase Auth (JWT) + custom API keys (`sk-rfa-*`) | Human users + agent-to-server auth |

### Reasoning Mode

Ralles evaluates guardrails using **Text Mode** — the LLM judges a natural-language query against stored plain-English business policies extracted from your schema, returning a human-readable verdict with confidence score and reasoning steps.

---

## Multi-Agent Extraction Pipeline

When you connect a database, Ralles runs a cooperative agent swarm:

```
Intent Detection → [ConceptAgent ‖ RulesAgent ‖ HierarchyAgent] → GitAgent (optional) → Quad Store
```

1. **ConceptAgent** — Identifies business entities (classes) from tables and FK relationships.
2. **RulesAgent** — Extracts cardinality, ownership, and action rules from constraints and triggers.
3. **HierarchyAgent** — Infers `is-a` and `disjoint` relationships between concepts.
4. **GitAgent** *(optional)* — Supplements schema rules with business logic found in your source code repository.

All extracted rules are stored as typed quads `(subject, predicate, object, rule_type)` in Supabase — your private guardrail memory.

---

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com/) project
- A Google Gemini API key ([Get one here](https://aistudio.google.com/))

---

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ReasonsForALL
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Copy and fill in the environment file:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
GEMINI_API_KEY=your-gemini-api-key

# Optional: SMTP for email alerts
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_SENDER=noreply@yourapp.com

# Optional: Stripe billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Optional: Allowed frontend origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000
```

Run the backend:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

The API will be available at `http://localhost:8080`.  
Interactive docs: `http://localhost:8080/docs`

> **Dev bypass:** For local testing without a real Supabase token, use `Authorization: Bearer dev-token`.

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Copy and fill in the environment file:

```bash
cp .env.local.example .env.local   # or create it manually
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Run the frontend dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

### 4. Supabase Database Setup

Apply the database migrations from the `supabase/` directory to your Supabase project:

```bash
# Using the Supabase CLI
supabase db push
```

Or run the SQL files manually from the Supabase SQL Editor.

---

### 5. Docker (Backend Only)

A Dockerfile is provided for deploying the backend to Cloud Run or any container host:

```bash
cd backend
docker build -t ralles-backend .
docker run -p 8080:8080 --env-file .env ralles-backend
```

---

## API Integration (Agent Example)

Once your guardrail server is set up and an API key is generated from the dashboard:

```python
import requests

response = requests.post(
    "https://your-backend-url/reasoning/verify",
    headers={"Authorization": "Bearer sk-rfa-your-api-key"},
    json={
        "server_id": "your-server-key",
        "agent_intent": "delete_user_record",
        "payload": {
            "user_role": "anonymous",
            "target_table": "ratings",
            "operation": "DELETE"
        }
    }
)

result = response.json()
if not result["is_valid"]:
    print("Blocked:", result["violations"])
```

**Response:**
```json
{
  "is_valid": false,
  "violations": ["Anonymous users cannot perform DELETE operations on protected tables"],
  "inference_time_ms": 3.2,
  "agent_intent": "delete_user_record",
  "message": "Payload validation complete."
}
```

---

## Project Structure

```
ReasonsForALL/
├── backend/
│   ├── app/
│   │   ├── agent.py              # Google ADK agent + workflow definition
│   │   ├── main.py               # FastAPI app + ADK integration
│   │   ├── config.py             # Environment config
│   │   ├── dependencies.py       # Auth middleware (JWT + API key)
│   │   ├── state.py              # In-memory server cache
│   │   ├── routers/
│   │   │   ├── tenant.py         # DB connect, extraction endpoints
│   │   │   ├── reasoning.py      # /verify endpoint for agents
│   │   │   └── server.py         # Dashboard CRUD, chat, policies
│   │   └── services/
│   │       ├── db_extractor.py   # SQLAlchemy schema reader
│   │       ├── gemini_service.py # LLM adapter (Gemini / OpenAI)
│   │       ├── supabase_client.py# Supabase data layer
│   │       ├── email_service.py  # SMTP alerts
│   │       └── extraction_agent/ # Sub-agents (concept, rules, hierarchy, git)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/app/                  # Next.js App Router pages
│   │   ├── page.tsx              # Landing page
│   │   ├── login/                # Auth pages
│   │   └── dashboard/            # Dashboard (servers, chat, logs, API keys)
│   └── package.json
├── supabase/                     # DB migrations
└── vercel.json                   # Vercel deployment config
```

---

## Deployment

| Service | Platform |
|---|---|
| **Frontend** | Vercel (auto-deploy from `frontend/`) |
| **Backend** | Google Cloud Run (via Docker) or any PaaS |
| **Database** | Supabase managed PostgreSQL |

The `vercel.json` at the repo root is configured for frontend deployment.  
The `backend/Dockerfile` targets port `8080` for Cloud Run compatibility.

---

## Roadmap

- [ ] **Agent-to-Agent Communication** — Shared guardrail context across multi-agent pipelines
- [ ] **Python SDK** — `pip install ralles` for one-import integration
- [ ] **Re-Sync UI** — One-click dashboard refresh when your schema evolves
- [ ] **Extraction Config UI** — Choose which tables and schemas to include per extraction

---

## License

© 2026 Ralles Inc. — *Reasons for All.* All rights reserved.

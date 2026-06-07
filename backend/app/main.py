from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import tenant, reasoning, server
import logging

# Configure root logger so all app-level INFO/WARNING logs appear in the terminal
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S"
)

app = FastAPI(
    title="Multi-Tenant Ontology Guardrail SaaS",
    description="Advanced semantic logic and inference verification layer",
    version="1.0.0.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tenant.router)
app.include_router(reasoning.router)
app.include_router(server.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Multi-Tenant Ontology Guardrail SaaS API"}

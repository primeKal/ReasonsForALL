from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import tenant, reasoning, server, billing
import logging
import os
from fastapi import Request, Response
from fastapi.responses import JSONResponse

# Configure root logger so all app-level INFO/WARNING logs appear in the terminal
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S"
)

app = FastAPI(
    title="Multi-Tenant Guardrail SaaS",
    description="Advanced rules verification and enforcement API",
    version="1.0.0.1"
)

# ALLOWED_ORIGINS env var = comma-separated list of frontend URLs
# e.g. "https://your-app.vercel.app,https://reasonsforall.com"
_extra_origins = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        *_extra_origins,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Quick OPTIONS preflight handler to avoid redirects breaking CORS in some
# deployed environments (edge/proxy rewrites can occasionally return 3xx
# which invalidates browser preflight requests). This returns minimal
# Access-Control-Allow-* headers for allowed origins so browsers accept
# the preflight and continue to the real route.


@app.options("/{path_name:path}")
async def _preflight(path_name: str, request: Request):
    origin = request.headers.get("origin")
    allowed = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        *_extra_origins,
    ]
    logging.info(f"CORS preflight received for path=/{path_name} origin={origin} allowed_origins={allowed}")

    # If an origin is present and not allowed, return 204 with no CORS headers
    if origin and origin not in allowed and "*" not in allowed:
        logging.warning(f"CORS preflight origin not allowed: {origin}")
        return Response(status_code=204)

    allow_headers = request.headers.get(
        "access-control-request-headers", "Authorization,Content-Type"
    )

    # When credentials are used, browsers require a specific origin value
    # (not '*'). Always echo the incoming origin when present and allowed.
    if origin:
        acao = origin
    else:
        # No Origin header (non-browser request) — fall back to wildcard if allowed
        acao = "*" if "*" in allowed else (allowed[0] if allowed else "*")

    headers = {
        "Access-Control-Allow-Origin": acao,
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": allow_headers,
        "Access-Control-Allow-Credentials": "true",
    }
    logging.info(f"CORS preflight responding with headers: {headers}")
    return Response(status_code=204, headers=headers)


@app.get("/ping")
def ping():
    """Simple diagnostic endpoint to verify CORS and reachability."""
    # Removed unnecessary origin echoing logic for simplicity
    return JSONResponse({"status": "ok"})


app.include_router(tenant.router)
app.include_router(reasoning.router)
app.include_router(server.router)
app.include_router(billing.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to the Multi-Tenant Guardrail API"}

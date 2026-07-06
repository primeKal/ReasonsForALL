import os
from pathlib import Path
from dotenv import load_dotenv

# Explicitly resolve the .env file relative to this file's location
# so it is found regardless of the working directory the server is started from.
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=False)

class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
    # Service role key for backend writes (bypasses RLS) — set this in .env
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_KEY", ""))
    
    # Tier limits
    FREE_TRIAL_RULE_CAP = 1000
    FREE_TRIAL_ROW_SCAN_DEPTH = 500
    # Runtime flags
    # If False, skip Description Logic (owlready2) reasoning that requires a JVM
    DL_REASONING_ENABLED = os.getenv("DL_REASONING_ENABLED", "true").lower() in ("1", "true", "yes")
    # When true, prompts to LLMs include stricter non-hallucination instructions and responses are validated
    LLM_SAFE_MODE = os.getenv("LLM_SAFE_MODE", "true").lower() in ("1", "true", "yes")
    # LLM call timeout (seconds)
    LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "40"))

config = Config()

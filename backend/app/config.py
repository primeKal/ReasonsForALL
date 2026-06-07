import os
from dotenv import load_dotenv

# Load .env file from the backend root directory
load_dotenv()

class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
    # Service role key for backend writes (bypasses RLS) — set this in .env
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_KEY", ""))
    
    # Tier limits
    FREE_TRIAL_RULE_CAP = 1000
    FREE_TRIAL_ROW_SCAN_DEPTH = 500

config = Config()

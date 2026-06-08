from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import logging
import stripe
import os
import httpx
from app.dependencies import verify_tenant
from app.config import config

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/billing",
    tags=["billing"]
)

# Initialize Stripe (read secret key from environment)
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
stripe.api_key = STRIPE_SECRET_KEY

class CheckoutSessionRequest(BaseModel):
    success_url: str
    cancel_url: str

@router.post("/create-checkout-session")
def create_checkout_session(request: CheckoutSessionRequest, tenant_context: dict = Depends(verify_tenant)):
    tenant_id = tenant_context.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Invalid tenant context")

    # Determine whether to append session_id with '?' or '&' to avoid double '?' in URL
    sep = "&" if "?" in request.success_url else "?"

    # If no Stripe key is set, run simulated flow
    if not STRIPE_SECRET_KEY:
        logger.warning("STRIPE_SECRET_KEY not set. Redirecting to simulated success page.")
        # Simulating a Stripe session redirect by returning a mock checkout URL
        # which redirects user back with success=true and session_id
        mock_checkout_url = f"{request.success_url}{sep}session_id=mock_session_12345"
        return {"checkout_url": mock_checkout_url, "simulated": True}

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Ralles Premium Subscription',
                        'description': 'Unlimited guardrails, logical reasoning, and active compliance policies.',
                    },
                    'unit_amount': 4900,  # $49.00 / mo
                    'recurring': {
                        'interval': 'month',
                    },
                },
                'quantity': 1,
            }],
            mode='subscription',
            metadata={
                'tenant_id': tenant_id
            },
            success_url=request.success_url + f"{sep}session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=request.cancel_url,
        )
        return {"checkout_url": session.url, "simulated": False}
    except Exception as e:
        logger.error(f"Failed to create Stripe Checkout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/complete-session")
def complete_session(session_id: str, tenant_context: dict = Depends(verify_tenant)):
    tenant_id = tenant_context.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Invalid tenant context")

    logger.info(f"Completing checkout session {session_id} for tenant {tenant_id}")
    
    if session_id.startswith("mock_session"):
        _upgrade_tenant_to_premium(tenant_id)
        return {"status": "success", "message": "Simulated upgrade complete. Welcome to Premium!"}

    if not STRIPE_SECRET_KEY:
        _upgrade_tenant_to_premium(tenant_id)
        return {"status": "success", "message": "Upgrade complete. Welcome to Premium!"}

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        session_tenant = session.get("metadata", {}).get("tenant_id")
        if session_tenant == tenant_id:
            _upgrade_tenant_to_premium(tenant_id)
            return {"status": "success", "message": "Upgrade complete. Welcome to Premium!"}
        else:
            raise HTTPException(status_code=400, detail="Session tenant mismatch")
    except Exception as e:
        logger.error(f"Failed to verify Stripe session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Webhook handler to process Stripe billing events and update premium status in Supabase.
    """
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    if not STRIPE_SECRET_KEY:
        # Mock webhook handler if called in dev/testing environment
        try:
            event_json = await request.json()
            if event_json.get("type") == "checkout.session.completed":
                session = event_json.get("data", {}).get("object", {})
                tenant_id = session.get("metadata", {}).get("tenant_id")
                if tenant_id:
                    logger.info(f"Simulating Stripe Webhook: Upgrading tenant {tenant_id} to Premium")
                    _upgrade_tenant_to_premium(tenant_id)
                    return {"status": "success", "message": "Upgraded tenant successfully (mocked)."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle completion events
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        tenant_id = session.get('metadata', {}).get('tenant_id')
        if tenant_id:
            logger.info(f"Stripe Webhook: checkout.session.completed received. Upgrading tenant {tenant_id} to Premium.")
            _upgrade_tenant_to_premium(tenant_id)

    return {"status": "success"}


def _upgrade_tenant_to_premium(tenant_id: str):
    """
    Directly updates the tenant's profile status in Supabase to is_premium = true.
    """
    user_id = tenant_id.replace("tenant_", "")
    headers = {
        "apikey": config.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    # 1. Update profiles table
    url_profile = f"{config.SUPABASE_URL}/rest/v1/profiles"
    params_profile = {"id": f"eq.{user_id}"}
    try:
        httpx.patch(url_profile, params=params_profile, json={"is_premium": True}, headers=headers, timeout=10.0).raise_for_status()
        logger.info(f"Successfully upgraded tenant profile '{user_id}' to Premium in profiles table.")
    except Exception as e:
        logger.error(f"Failed to upgrade tenant profile '{user_id}' in profiles: {e}")

    # 2. Update tenant_configurations table (if any configs exist)
    url_config = f"{config.SUPABASE_URL}/rest/v1/tenant_configurations"
    params_config = {"tenant_id": f"eq.{tenant_id}"}
    try:
        httpx.patch(url_config, params=params_config, json={"is_premium": True}, headers=headers, timeout=10.0).raise_for_status()
        logger.info(f"Successfully upgraded tenant '{tenant_id}' in tenant_configurations table.")
    except Exception as e:
        logger.error(f"Failed to upgrade tenant '{tenant_id}' in tenant_configurations: {e}")


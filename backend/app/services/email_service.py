import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Read SMTP configuration from environment variables
SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
try:
    SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
except ValueError:
    SMTP_PORT = 1025
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_SENDER = os.getenv("SMTP_SENDER", "noreply@reasonsforall.com")


def _get_email_layout(title: str, body_content: str) -> str:
    """
    HTML Email template wrapper matching Ralles' violet/indigo branding.
    """
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      width: 100%;
      background-color: #f3f4f6;
      padding: 40px 0;
    }}
    .container {{
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }}
    .header {{
      background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
      padding: 32px;
      text-align: center;
    }}
    .logo-badge {{
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      background-color: #ffffff;
      color: #7c3aed;
      font-size: 24px;
      font-weight: 900;
      border-radius: 10px;
      text-align: center;
      margin-bottom: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
    }}
    .header h1 {{
      color: #ffffff;
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }}
    .content {{
      padding: 32px;
      background-color: #ffffff;
    }}
    .content p {{
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
    }}
    .card {{
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }}
    .card-title {{
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #9ca3af;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }}
    .btn {{
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
      padding: 12px 28px;
      border-radius: 8px;
      text-align: center;
      margin-top: 16px;
      box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.2), 0 2px 4px -1px rgba(124, 58, 237, 0.1);
    }}
    .footer {{
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }}
    .footer p {{
      margin: 0;
      font-size: 12px;
      color: #9ca3af;
    }}
    .footer a {{
      color: #7c3aed;
      text-decoration: none;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">R</div>
        <h1>Ralles</h1>
      </div>
      <div class="content">
        {body_content}
      </div>
      <div class="footer">
        <p>&copy; 2026 Ralles Reasoning Systems. All rights reserved.</p>
        <p>Providing logic and guardrails as a service.</p>
      </div>
    </div>
  </div>
</body>
</html>
"""


def _send_html_email(recipient: str, subject: str, html_body: str):
    """
    Sends an HTML email using SMTP.
    Always saves a local HTML preview file in backend/emails/ for easy visual debugging.
    """
    # 1. Save local preview for development inspection
    try:
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        preview_dir = os.path.join(backend_dir, "emails")
        os.makedirs(preview_dir, exist_ok=True)
        safe_subject = "".join([c if c.isalnum() else "_" for c in subject])
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        preview_path = os.path.join(preview_dir, f"{timestamp}_{safe_subject}.html")
        with open(preview_path, "w", encoding="utf-8") as f:
            f.write(html_body)
        logger.info(f"[Email Service] Saved local HTML email preview to: {preview_path}")
    except Exception as e:
        logger.warning(f"[Email Service] Failed to save local preview HTML file: {e}")

    # 2. Try SMTP sending
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_SENDER
        msg["To"] = recipient

        msg.attach(MIMEText(html_body, "html"))

        # Initialize SMTP server connection
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=5.0)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=5.0)
            if SMTP_PORT == 587:
                server.starttls()

        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)

        server.sendmail(SMTP_SENDER, [recipient], msg.as_string())
        server.quit()
        logger.info(f"[Email Service] Successfully sent email to {recipient} via SMTP.")
    except Exception as e:
        logger.warning(f"[Email Service] SMTP dispatch to {recipient} failed: {e}. Fallback preview generated.")


def send_welcome_email(recipient_email: str, name: str):
    """
    Sent upon successful onboarding/manual sign-up.
    """
    name_label = name or "there"
    body = f"""
    <p>Hi {name_label},</p>
    <p>Welcome to <strong>Ralles</strong> — your advanced multi-agent reasoning guardrail system.</p>
    <p>We are thrilled to help you establish hallucination-free boundaries and compliance policies for your AI agents.</p>
    <div class="card">
      <div class="card-title">Where to Start</div>
      <p>1. Connect your database to dynamically extract schema classes and constraints.</p>
      <p>2. Define text-based business rules for natural language checking.</p>
      <p>3. Generate developer keys to deploy Ralles validation on your live API calls.</p>
    </div>
    <p>Ready to secure your agents?</p>
    <div style="text-align: center;">
      <a href="http://localhost:3000/dashboard/servers" class="btn">Go to Dashboard</a>
    </div>
    """
    html_content = _get_email_layout("Welcome to Ralles", body)
    _send_html_email(recipient_email, "Welcome to Ralles! 🎉", html_content)


def send_login_notification(recipient_email: str, name: str, user_agent: str = "Unknown Browser", ip_address: str = "Unknown IP"):
    """
    Sent upon user login.
    """
    name_label = name or "User"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    body = f"""
    <p>Hi {name_label},</p>
    <p>A new sign-in was recorded for your Ralles account.</p>
    <div class="card">
      <div class="card-title">Login Information</div>
      <p><strong>Time:</strong> {timestamp}</p>
      <p><strong>Device/Browser:</strong> {user_agent}</p>
      <p><strong>IP Address:</strong> {ip_address}</p>
    </div>
    <p>If this was you, no action is required. If you did not make this request, please update your password immediately to secure your account.</p>
    <div style="text-align: center;">
      <a href="http://localhost:3000/login" class="btn">Secure Account</a>
    </div>
    """
    html_content = _get_email_layout("Ralles Security Alert", body)
    _send_html_email(recipient_email, "Security Alert: New Sign-in to Ralles", html_content)


def send_trial_expiration_warning(recipient_email: str, name: str, days_left: int):
    """
    Sent when the trial is close to expiration.
    """
    name_label = name or "Customer"
    body = f"""
    <p>Hi {name_label},</p>
    <p>Your <strong>Ralles Free Trial</strong> is expiring soon!</p>
    <div class="card" style="border-left: 4px solid #7c3aed; background-color: #faf5ff;">
      <div class="card-title" style="color: #7c3aed;">Trial Account Status</div>
      <p>You have <strong>{days_left} days left</strong> in your free trial.</p>
      <p>Once expired, active database schema logic rules will be paused, and agent intents will bypass validation.</p>
    </div>
    <p>Upgrade to Premium to secure unlimited rules, high-fidelity Description Logic reasoning, and active compliance policies.</p>
    <div style="text-align: center;">
      <a href="http://localhost:3000/dashboard/profile" class="btn">Upgrade to Premium</a>
    </div>
    """
    html_content = _get_email_layout("Ralles Free Trial Expiring", body)
    _send_html_email(recipient_email, f"Action Required: Your Ralles trial expires in {days_left} days", html_content)


def send_risky_request_alert(recipient_email: str, name: str, server_name: str, query: str, verdict: str, summary: str, violations: list):
    """
    Sent when the LLM Judge blocks a high-risk text policy violation.
    """
    name_label = name or "Administrator"
    violations_html = "".join(f"<li style='color: #dc2626; margin-bottom: 6px;'>❌ {v}</li>" for v in violations)
    body = f"""
    <p>Hi {name_label},</p>
    <p>⚠️ <strong>High Risk / Blocked Request Detected</strong></p>
    <p>The Ralles LLM Judge intercepted and blocked a risky query on Server <strong>{server_name}</strong>.</p>
    
    <div class="card" style="border-left: 4px solid #dc2626; background-color: #fef2f2;">
      <div class="card-title" style="color: #dc2626;">Intercepted Request Details</div>
      <p><strong>Query:</strong> <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px;">"{query}"</code></p>
      <p><strong>Verdict:</strong> <strong style="color: #dc2626;">{verdict.upper()}</strong></p>
      <p><strong>Reasoning Analysis:</strong> {summary}</p>
    </div>
    
    <div class="card">
      <div class="card-title">Violated Business Policies</div>
      <ul style="margin: 0; padding-left: 20px;">
        {violations_html or "<li>No specific policy rules returned</li>"}
      </ul>
    </div>
    
    <p>Review the server's API logs to inspect full reasoning traces and modify agent policies if necessary.</p>
    <div style="text-align: center;">
      <a href="http://localhost:3000/dashboard/servers" class="btn">Review Audit Logs</a>
    </div>
    """
    html_content = _get_email_layout("Ralles Risky Request Intercepted", body)
    _send_html_email(recipient_email, f"⚠️ Warning: Risky request blocked on server '{server_name}'", html_content)

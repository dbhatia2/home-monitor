"""SMTP email sender — one shared function for all email modules."""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()


def send(html: str, subject: str, to_email: str) -> bool:
    """Send an HTML email. Returns True on success."""
    email_from = os.environ.get("EMAIL_FROM", "")
    email_pass = os.environ.get("EMAIL_PASS", "")
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))

    if not all([email_from, email_pass, to_email]):
        print("  Email credentials missing — skipping")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = email_from
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(email_from, email_pass)
            server.sendmail(email_from, [to_email], msg.as_string())
        print(f"  + Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"  x Email failed: {e}")
        return False

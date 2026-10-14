"""Enterprise Email Dispatcher for Security Codes and Notifications."""

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.config import settings

logger = logging.getLogger("email_service")


class EmailService:
    """Dispatches enterprise transactional emails via SMTP or logs to console in dev mode."""

    @staticmethod
    def _send_smtp_sync(to_email: str, subject: str, text_content: str, html_content: str) -> tuple[bool, Optional[str]]:
        """Synchronous SMTP email delivery run in a threadpool executor."""
        if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            return False, "SMTP configuration incomplete (missing SMTP_HOST, SMTP_USER, or SMTP_PASSWORD)"

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
            msg["To"] = to_email

            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAILS_FROM_EMAIL, to_email, msg.as_string())

            logger.info(f"Email successfully dispatched to {to_email}")
            return True, None
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to send email via SMTP to {to_email}: {error_msg}")
            return False, error_msg

    @classmethod
    async def send_otp_email(
        cls,
        to_email: str,
        user_name: str,
        otp_code: str,
        purpose: str = "password_reset",
    ) -> bool:
        """Sends a 6-digit verification code for registration activation or password recovery."""
        if purpose == "registration":
            subject = f"OpsPilot AI — Activate Your Account: {otp_code}"
            action_desc = "activate your new OpsPilot AI account"
            lead_text = "Welcome to OpsPilot AI! Use the following 6-digit verification code to activate your account and complete registration:"
            footer_note = "If you did not create an OpsPilot AI account, please ignore this email."
        else:
            subject = f"OpsPilot AI — Password Reset Verification Code: {otp_code}"
            action_desc = "reset your OpsPilot AI password"
            lead_text = "We received a request to reset your password. Use the following verification code to proceed:"
            footer_note = "If you did not request this password reset, please ignore this message."

        text_content = (
            f"Hello {user_name},\n\n"
            f"{lead_text}\n\n"
            f"Verification Code: {otp_code}\n\n"
            f"This code will expire in {settings.OTP_EXPIRY_MINUTES} minutes.\n"
            f"{footer_note}\n\n"
            f"— The OpsPilot AI Team"
        )

        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 24px; color: #111827;">
            <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h2 style="color: #2563eb; margin-top: 0;">OpsPilot AI</h2>
              <p>Hello <strong>{user_name}</strong>,</p>
              <p>{lead_text}</p>
              <div style="background-color: #f3f4f6; padding: 16px; text-align: center; border-radius: 6px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937; margin: 24px 0;">
                {otp_code}
              </div>
              <p style="color: #6b7280; font-size: 14px;">This code is valid for <strong>{settings.OTP_EXPIRY_MINUTES} minutes</strong>. For security reasons, do not share this code with anyone.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">{footer_note}</p>
            </div>
          </body>
        </html>
        """

        # In dev mode or if SMTP is not configured, prominently log to console for development verification
        if not settings.SMTP_HOST:
            logger.info("=" * 60)
            logger.info(f"[SECURITY OTP CODE DISPATCH] To: {to_email}")
            logger.info(f"Verification Code: >>> {otp_code} <<< (Valid for {settings.OTP_EXPIRY_MINUTES}m)")
            logger.info("=" * 60)
            return True, None

        # Dispatch via async threadpool if SMTP configured
        success, err = await asyncio.to_thread(cls._send_smtp_sync, to_email, subject, text_content, html_content)
        if not success:
            logger.warning(f"Fallback logging OTP for {to_email}: {otp_code}")
        return success, err

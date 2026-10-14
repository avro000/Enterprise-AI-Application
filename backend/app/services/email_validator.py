"""Email Deliverability & Domain Verification Service."""

import logging
from typing import Set
import dns.resolver

from app.config import settings

logger = logging.getLogger("email_validator")

# Popular disposable / temporary email services
DISPOSABLE_DOMAINS: Set[str] = {
    "mailinator.com",
    "tempmail.com",
    "10minutemail.com",
    "guerrillamail.com",
    "sharklasers.com",
    "yopmail.com",
    "trashmail.com",
    "dispostable.com",
    "getairmail.com",
    "temp-mail.org",
    "fakemailgenerator.com",
    "throwawaymail.com",
    "generator.email",
}

# Domains whitelisted for testing and internal development
TRUSTED_INTERNAL_DOMAINS: Set[str] = {
    "opspilot.com",
    "example.com",
    "test.com",
    "localhost",
}


class EmailValidatorService:
    """Validates email addresses for format, disposable providers, and real DNS MX deliverability."""

    @classmethod
    def validate_email_domain(cls, email: str) -> None:
        """Verifies that an email's domain is valid, not disposable, and has active mail servers.

        Raises:
            ValueError: If the domain is malformed, disposable, or does not exist on DNS.
        """
        if "@" not in email:
            raise ValueError("Invalid email format: missing '@' symbol.")

        parts = email.strip().split("@")
        if len(parts) != 2 or not parts[0] or not parts[1]:
            raise ValueError("Invalid email address format.")

        domain = parts[1].lower()

        # 1. Check TLD structure
        domain_parts = domain.split(".")
        if len(domain_parts) < 2 or len(domain_parts[-1]) < 2 or not domain_parts[-1].isalpha():
            raise ValueError(f"Invalid email domain '{domain}': unrecognized or malformed top-level domain.")

        # 2. Check disposable email domain blacklist
        if domain in DISPOSABLE_DOMAINS:
            raise ValueError(
                f"Registration with disposable or temporary email domain '@{domain}' is not permitted."
            )

        # 3. Bypass external DNS if disabled in settings or domain is trusted test domain
        if not settings.VALIDATE_EMAIL_DELIVERABILITY or domain in TRUSTED_INTERNAL_DOMAINS:
            return

        # 4. Perform DNS MX / Address resolution
        cls._verify_dns_deliverability(domain)

    @classmethod
    def _verify_dns_deliverability(cls, domain: str) -> None:
        """Queries DNS servers to verify domain existence and MX mail exchanger records."""
        resolver = dns.resolver.Resolver()
        # Use reliable public DNS with fallback to system DNS
        resolver.nameservers = ["8.8.8.8", "1.1.1.1"]
        resolver.timeout = 2.0
        resolver.lifetime = 2.5

        try:
            # First query for MX (Mail Exchange) records
            try:
                mx_answers = resolver.resolve(domain, "MX")
                exchanges = [r.exchange.to_text() for r in mx_answers]
                # A null MX record ('.') indicates the domain does not accept email
                if exchanges and exchanges != ["."]:
                    return
            except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):
                # Per RFC 5321, fallback to A/AAAA address record if no MX is specified
                pass

            # Fallback query for A host records
            try:
                a_answers = resolver.resolve(domain, "A")
                if a_answers:
                    return
            except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):
                raise ValueError(
                    f"Email domain '{domain}' cannot receive mail: no active MX or host records found."
                )

        except dns.resolver.NXDOMAIN:
            raise ValueError(f"Invalid email: domain '{domain}' does not exist.")
        except dns.resolver.LifetimeTimeout:
            raise ValueError(
                f"Email domain '{domain}' could not be verified: domain does not exist or DNS lookup timed out."
            )
        except ValueError:
            raise
        except Exception as e:
            logger.warning(f"DNS deliverability check error for '{domain}': {e}")
            raise ValueError(f"Failed to verify email domain '{domain}': {str(e)}")

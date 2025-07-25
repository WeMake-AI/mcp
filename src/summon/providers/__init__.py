"""Provider implementations for Summon."""

from .google import GoogleProvider, GOOGLE_AVAILABLE
from .openai import OpenAIProvider, OPENAI_AVAILABLE

# Only include available providers
PROVIDERS = {
    "google": GoogleProvider(),
}

if OPENAI_AVAILABLE:
    PROVIDERS["openai"] = OpenAIProvider()

__all__ = ["PROVIDERS", "GoogleProvider", "OpenAIProvider"]

import uuid
import structlog
from typing import Optional, Union
from sqlalchemy.orm import Session
from app.core.config import settings
from app.services.financial_assistant_service import AIProvider, RuleBasedProvider
from app.services.gemini_provider import GeminiProvider, GeminiQuotaError, GeminiAPIError
from app.services.financial_context_service import FinancialContextService

logger = structlog.get_logger()


class ProviderFactory:
    _gemini_instance: Optional[GeminiProvider] = None

    @classmethod
    def get_provider(cls) -> tuple[AIProvider, str]:
        provider_name = settings.AI_PROVIDER.lower()

        if provider_name == "gemini":
            if not settings.GEMINI_API_KEY:
                logger.warning("gemini_provider_selected_but_no_api_key_falling_back_to_rule")
                return RuleBasedProvider(), "rule"

            if cls._gemini_instance is None:
                try:
                    cls._gemini_instance = GeminiProvider()
                except Exception as e:
                    logger.error("gemini_instantiation_failed", error=str(e))
                    return RuleBasedProvider(), "rule"

            if cls._gemini_instance.is_available():
                logger.info("using_gemini_provider")
                return cls._gemini_instance, "gemini"
            else:
                logger.warning("gemini_unavailable_falling_back_to_rule")
                return RuleBasedProvider(), "rule"

        logger.info("using_rule_based_provider")
        return RuleBasedProvider(), "rule"


class GeminiAssistantWrapper(AIProvider):
    def __init__(self, gemini_provider: GeminiProvider):
        self.gemini = gemini_provider

    def ask(self, message: str, user_id: Union[str, uuid.UUID], db: Session) -> dict:
        context_service = FinancialContextService(db)
        context = context_service.get_context(user_id)
        financial_context_str = context.to_prompt_block()

        try:
            answer = self.gemini.generate_response(message, financial_context_str)
            recommendations = self._extract_recommendations(answer)

            return {
                "answer": answer,
                "intent": "gemini",
                "recommendations": recommendations,
                "error": False,
            }
        except (GeminiQuotaError, GeminiAPIError) as e:
            logger.warning("gemini_wrapper_error",
                           error=str(e),
                           error_type=type(e).__name__)
            return {
                "answer": "",
                "intent": "gemini_error",
                "recommendations": [],
                "error": True,
                "error_message": str(e),
            }

    def _extract_recommendations(self, text: str) -> list[str]:
        lines = text.split("\n")
        recs = []
        in_rec_section = False
        for line in lines:
            stripped = line.strip()
            if any(kw in stripped.lower() for kw in ["recommendation", "suggest", "tip", "consider", "try to"]):
                in_rec_section = True
            if in_rec_section and stripped and not stripped.startswith("=") and not stripped.startswith("---"):
                if any(kw in stripped.lower() for kw in ["recommend", "suggest", "tip", "consider", "try", "aim", "start", "build", "prioritize", "begin", "ensure", "look into"]):
                    recs.append(stripped.lstrip("•-*0123456789. "))

        return recs[:5]


def create_ai_provider() -> tuple[AIProvider, str]:
    provider_instance, provider_name = ProviderFactory.get_provider()

    if provider_name == "gemini":
        return GeminiAssistantWrapper(provider_instance), provider_name

    return provider_instance, provider_name


def get_gemini_diagnostics() -> dict:
    api_key = settings.GEMINI_API_KEY
    api_key_loaded = bool(api_key)
    api_key_prefix = api_key[:6] + "..." if api_key and len(api_key) > 6 else ""

    gemini_available = False
    fallback_active = True
    quota_exceeded = False

    if api_key_loaded:
        try:
            gem = GeminiProvider()
            gemini_available = gem.is_available()
            connectivity = gem.check_connectivity()
            fallback_active = not connectivity
            if gemini_available and not connectivity:
                quota_exceeded = True
        except Exception:
            fallback_active = True

    provider_name = settings.AI_PROVIDER.lower()
    if provider_name != "gemini":
        fallback_active = True

    return {
        "model": "gemini-2.0-flash",
        "api_key_loaded": api_key_loaded,
        "api_key_prefix": api_key_prefix,
        "gemini_connectivity": gemini_available and not quota_exceeded,
        "fallback_active": fallback_active,
        "provider": provider_name,
        "quota_exceeded": quota_exceeded,
        "last_error": None,
    }

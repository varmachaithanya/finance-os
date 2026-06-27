import uuid
import structlog
from datetime import datetime
from typing import Optional, Union
from sqlalchemy.orm import Session
from app.core.config import settings

logger = structlog.get_logger()

SYSTEM_PROMPT = """You are Arthya AI Coach, a personal finance assistant integrated into the Arthya personal finance management application.

RULES:
1. Use ONLY the financial information provided in the "USER FINANCIAL SUMMARY" section below.
2. Never invent numbers, amounts, or financial data that is not explicitly provided.
3. If data is unavailable or zero, state that clearly rather than making assumptions.
4. Provide actionable, personalized financial recommendations based on the data.
5. Keep responses concise (2-4 paragraphs max) and conversational.
6. Format the response in a clear, readable way with brief sections if helpful.
7. Use the currency symbol shown in the data (₹ for INR).
8. Be encouraging and constructive — never alarmist.
9. If the user asks about something not covered in the financial data, politely explain you can only answer based on their financial information.
10. Always end with 1-2 specific, actionable recommendations when possible."""


class GeminiQuotaError(Exception):
    def __init__(self, message: str = "Gemini API quota exceeded"):
        self.message = message
        super().__init__(self.message)


class GeminiAPIError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class GeminiProvider:
    def __init__(self):
        self.model = None
        self.model_name = "gemini-2.0-flash"
        self._last_usage = {}
        self._init_model()

    def _init_model(self):
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(self.model_name)
            logger.info("gemini_init_success", model=self.model_name)
        except Exception as e:
            logger.error("gemini_init_failed", error=str(e))
            self.model = None

    def generate_response(self, user_question: str, financial_context: str) -> str:
        if not self.model:
            raise GeminiAPIError("Gemini model not initialized")

        prompt = f"""{SYSTEM_PROMPT}

{financial_context}

User Question: {user_question}

Please provide a helpful, personalized response based on the financial data above."""

        try:
            import google.generativeai as genai

            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            ]

            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "top_k": 40,
                    "max_output_tokens": 1024,
                },
                safety_settings=safety_settings,
            )

            usage = {}
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                usage = {
                    "prompt_tokens": getattr(response.usage_metadata, 'prompt_token_count', 0),
                    "candidates_tokens": getattr(response.usage_metadata, 'candidates_token_count', 0),
                    "total_tokens": getattr(response.usage_metadata, 'total_token_count', 0),
                }
                logger.info("gemini_request_success",
                            model=self.model_name,
                            prompt_tokens=usage.get("prompt_tokens"),
                            response_tokens=usage.get("candidates_tokens"),
                            total_tokens=usage.get("total_tokens"))
                self._last_usage = usage

            return response.text

        except Exception as e:
            error_str = str(e)
            status_code = getattr(e, 'status_code', None)

            if status_code == 429 or "429" in error_str or "Quota Exceeded" in error_str:
                logger.warning("gemini_quota_exceeded",
                               model=self.model_name,
                               error=error_str,
                               limit="GenerateRequestsPerDayPerProjectPerModel-FreeTier")
                raise GeminiQuotaError(f"Gemini API quota exceeded: {error_str}")
            elif "timeout" in error_str.lower():
                logger.warning("gemini_timeout",
                               model=self.model_name,
                               error=error_str)
                raise GeminiAPIError(f"Gemini API timeout: {error_str}")
            else:
                logger.error("gemini_request_failed",
                             model=self.model_name,
                             error=error_str)
                raise GeminiAPIError(f"Gemini API error: {error_str}", status_code=status_code)

    def is_available(self) -> bool:
        return self.model is not None and bool(settings.GEMINI_API_KEY)

    def check_connectivity(self) -> bool:
        if not self.model:
            return False
        try:
            import google.generativeai as genai
            self.model.generate_content("ping",
                                        generation_config={"max_output_tokens": 5},
                                        safety_settings=[])
            return True
        except Exception:
            return False

    def get_diagnostics(self) -> dict:
        api_key = settings.GEMINI_API_KEY
        api_key_loaded = bool(api_key)
        api_key_prefix = api_key[:6] + "..." if api_key and len(api_key) > 6 else ""

        connectivity = self.check_connectivity() if api_key_loaded else False

        return {
            "model": self.model_name,
            "api_key_loaded": api_key_loaded,
            "api_key_prefix": api_key_prefix,
            "gemini_connectivity": connectivity,
            "fallback_active": not api_key_loaded or not connectivity or not self.is_available(),
            "last_usage": self._last_usage,
        }

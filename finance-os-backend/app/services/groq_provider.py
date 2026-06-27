import hashlib
import structlog
import time
from datetime import datetime
from typing import Optional
from app.core.config import settings

logger = structlog.get_logger()

SYSTEM_PROMPT = """You are Arthya AI, a premium personal finance assistant.

Your responsibilities:
- Analyze expenses
- Suggest savings opportunities
- Explain debt repayment strategies
- Recommend budgeting improvements
- Predict spending trends
- Help users improve financial health

Always provide practical and actionable advice.
Use Indian Rupees (₹) for monetary values.
Keep responses concise, professional, and user-friendly."""


class GroqRateLimitError(Exception):
    def __init__(self, message: str = "Groq API rate limit exceeded"):
        self.message = message
        super().__init__(self.message)


class GroqAPIError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class GroqProvider:
    def __init__(self):
        self.client = None
        self.model_name = settings.AI_MODEL
        self._last_usage = {}
        self._cache = {}
        self._cache_ttl = 300
        self._init_client()

    def _init_client(self):
        try:
            from groq import Groq
            self.client = Groq(api_key=settings.GROQ_API_KEY)
            logger.info("groq_init_success", model=self.model_name)
        except Exception as e:
            logger.error("groq_init_failed", error=str(e))
            self.client = None

    def _cache_key(self, prompt: str) -> str:
        return hashlib.md5(prompt.encode()).hexdigest()

    def _check_cache(self, key: str) -> Optional[str]:
        if key in self._cache:
            entry = self._cache[key]
            if time.time() - entry["timestamp"] < self._cache_ttl:
                logger.info("groq_cache_hit", cache_key=key)
                return entry["response"]
            else:
                del self._cache[key]
        return None

    def _set_cache(self, key: str, response: str):
        self._cache[key] = {
            "response": response,
            "timestamp": time.time(),
        }

    def generate_response(self, user_question: str, financial_context: str) -> str:
        if not self.client:
            raise GroqAPIError("Groq client not initialized")

        prompt = f"""{SYSTEM_PROMPT}

{financial_context}

User Question: {user_question}

Please provide a helpful, personalized response based on the financial data above."""

        cache_key = self._cache_key(prompt)
        cached = self._check_cache(cache_key)
        if cached is not None:
            return cached

        logger.info("groq_request_started",
                    model=self.model_name,
                    question_preview=user_question[:60])

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"{financial_context}\n\nUser Question: {user_question}"},
                ],
                temperature=0.7,
                max_tokens=1024,
                top_p=0.9,
                stream=False,
                timeout=20,
            )

            answer = response.choices[0].message.content

            usage = {}
            if hasattr(response, 'usage') and response.usage:
                usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }
                logger.info("groq_request_success",
                            model=self.model_name,
                            prompt_tokens=usage.get("prompt_tokens"),
                            response_tokens=usage.get("completion_tokens"),
                            total_tokens=usage.get("total_tokens"))
                self._last_usage = usage

            self._set_cache(cache_key, answer)
            return answer

        except Exception as e:
            error_str = str(e)
            status_code = getattr(e, 'status_code', None)

            if status_code == 429 or "429" in error_str or "rate limit" in error_str.lower():
                logger.warning("groq_rate_limit_exceeded",
                               model=self.model_name,
                               error=error_str)
                raise GroqRateLimitError(f"Groq API rate limit exceeded: {error_str}")

            if "timeout" in error_str.lower():
                logger.warning("groq_timeout",
                               model=self.model_name,
                               error=error_str)
                raise GroqAPIError(f"Groq API timeout: {error_str}")

            logger.error("groq_request_failed",
                         model=self.model_name,
                         error=error_str)
            raise GroqAPIError(f"Groq API error: {error_str}", status_code=status_code)

    def is_available(self) -> bool:
        return self.client is not None and bool(settings.GROQ_API_KEY)

    def check_connectivity(self) -> bool:
        if not self.client:
            return False
        try:
            self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=5,
                timeout=10,
            )
            return True
        except Exception:
            return False

    def get_diagnostics(self) -> dict:
        api_key = settings.GROQ_API_KEY
        api_key_loaded = bool(api_key)
        api_key_prefix = api_key[:6] + "..." if api_key and len(api_key) > 6 else ""

        connectivity = self.check_connectivity() if api_key_loaded else False

        return {
            "model": self.model_name,
            "api_key_loaded": api_key_loaded,
            "api_key_prefix": api_key_prefix,
            "connectivity": connectivity,
            "fallback_active": not api_key_loaded or not connectivity or not self.is_available(),
            "last_usage": self._last_usage,
        }

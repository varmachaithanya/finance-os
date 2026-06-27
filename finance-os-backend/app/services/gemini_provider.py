import uuid
from typing import Union
from sqlalchemy.orm import Session
from app.core.config import settings
from app.services.financial_context_service import FinancialContextService

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


class GeminiProvider:
    def __init__(self):
        self.model = None
        self._init_model()

    def _init_model(self):
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel("gemini-2.0-flash")
        except Exception as e:
            import structlog
            logger = structlog.get_logger()
            logger.error("gemini_init_failed", error=str(e))
            self.model = None

    def generate_response(self, user_question: str, financial_context: str) -> str:
        if not self.model:
            return self._fallback_response()

        prompt = f"""{SYSTEM_PROMPT}

{financial_context}

User Question: {user_question}

Please provide a helpful, personalized response based on the financial data above."""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "top_k": 40,
                    "max_output_tokens": 1024,
                },
                safety_settings=[
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                ],
            )
            return response.text
        except Exception as e:
            import structlog
            logger = structlog.get_logger()
            logger.error("gemini_request_failed", error=str(e))
            return self._fallback_response()

    def _fallback_response(self) -> str:
        return (
            "I'm sorry, I'm having trouble connecting to my AI engine right now. "
            "Please try again in a moment. Your financial data is available and "
            "ready once I'm back online."
        )

    def is_available(self) -> bool:
        return self.model is not None and bool(settings.GEMINI_API_KEY)

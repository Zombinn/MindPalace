"""AI Gateway — unified LLM gateway with provider routing, template rendering, and structured output validation."""
import json
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional, Type

import jinja2
from loguru import logger
from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings
from app.models.domain import AICallLog
from app.models.ai_config import AIScene

settings = get_settings()


@dataclass
class AIProvider:
    id: int
    name: str
    base_url: str
    api_key: str  # decrypted
    default_model: str


@dataclass
class AISceneRoute:
    scene: AIScene
    provider_id: int
    model: str
    temperature: float = 0.7


@dataclass
class AICallResult:
    content: str
    parsed: Optional[BaseModel] = None
    model: str = ""
    usage: dict = field(default_factory=dict)
    latency_ms: float = 0


class AIStructuredOutputError(Exception):
    pass


async def _log_ai_call(scene: str, model: str, prompt: str, response: str, usage: dict, latency_ms: float, success: bool = True, error: str = ""):
    """Log AI call to database for observability (TD §4.4)."""
    try:
        from app.core.database import async_session
        async with async_session() as session:
            log = AICallLog(
                scene=scene, model=model, prompt=prompt[:8000], response=response[:8000],
                tokens_in=usage.get("prompt_tokens"), tokens_out=usage.get("completion_tokens"),
                latency_ms=round(latency_ms), success=success, error_message=error[:500] if error else None,
            )
            session.add(log)
            await session.commit()
    except Exception:
        pass  # never fail the main flow due to logging


class AIGateway:
    """Unified LLM gateway with scene routing, structured output, and retries."""

    def __init__(self):
        self._providers: dict[int, AIProvider] = {}
        self._routes: dict[AIScene, AISceneRoute] = {}
        self._templates: dict[str, str] = {}
        self._jinja = jinja2.Environment()
        self._default_client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY or "sk-placeholder",
            base_url=settings.OPENAI_BASE_URL,
        )

    async def reload(self, session):
        """Reload providers, routes, and templates from DB."""
        from sqlalchemy import select
        from app.models.ai_config import AIProvider as AIProviderModel, AISceneRoute as RouteModel, PromptTemplate

        rows = (await session.execute(select(AIProviderModel))).scalars().all()
        for p in rows:
            from app.core.crypto import decrypt
            self._providers[p.id] = AIProvider(
                id=p.id, name=p.name, base_url=p.base_url,
                api_key=decrypt(p.api_key_enc), default_model=p.default_model,
            )

        routes = (await session.execute(select(RouteModel))).scalars().all()
        self._routes = {}
        for r in routes:
            scene = AIScene(r.scene)
            self._routes[scene] = AISceneRoute(
                scene=scene, provider_id=r.provider_id,
                model=r.model, temperature=r.temperature or 0.7,
            )

        templates = (await session.execute(select(PromptTemplate))).scalars().all()
        self._templates = {t.scene: t.content for t in templates}

    def get_route(self, scene: AIScene) -> AISceneRoute:
        if scene in self._routes:
            return self._routes[scene]
        return AISceneRoute(
            scene=scene, provider_id=0, model=settings.DEFAULT_MODEL, temperature=0.7,
        )

    def get_client(self, route: AISceneRoute) -> AsyncOpenAI:
        provider = self._providers.get(route.provider_id)
        if provider:
            return AsyncOpenAI(api_key=provider.api_key, base_url=provider.base_url)
        return self._default_client

    def render_template(self, scene: AIScene, variables: dict) -> str:
        tmpl = self._templates.get(scene.value, "")
        if not tmpl:
            raise ValueError(f"No template found for scene {scene.value}")
        return self._jinja.from_string(tmpl).render(**variables)

    async def call(
        self,
        scene: AIScene,
        variables: dict,
        response_model: Optional[Type[BaseModel]] = None,
    ) -> AICallResult:
        route = self.get_route(scene)
        prompt = self.render_template(scene, variables)
        client = self.get_client(route)
        model = route.model or settings.DEFAULT_MODEL

        raw = ""
        usage = {}
        t0 = time.time()

        for attempt in range(3):
            try:
                resp = await client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=route.temperature - attempt * 0.1,
                    response_format={"type": "json_object"} if response_model else None,
                )
                raw = resp.choices[0].message.content or ""
                usage = resp.usage.model_dump() if resp.usage else {}
            except Exception as e:
                logger.warning(f"AI call attempt {attempt+1} failed: {e}")
                if attempt == 2:
                    raise
                continue

            if response_model is None:
                break

            try:
                parsed = response_model.model_validate_json(extract_json(raw))
                lat = (time.time() - t0) * 1000
                import asyncio
                asyncio.ensure_future(_log_ai_call(scene.value, model, prompt, raw, usage, lat, True))
                return AICallResult(
                    content=raw, parsed=parsed, model=model,
                    usage=usage, latency_ms=lat,
                )
            except (ValidationError, json.JSONDecodeError) as e:
                logger.warning(f"Structured output validation failed (attempt {attempt+1}): {e}")
                prompt = prompt + f"\n\nThe previous response had errors: {e}. Please return valid JSON matching the schema."
                if attempt == 2:
                    raise AIStructuredOutputError(f"Failed to get valid structured output after 3 attempts: {e}")

        lat = (time.time() - t0) * 1000
        import asyncio
        asyncio.ensure_future(_log_ai_call(scene.value, model, prompt, raw, usage, lat, True))
        return AICallResult(
            content=raw, model=model, usage=usage,
            latency_ms=lat,
        )


def extract_json(text: str) -> str:
    """Extract JSON from LLM output, handling markdown fences."""
    m = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if m:
        return m.group(1).strip()
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        return m.group(0)
    return text


# Singleton
ai_gateway = AIGateway()

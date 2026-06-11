"""FastAPI application entry point — MindPalace Personal Growth OS."""
import uuid
from contextlib import asynccontextmanager
from datetime import date
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger
from sqlalchemy import select, func

from app.core.config import get_settings
from app.core.database import engine, init_db, async_session
from app.models.ai_config import PromptTemplate
from app.prompts import (
    DEFAULT_DECOMPOSE_TEMPLATE, DEFAULT_EXAM_GEN_TEMPLATE,
    DEFAULT_EXAM_EVAL_TEMPLATE, DEFAULT_REDECOMPOSE_TEMPLATE,
    DEFAULT_SCRIPT_GEN_TEMPLATE,
)
from app.api.goals import router as goals_router
from app.api.tasks import router as tasks_router
from app.api.exams import router as exams_router
from app.api.notes import router as notes_router
from app.api.dashboard import router as dashboard_router
from app.api.settings import router as settings_router
from app.api.wrongbook import router as wrongbook_router
from app.api.career import router as career_router

class RequestIDMiddleware(BaseHTTPMiddleware):
    """Inject X-Request-ID header for request correlation."""
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_default_data()
    logger.info("MindPalace API started")
    yield
    await engine.dispose()


async def seed_default_data():
    async with async_session() as session:
        count = (await session.execute(select(func.count(PromptTemplate.id)))).scalar()
        if count and count > 0:
            return
        templates = [
            PromptTemplate(scene="decompose", name="Task Decomposition", is_builtin=True, content=DEFAULT_DECOMPOSE_TEMPLATE),
            PromptTemplate(scene="exam_gen", name="Exam Generation", is_builtin=True, content=DEFAULT_EXAM_GEN_TEMPLATE),
            PromptTemplate(scene="exam_eval", name="Exam Evaluation", is_builtin=True, content=DEFAULT_EXAM_EVAL_TEMPLATE),
            PromptTemplate(scene="redecompose", name="Redecomposition", is_builtin=True, content=DEFAULT_REDECOMPOSE_TEMPLATE),
            PromptTemplate(scene="script_gen", name="Script Generation", is_builtin=True, content=DEFAULT_SCRIPT_GEN_TEMPLATE),
        ]
        session.add_all(templates)
        await session.commit()
        logger.info("Seeded default prompt templates")


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan)

app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(goals_router)
app.include_router(tasks_router)
app.include_router(exams_router)
app.include_router(notes_router)
app.include_router(dashboard_router)
app.include_router(settings_router)
app.include_router(wrongbook_router)
app.include_router(career_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

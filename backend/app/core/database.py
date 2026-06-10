"""SQLAlchemy async engine, session factory, and Base."""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()
_FTS5_INITIALIZED = False

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    global _FTS5_INITIALIZED
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if not _FTS5_INITIALIZED:
            try:
                await conn.execute(text("CREATE VIRTUAL TABLE IF NOT EXISTS note_fts USING fts5(title, content, content='note', content_rowid='id')"))
                triggers = [
                    "CREATE TRIGGER IF NOT EXISTS note_fts_ai AFTER INSERT ON note BEGIN INSERT INTO note_fts(rowid, title, content) VALUES (new.id, new.title, new.content); END",
                    "CREATE TRIGGER IF NOT EXISTS note_fts_ad AFTER DELETE ON note BEGIN INSERT INTO note_fts(note_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content); END",
                    "CREATE TRIGGER IF NOT EXISTS note_fts_au AFTER UPDATE ON note BEGIN INSERT INTO note_fts(note_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content); INSERT INTO note_fts(rowid, title, content) VALUES (new.id, new.title, new.content); END",
                ]
                for t in triggers:
                    await conn.execute(text(t))
                await conn.execute(text("INSERT INTO note_fts(note_fts) VALUES('rebuild')"))
                _FTS5_INITIALIZED = True
            except Exception:
                pass

        # Performance indexes for common query patterns
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_goal_status ON goal(status)",
            "CREATE INDEX IF NOT EXISTS idx_stage_task_goal_status ON stage_task(goal_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_stage_task_status ON stage_task(status)",
            "CREATE INDEX IF NOT EXISTS idx_sub_task_stage_round ON sub_task(stage_task_id, round)",
            "CREATE INDEX IF NOT EXISTS idx_exam_stage_task ON exam(stage_task_id)",
            "CREATE INDEX IF NOT EXISTS idx_exam_question_exam ON exam_question(exam_id)",
            "CREATE INDEX IF NOT EXISTS idx_note_goal ON note(goal_id)",
            "CREATE INDEX IF NOT EXISTS idx_note_task ON note(stage_task_id)",
            "CREATE INDEX IF NOT EXISTS idx_script_run_script ON script_run(script_id, started_at)",
            "CREATE INDEX IF NOT EXISTS idx_learning_activity_date ON learning_activity(activity_date)",
            "CREATE INDEX IF NOT EXISTS idx_wrong_question_stage ON wrong_question_book(stage_task_id)",
        ]
        for idx in indexes:
            try:
                await conn.execute(text(idx))
            except Exception:
                pass

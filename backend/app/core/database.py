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

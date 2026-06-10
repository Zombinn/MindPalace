from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.domain import Note
from app.schemas import NoteCreate, NoteUpdate
from app.api.helpers import get_or_404, note_to_dict

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("")
async def list_notes(
    goal_id: Optional[int] = None,
    task_id: Optional[int] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    if q:
        # Use FTS5 full-text search
        result = await db.execute(
            text("SELECT n.* FROM note n JOIN note_fts f ON n.id = f.rowid WHERE note_fts MATCH :query AND n.deleted_at IS NULL ORDER BY rank LIMIT 100"),
            {"query": q}
        )
        rows = result.fetchall()
        notes = []
        for row in rows:
            n = Note(id=row[0], title=row[1], content=row[2], goal_id=row[3], stage_task_id=row[4],
                     sub_task_id=row[5], tags=row[6], deleted_at=row[7], created_at=row[8], updated_at=row[9])
            notes.append(n)
    else:
        query = select(Note).where(Note.deleted_at.is_(None))
        if goal_id:
            query = query.where(Note.goal_id == goal_id)
        if task_id:
            query = query.where(Note.stage_task_id == task_id)
        query = query.order_by(Note.created_at.desc())
        notes = (await db.execute(query)).scalars().all()

    return [note_to_dict(n) for n in notes]


@router.post("")
async def create_note(data: NoteCreate, db: AsyncSession = Depends(get_db)):
    n = Note(**data.model_dump())
    db.add(n)
    await db.commit()
    await db.refresh(n)
    # Track activity
    from app.models.domain import LearningActivity
    _track_activity(db, date.today(), 'note_created')
    return note_to_dict(n)


@router.get("/{note_id}")
async def get_note(note_id: int, db: AsyncSession = Depends(get_db)):
    n = await get_or_404(db, Note, note_id)
    return note_to_dict(n)


@router.patch("/{note_id}")
async def update_note(note_id: int, data: NoteUpdate, db: AsyncSession = Depends(get_db)):
    n = await get_or_404(db, Note, note_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(n, k, v)
    n.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(n)
    return note_to_dict(n)


@router.delete("/{note_id}")
async def delete_note(note_id: int, db: AsyncSession = Depends(get_db)):
    n = await get_or_404(db, Note, note_id)
    n.deleted_at = datetime.utcnow()
    await db.commit()
    return {"ok": True}


async def _track_activity(db: AsyncSession, activity_date, activity_type: str):
    """Upsert daily learning activity counter."""
    from sqlalchemy import update
    from app.models.domain import LearningActivity
    existing = (await db.execute(
        select(LearningActivity).where(
            LearningActivity.activity_date == activity_date,
            LearningActivity.activity_type == activity_type
        )
    )).scalar_one_or_none()
    if existing:
        existing.count = (existing.count or 0) + 1
    else:
        db.add(LearningActivity(activity_date=activity_date, activity_type=activity_type, count=1))
    await db.commit()

"""Wrong-question book — cross-task aggregation of wrong answers."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.domain import WrongQuestionBook, ExamQuestion, StageTask
from app.api.helpers import get_or_404

router = APIRouter(prefix="/api/wrongbook", tags=["wrongbook"])


@router.get("")
async def list_wrong_questions(
    tag: str | None = None,
    reviewed: bool | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(WrongQuestionBook).order_by(WrongQuestionBook.created_at.desc())
    if tag:
        query = query.where(WrongQuestionBook.knowledge_tags.contains([tag]))
    if reviewed is not None:
        query = query.where(WrongQuestionBook.reviewed == reviewed)
    items = (await db.execute(query)).scalars().all()
    return [_wrongbook_to_dict(w) for w in items]


@router.patch("/{item_id}")
async def review_wrong_question(item_id: int, db: AsyncSession = Depends(get_db)):
    w = await get_or_404(db, WrongQuestionBook, item_id)
    from datetime import datetime
    w.reviewed = True
    w.reviewed_at = datetime.utcnow()
    await db.commit()
    return _wrongbook_to_dict(w)


@router.get("/tags")
async def wrongbook_tags(db: AsyncSession = Depends(get_db)):
    items = (await db.execute(select(WrongQuestionBook))).scalars().all()
    tag_counts: dict[str, int] = {}
    for item in items:
        for t in (item.knowledge_tags or []):
            tag_counts[t] = tag_counts.get(t, 0) + 1
    return sorted(tag_counts.items(), key=lambda x: -x[1])


@router.get("/stats")
async def wrongbook_stats(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(WrongQuestionBook))).scalars().all()
    reviewed = sum(1 for w in total if w.reviewed)
    return {"total": len(total), "reviewed": reviewed, "unreviewed": len(total) - reviewed}


def _wrongbook_to_dict(w: WrongQuestionBook) -> dict:
    return {
        "id": w.id, "exam_question_id": w.exam_question_id, "stage_task_id": w.stage_task_id,
        "knowledge_tags": w.knowledge_tags, "question": w.question, "user_answer": w.user_answer,
        "correct_notes": w.correct_notes, "reviewed": w.reviewed,
        "reviewed_at": str(w.reviewed_at) if w.reviewed_at else None,
        "created_at": str(w.created_at),
    }

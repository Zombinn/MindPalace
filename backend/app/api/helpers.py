from datetime import date, datetime
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import Goal, StageTask, SubTask, Exam, ExamQuestion, Note


async def get_or_404(db: AsyncSession, model, id_):
    obj = (await db.execute(select(model).where(model.id == id_))).scalar_one_or_none()
    if not obj:
        raise HTTPException(404, f"{model.__name__} not found")
    return obj


async def recalc_progress(db: AsyncSession, task_id: int):
    subs = (await db.execute(select(SubTask).where(SubTask.stage_task_id == task_id))).scalars().all()
    if not subs:
        return
    done = sum(1 for s in subs if s.status in ("done", "mastered"))
    task = (await db.execute(select(StageTask).where(StageTask.id == task_id))).scalar_one_or_none()
    if task:
        task.progress = done / len(subs)
        await db.commit()


async def track_activity(db: AsyncSession, activity_date, activity_type: str):
    """Record a daily learning activity."""
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


def _fmt(obj, fields, converters=None):
    converters = converters or {}
    d = {}
    for f in fields:
        val = getattr(obj, f, None)
        if val is not None and f in converters:
            val = converters[f](val)
        d[f] = val
    return d


def goal_to_dict(g: Goal) -> dict:
    return _fmt(g, ["id", "name", "description", "start_date", "end_date", "priority", "status", "created_at", "updated_at"],
                {"start_date": str, "end_date": str, "created_at": str, "updated_at": str})


def task_to_dict(t: StageTask) -> dict:
    d = _fmt(t, ["id", "goal_id", "title", "objective", "start_date", "end_date", "status", "progress", "exam_config", "delay_count", "max_delays", "round", "created_at", "updated_at"],
             {"start_date": str, "end_date": str, "created_at": str, "updated_at": str})
    d["is_overdue"] = bool(t.end_date and date.today() > t.end_date and t.status not in ("passed", "force_closed"))
    return d


def subtask_to_dict(s: SubTask) -> dict:
    return _fmt(s, ["id", "stage_task_id", "title", "content", "knowledge_tags", "order_index", "est_hours", "status", "origin", "round", "locked", "done_at"], {"done_at": str})


def exam_to_dict(e: Exam) -> dict:
    return _fmt(e, ["id", "stage_task_id", "round", "status", "total_score", "pass_score", "passed", "ai_summary", "human_reviewed", "created_at"], {"created_at": str})


def question_to_dict(q: ExamQuestion) -> dict:
    return _fmt(q, ["id", "exam_id", "qtype", "question", "options", "rubric", "knowledge_tags", "max_score", "answer_text", "ai_score", "ai_feedback", "human_score", "override_reason"])


def note_to_dict(n: Note) -> dict:
    return _fmt(n, ["id", "title", "content", "goal_id", "stage_task_id", "sub_task_id", "tags", "created_at", "updated_at"], {"created_at": str, "updated_at": str})

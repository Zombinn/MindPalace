from datetime import date, timedelta, datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.domain import Goal, StageTask, Exam, ExamQuestion, LearningActivity
from app.api.helpers import task_to_dict

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(db: AsyncSession = Depends(get_db)):
    goals = (await db.execute(select(Goal).where(Goal.status.in_(["pending", "active"])))).scalars().all()
    tasks = (await db.execute(select(StageTask).where(StageTask.status.notin_(["passed", "force_closed"])))).scalars().all()
    today = date.today()
    due_tasks = [t for t in tasks if t.end_date and t.end_date <= today and t.status != "passed"]
    in_progress = [t for t in tasks if t.status == "in_progress"]
    exam_pending = [t for t in tasks if t.status == "exam_pending"]

    recent_exams = (await db.execute(select(Exam).order_by(Exam.created_at.desc()).limit(20))).scalars().all()
    weak_tags: dict[str, int] = {}
    for exam in recent_exams:
        if exam.passed is False:
            qs = (await db.execute(select(ExamQuestion).where(ExamQuestion.exam_id == exam.id))).scalars().all()
            for q in qs:
                for tag in (q.knowledge_tags or []):
                    weak_tags[tag] = weak_tags.get(tag, 0) + 1

    return {
        "goals_active": len(goals),
        "tasks_in_progress": len(in_progress),
        "tasks_exam_pending": len(exam_pending),
        "tasks_due_today": len(due_tasks),
        "delay_count": sum(t.delay_count or 0 for t in tasks),
        "weak_points": sorted(weak_tags.items(), key=lambda x: -x[1])[:10],
        "due_tasks": [task_to_dict(t) for t in due_tasks[:5]],
    }


@router.get("/weak-points")
async def weak_points(db: AsyncSession = Depends(get_db)):
    exams = (await db.execute(select(Exam).order_by(Exam.created_at.desc()).limit(50))).scalars().all()
    weak_tags: dict[str, dict] = {}
    for exam in exams:
        qs = (await db.execute(select(ExamQuestion).where(ExamQuestion.exam_id == exam.id))).scalars().all()
        for q in qs:
            score = q.human_score if q.human_score is not None else (q.ai_score or 0)
            for tag in (q.knowledge_tags or []):
                if tag not in weak_tags:
                    weak_tags[tag] = {"count": 0, "total_score": 0.0, "max_score": 0.0}
                weak_tags[tag]["count"] += 1
                weak_tags[tag]["total_score"] += score
                weak_tags[tag]["max_score"] += q.max_score

    result = []
    for tag, data in sorted(weak_tags.items(), key=lambda x: -x[1]["count"]):
        avg = data["total_score"] / data["max_score"] * 100 if data["max_score"] > 0 else 0
        result.append({"tag": tag, "count": data["count"], "avg_score_pct": round(avg, 1)})
    return result


@router.get("/heatmap")
async def heatmap(days: int = 30, db: AsyncSession = Depends(get_db)):
    """Return daily activity counts for the last N days."""
    since = date.today() - timedelta(days=days)
    rows = (await db.execute(
        select(LearningActivity.activity_date, func.sum(LearningActivity.count))
        .where(LearningActivity.activity_date >= since)
        .group_by(LearningActivity.activity_date)
        .order_by(LearningActivity.activity_date)
    )).all()
    data = {str(row[0]): int(row[1]) for row in rows}
    # Fill empty days
    result = []
    for i in range(days):
        d = since + timedelta(days=i)
        ds = str(d)
        result.append({"date": ds, "count": data.get(ds, 0), "is_today": d == date.today()})
    return result


@router.get("/weekly-report")
async def weekly_report(db: AsyncSession = Depends(get_db)):
    """Generate a weekly learning summary (data only; AI summary is frontend-triggered)."""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    # Activities this week
    rows = (await db.execute(
        select(func.sum(LearningActivity.count))
        .where(LearningActivity.activity_date >= week_start, LearningActivity.activity_date <= week_end)
    )).scalar() or 0

    # Completed subtasks this week
    from app.models.domain import SubTask
    subtasks_done = (await db.execute(
        select(func.count(SubTask.id))
        .where(SubTask.done_at >= datetime.combine(week_start, datetime.min.time()),
               SubTask.status.in_(["done", "mastered"]))
    )).scalar() or 0

    # Notes created
    from app.models.domain import Note
    notes_count = (await db.execute(
        select(func.count(Note.id))
        .where(Note.created_at >= datetime.combine(week_start, datetime.min.time()),
               Note.deleted_at.is_(None))
    )).scalar() or 0

    # Exams taken
    exams_count = (await db.execute(
        select(func.count(Exam.id))
        .where(Exam.created_at >= datetime.combine(week_start, datetime.min.time()))
    )).scalar() or 0

    # Exams passed
    exams_passed = (await db.execute(
        select(func.count(Exam.id))
        .where(Exam.created_at >= datetime.combine(week_start, datetime.min.time()), Exam.passed == True)
    )).scalar() or 0

    # Weak points this week
    recent_exams = (await db.execute(
        select(Exam).where(Exam.created_at >= datetime.combine(week_start, datetime.min.time()))
    )).scalars().all()
    weak_tags = {}
    for exam in recent_exams:
        qs = (await db.execute(select(ExamQuestion).where(ExamQuestion.exam_id == exam.id))).scalars().all()
        for q in qs:
            score = q.human_score if q.human_score is not None else (q.ai_score or 0)
            if score < q.max_score * 0.6:
                for tag in (q.knowledge_tags or []):
                    weak_tags[tag] = weak_tags.get(tag, 0) + 1

    return {
        "week_start": str(week_start),
        "week_end": str(week_end),
        "activities": int(rows),
        "subtasks_completed": subtasks_done,
        "notes_created": notes_count,
        "exams_taken": exams_count,
        "exams_passed": exams_passed,
        "weak_points_this_week": sorted(weak_tags.items(), key=lambda x: -x[1])[:5],
    }

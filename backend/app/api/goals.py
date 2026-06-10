from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.domain import Goal, StageTask, Note
from app.schemas import GoalCreate, GoalUpdate
from app.api.helpers import goal_to_dict, task_to_dict, note_to_dict, get_or_404

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.get("")
async def list_goals(db: AsyncSession = Depends(get_db)):
    goals = (await db.execute(select(Goal).order_by(Goal.created_at.desc()))).scalars().all()
    return [goal_to_dict(g) for g in goals]


@router.post("")
async def create_goal(data: GoalCreate, db: AsyncSession = Depends(get_db)):
    g = Goal(**data.model_dump())
    db.add(g)
    await db.commit()
    await db.refresh(g)
    return goal_to_dict(g)


@router.get("/{goal_id}")
async def get_goal(goal_id: int, db: AsyncSession = Depends(get_db)):
    g = await get_or_404(db, Goal, goal_id)
    d = goal_to_dict(g)
    tasks = (await db.execute(select(StageTask).where(StageTask.goal_id == goal_id).order_by(StageTask.created_at.desc()))).scalars().all()
    d["tasks"] = [task_to_dict(t) for t in tasks]
    notes = (await db.execute(select(Note).where(Note.goal_id == goal_id, Note.deleted_at.is_(None)).order_by(Note.created_at.desc()))).scalars().all()
    d["notes"] = [note_to_dict(n) for n in notes]
    return d


@router.patch("/{goal_id}")
async def update_goal(goal_id: int, data: GoalUpdate, db: AsyncSession = Depends(get_db)):
    g = await get_or_404(db, Goal, goal_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(g, k, v)
    await db.commit()
    await db.refresh(g)
    return goal_to_dict(g)


@router.delete("/{goal_id}")
async def archive_goal(goal_id: int, db: AsyncSession = Depends(get_db)):
    g = await get_or_404(db, Goal, goal_id)
    g.status = "archived"
    await db.commit()
    return {"ok": True}

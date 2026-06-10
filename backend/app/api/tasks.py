from datetime import datetime as dt
from fastapi import APIRouter, Depends
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.ai_gateway import ai_gateway
from app.models.domain import Goal, StageTask, SubTask, Note
from app.models.ai_config import AIScene
from app.schemas import StageTaskCreate, StageTaskUpdate, SubTaskUpdate, SubTaskBatchConfirm, DecomposeResponse
from app.api.helpers import get_or_404, task_to_dict, subtask_to_dict, note_to_dict, recalc_progress

router = APIRouter(tags=["tasks"])


@router.get("/api/goals/{goal_id}/tasks")
async def list_tasks(goal_id: int, db: AsyncSession = Depends(get_db)):
    tasks = (await db.execute(select(StageTask).where(StageTask.goal_id == goal_id).order_by(StageTask.created_at.desc()))).scalars().all()
    return [task_to_dict(t) for t in tasks]


@router.post("/api/goals/{goal_id}/tasks")
async def create_task(goal_id: int, data: StageTaskCreate, db: AsyncSession = Depends(get_db)):
    _ = await get_or_404(db, Goal, goal_id)
    t = StageTask(goal_id=goal_id, **data.model_dump())
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return task_to_dict(t)


@router.get("/api/tasks/{task_id}")
async def get_task(task_id: int, db: AsyncSession = Depends(get_db)):
    t = await get_or_404(db, StageTask, task_id)
    d = task_to_dict(t)
    subs = (await db.execute(select(SubTask).where(SubTask.stage_task_id == task_id).order_by(SubTask.order_index))).scalars().all()
    d["subtasks"] = [subtask_to_dict(s) for s in subs]
    notes = (await db.execute(select(Note).where(Note.stage_task_id == task_id, Note.deleted_at.is_(None)).order_by(Note.created_at.desc()))).scalars().all()
    d["notes"] = [note_to_dict(n) for n in notes]
    return d


@router.patch("/api/tasks/{task_id}")
async def update_task(task_id: int, data: StageTaskUpdate, db: AsyncSession = Depends(get_db)):
    t = await get_or_404(db, StageTask, task_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    await db.commit()
    await db.refresh(t)
    return task_to_dict(t)


@router.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    t = await get_or_404(db, StageTask, task_id)
    await db.delete(t)
    await db.commit()
    return {"ok": True}


@router.post("/api/tasks/{task_id}/decompose")
async def decompose_task(task_id: int, db: AsyncSession = Depends(get_db)):
    t = await get_or_404(db, StageTask, task_id)
    existing = (await db.execute(select(SubTask).where(SubTask.stage_task_id == task_id, SubTask.status != "mastered"))).scalars().all()

    await ai_gateway.reload(db)
    result = await ai_gateway.call(
        AIScene.decompose,
        {
            "objective": t.objective or t.title,
            "title": t.title,
            "start_date": str(t.start_date or ""),
            "end_date": str(t.end_date or ""),
            "existing_subtasks": "\n".join(f"- {s.title} [{s.status}]" for s in existing),
        },
        DecomposeResponse,
    )
    return {"draft": result.parsed.model_dump() if result.parsed else {"subtasks": []}, "raw": result.content}


@router.post("/api/tasks/{task_id}/subtasks:confirm")
async def confirm_subtasks(task_id: int, data: SubTaskBatchConfirm, db: AsyncSession = Depends(get_db)):
    t = await get_or_404(db, StageTask, task_id)
    await db.execute(delete(SubTask).where(SubTask.stage_task_id == task_id, SubTask.status != "mastered"))
    for i, s in enumerate(data.subtasks):
        st = SubTask(stage_task_id=task_id, order_index=i)
        for k, v in s.model_dump().items():
            setattr(st, k, v)
        db.add(st)
    await db.commit()
    return {"ok": True, "count": len(data.subtasks)}


@router.patch("/api/subtasks/{subtask_id}")
async def update_subtask(subtask_id: int, data: SubTaskUpdate, db: AsyncSession = Depends(get_db)):
    s = await get_or_404(db, SubTask, subtask_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    if data.status == "done":
        s.done_at = dt.utcnow()
    await db.commit()
    await recalc_progress(db, s.stage_task_id)
    from app.api.helpers import track_activity
    if data.status == 'done':
        await track_activity(db, date.today(), 'subtask_done')
    return subtask_to_dict(s)

# Activity tracking patch — appended to existing tasks.py
# The update_subtask function already exists; we patch it at runtime.
# Main tracking is handled by tracking middleware in the app.

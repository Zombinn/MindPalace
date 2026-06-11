"""Career pipeline API — job applications, pipeline inbox, and config."""

from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.career import JobApplication, PipelineItem, CareerConfig, CANONICAL_STATES

router = APIRouter(prefix="/api/career", tags=["career"])


# ── Job Applications ────────────────────────────────────────────────

@router.get("/jobs")
async def list_jobs(status: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(JobApplication).order_by(JobApplication.updated_at.desc())
    if status:
        query = query.where(JobApplication.status == status)
    jobs = (await db.execute(query)).scalars().all()
    return [j.to_dict() for j in jobs]


@router.post("/jobs")
async def create_job(data: dict, db: AsyncSession = Depends(get_db)):
    j = JobApplication(
        company=data.get("company", ""),
        role=data.get("role", ""),
        url=data.get("url", ""),
        status=data.get("status", "evaluated"),
        score=data.get("score"),
        location=data.get("location"),
        notes=data.get("notes"),
        tags=data.get("tags", []),
        pipeline_data=data.get("pipeline_data"),
        applied_date=data.get("applied_date"),
    )
    db.add(j)
    await db.commit()
    await db.refresh(j)
    return j.to_dict()


@router.get("/jobs/{job_id}")
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    j = (await db.execute(select(JobApplication).where(JobApplication.id == job_id))).scalar_one_or_none()
    if not j:
        raise HTTPException(404, "Job not found")
    return j.to_dict()


@router.patch("/jobs/{job_id}")
async def update_job(job_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    j = (await db.execute(select(JobApplication).where(JobApplication.id == job_id))).scalar_one_or_none()
    if not j:
        raise HTTPException(404, "Job not found")
    for k, v in data.items():
        if hasattr(j, k):
            setattr(j, k, v)
    j.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(j)
    return j.to_dict()


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db)):
    j = (await db.execute(select(JobApplication).where(JobApplication.id == job_id))).scalar_one_or_none()
    if not j:
        raise HTTPException(404, "Job not found")
    await db.delete(j)
    await db.commit()
    return {"ok": True}


# ── Pipeline Inbox ──────────────────────────────────────────────────

@router.get("/pipeline")
async def list_pipeline(status: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(PipelineItem).order_by(PipelineItem.created_at.desc())
    if status:
        query = query.where(PipelineItem.status == status)
    items = (await db.execute(query)).scalars().all()
    return [i.to_dict() for i in items]


@router.post("/pipeline")
async def add_pipeline_item(data: dict, db: AsyncSession = Depends(get_db)):
    item = PipelineItem(url=data.get("url", ""), company=data.get("company"), role=data.get("role"))
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item.to_dict()


@router.delete("/pipeline/{item_id}")
async def delete_pipeline_item(item_id: int, db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(PipelineItem).where(PipelineItem.id == item_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Pipeline item not found")
    await db.delete(item)
    await db.commit()
    return {"ok": True}


# ── Config ──────────────────────────────────────────────────────────

@router.get("/config/{key}")
async def get_config(key: str, db: AsyncSession = Depends(get_db)):
    cfg = (await db.execute(select(CareerConfig).where(CareerConfig.key == key))).scalar_one_or_none()
    if not cfg:
        return {"key": key, "value": None}
    return cfg.to_dict()


@router.put("/config/{key}")
async def set_config(key: str, data: dict, db: AsyncSession = Depends(get_db)):
    cfg = (await db.execute(select(CareerConfig).where(CareerConfig.key == key))).scalar_one_or_none()
    if cfg:
        cfg.value = data.get("value")
    else:
        cfg = CareerConfig(key=key, value=data.get("value"))
        db.add(cfg)
    await db.commit()
    await db.refresh(cfg)
    return cfg.to_dict()


# ── Stats ───────────────────────────────────────────────────────────

@router.get("/stats")
async def career_stats(db: AsyncSession = Depends(get_db)):
    jobs = (await db.execute(select(JobApplication))).scalars().all()
    by_status = {}
    for j in jobs:
        by_status[j.status] = by_status.get(j.status, 0) + 1
    scores = [j.score for j in jobs if j.score is not None]
    pipeline_items = (await db.execute(select(func.count(PipelineItem.id)).where(PipelineItem.status == "pending"))).scalar()
    return {
        "total": len(jobs),
        "by_status": by_status,
        "avg_score": round(sum(scores) / len(scores), 1) if scores else None,
        "pipeline_pending": pipeline_items or 0,
    }


# ── States reference ────────────────────────────────────────────────

@router.get("/states")
async def list_states():
    labels = {
        "evaluated": "Evaluated", "applied": "Applied", "responded": "Responded",
        "interview": "Interview", "offer": "Offer",
        "rejected": "Rejected", "discarded": "Discarded", "skip": "SKIP",
    }
    dag = {
        "evaluated": ["applied", "discarded", "skip"],
        "applied": ["responded", "rejected"],
        "responded": ["interview", "rejected", "discarded"],
        "interview": ["offer", "rejected", "discarded"],
        "offer": ["rejected", "discarded"],
        "rejected": [],
        "discarded": [],
        "skip": [],
    }
    return [{"id": s, "label": labels.get(s, s), "next_states": dag.get(s, [])} for s in CANONICAL_STATES]

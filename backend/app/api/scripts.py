"""Scripts CRUD + generate + run."""
from fastapi import APIRouter, Depends, HTTPException
import asyncio
import re
import sys

def _strip_code_fences(code: str) -> str:
    """Remove markdown code fences like ```python ... ``` from script code."""
    m = re.search(r'```(?:python)?\s*\n(.*?)\n```', code, re.DOTALL)
    if m:
        return m.group(1).strip()
    return code
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.ai_gateway import ai_gateway, AIScene
from app.models.domain import Script, ScriptRun

router = APIRouter(prefix="/api/scripts", tags=["scripts"])

class ScriptCreate(BaseModel):
    name: str
    requirement: Optional[str] = ""
    code: Optional[str] = ""
    cron_expr: Optional[str] = None

class ScriptUpdate(BaseModel):
    name: Optional[str] = None
    requirement: Optional[str] = None
    code: Optional[str] = None
    cron_expr: Optional[str] = None
    enabled: Optional[bool] = None

class ScriptGenerate(BaseModel):
    requirement: str


@router.get("")
async def list_scripts(db: AsyncSession = Depends(get_db)):
    scripts = (await db.execute(select(Script).order_by(Script.created_at.desc()))).scalars().all()
    return [{
        "id": s.id, "name": s.name, "requirement": s.requirement,
        "code": s.code, "version": s.version, "cron_expr": s.cron_expr,
        "enabled": s.enabled, "created_at": str(s.created_at) if s.created_at else None,
    } for s in scripts]


@router.post("")
async def create_script(data: ScriptCreate, db: AsyncSession = Depends(get_db)):
    s = Script(**data.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return {"id": s.id, "name": s.name}


@router.patch("/{script_id}")
async def update_script(script_id: int, data: ScriptUpdate, db: AsyncSession = Depends(get_db)):
    s = (await db.execute(select(Script).where(Script.id == script_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Script not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await db.commit()
    return {"ok": True}


@router.delete("/{script_id}")
async def delete_script(script_id: int, db: AsyncSession = Depends(get_db)):
    s = (await db.execute(select(Script).where(Script.id == script_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Script not found")
    await db.delete(s)
    await db.commit()
    return {"ok": True}


@router.post("/generate")
async def generate_script(data: ScriptGenerate, db: AsyncSession = Depends(get_db)):
    await ai_gateway.reload(db)
    try:
        result = await ai_gateway.call(
            AIScene.script_gen,
            {"requirement": data.requirement},
        )
        code = _strip_code_fences(result.content)
        return {"code": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{script_id}/run")
async def run_script(script_id: int, db: AsyncSession = Depends(get_db)):
    s = (await db.execute(select(Script).where(Script.id == script_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Script not found")
    from datetime import datetime
    import subprocess, tempfile, os
    run = ScriptRun(script_id=script_id, trigger="manual", status="running", started_at=datetime.utcnow())
    db.add(run)
    await db.commit()
    await db.refresh(run)
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            clean_code = _strip_code_fences(s.code)
            f.write(clean_code)
            tmp_path = f.name
        proc = await asyncio.create_subprocess_exec(
            "/usr/bin/python3", tmp_path,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=s.timeout_sec or 30)
        except asyncio.TimeoutError:
            proc.kill()
            stdout, stderr = await proc.communicate()
            run.status = "timeout"
        else:
            run.status = "success" if proc.returncode == 0 else "failed"
        run.stdout = stdout.decode('utf-8', errors='replace')[:50000] if stdout else None
        run.stderr = stderr.decode('utf-8', errors='replace')[:50000] if stderr else None
        run.finished_at = datetime.utcnow()
        os.unlink(tmp_path)
    except Exception as e:
        run.status = "failed"
        run.stderr = str(e)
        run.finished_at = datetime.utcnow()
    await db.commit()
    return {"ok": True, "run_id": run.id, "status": run.status, "stdout": run.stdout, "stderr": run.stderr}


@router.get("/{script_id}/runs")
async def list_runs(script_id: int, page: int = 1, page_size: int = 10, db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * page_size
    total = (await db.execute(
        select(func.count(ScriptRun.id)).where(ScriptRun.script_id == script_id)
    )).scalar() or 0
    runs = (await db.execute(
        select(ScriptRun).where(ScriptRun.script_id == script_id)
        .order_by(ScriptRun.started_at.desc())
        .offset(offset).limit(page_size)
    )).scalars().all()
    return {
        "items": [{
            "id": r.id, "trigger": r.trigger, "status": r.status,
            "started_at": str(r.started_at) if r.started_at else None,
            "finished_at": str(r.finished_at) if r.finished_at else None,
            "stdout": r.stdout, "stderr": r.stderr,
        } for r in runs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.delete("/{script_id}/runs/{run_id}")
async def delete_run(script_id: int, run_id: int, db: AsyncSession = Depends(get_db)):
    r = (await db.execute(select(ScriptRun).where(ScriptRun.id == run_id, ScriptRun.script_id == script_id))).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Run not found")
    await db.delete(r)
    await db.commit()
    return {"ok": True}

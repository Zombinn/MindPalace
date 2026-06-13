"""Scripts CRUD + generate + run — streaming log support."""
from fastapi import APIRouter, Depends, HTTPException
import asyncio
import re
import sys

def _strip_code_fences(code: str) -> str:
    m = re.search(r'```(?:python)?\s*\n(.*?)\n```', code, re.DOTALL)
    if m:
        return m.group(1).strip()
    return code
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db, async_session
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
    run_id = run.id
    timeout = s.timeout_sec or 300

    async def _bg_execute():
        buf_stdout = ""
        buf_stderr = ""
        last_update = asyncio.get_event_loop().time()

        async def _flush_logs(force: bool = False):
            nonlocal buf_stdout, buf_stderr, last_update
            now = asyncio.get_event_loop().time()
            if not force and now - last_update < 1.0:
                return
            last_update = now
            async with async_session() as bg_db:
                r = (await bg_db.execute(select(ScriptRun).where(ScriptRun.id == run_id))).scalar_one_or_none()
                if r:
                    if buf_stdout:
                        r.stdout = (r.stdout or "") + buf_stdout
                        r.stdout = r.stdout[-100000:]  # keep last 100KB
                    if buf_stderr:
                        r.stderr = (r.stderr or "") + buf_stderr
                        r.stderr = r.stderr[-100000:]
                    await bg_db.commit()
                buf_stdout = ""
                buf_stderr = ""

        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                clean_code = _strip_code_fences(s.code)
                f.write(clean_code)
                tmp_path = f.name
            proc = await asyncio.create_subprocess_exec(
                "/opt/homebrew/bin/python3.12", tmp_path,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )

            async def _read_stream(stream, out_buf_name):
                nonlocal buf_stdout, buf_stderr
                while True:
                    try:
                        line = await asyncio.wait_for(stream.readline(), timeout=1.0)
                    except asyncio.TimeoutError:
                        line = None
                    if line:
                        decoded = line.decode('utf-8', errors='replace')
                        if out_buf_name == 'stdout':
                            buf_stdout += decoded
                        else:
                            buf_stderr += decoded
                        await _flush_logs()
                    elif line == b'' or line is None:
                        # Empty line is still progress; but End-of-file is b''
                        if line == b'':
                            break
                        # Timeout with no data — flush anyway
                        await _flush_logs()
                    else:
                        break

            read_stdout = asyncio.create_task(_read_stream(proc.stdout, 'stdout'))
            read_stderr = asyncio.create_task(_read_stream(proc.stderr, 'stderr'))

            try:
                await asyncio.wait_for(
                    asyncio.gather(read_stdout, read_stderr),
                    timeout=timeout
                )
                await proc.wait()
                status = "success" if proc.returncode == 0 else "failed"
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                status = "timeout"

            await _flush_logs(force=True)
            os.unlink(tmp_path)
        except Exception as e:
            status = "failed"
            buf_stderr += f"\n[FATAL] {e}"
            await _flush_logs(force=True)

        # Final status update
        async with async_session() as bg_db:
            r = (await bg_db.execute(select(ScriptRun).where(ScriptRun.id == run_id))).scalar_one_or_none()
            if r:
                r.status = status
                r.finished_at = datetime.utcnow()
                await bg_db.commit()

    asyncio.create_task(_bg_execute())
    return {"ok": True, "run_id": run_id, "status": "running"}


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

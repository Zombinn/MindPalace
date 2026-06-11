"""Script sandbox runner — polls script_run queue and executes in Docker containers (TD §4.5)."""

import asyncio
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import select
from app.core.database import async_session, init_db
from app.models.domain import Script, ScriptRun
from loguru import logger

POLL_INTERVAL = 5  # seconds
RUN_DIR = Path(__file__).resolve().parent / "script_runs"


async def execute_script(run: ScriptRun, script: Script):
    """Run a script in a Docker sandbox container."""
    run_dir = RUN_DIR / str(run.id)
    run_dir.mkdir(parents=True, exist_ok=True)

    # Write script to workspace
    script_path = run_dir / "script.py"
    script_path.write_text(script.code)

    cmd = [
        "docker", "run", "--rm",
        "--memory", "512m", "--cpus", "1",
        "--network", "none",
        "--read-only",
        "-v", f"{run_dir}:/workspace:rw",
        "--pids-limit", "128",
        "python:3.12-slim",
        "timeout", str(script.timeout_sec or 300),
        "python", "/workspace/script.py",
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        run.stdout = stdout.decode(errors="replace")[:50000]
        run.stderr = stderr.decode(errors="replace")[:50000]
        run.status = "success" if proc.returncode == 0 else "failed"
    except FileNotFoundError:
        # Docker not available — fallback to direct execution (dev mode)
        logger.warning("Docker not found; running script directly in subprocess (unsandboxed)")
        try:
            proc = await asyncio.create_subprocess_exec(
                sys.executable, str(script_path),
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.create_task(asyncio.wait_for(
                proc.communicate(), timeout=script.timeout_sec or 300,
            ))
            run.stdout = stdout.decode(errors="replace")[:50000]
            run.stderr = stderr.decode(errors="replace")[:50000]
            run.status = "success" if proc.returncode == 0 else "failed"
        except asyncio.TimeoutError:
            run.status = "timeout"
            run.stderr = "Script timed out"
        except Exception as e:
            run.status = "error"
            run.stderr = str(e)
    except Exception as e:
        run.status = "error"
        run.stderr = str(e)

    run.finished_at = datetime.utcnow()
    run.artifacts = json.dumps([f.name for f in run_dir.iterdir() if f.is_file()])


async def main_loop():
    await init_db()
    logger.info("Runner started — polling for queued jobs...")

    while True:
        try:
            async with async_session() as session:
                run = (await session.execute(
                    select(ScriptRun).where(ScriptRun.status == "queued").order_by(ScriptRun.started_at).limit(1)
                )).scalar_one_or_none()

                if run:
                    script = (await session.execute(
                        select(Script).where(Script.id == run.script_id)
                    )).scalar_one_or_none()

                    if script and script.enabled:
                        run.status = "running"
                        run.started_at = datetime.utcnow()
                        await session.commit()
                        logger.info(f"Running script {script.id}: {script.name}")
                        await execute_script(run, script)
                        await session.commit()
                        logger.info(f"Script {script.id} finished: {run.status}")
                    else:
                        run.status = "error"
                        run.stderr = "Script not found or disabled"
                        await session.commit()

        except Exception as e:
            logger.error(f"Runner error: {e}")

        await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main_loop())

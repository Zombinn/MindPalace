from datetime import date as dt_date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.ai_gateway import ai_gateway
from app.models.domain import StageTask, SubTask, Exam, ExamQuestion
from app.models.ai_config import AIScene
from app.schemas import ExamAnswer, ExamOverride, RedecomposeApply, ExamGenResponse, EvalResponse, RedecomposeResponse
from app.api.helpers import get_or_404, task_to_dict, exam_to_dict, question_to_dict
from app.api.tasks import enforce_transition, log_task_event

router = APIRouter(prefix="/api", tags=["exams"])


@router.post("/tasks/{task_id}/exam")
async def generate_exam(task_id: int, db: AsyncSession = Depends(get_db)):
    t = await get_or_404(db, StageTask, task_id)
    subs = (await db.execute(select(SubTask).where(SubTask.stage_task_id == task_id))).scalars().all()
    prev_exams = (await db.execute(select(Exam).where(Exam.stage_task_id == task_id).order_by(Exam.created_at.desc()))).scalars().all()

    wrong_tags = []
    for pe in prev_exams:
        qs = (await db.execute(select(ExamQuestion).where(ExamQuestion.exam_id == pe.id))).scalars().all()
        for q in qs:
            sc = q.human_score if q.human_score is not None else (q.ai_score or 0)
            if sc < q.max_score * 0.6:
                wrong_tags.extend(q.knowledge_tags or [])

    exam_config = t.exam_config or {}
    question_count = exam_config.get("question_count", 5)
    pass_score = exam_config.get("pass_score", 80)
    tags_list = list(set(tag for s in subs for tag in (s.knowledge_tags or [])))

    await ai_gateway.reload(db)
    result = await ai_gateway.call(
        AIScene.exam_gen,
        {
            "objective": t.objective or t.title,
            "subtasks": "\n".join(f"- {s.title} tags:{s.knowledge_tags}" for s in subs),
            "tags_list": ", ".join(tags_list),
            "wrong_tags": ", ".join(set(wrong_tags)),
            "question_count": str(question_count),
        },
        ExamGenResponse,
    )

    if not result.parsed:
        raise HTTPException(500, "Exam generation failed")

    exam = Exam(stage_task_id=task_id, round=t.round, status="generated",
                gen_prompt_snapshot=result.content, pass_score=float(pass_score))
    db.add(exam)
    await db.flush()

    for q in result.parsed.questions:
        eq = ExamQuestion(exam_id=exam.id, qtype=q.qtype or "short_answer", question=q.question,
                          options=q.options, rubric=q.rubric or "", knowledge_tags=q.knowledge_tags or [],
                          max_score=q.max_score or 20)
        db.add(eq)

    t.status = "exam_in_progress"
    await db.commit()
    await db.refresh(exam)

    questions = (await db.execute(select(ExamQuestion).where(ExamQuestion.exam_id == exam.id))).scalars().all()
    return {"exam": exam_to_dict(exam), "questions": [question_to_dict(q) for q in questions]}


@router.put("/exams/{exam_id}/answers")
async def save_answers(exam_id: int, data: ExamAnswer, db: AsyncSession = Depends(get_db)):
    exam = await get_or_404(db, Exam, exam_id)
    for qid_str, ans in data.answers.items():
        q = (await db.execute(select(ExamQuestion).where(ExamQuestion.id == int(qid_str), ExamQuestion.exam_id == exam_id))).scalar_one_or_none()
        if q:
            q.answer_text = ans
    await db.commit()
    return {"ok": True}


@router.post("/exams/{exam_id}/evaluate")
async def evaluate_exam(exam_id: int, db: AsyncSession = Depends(get_db)):
    exam = await get_or_404(db, Exam, exam_id)
    questions = (await db.execute(select(ExamQuestion).where(ExamQuestion.exam_id == exam_id))).scalars().all()
    exam.status = "evaluating"
    await db.commit()

    await ai_gateway.reload(db)
    total = 0.0
    max_total = 0.0
    wrong_tags = set()

    for q in questions:
        if not q.answer_text:
            continue
        max_total += q.max_score

        if q.qtype in ("single", "multi") and q.options:
            correct = next((o for o in q.options if o.get("is_correct")), None)
            if correct and q.answer_text.strip() == correct.get("key", "").strip():
                q.ai_score = q.max_score
                q.ai_feedback = "Correct (auto-graded)"
                total += q.max_score
            else:
                q.ai_score = 0
                q.ai_feedback = f"Incorrect" + (f". Expected: {correct.get('key', '')}" if correct else "")
                wrong_tags.update(q.knowledge_tags or [])
        else:
            try:
                r = await ai_gateway.call(AIScene.exam_eval, {
                    "question": q.question, "rubric": q.rubric or "",
                    "answer": q.answer_text, "max_score": str(q.max_score),
                }, EvalResponse)
                if r.parsed:
                    q.ai_score = min(r.parsed.score, q.max_score)
                    q.ai_feedback = r.parsed.feedback or ""
                    total += q.ai_score
                    if r.parsed.score < q.max_score * 0.6:
                        wrong_tags.update(q.knowledge_tags or [])
            except Exception as e:
                logger.error(f"Eval failed for q {q.id}: {e}")
                q.ai_feedback = f"Eval error: {e}"

    passed = total >= (exam.pass_score or 80) if max_total > 0 else False
    exam.total_score = total
    exam.passed = passed
    exam.ai_summary = f"Total: {total:.1f}/{max_total:.1f}, Passed: {passed}, Weak: {', '.join(wrong_tags)}"
    exam.status = "evaluated"

    task = await get_or_404(db, StageTask, exam.stage_task_id)
    if passed:
        await enforce_transition(task, "passed", db)
        subs = (await db.execute(select(SubTask).where(SubTask.stage_task_id == task.id))).scalars().all()
        for s in subs:
            if s.knowledge_tags and not (set(s.knowledge_tags or []) & wrong_tags):
                s.status = "mastered"
                s.locked = True
            elif s.knowledge_tags and (set(s.knowledge_tags or []) & wrong_tags):
                s.status = "weak"
    else:
        new_status = "force_closed" if (task.delay_count or 0) + 1 >= (task.max_delays or 3) else "delayed"
        await enforce_transition(task, new_status, db)
        task.delay_count = (task.delay_count or 0) + 1


    # Populate wrong-question book
    for q in questions:
        sc = q.human_score if q.human_score is not None else (q.ai_score or 0)
        if q.answer_text and sc < q.max_score * 0.6:
            from app.models.domain import WrongQuestionBook
            w = WrongQuestionBook(
                exam_question_id=q.id,
                stage_task_id=exam.stage_task_id,
                knowledge_tags=q.knowledge_tags,
                question=q.question,
                user_answer=q.answer_text,
                correct_notes=q.ai_feedback,
            )
            db.add(w)

    # Track exam activity
    from app.api.helpers import track_activity
    await track_activity(db, date.today(), 'exam_taken')
    await db.commit()
    return exam_to_dict(exam)


@router.post("/questions/{question_id}/override")
async def override_score(question_id: int, data: ExamOverride, db: AsyncSession = Depends(get_db)):
    q = await get_or_404(db, ExamQuestion, question_id)
    q.human_score = data.score
    q.override_reason = data.reason
    exam = await get_or_404(db, Exam, q.exam_id)
    exam.human_reviewed = True

    questions = (await db.execute(select(ExamQuestion).where(ExamQuestion.exam_id == exam.id))).scalars().all()
    total = sum(qq.human_score if qq.human_score is not None else (qq.ai_score or 0) for qq in questions if qq.answer_text)
    exam.total_score = total
    exam.passed = total >= (exam.pass_score or 80)

    task = await get_or_404(db, StageTask, exam.stage_task_id)
    ns = "passed" if exam.passed else ("force_closed" if (task.delay_count or 0) >= (task.max_delays or 3) else "delayed")
    await enforce_transition(task, ns, db)
    await db.commit()
    return question_to_dict(q)


@router.post("/exams/{exam_id}/redecompose")
async def redecompose(exam_id: int, db: AsyncSession = Depends(get_db)):
    exam = await get_or_404(db, Exam, exam_id)
    task = await get_or_404(db, StageTask, exam.stage_task_id)
    subs = (await db.execute(select(SubTask).where(SubTask.stage_task_id == task.id))).scalars().all()
    questions = (await db.execute(select(ExamQuestion).where(ExamQuestion.exam_id == exam_id))).scalars().all()

    wrong_questions = [{
        "question": q.question, "answer": q.answer_text, "tags": q.knowledge_tags,
        "score": q.human_score or q.ai_score or 0, "max_score": q.max_score, "feedback": q.ai_feedback,
    } for q in questions if (q.human_score or q.ai_score or 0) < q.max_score * 0.6]

    await ai_gateway.reload(db)
    result = await ai_gateway.call(AIScene.redecompose, {
        "subtasks": "\n".join(f"- {s.title} [{s.status}] tags:{s.knowledge_tags}" for s in subs),
        "wrong_questions": str(wrong_questions),
    }, RedecomposeResponse)

    diff = result.parsed.model_dump() if result.parsed else {"reinforce": [], "new": [], "rationale": "AI generation failed"}
    for s in subs:
        if s.status == "mastered":
            s.locked = True
            diff.setdefault("keep", []).append({"id": s.id, "title": s.title, "status": "mastered", "locked": True})

    await db.commit()
    return {"diff": diff}


@router.post("/exams/{exam_id}/redecompose:apply")
async def apply_redecompose(exam_id: int, data: RedecomposeApply, db: AsyncSession = Depends(get_db)):
    exam = await get_or_404(db, Exam, exam_id)
    task = await get_or_404(db, StageTask, exam.stage_task_id)

    if task.end_date:
        task.end_date = task.end_date + timedelta(days=data.delay_days)
    task.status = "in_progress"
    task.round = (task.round or 1) + 1
    task.delay_count = (task.delay_count or 0) + 1

    max_idx = (await db.execute(select(func.max(SubTask.order_index)).where(SubTask.stage_task_id == task.id))).scalar() or 0
    for cat in ["reinforce", "new"]:
        for sdata in data.diff.get(cat, []):
            max_idx += 1
            st = SubTask(stage_task_id=task.id, title=sdata.get("title", ""), content=sdata.get("content", ""),
                         knowledge_tags=sdata.get("knowledge_tags", []), order_index=max_idx,
                         est_hours=sdata.get("est_hours"), status="todo", origin="redecompose", round=task.round)
            db.add(st)

    await db.commit()
    return task_to_dict(task)

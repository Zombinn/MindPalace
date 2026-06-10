"""Core domain models: Goal, StageTask, SubTask, Exam, ExamQuestion, Note, Script."""
from datetime import datetime

from sqlalchemy import (Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON,
                        String, Text, Date)
from sqlalchemy.orm import relationship
from app.core.database import Base


class Goal(Base):
    __tablename__ = "goal"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(256), nullable=False)
    description = Column(Text)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    priority = Column(String(4), default="P1")
    status = Column(String(16), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tasks = relationship("StageTask", back_populates="goal", cascade="all, delete-orphan")


class StageTask(Base):
    __tablename__ = "stage_task"
    id = Column(Integer, primary_key=True, autoincrement=True)
    goal_id = Column(Integer, ForeignKey("goal.id"), nullable=False)
    title = Column(String(256), nullable=False)
    objective = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String(24), default="pending")
    progress = Column(Float, default=0.0)
    exam_config = Column(JSON)
    delay_count = Column(Integer, default=0)
    max_delays = Column(Integer, default=3)
    round = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    goal = relationship("Goal", back_populates="tasks")
    subtasks = relationship("SubTask", back_populates="stage_task", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="stage_task", cascade="all, delete-orphan")


class SubTask(Base):
    __tablename__ = "sub_task"
    id = Column(Integer, primary_key=True, autoincrement=True)
    stage_task_id = Column(Integer, ForeignKey("stage_task.id"), nullable=False)
    title = Column(String(256), nullable=False)
    content = Column(Text)
    knowledge_tags = Column(JSON)
    order_index = Column(Integer, default=0)
    est_hours = Column(Float)
    status = Column(String(16), default="todo")
    origin = Column(String(16), default="ai")
    round = Column(Integer, default=1)
    locked = Column(Boolean, default=False)
    done_at = Column(DateTime)

    stage_task = relationship("StageTask", back_populates="subtasks")


class Exam(Base):
    __tablename__ = "exam"
    id = Column(Integer, primary_key=True, autoincrement=True)
    stage_task_id = Column(Integer, ForeignKey("stage_task.id"), nullable=False)
    round = Column(Integer, nullable=False)
    status = Column(String(16), default="generated")
    gen_prompt_snapshot = Column(Text)
    total_score = Column(Float)
    pass_score = Column(Float)
    passed = Column(Boolean)
    ai_summary = Column(Text)
    human_reviewed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    stage_task = relationship("StageTask", back_populates="exams")
    questions = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan")


class ExamQuestion(Base):
    __tablename__ = "exam_question"
    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exam.id"), nullable=False)
    qtype = Column(String(16))
    question = Column(Text, nullable=False)
    options = Column(JSON)
    rubric = Column(Text)
    knowledge_tags = Column(JSON)
    max_score = Column(Float, nullable=False)
    answer_text = Column(Text)
    ai_score = Column(Float)
    ai_feedback = Column(Text)
    human_score = Column(Float)
    override_reason = Column(Text)

    exam = relationship("Exam", back_populates="questions")


class Note(Base):
    __tablename__ = "note"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(256))
    content = Column(Text)
    goal_id = Column(Integer, ForeignKey("goal.id"), nullable=True)
    stage_task_id = Column(Integer, ForeignKey("stage_task.id"), nullable=True)
    sub_task_id = Column(Integer, ForeignKey("sub_task.id"), nullable=True)
    tags = Column(JSON)
    deleted_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Script(Base):
    __tablename__ = "script"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(256), nullable=False)
    goal_id = Column(Integer, ForeignKey("goal.id"), nullable=True)
    stage_task_id = Column(Integer, ForeignKey("stage_task.id"), nullable=True)
    requirement = Column(Text)
    code = Column(Text, nullable=False)
    version = Column(Integer, default=1)
    cron_expr = Column(String(128))
    enabled = Column(Boolean, default=False)
    post_prompt_template_id = Column(Integer, nullable=True)
    timeout_sec = Column(Integer, default=300)
    created_at = Column(DateTime, default=datetime.utcnow)


class ScriptRun(Base):
    __tablename__ = "script_run"
    id = Column(Integer, primary_key=True, autoincrement=True)
    script_id = Column(Integer, ForeignKey("script.id"), nullable=False)
    trigger = Column(String(16))
    status = Column(String(16))
    started_at = Column(DateTime)
    finished_at = Column(DateTime)
    stdout = Column(Text)
    stderr = Column(Text)
    artifacts = Column(JSON)


class WrongQuestionBook(Base):
    __tablename__ = "wrong_question_book"
    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_question_id = Column(Integer, ForeignKey("exam_question.id"), nullable=False)
    stage_task_id = Column(Integer, ForeignKey("stage_task.id"), nullable=False)
    knowledge_tags = Column(JSON)
    question = Column(Text, nullable=False)
    user_answer = Column(Text)
    correct_notes = Column(Text)
    reviewed = Column(Boolean, default=False)
    reviewed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class LearningActivity(Base):
    __tablename__ = "learning_activity"
    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_date = Column(Date, nullable=False)
    activity_type = Column(String(32))
    count = Column(Integer, default=1)

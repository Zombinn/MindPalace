"""AI configuration models: Provider, SceneRoute, PromptTemplate."""
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, LargeBinary, String, Text
from app.core.database import Base


class AIScene(str, Enum):
    decompose = "decompose"
    exam_gen = "exam_gen"
    exam_eval = "exam_eval"
    script_gen = "script_gen"
    note_assist = "note_assist"
    redecompose = "redecompose"


class AIProvider(Base):
    __tablename__ = "ai_provider"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    base_url = Column(String(512), nullable=False)
    api_key_enc = Column(LargeBinary, nullable=False)
    default_model = Column(String(128))
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AISceneRoute(Base):
    __tablename__ = "ai_scene_route"
    scene = Column(String(32), primary_key=True)
    provider_id = Column(Integer, nullable=False)
    model = Column(String(128))
    temperature = Column(Float, default=0.7)


class PromptTemplate(Base):
    __tablename__ = "prompt_template"
    id = Column(Integer, primary_key=True, autoincrement=True)
    scene = Column(String(32), nullable=False)
    name = Column(String(128))
    is_builtin = Column(Boolean, default=False)
    content = Column(Text, nullable=False)

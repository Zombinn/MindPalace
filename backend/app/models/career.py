"""Career pipeline models — job applications and pipeline inbox, adapted from career-ops."""

from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text, Date, Boolean
from app.core.database import Base

# Canonical states from career-ops states.yml
CANONICAL_STATES = [
    "evaluated", "applied", "responded", "interview",
    "offer", "rejected", "discarded", "skip",
]

PIPELINE_STATUSES = ["pending", "processing", "processed", "error"]


class JobApplication(Base):
    """A single job application tracked through the career-ops pipeline."""
    __tablename__ = "job_application"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company = Column(String(256), nullable=False)
    role = Column(String(256), nullable=False)
    url = Column(String(1024))
    status = Column(String(16), default="evaluated")
    score = Column(Float)
    location = Column(String(256))
    notes = Column(Text)
    tags = Column(JSON)
    pipeline_data = Column(JSON)
    applied_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "company": self.company, "role": self.role,
            "url": self.url, "status": self.status, "score": self.score,
            "location": self.location, "notes": self.notes, "tags": self.tags or [],
            "pipeline_data": self.pipeline_data, "applied_date": str(self.applied_date) if self.applied_date else None,
            "created_at": str(self.created_at), "updated_at": str(self.updated_at),
        }


class PipelineItem(Base):
    """URL inbox entry — pending job URLs to be processed."""
    __tablename__ = "pipeline_item"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String(1024), nullable=False)
    company = Column(String(256))
    role = Column(String(256))
    status = Column(String(16), default="pending")
    score = Column(Float)
    report_path = Column(String(512))
    pdf_path = Column(String(512))
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "url": self.url, "company": self.company, "role": self.role,
            "status": self.status, "score": self.score,
            "report_path": self.report_path, "pdf_path": self.pdf_path,
            "error_message": self.error_message,
            "created_at": str(self.created_at),
            "processed_at": str(self.processed_at) if self.processed_at else None,
        }


class CareerConfig(Base):
    """Career profile and scanner config."""
    __tablename__ = "career_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(128), unique=True, nullable=False)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {"id": self.id, "key": self.key, "value": self.value, "updated_at": str(self.updated_at)}

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator


class GoalCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    start_date: date
    end_date: Optional[date] = None
    priority: str = "P1"
    status: str = "pending"

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date and self.start_date and self.start_date > self.end_date:
            raise ValueError("end_date must not be earlier than start_date")
        return self


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class StageTaskCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str
    objective: Optional[str] = ""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    exam_config: Optional[dict] = None
    max_delays: int = 3

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date and self.start_date and self.start_date > self.end_date:
            raise ValueError("end_date must not be earlier than start_date")
        if self.max_delays < 0:
            raise ValueError("max_delays must be >= 0")
        return self



class StageTaskCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    @model_validator(mode='before')
    def coerce_dates(cls, data):
        """Convert empty date strings to None before field validation."""
        if isinstance(data, dict):
            for key in ('start_date', 'end_date'):
                if data.get(key) == '':
                    data[key] = None
        return data

    title: str
    objective: Optional[str] = ""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    exam_config: Optional[dict] = None
    max_delays: int = 3

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date and self.start_date and self.start_date > self.end_date:
            raise ValueError("end_date must not be earlier than start_date")
        if self.max_delays < 0:
            raise ValueError("max_delays must be >= 0")
        return self

class StageTaskUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: Optional[str] = None
    objective: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    progress: Optional[float] = None
    exam_config: Optional[dict] = None
    max_delays: Optional[int] = None


class SubTaskCreate(BaseModel):
    title: str
    content: Optional[str] = ""
    knowledge_tags: Optional[list] = None
    order_index: int = 0
    est_hours: Optional[float] = None


class SubTaskUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None
    order_index: Optional[int] = None
    est_hours: Optional[float] = None


class SubTaskBatchConfirm(BaseModel):
    subtasks: list[SubTaskCreate]


class ExamAnswer(BaseModel):
    answers: dict[int, str] = Field(default_factory=dict)


class ExamOverride(BaseModel):
    score: float
    reason: str = ""


class NoteCreate(BaseModel):
    title: str = ""
    content: str
    goal_id: Optional[int] = None
    stage_task_id: Optional[int] = None
    sub_task_id: Optional[int] = None
    tags: Optional[list] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    goal_id: Optional[int] = None
    stage_task_id: Optional[int] = None
    sub_task_id: Optional[int] = None
    tags: Optional[list] = None


class ProviderCreate(BaseModel):
    name: str
    base_url: str
    api_key: str
    default_model: str = ""
    is_default: bool = False


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    default_model: Optional[str] = None
    is_default: Optional[bool] = None


class SceneRouteCreate(BaseModel):
    provider_id: int
    model: str
    temperature: float = 0.7


class TemplateUpdate(BaseModel):
    content: str


class RedecomposeApply(BaseModel):
    delay_days: int
    diff: dict


# LLM structured output models
class DecomposeSubTask(BaseModel):
    title: str
    content: str = ""
    knowledge_tags: list[str] = Field(default_factory=list)
    est_hours: Optional[float] = None
    key_points: list[str] = Field(default_factory=list)
    practice_questions: list[str] = Field(default_factory=list)
    ref_links: list[str] = Field(default_factory=list)


class DecomposeResponse(BaseModel):
    subtasks: list[DecomposeSubTask] = Field(default_factory=list)
    rationale: str = ""


class ExamGenQuestion(BaseModel):
    qtype: str = "short_answer"
    question: str
    options: Optional[list] = None
    rubric: str = ""
    knowledge_tags: list[str] = Field(default_factory=list)
    max_score: float = 20


class ExamGenResponse(BaseModel):
    questions: list[ExamGenQuestion] = Field(default_factory=list)


class EvalResponse(BaseModel):
    score: float
    feedback: str = ""


class RedecomposeSubTask(BaseModel):
    title: str
    content: str = ""
    knowledge_tags: list[str] = Field(default_factory=list)
    est_hours: Optional[float] = None


class RedecomposeResponse(BaseModel):
    reinforce: list[RedecomposeSubTask] = Field(default_factory=list)
    new: list[RedecomposeSubTask] = Field(default_factory=list)
    rationale: str = ""

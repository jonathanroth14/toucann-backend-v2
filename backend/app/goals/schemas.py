"""
Goal Schemas
Pydantic models for request/response validation
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


# Goal Schemas
class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    is_active: bool = True


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class GoalResponse(GoalBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Goal Step Schemas
class GoalStepBase(BaseModel):
    title: str
    description: Optional[str] = None
    points: int = 0
    sort_order: int = 0
    is_required: bool = True


class GoalStepCreate(GoalStepBase):
    pass


class GoalStepUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    points: Optional[int] = None
    sort_order: Optional[int] = None
    is_required: Optional[bool] = None


class GoalStepResponse(GoalStepBase):
    id: int
    goal_id: int
    model_config = ConfigDict(from_attributes=True)


# Goal with Steps
class GoalWithSteps(GoalResponse):
    steps: list[GoalStepResponse] = []


# Goal Link Schemas
class GoalLinkCreate(BaseModel):
    to_goal_id: int
    condition: str = "ON_COMPLETE"


class GoalLinkResponse(BaseModel):
    id: int
    from_goal_id: int
    to_goal_id: int
    condition: str
    model_config = ConfigDict(from_attributes=True)


# Student-facing schemas
class GoalStepWithProgress(GoalStepBase):
    id: int
    goal_id: int
    status: str  # INCOMPLETE or COMPLETE
    completed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ActiveGoalResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str  # NOT_STARTED, IN_PROGRESS, COMPLETE
    steps: list[GoalStepWithProgress] = []
    model_config = ConfigDict(from_attributes=True)

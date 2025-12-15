"""
Challenge Pydantic Schemas
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

from app.challenges.models import ChallengeStatus, ObjectiveStatus


# Objective Schemas
class ObjectiveBase(BaseModel):
    """Base objective schema"""

    title: str
    description: Optional[str] = None
    points: int = 0
    sort_order: int = 0
    is_required: bool = True


class ObjectiveCreate(ObjectiveBase):
    """Schema for creating an objective"""

    pass


class ObjectiveUpdate(BaseModel):
    """Schema for updating an objective"""

    title: Optional[str] = None
    description: Optional[str] = None
    points: Optional[int] = None
    sort_order: Optional[int] = None
    is_required: Optional[bool] = None


class ObjectiveResponse(ObjectiveBase):
    """Schema for objective response"""

    id: int
    challenge_id: int

    model_config = ConfigDict(from_attributes=True)


class ObjectiveWithProgress(ObjectiveResponse):
    """Schema for objective with user progress"""

    status: ObjectiveStatus
    completed_at: Optional[datetime] = None


# Challenge Schemas
class ChallengeBase(BaseModel):
    """Base challenge schema"""

    title: str
    description: Optional[str] = None
    is_active: bool = True


class ChallengeCreate(ChallengeBase):
    """Schema for creating a challenge"""

    pass


class ChallengeUpdate(BaseModel):
    """Schema for updating a challenge"""

    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ChallengeResponse(ChallengeBase):
    """Schema for challenge response"""

    id: int
    created_by: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChallengeWithObjectives(ChallengeResponse):
    """Schema for challenge with objectives"""

    objectives: list[ObjectiveResponse]


class ActiveChallengeResponse(ChallengeResponse):
    """Schema for active challenge with objectives and progress"""

    objectives: list[ObjectiveWithProgress]
    status: ChallengeStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# Challenge Link Schemas
class ChallengeLinkCreate(BaseModel):
    """Schema for creating a challenge link"""

    to_challenge_id: int
    condition: str = "ON_COMPLETE"


class ChallengeLinkResponse(BaseModel):
    """Schema for challenge link response"""

    id: int
    from_challenge_id: int
    to_challenge_id: int
    condition: str

    model_config = ConfigDict(from_attributes=True)


# User Progress Schemas
class UserChallengeProgressResponse(BaseModel):
    """Schema for user challenge progress"""

    id: int
    user_id: int
    challenge_id: int
    status: ChallengeStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserObjectiveProgressResponse(BaseModel):
    """Schema for user objective progress"""

    id: int
    user_id: int
    objective_id: int
    status: ObjectiveStatus
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

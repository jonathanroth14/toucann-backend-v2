"""
Admin Pydantic Schemas
"""
from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.challenges.models import ChallengeStatus


class UserListResponse(BaseModel):
    """Schema for user list response"""

    id: int
    email: EmailStr
    created_at: datetime
    is_admin: bool
    is_active: bool
    role: Optional[str] = None


class UserActivityResponse(BaseModel):
    """Schema for user activity response"""

    user_id: int
    email: EmailStr
    challenges_completed: int
    challenges_in_progress: int
    objectives_completed: int
    total_points: int


class ChallengeProgressDetail(BaseModel):
    """Schema for challenge progress detail"""

    challenge_id: int
    challenge_title: str
    status: ChallengeStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    objectives_completed: int
    objectives_total: int


class PasswordResetResponse(BaseModel):
    """Schema for password reset response"""

    user_id: int
    email: EmailStr
    temporary_password: str
    message: str

"""
User Profile Pydantic Schemas
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional

from app.users.models import UserRole


class ProfileBase(BaseModel):
    """Base profile schema"""

    full_name: Optional[str] = None
    role: UserRole
    expected_grad_year: Optional[int] = None
    newsletter_opt_in: bool = False


class ProfileCreate(ProfileBase):
    """Schema for creating a profile"""

    pass


class ProfileUpdate(BaseModel):
    """Schema for updating a profile"""

    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    expected_grad_year: Optional[int] = None
    newsletter_opt_in: Optional[bool] = None


class ProfileResponse(ProfileBase):
    """Schema for profile response"""

    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)

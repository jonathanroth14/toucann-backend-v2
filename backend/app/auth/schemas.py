"""
Authentication Pydantic Schemas
"""
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    """Base user schema"""

    email: EmailStr


class UserCreate(UserBase):
    """Schema for user registration"""

    password: str


class UserLogin(UserBase):
    """Schema for user login"""

    password: str


class UserResponse(UserBase):
    """Schema for user response"""

    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Schema for JWT token response"""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token data"""

    email: str | None = None

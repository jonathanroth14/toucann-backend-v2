"""
User Profile Models
"""
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.auth.models import Base


class UserRole(str, enum.Enum):
    """User role enumeration"""

    STUDENT = "student"
    GUARDIAN = "guardian"
    ADVISOR = "advisor"
    SCHOOL_ADMIN = "school_admin"


class Profile(Base):
    """User profile model"""

    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole), nullable=False)
    expected_grad_year = Column(Integer, nullable=True)
    newsletter_opt_in = Column(Boolean, default=False, nullable=False)

    # Relationship to user
    user = relationship("User", back_populates="profile")

    def __repr__(self):
        return f"<Profile(id={self.id}, user_id={self.user_id}, role={self.role})>"

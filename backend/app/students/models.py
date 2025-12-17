"""
Student State Models
Track student-specific state like second task slot and snoozed challenges
"""
from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
)
from sqlalchemy.orm import relationship

from app.auth.models import Base


class StudentState(Base):
    """Student state tracking"""

    __tablename__ = "student_state"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    second_slot_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<StudentState(user_id={self.user_id}, second_slot={self.second_slot_enabled})>"


class SnoozedChallenge(Base):
    """Tracks challenges that a student has snoozed"""

    __tablename__ = "snoozed_challenges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    snoozed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    snoozed_until = Column(DateTime, nullable=False)

    def __repr__(self):
        return f"<SnoozedChallenge(user_id={self.user_id}, challenge_id={self.challenge_id})>"

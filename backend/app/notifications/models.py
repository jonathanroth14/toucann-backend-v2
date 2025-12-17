"""
Notification Models
"""
from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
import enum

from app.auth.models import Base


class NotificationType(str, enum.Enum):
    """Notification type enumeration"""

    DEADLINE = "deadline"  # Deadline reminders (challenge due, goal milestone)
    NUDGE = "nudge"  # Inactivity nudges
    STREAK = "streak"  # Streak / momentum encouragement


class Notification(Base):
    """User notifications - assistive reminders that support the challenge flow"""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(SQLEnum(NotificationType), nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)

    # Optional links to goals/challenges for deep-linking
    related_goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=True)
    related_challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=True)

    # Scheduling and state
    scheduled_for = Column(DateTime, nullable=False, index=True, comment="When notification should be shown")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True, comment="When user read the notification")
    dismissed_at = Column(DateTime, nullable=True, comment="When user dismissed the notification")

    # Deduplication key to prevent duplicate notifications
    dedup_key = Column(String, nullable=True, index=True, comment="Unique key for deduplication (e.g., 'deadline:challenge:123:2024-01-15')")

    def __repr__(self):
        return f"<Notification(id={self.id}, type={self.type}, user_id={self.user_id})>"

    @property
    def is_read(self) -> bool:
        """Check if notification has been read"""
        return self.read_at is not None

    @property
    def is_dismissed(self) -> bool:
        """Check if notification has been dismissed"""
        return self.dismissed_at is not None

    @property
    def is_active(self) -> bool:
        """Check if notification should be shown (not read or dismissed, and scheduled time has passed)"""
        if self.is_read or self.is_dismissed:
            return False
        return self.scheduled_for <= datetime.utcnow()

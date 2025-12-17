"""
Challenge Models
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
    UniqueConstraint,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
import enum

from app.auth.models import Base


class ChallengeStatus(str, enum.Enum):
    """Challenge status enumeration"""

    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "COMPLETE"


class ObjectiveStatus(str, enum.Enum):
    """Objective status enumeration"""

    INCOMPLETE = "INCOMPLETE"
    COMPLETE = "COMPLETE"


class Challenge(Base):
    """Academic challenge model - daily tasks that belong to goals"""

    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Goal relationship - challenges belong to goals
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="SET NULL"), nullable=True)

    # Challenge chaining - simpler than ChallengeLink table
    next_challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="SET NULL"), nullable=True)

    # Ordering and visibility
    sort_order = Column(Integer, default=0, nullable=False)
    visible_to_students = Column(Boolean, default=True, nullable=False)

    # Challenge metadata
    points = Column(Integer, default=10, nullable=False)
    category = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)

    # Scheduling and recurrence
    start_date = Column(DateTime, nullable=True, comment="When challenge becomes available")
    expires_at = Column(DateTime, nullable=True, comment="When challenge expires if not completed")
    recurrence_days = Column(Integer, nullable=True, comment="Days until challenge reappears (null = no recurrence)")
    recurrence_limit = Column(Integer, nullable=True, comment="Max times to recur (null = infinite)")
    recurrence_count = Column(Integer, default=0, nullable=False, comment="Current recurrence count")
    original_challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="SET NULL"), nullable=True,
                                    comment="ID of original challenge if this is a recurrence")

    # Relationships
    objectives = relationship("Objective", back_populates="challenge", cascade="all, delete-orphan")
    links_from = relationship(
        "ChallengeLink",
        foreign_keys="ChallengeLink.from_challenge_id",
        back_populates="from_challenge",
        cascade="all, delete-orphan",
    )
    user_progress = relationship("UserChallengeProgress", back_populates="challenge", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Challenge(id={self.id}, title={self.title})>"


class Objective(Base):
    """Challenge objective model"""

    __tablename__ = "objectives"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    points = Column(Integer, default=0, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    is_required = Column(Boolean, default=True, nullable=False)

    # Relationships
    challenge = relationship("Challenge", back_populates="objectives")
    user_progress = relationship("UserObjectiveProgress", back_populates="objective", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Objective(id={self.id}, title={self.title})>"


class ChallengeLink(Base):
    """Challenge chaining/linking model"""

    __tablename__ = "challenge_links"

    id = Column(Integer, primary_key=True, index=True)
    from_challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    to_challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    condition = Column(String, default="ON_COMPLETE", nullable=False)

    # Relationships
    from_challenge = relationship("Challenge", foreign_keys=[from_challenge_id], back_populates="links_from")

    __table_args__ = (UniqueConstraint("from_challenge_id", "condition", name="uq_challenge_link_condition"),)

    def __repr__(self):
        return f"<ChallengeLink(from={self.from_challenge_id}, to={self.to_challenge_id}, condition={self.condition})>"


class UserChallengeProgress(Base):
    """User progress on challenges"""

    __tablename__ = "user_challenge_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(ChallengeStatus), default=ChallengeStatus.NOT_STARTED, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    challenge = relationship("Challenge", back_populates="user_progress")

    __table_args__ = (UniqueConstraint("user_id", "challenge_id", name="uq_user_challenge"),)

    def __repr__(self):
        return f"<UserChallengeProgress(user_id={self.user_id}, challenge_id={self.challenge_id}, status={self.status})>"


class UserObjectiveProgress(Base):
    """User progress on objectives"""

    __tablename__ = "user_objective_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    objective_id = Column(Integer, ForeignKey("objectives.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(ObjectiveStatus), default=ObjectiveStatus.INCOMPLETE, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    objective = relationship("Objective", back_populates="user_progress")

    __table_args__ = (UniqueConstraint("user_id", "objective_id", name="uq_user_objective"),)

    def __repr__(self):
        return f"<UserObjectiveProgress(user_id={self.user_id}, objective_id={self.objective_id}, status={self.status})>"


class UserChallengePreferences(Base):
    """User preferences for challenge system"""

    __tablename__ = "user_challenge_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    second_slot_enabled = Column(Boolean, default=False, nullable=False)
    second_slot_challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<UserChallengePreferences(user_id={self.user_id}, second_slot_enabled={self.second_slot_enabled})>"


class SnoozedChallenge(Base):
    """Tracks challenges that users have snoozed"""

    __tablename__ = "snoozed_challenges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    snoozed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    snoozed_until = Column(DateTime, nullable=False, comment="When challenge becomes available again")
    reason = Column(String, nullable=True, comment="Optional reason for snoozing")

    __table_args__ = (UniqueConstraint("user_id", "challenge_id", name="uq_user_snoozed_challenge"),)

    def __repr__(self):
        return f"<SnoozedChallenge(user_id={self.user_id}, challenge_id={self.challenge_id}, until={self.snoozed_until})>"

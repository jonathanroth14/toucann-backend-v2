"""
Goal Models
Long-term arcs with steps that students work through
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


class GoalStatus(str, enum.Enum):
    """Goal status enumeration"""

    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "COMPLETE"


class GoalStepStatus(str, enum.Enum):
    """Goal step status enumeration"""

    INCOMPLETE = "INCOMPLETE"
    COMPLETE = "COMPLETE"


class Goal(Base):
    """Long-term goal model"""

    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Scheduling and recurrence
    start_date = Column(DateTime, nullable=True, comment="When goal becomes available")
    expires_at = Column(DateTime, nullable=True, comment="When goal expires if not completed")
    recurrence_days = Column(Integer, nullable=True, comment="Days until goal reappears (null = no recurrence)")
    recurrence_limit = Column(Integer, nullable=True, comment="Max times to recur (null = infinite)")
    recurrence_count = Column(Integer, default=0, nullable=False, comment="Current recurrence count")

    # Relationships
    steps = relationship("GoalStep", back_populates="goal", cascade="all, delete-orphan")
    links_from = relationship(
        "GoalLink",
        foreign_keys="GoalLink.from_goal_id",
        back_populates="from_goal",
        cascade="all, delete-orphan",
    )
    user_progress = relationship("UserGoalProgress", back_populates="goal", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Goal(id={self.id}, title={self.title})>"


class GoalStep(Base):
    """Goal step model (tasks within a goal)"""

    __tablename__ = "goal_steps"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    points = Column(Integer, default=0, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    is_required = Column(Boolean, default=True, nullable=False)

    # Relationships
    goal = relationship("Goal", back_populates="steps")
    user_progress = relationship("UserGoalStepProgress", back_populates="step", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<GoalStep(id={self.id}, title={self.title})>"


class GoalLink(Base):
    """Goal chaining/linking model"""

    __tablename__ = "goal_links"

    id = Column(Integer, primary_key=True, index=True)
    from_goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    to_goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    condition = Column(String, default="ON_COMPLETE", nullable=False)

    # Relationships
    from_goal = relationship("Goal", foreign_keys=[from_goal_id], back_populates="links_from")

    __table_args__ = (UniqueConstraint("from_goal_id", "condition", name="uq_goal_link_condition"),)

    def __repr__(self):
        return f"<GoalLink(from={self.from_goal_id}, to={self.to_goal_id}, condition={self.condition})>"


class UserGoalProgress(Base):
    """User progress on goals"""

    __tablename__ = "user_goal_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(GoalStatus), default=GoalStatus.NOT_STARTED, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    goal = relationship("Goal", back_populates="user_progress")

    __table_args__ = (UniqueConstraint("user_id", "goal_id", name="uq_user_goal"),)

    def __repr__(self):
        return f"<UserGoalProgress(user_id={self.user_id}, goal_id={self.goal_id}, status={self.status})>"


class UserGoalStepProgress(Base):
    """User progress on goal steps"""

    __tablename__ = "user_goal_step_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    step_id = Column(Integer, ForeignKey("goal_steps.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(GoalStepStatus), default=GoalStepStatus.INCOMPLETE, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    step = relationship("GoalStep", back_populates="user_progress")

    __table_args__ = (UniqueConstraint("user_id", "step_id", name="uq_user_goal_step"),)

    def __repr__(self):
        return f"<UserGoalStepProgress(user_id={self.user_id}, step_id={self.step_id}, status={self.status})>"

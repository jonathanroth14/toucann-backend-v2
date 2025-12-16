"""
Goal Student Routes
Student-facing endpoints for goals and steps
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.common.dependencies import get_db
from app.auth.models import User
from app.auth.utils import get_current_active_user
from app.goals.models import (
    Goal,
    GoalStep,
    GoalLink,
    UserGoalProgress,
    UserGoalStepProgress,
    GoalStatus,
    GoalStepStatus,
)
from app.goals.schemas import ActiveGoalResponse, GoalStepWithProgress

router = APIRouter()


def _get_or_create_goal_progress(db: Session, user_id: int, goal_id: int) -> UserGoalProgress:
    """Get or create goal progress for a user"""
    progress = (
        db.query(UserGoalProgress)
        .filter(
            and_(
                UserGoalProgress.user_id == user_id,
                UserGoalProgress.goal_id == goal_id,
            )
        )
        .first()
    )

    if not progress:
        progress = UserGoalProgress(
            user_id=user_id,
            goal_id=goal_id,
            status=GoalStatus.NOT_STARTED,
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)

    return progress


def _auto_assign_first_goal(db: Session, user_id: int) -> Goal | None:
    """Auto-assign the first active goal if no goal is active"""
    # Find first active goal (by id or created_at)
    first_goal = (
        db.query(Goal)
        .filter(Goal.is_active == True)
        .order_by(Goal.id)
        .first()
    )

    if first_goal:
        progress = _get_or_create_goal_progress(db, user_id, first_goal.id)
        if progress.status == GoalStatus.NOT_STARTED:
            progress.status = GoalStatus.IN_PROGRESS
            progress.started_at = datetime.utcnow()
            db.commit()

    return first_goal


def _check_goal_completion(db: Session, user_id: int, goal_id: int) -> bool:
    """Check if all required steps are complete and update goal status"""
    # Get all required steps
    required_steps = (
        db.query(GoalStep)
        .filter(
            and_(
                GoalStep.goal_id == goal_id,
                GoalStep.is_required == True,
            )
        )
        .all()
    )

    if not required_steps:
        return False

    # Check if all required steps are complete
    for step in required_steps:
        step_progress = (
            db.query(UserGoalStepProgress)
            .filter(
                and_(
                    UserGoalStepProgress.user_id == user_id,
                    UserGoalStepProgress.step_id == step.id,
                )
            )
            .first()
        )

        if not step_progress or step_progress.status != GoalStepStatus.COMPLETE:
            return False

    # All required steps complete - mark goal as complete
    goal_progress = (
        db.query(UserGoalProgress)
        .filter(
            and_(
                UserGoalProgress.user_id == user_id,
                UserGoalProgress.goal_id == goal_id,
            )
        )
        .first()
    )

    if goal_progress and goal_progress.status != GoalStatus.COMPLETE:
        goal_progress.status = GoalStatus.COMPLETE
        goal_progress.completed_at = datetime.utcnow()
        db.commit()

        # Check for next goal in chain
        _auto_chain_next_goal(db, user_id, goal_id)

    return True


def _auto_chain_next_goal(db: Session, user_id: int, completed_goal_id: int):
    """Automatically activate next goal in chain if exists"""
    # Find next goal link
    next_link = (
        db.query(GoalLink)
        .filter(
            and_(
                GoalLink.from_goal_id == completed_goal_id,
                GoalLink.condition == "ON_COMPLETE",
            )
        )
        .first()
    )

    if next_link:
        # Check if next goal is active
        next_goal = db.query(Goal).filter(Goal.id == next_link.to_goal_id).first()
        if next_goal and next_goal.is_active:
            # Create or update progress
            progress = _get_or_create_goal_progress(db, user_id, next_goal.id)
            if progress.status == GoalStatus.NOT_STARTED:
                progress.status = GoalStatus.IN_PROGRESS
                progress.started_at = datetime.utcnow()
                db.commit()


@router.get("/me/active-goal", response_model=ActiveGoalResponse)
async def get_active_goal(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get the user's current active goal with steps and progress"""
    # Find user's active goal (IN_PROGRESS)
    active_progress = (
        db.query(UserGoalProgress)
        .filter(
            and_(
                UserGoalProgress.user_id == current_user.id,
                UserGoalProgress.status == GoalStatus.IN_PROGRESS,
            )
        )
        .first()
    )

    # If no active goal, auto-assign first one
    if not active_progress:
        goal = _auto_assign_first_goal(db, current_user.id)
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active goals available",
            )
        # Reload progress
        active_progress = (
            db.query(UserGoalProgress)
            .filter(
                and_(
                    UserGoalProgress.user_id == current_user.id,
                    UserGoalProgress.goal_id == goal.id,
                )
            )
            .first()
        )

    # Get goal
    goal = db.query(Goal).filter(Goal.id == active_progress.goal_id).first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    # Get all steps with progress
    steps = (
        db.query(GoalStep)
        .filter(GoalStep.goal_id == goal.id)
        .order_by(GoalStep.sort_order)
        .all()
    )

    steps_with_progress = []
    for step in steps:
        step_progress = (
            db.query(UserGoalStepProgress)
            .filter(
                and_(
                    UserGoalStepProgress.user_id == current_user.id,
                    UserGoalStepProgress.step_id == step.id,
                )
            )
            .first()
        )

        steps_with_progress.append(
            GoalStepWithProgress(
                id=step.id,
                goal_id=step.goal_id,
                title=step.title,
                description=step.description,
                points=step.points,
                sort_order=step.sort_order,
                is_required=step.is_required,
                status=step_progress.status.value if step_progress else GoalStepStatus.INCOMPLETE.value,
                completed_at=step_progress.completed_at if step_progress else None,
            )
        )

    return ActiveGoalResponse(
        id=goal.id,
        title=goal.title,
        description=goal.description,
        status=active_progress.status.value,
        steps=steps_with_progress,
    )


@router.post("/me/goal-steps/{step_id}/complete")
async def complete_goal_step(
    step_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Mark a goal step as complete"""
    # Verify step exists
    step = db.query(GoalStep).filter(GoalStep.id == step_id).first()
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal step not found",
        )

    # Get or create step progress
    step_progress = (
        db.query(UserGoalStepProgress)
        .filter(
            and_(
                UserGoalStepProgress.user_id == current_user.id,
                UserGoalStepProgress.step_id == step_id,
            )
        )
        .first()
    )

    if not step_progress:
        step_progress = UserGoalStepProgress(
            user_id=current_user.id,
            step_id=step_id,
            status=GoalStepStatus.COMPLETE,
            completed_at=datetime.utcnow(),
        )
        db.add(step_progress)
    else:
        step_progress.status = GoalStepStatus.COMPLETE
        step_progress.completed_at = datetime.utcnow()

    db.commit()

    # Check if goal is now complete
    goal_complete = _check_goal_completion(db, current_user.id, step.goal_id)

    return {
        "ok": True,
        "message": f"Step '{step.title}' marked as complete",
        "goal_complete": goal_complete,
    }

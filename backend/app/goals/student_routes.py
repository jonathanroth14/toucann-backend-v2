"""
Goal Student Routes
Student-facing endpoints for goals and tasks
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.common.dependencies import get_db
from app.auth.models import User
from app.auth.utils import get_current_active_user
from app.goals.models import (
    Goal,
    GoalStep,
    UserGoalProgress,
    UserGoalStepProgress,
    SnoozedGoalTask,
    GoalStatus,
    GoalStepStatus,
)
from typing import Optional
from pydantic import BaseModel


# Schemas
class TaskDetail(BaseModel):
    """Detailed task info"""
    id: int
    goal_id: int
    goal_title: str
    title: str
    description: Optional[str]
    points: int
    sort_order: int
    is_required: bool
    is_completed: bool
    completed_at: Optional[datetime] = None
    snoozed_until: Optional[datetime] = None

    class Config:
        from_attributes = True


class TodayTaskResponse(BaseModel):
    """Response for /student/today-task endpoint"""
    task: Optional[TaskDetail]
    goal_progress: Optional[dict]
    available_count: int


router = APIRouter()


def _get_eligible_tasks(db: Session, user_id: int, exclude_task_ids: list[int] = None) -> list[tuple[GoalStep, Goal]]:
    """
    Get all eligible tasks for a user based on selection logic.

    Returns list of (task, goal) tuples ordered by priority.
    """
    exclude_task_ids = exclude_task_ids or []
    now = datetime.utcnow()

    # Get all active goals
    active_goals = db.query(Goal).filter(Goal.is_active == True).all()

    eligible_tasks = []

    for goal in active_goals:
        # Get all tasks for this goal, ordered by sort_order
        tasks = (
            db.query(GoalStep)
            .filter(GoalStep.goal_id == goal.id)
            .order_by(GoalStep.sort_order)
            .all()
        )

        for task in tasks:
            # Skip if in exclude list
            if task.id in exclude_task_ids:
                continue

            # Check if task is completed
            progress = (
                db.query(UserGoalStepProgress)
                .filter(
                    and_(
                        UserGoalStepProgress.user_id == user_id,
                        UserGoalStepProgress.step_id == task.id,
                        UserGoalStepProgress.status == GoalStepStatus.COMPLETE,
                    )
                )
                .first()
            )
            if progress:
                continue  # Skip completed tasks

            # Check if task is snoozed
            snoozed = (
                db.query(SnoozedGoalTask)
                .filter(
                    and_(
                        SnoozedGoalTask.user_id == user_id,
                        SnoozedGoalTask.step_id == task.id,
                        SnoozedGoalTask.snoozed_until > now,  # Still snoozed
                    )
                )
                .first()
            )
            if snoozed:
                continue  # Skip snoozed tasks

            # Task is eligible
            eligible_tasks.append((task, goal))
            break  # Only take first eligible task from each goal

    return eligible_tasks


def _get_task_detail(task: GoalStep, goal: Goal, user_id: int, db: Session) -> TaskDetail:
    """Convert a GoalStep to TaskDetail with progress info"""
    # Get completion status
    progress = (
        db.query(UserGoalStepProgress)
        .filter(
            and_(
                UserGoalStepProgress.user_id == user_id,
                UserGoalStepProgress.step_id == task.id,
            )
        )
        .first()
    )

    # Get snooze status
    snoozed = (
        db.query(SnoozedGoalTask)
        .filter(
            and_(
                SnoozedGoalTask.user_id == user_id,
                SnoozedGoalTask.step_id == task.id,
            )
        )
        .first()
    )

    return TaskDetail(
        id=task.id,
        goal_id=goal.id,
        goal_title=goal.title,
        title=task.title,
        description=task.description,
        points=task.points,
        sort_order=task.sort_order,
        is_required=task.is_required,
        is_completed=progress.status == GoalStepStatus.COMPLETE if progress else False,
        completed_at=progress.completed_at if progress else None,
        snoozed_until=snoozed.snoozed_until if snoozed else None,
    )


def _get_goal_progress(goal: Goal, user_id: int, db: Session) -> dict:
    """Get progress stats for a goal"""
    all_tasks = db.query(GoalStep).filter(GoalStep.goal_id == goal.id).all()
    completed_count = 0

    for task in all_tasks:
        progress = (
            db.query(UserGoalStepProgress)
            .filter(
                and_(
                    UserGoalStepProgress.user_id == user_id,
                    UserGoalStepProgress.step_id == task.id,
                    UserGoalStepProgress.status == GoalStepStatus.COMPLETE,
                )
            )
            .first()
        )
        if progress:
            completed_count += 1

    total_count = len(all_tasks)
    percentage = round((completed_count / total_count * 100)) if total_count > 0 else 0

    return {
        "goal_id": goal.id,
        "goal_title": goal.title,
        "total": total_count,
        "completed": completed_count,
        "percentage": percentage,
    }


@router.get("/student/today-task", response_model=TodayTaskResponse)
async def get_today_task(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get today's task for the student.
    Returns ONE task based on selection logic.
    """
    eligible_tasks = _get_eligible_tasks(db, current_user.id)

    if not eligible_tasks:
        return TodayTaskResponse(
            task=None,
            goal_progress=None,
            available_count=0,
        )

    # Return first eligible task (highest priority)
    task, goal = eligible_tasks[0]
    task_detail = _get_task_detail(task, goal, current_user.id, db)
    goal_progress = _get_goal_progress(goal, current_user.id, db)

    return TodayTaskResponse(
        task=task_detail,
        goal_progress=goal_progress,
        available_count=len(eligible_tasks),
    )


@router.post("/student/today-task/{task_id}/complete")
async def complete_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Mark a task as complete.
    Awards points and unlocks next task in the goal.
    """
    # Verify task exists
    task = db.query(GoalStep).filter(GoalStep.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Get or create progress
    progress = (
        db.query(UserGoalStepProgress)
        .filter(
            and_(
                UserGoalStepProgress.user_id == current_user.id,
                UserGoalStepProgress.step_id == task_id,
            )
        )
        .first()
    )

    if not progress:
        progress = UserGoalStepProgress(
            user_id=current_user.id,
            step_id=task_id,
            status=GoalStepStatus.COMPLETE,
            completed_at=datetime.utcnow(),
        )
        db.add(progress)
    else:
        if progress.status == GoalStepStatus.COMPLETE:
            return {
                "ok": True,
                "message": "Task already completed",
                "points_awarded": 0,
            }
        progress.status = GoalStepStatus.COMPLETE
        progress.completed_at = datetime.utcnow()

    db.commit()

    # Award points (could be enhanced to update user.total_points)
    points_awarded = task.points

    # Check if goal is complete
    goal = db.query(Goal).filter(Goal.id == task.goal_id).first()
    all_tasks = db.query(GoalStep).filter(GoalStep.goal_id == task.goal_id).all()

    all_complete = True
    for t in all_tasks:
        if not t.is_required:
            continue
        p = (
            db.query(UserGoalStepProgress)
            .filter(
                and_(
                    UserGoalStepProgress.user_id == current_user.id,
                    UserGoalStepProgress.step_id == t.id,
                    UserGoalStepProgress.status == GoalStepStatus.COMPLETE,
                )
            )
            .first()
        )
        if not p:
            all_complete = False
            break

    goal_complete = all_complete

    return {
        "ok": True,
        "message": f"Task '{task.title}' completed!",
        "points_awarded": points_awarded,
        "goal_complete": goal_complete,
    }


@router.post("/student/today-task/{task_id}/snooze")
async def snooze_task(
    task_id: int,
    days: int = Query(1, ge=1, le=30, description="Number of days to snooze"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Snooze a task until tomorrow (or specified days).
    Task will not appear in today-task until snooze expires.
    """
    # Verify task exists
    task = db.query(GoalStep).filter(GoalStep.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Calculate snooze until date
    snoozed_until = datetime.utcnow() + timedelta(days=days)

    # Check if already snoozed
    existing_snooze = (
        db.query(SnoozedGoalTask)
        .filter(
            and_(
                SnoozedGoalTask.user_id == current_user.id,
                SnoozedGoalTask.step_id == task_id,
            )
        )
        .first()
    )

    if existing_snooze:
        # Update existing snooze
        existing_snooze.snoozed_until = snoozed_until
        existing_snooze.snoozed_at = datetime.utcnow()
    else:
        # Create new snooze
        snooze = SnoozedGoalTask(
            user_id=current_user.id,
            step_id=task_id,
            snoozed_until=snoozed_until,
        )
        db.add(snooze)

    db.commit()

    return {
        "ok": True,
        "message": f"Task snoozed until {snoozed_until.strftime('%Y-%m-%d')}",
        "snoozed_until": snoozed_until.isoformat(),
    }


@router.post("/student/today-task/add-another", response_model=TodayTaskResponse)
async def add_another_task(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get the next available task (for "Add another task" button).
    Returns the second eligible task if available.
    """
    eligible_tasks = _get_eligible_tasks(db, current_user.id)

    if len(eligible_tasks) < 2:
        return TodayTaskResponse(
            task=None,
            goal_progress=None,
            available_count=len(eligible_tasks),
        )

    # Return second eligible task
    task, goal = eligible_tasks[1]
    task_detail = _get_task_detail(task, goal, current_user.id, db)
    goal_progress = _get_goal_progress(goal, current_user.id, db)

    return TodayTaskResponse(
        task=task_detail,
        goal_progress=goal_progress,
        available_count=len(eligible_tasks),
    )


@router.post("/student/today-task/swap", response_model=TodayTaskResponse)
async def swap_task(
    current_task_id: int = Query(..., description="ID of current task to swap away from"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Swap current task with next available task.
    Useful if student wants to skip current task for now.
    """
    # Get eligible tasks excluding the current one
    eligible_tasks = _get_eligible_tasks(db, current_user.id, exclude_task_ids=[current_task_id])

    if not eligible_tasks:
        return TodayTaskResponse(
            task=None,
            goal_progress=None,
            available_count=0,
        )

    # Return first eligible alternative task
    task, goal = eligible_tasks[0]
    task_detail = _get_task_detail(task, goal, current_user.id, db)
    goal_progress = _get_goal_progress(goal, current_user.id, db)

    return TodayTaskResponse(
        task=task_detail,
        goal_progress=goal_progress,
        available_count=len(eligible_tasks) + 1,  # +1 for the excluded task
    )

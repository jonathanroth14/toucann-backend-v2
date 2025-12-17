"""
Student Routes
Endpoints for student dashboard and current task flow
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.common.dependencies import get_db
from app.auth.models import User
from app.auth.utils import get_current_active_user
from app.challenges.models import (
    Challenge,
    Objective,
    UserChallengeProgress,
    UserObjectiveProgress,
    ChallengeStatus,
    ObjectiveStatus,
)
from app.goals.models import Goal, UserGoalProgress, GoalStatus

router = APIRouter()


@router.get("/student/today")
async def get_today_task(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get the student's "Today's Task" - their current active challenge.
    Returns:
    - current_goal: the goal this challenge belongs to
    - current_challenge: the active challenge (Today's Task)
    - all_challenges: all challenges in this goal with completion status
    - progress: overall goal progress
    """

    # Find the student's current IN_PROGRESS challenge
    current_progress = (
        db.query(UserChallengeProgress)
        .filter(
            and_(
                UserChallengeProgress.user_id == current_user.id,
                UserChallengeProgress.status == ChallengeStatus.IN_PROGRESS,
            )
        )
        .first()
    )

    # If no current challenge, try to auto-assign the first visible challenge
    if not current_progress:
        # Get the first active, visible challenge that the user hasn't completed
        completed_ids = [
            c[0]
            for c in db.query(UserChallengeProgress.challenge_id)
            .filter(
                and_(
                    UserChallengeProgress.user_id == current_user.id,
                    UserChallengeProgress.status == ChallengeStatus.COMPLETE,
                )
            )
            .all()
        ]

        # Get current UTC time for date filtering
        now = datetime.utcnow()

        # Build filters for available challenges
        filters = [
            Challenge.is_active == True,
            Challenge.visible_to_students == True,
            ~Challenge.id.in_(completed_ids) if completed_ids else True,
        ]

        # Add date range filters: challenge must be started and not expired
        # start_date: if set, must be <= now
        # expires_at: if set, must be > now
        filters.append(
            (Challenge.start_date == None) | (Challenge.start_date <= now)
        )
        filters.append(
            (Challenge.expires_at == None) | (Challenge.expires_at > now)
        )

        first_challenge = (
            db.query(Challenge)
            .filter(and_(*filters))
            .order_by(Challenge.sort_order, Challenge.id)
            .first()
        )

        if not first_challenge:
            return {
                "current_goal": None,
                "current_challenge": None,
                "all_challenges": [],
                "progress": {
                    "total": 0,
                    "completed": 0,
                    "percentage": 0,
                },
            }

        # Create progress for this challenge
        current_progress = UserChallengeProgress(
            user_id=current_user.id,
            challenge_id=first_challenge.id,
            status=ChallengeStatus.IN_PROGRESS,
            started_at=datetime.utcnow(),
        )
        db.add(current_progress)
        db.commit()
        db.refresh(current_progress)

    # Get the challenge
    challenge = db.query(Challenge).filter(Challenge.id == current_progress.challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    # Get the goal this challenge belongs to
    goal = None
    if challenge.goal_id:
        goal = db.query(Goal).filter(Goal.id == challenge.goal_id).first()

    # Get objectives for this challenge
    objectives = (
        db.query(Objective)
        .filter(Objective.challenge_id == challenge.id)
        .order_by(Objective.sort_order)
        .all()
    )

    # Get objective progress
    objectives_with_progress = []
    for obj in objectives:
        obj_progress = (
            db.query(UserObjectiveProgress)
            .filter(
                and_(
                    UserObjectiveProgress.user_id == current_user.id,
                    UserObjectiveProgress.objective_id == obj.id,
                )
            )
            .first()
        )

        objectives_with_progress.append({
            "id": obj.id,
            "title": obj.title,
            "description": obj.description,
            "points": obj.points,
            "sort_order": obj.sort_order,
            "is_required": obj.is_required,
            "status": obj_progress.status.value if obj_progress else ObjectiveStatus.INCOMPLETE.value,
            "completed_at": obj_progress.completed_at if obj_progress else None,
        })

    # Get all challenges in this goal (if goal exists)
    all_challenges = []
    progress_stats = {"total": 0, "completed": 0, "percentage": 0}

    if goal:
        all_challenges_query = (
            db.query(Challenge)
            .filter(Challenge.goal_id == goal.id)
            .order_by(Challenge.sort_order, Challenge.id)
            .all()
        )

        for ch in all_challenges_query:
            ch_progress = (
                db.query(UserChallengeProgress)
                .filter(
                    and_(
                        UserChallengeProgress.user_id == current_user.id,
                        UserChallengeProgress.challenge_id == ch.id,
                    )
                )
                .first()
            )

            all_challenges.append({
                "id": ch.id,
                "title": ch.title,
                "points": ch.points,
                "sort_order": ch.sort_order,
                "status": ch_progress.status.value if ch_progress else ChallengeStatus.NOT_STARTED.value,
                "is_current": ch.id == challenge.id,
            })

        progress_stats["total"] = len(all_challenges_query)
        progress_stats["completed"] = sum(
            1 for ch in all_challenges if ch["status"] == ChallengeStatus.COMPLETE.value
        )
        progress_stats["percentage"] = (
            int((progress_stats["completed"] / progress_stats["total"]) * 100)
            if progress_stats["total"] > 0
            else 0
        )

    return {
        "current_goal": {
            "id": goal.id,
            "title": goal.title,
            "description": goal.description,
        } if goal else None,
        "current_challenge": {
            "id": challenge.id,
            "title": challenge.title,
            "description": challenge.description,
            "points": challenge.points,
            "category": challenge.category,
            "due_date": challenge.due_date,
            "objectives": objectives_with_progress,
            "has_next": challenge.next_challenge_id is not None,
        },
        "all_challenges": all_challenges,
        "progress": progress_stats,
    }


@router.post("/student/challenges/{challenge_id}/complete")
async def complete_challenge(
    challenge_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Mark a challenge as complete.
    If next_challenge_id exists, activate that challenge.
    """
    # Get the challenge
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    # Get user progress
    progress = (
        db.query(UserChallengeProgress)
        .filter(
            and_(
                UserChallengeProgress.user_id == current_user.id,
                UserChallengeProgress.challenge_id == challenge_id,
            )
        )
        .first()
    )

    if not progress:
        progress = UserChallengeProgress(
            user_id=current_user.id,
            challenge_id=challenge_id,
        )
        db.add(progress)

    # Mark as complete
    progress.status = ChallengeStatus.COMPLETE
    progress.completed_at = datetime.utcnow()
    db.commit()

    # If there's a next challenge, activate it
    if challenge.next_challenge_id:
        next_progress = (
            db.query(UserChallengeProgress)
            .filter(
                and_(
                    UserChallengeProgress.user_id == current_user.id,
                    UserChallengeProgress.challenge_id == challenge.next_challenge_id,
                )
            )
            .first()
        )

        if not next_progress:
            next_progress = UserChallengeProgress(
                user_id=current_user.id,
                challenge_id=challenge.next_challenge_id,
                status=ChallengeStatus.IN_PROGRESS,
                started_at=datetime.utcnow(),
            )
            db.add(next_progress)
        else:
            next_progress.status = ChallengeStatus.IN_PROGRESS
            if not next_progress.started_at:
                next_progress.started_at = datetime.utcnow()

        db.commit()

        return {
            "ok": True,
            "message": f"Challenge '{challenge.title}' completed!",
            "next_challenge_activated": True,
            "next_challenge_id": challenge.next_challenge_id,
        }

    return {
        "ok": True,
        "message": f"Challenge '{challenge.title}' completed!",
        "next_challenge_activated": False,
        "next_challenge_id": None,
    }

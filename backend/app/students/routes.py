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
    UserChallengePreferences,
    SnoozedChallenge,
)
from app.goals.models import Goal, UserGoalProgress, GoalStatus
from app.notifications.service import NotificationService

router = APIRouter()


def _get_challenge_chain(db: Session, challenge: Challenge, max_depth: int = 5) -> list:
    """Helper function to get the challenge chain (preview of upcoming challenges)"""
    chain = []
    current = challenge
    depth = 0

    while current and current.next_challenge_id and depth < max_depth:
        next_challenge = db.query(Challenge).filter(Challenge.id == current.next_challenge_id).first()
        if next_challenge:
            chain.append({
                "id": next_challenge.id,
                "title": next_challenge.title,
                "points": next_challenge.points,
                "category": next_challenge.category,
            })
            current = next_challenge
            depth += 1
        else:
            break

    return chain


def _get_available_challenges(db: Session, user_id: int, exclude_ids: list = None) -> list:
    """Helper function to get available challenges (not completed, not snoozed, within date range)"""
    if exclude_ids is None:
        exclude_ids = []

    # Get completed challenge IDs
    completed_ids = [
        c[0]
        for c in db.query(UserChallengeProgress.challenge_id)
        .filter(
            and_(
                UserChallengeProgress.user_id == user_id,
                UserChallengeProgress.status == ChallengeStatus.COMPLETE,
            )
        )
        .all()
    ]

    # Get snoozed challenge IDs (still snoozed)
    now = datetime.utcnow()
    snoozed_ids = [
        s[0]
        for s in db.query(SnoozedChallenge.challenge_id)
        .filter(
            and_(
                SnoozedChallenge.user_id == user_id,
                SnoozedChallenge.snoozed_until > now,
            )
        )
        .all()
    ]

    # Combine all exclusions
    all_excluded = set(completed_ids + snoozed_ids + exclude_ids)

    # Build filters
    filters = [
        Challenge.is_active == True,
        Challenge.visible_to_students == True,
    ]

    if all_excluded:
        filters.append(~Challenge.id.in_(all_excluded))

    # Date range filters
    filters.append((Challenge.start_date == None) | (Challenge.start_date <= now))
    filters.append((Challenge.expires_at == None) | (Challenge.expires_at > now))

    return (
        db.query(Challenge)
        .filter(and_(*filters))
        .order_by(Challenge.sort_order, Challenge.id)
        .all()
    )


@router.get("/student/today")
async def get_today_task(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get the student's "Today's Task" - their current active challenge(s).
    Returns:
    - current_goal: the goal this challenge belongs to
    - primary_challenge: the main active challenge (Today's Task)
    - secondary_challenge: the second slot challenge (if enabled)
    - challenge_chain: preview of upcoming challenges in the chain
    - all_challenges: all challenges in this goal with completion status
    - progress: overall goal progress
    - second_slot_enabled: whether user has enabled second slot
    """

    # Get user preferences
    prefs = (
        db.query(UserChallengePreferences)
        .filter(UserChallengePreferences.user_id == current_user.id)
        .first()
    )

    if not prefs:
        # Create default preferences
        prefs = UserChallengePreferences(user_id=current_user.id, second_slot_enabled=False)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

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

    # If no current challenge, try to auto-assign the first available challenge
    if not current_progress:
        available_challenges = _get_available_challenges(db, current_user.id)

        if not available_challenges:
            return {
                "current_goal": None,
                "primary_challenge": None,
                "secondary_challenge": None,
                "challenge_chain": [],
                "all_challenges": [],
                "progress": {
                    "total": 0,
                    "completed": 0,
                    "percentage": 0,
                },
                "second_slot_enabled": prefs.second_slot_enabled,
            }

        first_challenge = available_challenges[0]

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

    # Get the challenge chain for preview
    challenge_chain = _get_challenge_chain(db, challenge)

    # Get secondary challenge if enabled
    secondary_challenge_data = None
    if prefs.second_slot_enabled and prefs.second_slot_challenge_id:
        secondary_challenge = db.query(Challenge).filter(Challenge.id == prefs.second_slot_challenge_id).first()
        if secondary_challenge:
            # Get objectives for secondary challenge
            sec_objectives = (
                db.query(Objective)
                .filter(Objective.challenge_id == secondary_challenge.id)
                .order_by(Objective.sort_order)
                .all()
            )

            # Get objective progress
            sec_objectives_with_progress = []
            for obj in sec_objectives:
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

                sec_objectives_with_progress.append({
                    "id": obj.id,
                    "title": obj.title,
                    "description": obj.description,
                    "points": obj.points,
                    "sort_order": obj.sort_order,
                    "is_required": obj.is_required,
                    "status": obj_progress.status.value if obj_progress else ObjectiveStatus.INCOMPLETE.value,
                    "completed_at": obj_progress.completed_at if obj_progress else None,
                })

            secondary_challenge_data = {
                "id": secondary_challenge.id,
                "title": secondary_challenge.title,
                "description": secondary_challenge.description,
                "points": secondary_challenge.points,
                "category": secondary_challenge.category,
                "due_date": secondary_challenge.due_date,
                "objectives": sec_objectives_with_progress,
            }

    return {
        "current_goal": {
            "id": goal.id,
            "title": goal.title,
            "description": goal.description,
        } if goal else None,
        "primary_challenge": {
            "id": challenge.id,
            "title": challenge.title,
            "description": challenge.description,
            "points": challenge.points,
            "category": challenge.category,
            "due_date": challenge.due_date,
            "objectives": objectives_with_progress,
            "has_next": challenge.next_challenge_id is not None,
        },
        "secondary_challenge": secondary_challenge_data,
        "challenge_chain": challenge_chain,
        "all_challenges": all_challenges,
        "progress": progress_stats,
        "second_slot_enabled": prefs.second_slot_enabled,
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

    # Generate streak encouragement notification
    try:
        notification_service = NotificationService(db)
        notification_service.generate_streak_encouragement(current_user.id, challenge.id)
    except Exception as e:
        # Don't fail the completion if notification generation fails
        print(f"Failed to generate streak notification: {e}")

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


@router.post("/me/today/add-slot")
async def add_second_slot(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Enable the second challenge slot for today.
    Automatically assigns the next available challenge to the second slot.
    """
    # Get or create user preferences
    prefs = (
        db.query(UserChallengePreferences)
        .filter(UserChallengePreferences.user_id == current_user.id)
        .first()
    )

    if not prefs:
        prefs = UserChallengePreferences(user_id=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    if prefs.second_slot_enabled:
        return {
            "ok": True,
            "message": "Second slot already enabled",
            "second_slot_challenge_id": prefs.second_slot_challenge_id,
        }

    # Get the current primary challenge
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

    # Get available challenges (exclude primary challenge)
    exclude_ids = [current_progress.challenge_id] if current_progress else []
    available_challenges = _get_available_challenges(db, current_user.id, exclude_ids)

    if not available_challenges:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No available challenges for second slot",
        )

    # Assign the first available challenge to the second slot
    second_challenge = available_challenges[0]

    prefs.second_slot_enabled = True
    prefs.second_slot_challenge_id = second_challenge.id
    prefs.updated_at = datetime.utcnow()
    db.commit()

    return {
        "ok": True,
        "message": "Second slot enabled",
        "second_slot_challenge_id": second_challenge.id,
        "challenge": {
            "id": second_challenge.id,
            "title": second_challenge.title,
            "description": second_challenge.description,
            "points": second_challenge.points,
            "category": second_challenge.category,
        },
    }


@router.post("/me/today/swap")
async def swap_challenge(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Swap the current primary challenge with another available challenge.
    The current challenge is returned to the available pool.
    """
    # Get the current primary challenge
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

    if not current_progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active challenge to swap",
        )

    # Get available challenges (excluding current one)
    available_challenges = _get_available_challenges(db, current_user.id, [current_progress.challenge_id])

    if not available_challenges:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No other challenges available to swap with",
        )

    # Mark current challenge as NOT_STARTED (return to pool)
    current_progress.status = ChallengeStatus.NOT_STARTED
    current_progress.started_at = None

    # Assign the next available challenge
    new_challenge = available_challenges[0]

    # Check if progress exists for new challenge
    new_progress = (
        db.query(UserChallengeProgress)
        .filter(
            and_(
                UserChallengeProgress.user_id == current_user.id,
                UserChallengeProgress.challenge_id == new_challenge.id,
            )
        )
        .first()
    )

    if not new_progress:
        new_progress = UserChallengeProgress(
            user_id=current_user.id,
            challenge_id=new_challenge.id,
            status=ChallengeStatus.IN_PROGRESS,
            started_at=datetime.utcnow(),
        )
        db.add(new_progress)
    else:
        new_progress.status = ChallengeStatus.IN_PROGRESS
        new_progress.started_at = datetime.utcnow()

    db.commit()

    return {
        "ok": True,
        "message": "Challenge swapped successfully",
        "new_challenge_id": new_challenge.id,
        "challenge": {
            "id": new_challenge.id,
            "title": new_challenge.title,
            "description": new_challenge.description,
            "points": new_challenge.points,
            "category": new_challenge.category,
        },
    }


@router.post("/me/today/snooze")
async def snooze_challenge(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    days: int = 1,
):
    """
    Snooze the current primary challenge until tomorrow (or X days).
    The challenge will be hidden and another challenge will be activated.
    """
    from datetime import timedelta

    if days < 1 or days > 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snooze days must be between 1 and 30",
        )

    # Get the current primary challenge
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

    if not current_progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active challenge to snooze",
        )

    # Check if already snoozed
    existing_snooze = (
        db.query(SnoozedChallenge)
        .filter(
            and_(
                SnoozedChallenge.user_id == current_user.id,
                SnoozedChallenge.challenge_id == current_progress.challenge_id,
            )
        )
        .first()
    )

    now = datetime.utcnow()
    snoozed_until = now + timedelta(days=days)

    if existing_snooze:
        # Update existing snooze
        existing_snooze.snoozed_until = snoozed_until
        existing_snooze.snoozed_at = now
    else:
        # Create new snooze record
        snooze = SnoozedChallenge(
            user_id=current_user.id,
            challenge_id=current_progress.challenge_id,
            snoozed_at=now,
            snoozed_until=snoozed_until,
        )
        db.add(snooze)

    # Mark current challenge as NOT_STARTED
    current_progress.status = ChallengeStatus.NOT_STARTED
    current_progress.started_at = None

    # Get next available challenge (excluding snoozed one)
    available_challenges = _get_available_challenges(db, current_user.id)

    if available_challenges:
        new_challenge = available_challenges[0]

        # Create progress for new challenge
        new_progress = (
            db.query(UserChallengeProgress)
            .filter(
                and_(
                    UserChallengeProgress.user_id == current_user.id,
                    UserChallengeProgress.challenge_id == new_challenge.id,
                )
            )
            .first()
        )

        if not new_progress:
            new_progress = UserChallengeProgress(
                user_id=current_user.id,
                challenge_id=new_challenge.id,
                status=ChallengeStatus.IN_PROGRESS,
                started_at=datetime.utcnow(),
            )
            db.add(new_progress)
        else:
            new_progress.status = ChallengeStatus.IN_PROGRESS
            new_progress.started_at = datetime.utcnow()

    db.commit()

    return {
        "ok": True,
        "message": f"Challenge snoozed until {snoozed_until.strftime('%Y-%m-%d')}",
        "snoozed_until": snoozed_until.isoformat(),
        "new_challenge_activated": bool(available_challenges),
        "new_challenge_id": available_challenges[0].id if available_challenges else None,
    }

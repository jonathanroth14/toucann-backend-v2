"""
Student Routes
Endpoints for student dashboard and current task flow
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel

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
from app.students.models import StudentState, SnoozedChallenge

router = APIRouter()


# Request/Response models
class SwapChallengeRequest(BaseModel):
    """Request to swap current challenge"""
    new_challenge_id: int
    slot: int = 1  # 1 or 2


class SnoozeChallengeRequest(BaseModel):
    """Request to snooze current challenge"""
    challenge_id: int
    days: int = 1


def _get_challenge_with_objectives(
    challenge_id: int,
    user_id: int,
    db: Session,
) -> Optional[Dict[str, Any]]:
    """Helper to get a challenge with its objectives and progress"""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        return None

    # Get objectives
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
                    UserObjectiveProgress.user_id == user_id,
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

    return {
        "id": challenge.id,
        "title": challenge.title,
        "description": challenge.description,
        "points": challenge.points,
        "category": challenge.category,
        "due_date": challenge.due_date,
        "objectives": objectives_with_progress,
        "has_next": challenge.next_challenge_id is not None,
        "next_challenge_id": challenge.next_challenge_id,
    }


def _get_chain_preview(challenge_id: int, db: Session, max_depth: int = 5) -> List[Dict[str, Any]]:
    """Get the chain of challenges following this one"""
    chain = []
    current_id = challenge_id
    depth = 0

    while current_id and depth < max_depth:
        challenge = db.query(Challenge).filter(Challenge.id == current_id).first()
        if not challenge or not challenge.next_challenge_id:
            break

        next_challenge = db.query(Challenge).filter(Challenge.id == challenge.next_challenge_id).first()
        if next_challenge:
            chain.append({
                "id": next_challenge.id,
                "title": next_challenge.title,
                "category": next_challenge.category,
                "points": next_challenge.points,
            })
            current_id = next_challenge.next_challenge_id
            depth += 1
        else:
            break

    return chain


@router.get("/student/today")
async def get_today_task(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get the student's "Today's Task" - their current active challenge(s).
    """
    # Get or create student state
    student_state = db.query(StudentState).filter(StudentState.user_id == current_user.id).first()
    if not student_state:
        student_state = StudentState(user_id=current_user.id, second_slot_enabled=False)
        db.add(student_state)
        db.commit()
        db.refresh(student_state)

    # Get snoozed challenge IDs
    now = datetime.utcnow()
    snoozed_ids = [
        s[0]
        for s in db.query(SnoozedChallenge.challenge_id)
        .filter(
            and_(
                SnoozedChallenge.user_id == current_user.id,
                SnoozedChallenge.snoozed_until > now,
            )
        )
        .all()
    ]

    # Get completed challenge IDs
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

    # Find the student's current IN_PROGRESS challenges
    current_progresses = (
        db.query(UserChallengeProgress)
        .filter(
            and_(
                UserChallengeProgress.user_id == current_user.id,
                UserChallengeProgress.status == ChallengeStatus.IN_PROGRESS,
            )
        )
        .limit(2)  # Max 2 slots
        .all()
    )

    # Get available challenges for auto-assignment or swapping
    exclude_ids = completed_ids + snoozed_ids
    filters = [
        Challenge.is_active == True,
        Challenge.visible_to_students == True,
        ~Challenge.id.in_(exclude_ids) if exclude_ids else True,
        (Challenge.start_date == None) | (Challenge.start_date <= now),
        (Challenge.expires_at == None) | (Challenge.expires_at > now),
    ]

    available_challenges = (
        db.query(Challenge)
        .filter(and_(*filters))
        .order_by(Challenge.sort_order, Challenge.id)
        .limit(10)
        .all()
    )

    # If no current challenge, auto-assign the first available
    if not current_progresses and available_challenges:
        first_challenge = available_challenges[0]
        current_progress = UserChallengeProgress(
            user_id=current_user.id,
            challenge_id=first_challenge.id,
            status=ChallengeStatus.IN_PROGRESS,
            started_at=datetime.utcnow(),
        )
        db.add(current_progress)
        db.commit()
        current_progresses = [current_progress]

    # Build response
    primary_challenge = None
    second_challenge = None
    chain_preview = []
    goal = None

    if current_progresses:
        # Primary challenge (first slot)
        primary_challenge_data = _get_challenge_with_objectives(
            current_progresses[0].challenge_id,
            current_user.id,
            db,
        )
        if primary_challenge_data:
            primary_challenge = primary_challenge_data
            chain_preview = _get_chain_preview(current_progresses[0].challenge_id, db)

            # Get goal
            challenge_obj = db.query(Challenge).filter(Challenge.id == current_progresses[0].challenge_id).first()
            if challenge_obj and challenge_obj.goal_id:
                goal_obj = db.query(Goal).filter(Goal.id == challenge_obj.goal_id).first()
                if goal_obj:
                    goal = {
                        "id": goal_obj.id,
                        "title": goal_obj.title,
                        "description": goal_obj.description,
                    }

        # Second challenge (if enabled and exists)
        if student_state.second_slot_enabled and len(current_progresses) > 1:
            second_challenge = _get_challenge_with_objectives(
                current_progresses[1].challenge_id,
                current_user.id,
                db,
            )

    # Format available challenges for swapping
    available_for_swap = []
    for ch in available_challenges:
        # Don't include challenges already in progress
        in_progress_ids = [p.challenge_id for p in current_progresses]
        if ch.id not in in_progress_ids:
            available_for_swap.append({
                "id": ch.id,
                "title": ch.title,
                "category": ch.category,
                "points": ch.points,
                "description": ch.description,
            })

    # Get all challenges for progress tracking
    all_challenges = []
    progress_stats = {"total": 0, "completed": 0, "percentage": 0}

    if goal:
        all_challenges_query = (
            db.query(Challenge)
            .filter(Challenge.goal_id == goal["id"])
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
                "is_current": primary_challenge and ch.id == primary_challenge["id"],
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
        "current_goal": goal,
        "current_challenge": primary_challenge,
        "second_challenge": second_challenge,
        "chain_preview": chain_preview,
        "available_challenges": available_for_swap[:5],  # Limit to 5 for UI
        "student_state": {
            "second_slot_enabled": student_state.second_slot_enabled,
            "can_add_second_slot": len(available_for_swap) > 0,
        },
        "all_challenges": all_challenges,
        "progress": progress_stats,
    }


@router.post("/student/today/add-slot")
async def add_second_slot(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Enable the second task slot for today"""
    # Get or create student state
    student_state = db.query(StudentState).filter(StudentState.user_id == current_user.id).first()
    if not student_state:
        student_state = StudentState(user_id=current_user.id, second_slot_enabled=False)
        db.add(student_state)

    student_state.second_slot_enabled = True
    db.commit()

    return {
        "ok": True,
        "message": "Second task slot enabled",
        "second_slot_enabled": True,
    }


@router.post("/student/today/swap")
async def swap_challenge(
    request: SwapChallengeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Swap current challenge with another available challenge"""
    # Get the new challenge
    new_challenge = db.query(Challenge).filter(Challenge.id == request.new_challenge_id).first()
    if not new_challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    # Get current progresses
    current_progresses = (
        db.query(UserChallengeProgress)
        .filter(
            and_(
                UserChallengeProgress.user_id == current_user.id,
                UserChallengeProgress.status == ChallengeStatus.IN_PROGRESS,
            )
        )
        .order_by(UserChallengeProgress.started_at)
        .all()
    )

    if not current_progresses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active challenge to swap",
        )

    # Determine which slot to swap (default to first)
    slot_index = request.slot - 1
    if slot_index >= len(current_progresses):
        slot_index = 0

    old_progress = current_progresses[slot_index]

    # Mark old challenge as NOT_STARTED (revert it)
    old_progress.status = ChallengeStatus.NOT_STARTED
    old_progress.started_at = None

    # Create or update progress for new challenge
    new_progress = (
        db.query(UserChallengeProgress)
        .filter(
            and_(
                UserChallengeProgress.user_id == current_user.id,
                UserChallengeProgress.challenge_id == request.new_challenge_id,
            )
        )
        .first()
    )

    if not new_progress:
        new_progress = UserChallengeProgress(
            user_id=current_user.id,
            challenge_id=request.new_challenge_id,
            status=ChallengeStatus.IN_PROGRESS,
            started_at=datetime.utcnow(),
        )
        db.add(new_progress)
    else:
        new_progress.status = ChallengeStatus.IN_PROGRESS
        if not new_progress.started_at:
            new_progress.started_at = datetime.utcnow()

    db.commit()

    return {
        "ok": True,
        "message": f"Swapped to '{new_challenge.title}'",
        "new_challenge_id": new_challenge.id,
    }


@router.post("/student/today/snooze")
async def snooze_challenge(
    request: SnoozeChallengeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Snooze a challenge for N days"""
    # Get the challenge
    challenge = db.query(Challenge).filter(Challenge.id == request.challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    # Get current progress
    progress = (
        db.query(UserChallengeProgress)
        .filter(
            and_(
                UserChallengeProgress.user_id == current_user.id,
                UserChallengeProgress.challenge_id == request.challenge_id,
                UserChallengeProgress.status == ChallengeStatus.IN_PROGRESS,
            )
        )
        .first()
    )

    if not progress:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge is not in progress",
        )

    # Mark as NOT_STARTED
    progress.status = ChallengeStatus.NOT_STARTED
    progress.started_at = None

    # Add to snoozed challenges
    snoozed_until = datetime.utcnow() + timedelta(days=request.days)
    snoozed = SnoozedChallenge(
        user_id=current_user.id,
        challenge_id=request.challenge_id,
        snoozed_until=snoozed_until,
    )
    db.add(snoozed)
    db.commit()

    return {
        "ok": True,
        "message": f"Challenge snoozed for {request.days} day(s)",
        "snoozed_until": snoozed_until,
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


@router.post("/me/objectives/{objective_id}/complete")
async def complete_objective(
    objective_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Mark an objective as complete"""
    # Get the objective
    objective = db.query(Objective).filter(Objective.id == objective_id).first()
    if not objective:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objective not found",
        )

    # Get or create objective progress
    obj_progress = (
        db.query(UserObjectiveProgress)
        .filter(
            and_(
                UserObjectiveProgress.user_id == current_user.id,
                UserObjectiveProgress.objective_id == objective_id,
            )
        )
        .first()
    )

    if not obj_progress:
        obj_progress = UserObjectiveProgress(
            user_id=current_user.id,
            objective_id=objective_id,
        )
        db.add(obj_progress)

    obj_progress.status = ObjectiveStatus.COMPLETE
    obj_progress.completed_at = datetime.utcnow()
    db.commit()

    # Check if all required objectives are complete
    all_objectives = (
        db.query(Objective)
        .filter(Objective.challenge_id == objective.challenge_id)
        .all()
    )

    all_required_complete = True
    for obj in all_objectives:
        if obj.is_required:
            prog = (
                db.query(UserObjectiveProgress)
                .filter(
                    and_(
                        UserObjectiveProgress.user_id == current_user.id,
                        UserObjectiveProgress.objective_id == obj.id,
                    )
                )
                .first()
            )
            if not prog or prog.status != ObjectiveStatus.COMPLETE:
                all_required_complete = False
                break

    return {
        "ok": True,
        "message": f"Objective '{objective.title}' completed!",
        "all_required_complete": all_required_complete,
        "challenge_id": objective.challenge_id,
    }

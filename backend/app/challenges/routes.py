"""
Student-facing Challenge Routes
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.common.dependencies import get_db
from app.auth.models import User
from app.auth.utils import get_current_active_user
from app.challenges.models import (
    Challenge,
    Objective,
    ChallengeLink,
    UserChallengeProgress,
    UserObjectiveProgress,
    ChallengeStatus,
    ObjectiveStatus,
)
from app.challenges.schemas import ActiveChallengeResponse, ObjectiveWithProgress

router = APIRouter()


def get_or_assign_active_challenge(db: Session, user_id: int) -> tuple[Challenge, UserChallengeProgress]:
    """
    Get the user's active challenge or assign the first available one.
    Returns (Challenge, UserChallengeProgress)
    """
    # Check if user has an IN_PROGRESS challenge
    in_progress = (
        db.query(UserChallengeProgress)
        .filter(
            UserChallengeProgress.user_id == user_id,
            UserChallengeProgress.status == ChallengeStatus.IN_PROGRESS,
        )
        .first()
    )

    if in_progress:
        challenge = db.query(Challenge).filter(Challenge.id == in_progress.challenge_id).first()
        return challenge, in_progress

    # No IN_PROGRESS challenge, find the first active challenge user hasn't completed
    completed_challenge_ids = (
        db.query(UserChallengeProgress.challenge_id)
        .filter(
            UserChallengeProgress.user_id == user_id,
            UserChallengeProgress.status == ChallengeStatus.COMPLETE,
        )
        .all()
    )
    completed_ids = [c[0] for c in completed_challenge_ids]

    # Get first active challenge not completed
    challenge = (
        db.query(Challenge)
        .filter(Challenge.is_active == True, ~Challenge.id.in_(completed_ids) if completed_ids else True)
        .order_by(Challenge.id)
        .first()
    )

    if not challenge:
        return None, None

    # Create or update progress to IN_PROGRESS
    progress = (
        db.query(UserChallengeProgress)
        .filter(
            UserChallengeProgress.user_id == user_id,
            UserChallengeProgress.challenge_id == challenge.id,
        )
        .first()
    )

    if not progress:
        progress = UserChallengeProgress(
            user_id=user_id,
            challenge_id=challenge.id,
            status=ChallengeStatus.IN_PROGRESS,
            started_at=datetime.utcnow(),
        )
        db.add(progress)
    else:
        progress.status = ChallengeStatus.IN_PROGRESS
        if not progress.started_at:
            progress.started_at = datetime.utcnow()

    db.commit()
    db.refresh(progress)

    return challenge, progress


@router.get("/me/active-challenge", response_model=ActiveChallengeResponse)
async def get_active_challenge(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get the user's current active challenge with objectives and progress
    """
    challenge, progress = get_or_assign_active_challenge(db, current_user.id)

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active challenges available",
        )

    # Get objectives sorted by sort_order
    objectives = (
        db.query(Objective)
        .filter(Objective.challenge_id == challenge.id)
        .order_by(Objective.sort_order)
        .all()
    )

    # Get user's objective progress
    objective_progress_map = {}
    for obj in objectives:
        obj_progress = (
            db.query(UserObjectiveProgress)
            .filter(
                UserObjectiveProgress.user_id == current_user.id,
                UserObjectiveProgress.objective_id == obj.id,
            )
            .first()
        )
        if obj_progress:
            objective_progress_map[obj.id] = obj_progress
        else:
            # Create NOT_STARTED progress
            obj_progress = UserObjectiveProgress(
                user_id=current_user.id,
                objective_id=obj.id,
                status=ObjectiveStatus.INCOMPLETE,
            )
            db.add(obj_progress)
            objective_progress_map[obj.id] = obj_progress

    db.commit()

    # Build response
    objectives_with_progress = []
    for obj in objectives:
        obj_progress = objective_progress_map[obj.id]
        objectives_with_progress.append(
            ObjectiveWithProgress(
                id=obj.id,
                challenge_id=obj.challenge_id,
                title=obj.title,
                description=obj.description,
                points=obj.points,
                sort_order=obj.sort_order,
                is_required=obj.is_required,
                status=obj_progress.status,
                completed_at=obj_progress.completed_at,
            )
        )

    return ActiveChallengeResponse(
        id=challenge.id,
        title=challenge.title,
        description=challenge.description,
        is_active=challenge.is_active,
        created_by=challenge.created_by,
        created_at=challenge.created_at,
        objectives=objectives_with_progress,
        status=progress.status,
        started_at=progress.started_at,
        completed_at=progress.completed_at,
    )


@router.post("/me/objectives/{objective_id}/complete", response_model=ActiveChallengeResponse)
async def complete_objective(
    objective_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Mark an objective as complete for the current user.
    If all required objectives are complete, mark challenge as complete and activate next challenge.
    """
    # Get the objective
    objective = db.query(Objective).filter(Objective.id == objective_id).first()
    if not objective:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objective not found",
        )

    # Get or create user objective progress
    obj_progress = (
        db.query(UserObjectiveProgress)
        .filter(
            UserObjectiveProgress.user_id == current_user.id,
            UserObjectiveProgress.objective_id == objective_id,
        )
        .first()
    )

    if not obj_progress:
        obj_progress = UserObjectiveProgress(
            user_id=current_user.id,
            objective_id=objective_id,
        )
        db.add(obj_progress)

    # Mark as complete
    obj_progress.status = ObjectiveStatus.COMPLETE
    obj_progress.completed_at = datetime.utcnow()
    db.commit()

    # Check if all required objectives in this challenge are complete
    challenge_id = objective.challenge_id
    all_objectives = db.query(Objective).filter(Objective.challenge_id == challenge_id).all()

    all_required_complete = True
    for obj in all_objectives:
        if obj.is_required:
            obj_prog = (
                db.query(UserObjectiveProgress)
                .filter(
                    UserObjectiveProgress.user_id == current_user.id,
                    UserObjectiveProgress.objective_id == obj.id,
                )
                .first()
            )
            if not obj_prog or obj_prog.status != ObjectiveStatus.COMPLETE:
                all_required_complete = False
                break

    # If all required objectives complete, mark challenge as complete
    if all_required_complete:
        challenge_progress = (
            db.query(UserChallengeProgress)
            .filter(
                UserChallengeProgress.user_id == current_user.id,
                UserChallengeProgress.challenge_id == challenge_id,
            )
            .first()
        )

        if challenge_progress:
            challenge_progress.status = ChallengeStatus.COMPLETE
            challenge_progress.completed_at = datetime.utcnow()
            db.commit()

        # Find next challenge via challenge_links
        next_link = (
            db.query(ChallengeLink)
            .filter(
                ChallengeLink.from_challenge_id == challenge_id,
                ChallengeLink.condition == "ON_COMPLETE",
            )
            .first()
        )

        if next_link:
            # Activate next challenge
            next_challenge_id = next_link.to_challenge_id
            next_progress = (
                db.query(UserChallengeProgress)
                .filter(
                    UserChallengeProgress.user_id == current_user.id,
                    UserChallengeProgress.challenge_id == next_challenge_id,
                )
                .first()
            )

            if not next_progress:
                next_progress = UserChallengeProgress(
                    user_id=current_user.id,
                    challenge_id=next_challenge_id,
                    status=ChallengeStatus.IN_PROGRESS,
                    started_at=datetime.utcnow(),
                )
                db.add(next_progress)
            else:
                next_progress.status = ChallengeStatus.IN_PROGRESS
                if not next_progress.started_at:
                    next_progress.started_at = datetime.utcnow()

            db.commit()

    # Return updated active challenge
    challenge, progress = get_or_assign_active_challenge(db, current_user.id)

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active challenges available",
        )

    # Get objectives with progress
    objectives = (
        db.query(Objective)
        .filter(Objective.challenge_id == challenge.id)
        .order_by(Objective.sort_order)
        .all()
    )

    objectives_with_progress = []
    for obj in objectives:
        obj_progress = (
            db.query(UserObjectiveProgress)
            .filter(
                UserObjectiveProgress.user_id == current_user.id,
                UserObjectiveProgress.objective_id == obj.id,
            )
            .first()
        )
        if not obj_progress:
            obj_progress = UserObjectiveProgress(
                user_id=current_user.id,
                objective_id=obj.id,
                status=ObjectiveStatus.INCOMPLETE,
            )
            db.add(obj_progress)
            db.commit()

        objectives_with_progress.append(
            ObjectiveWithProgress(
                id=obj.id,
                challenge_id=obj.challenge_id,
                title=obj.title,
                description=obj.description,
                points=obj.points,
                sort_order=obj.sort_order,
                is_required=obj.is_required,
                status=obj_progress.status,
                completed_at=obj_progress.completed_at,
            )
        )

    return ActiveChallengeResponse(
        id=challenge.id,
        title=challenge.title,
        description=challenge.description,
        is_active=challenge.is_active,
        created_by=challenge.created_by,
        created_at=challenge.created_at,
        objectives=objectives_with_progress,
        status=progress.status,
        started_at=progress.started_at,
        completed_at=progress.completed_at,
    )

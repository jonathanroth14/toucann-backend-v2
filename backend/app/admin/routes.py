"""
Admin Routes
"""
import secrets
import string
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.common.dependencies import get_db, require_admin
from app.auth.models import User
from app.auth.utils import get_password_hash, get_current_active_user
from app.users.models import Profile
from app.challenges.models import (
    Challenge,
    Objective,
    ChallengeLink,
    UserChallengeProgress,
    UserObjectiveProgress,
    ObjectiveStatus,
)
from app.challenges.schemas import (
    ChallengeCreate,
    ChallengeUpdate,
    ChallengeResponse,
    ChallengeWithObjectives,
    ObjectiveCreate,
    ObjectiveUpdate,
    ObjectiveResponse,
    ChallengeLinkCreate,
    ChallengeLinkResponse,
)
from app.admin.schemas import (
    UserListResponse,
    UserActivityResponse,
    ChallengeProgressDetail,
    PasswordResetResponse,
)

router = APIRouter()


def generate_temp_password(length: int = 12) -> str:
    """Generate a secure temporary password"""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    # Ensure at least one of each type
    password = [
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
        secrets.choice(string.punctuation),
    ]
    # Fill the rest randomly
    password += [secrets.choice(alphabet) for _ in range(length - 4)]
    # Shuffle
    secrets.SystemRandom().shuffle(password)
    return "".join(password)


# Challenge Management
@router.get("/challenges", response_model=list[ChallengeResponse])
async def list_challenges(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all challenges (admin only)"""
    challenges = db.query(Challenge).order_by(Challenge.id).all()
    return challenges


@router.post("/challenges", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED)
async def create_challenge(
    challenge_data: ChallengeCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new challenge (admin only)"""
    challenge = Challenge(
        title=challenge_data.title,
        description=challenge_data.description,
        is_active=challenge_data.is_active,
        created_by=current_admin.id,
        goal_id=challenge_data.goal_id,
        next_challenge_id=challenge_data.next_challenge_id,
        sort_order=challenge_data.sort_order,
        visible_to_students=challenge_data.visible_to_students,
        points=challenge_data.points,
        category=challenge_data.category,
        due_date=challenge_data.due_date,
    )

    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    return challenge


@router.put("/challenges/{challenge_id}", response_model=ChallengeResponse)
async def update_challenge(
    challenge_id: int,
    challenge_data: ChallengeUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a challenge (admin only)"""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    # Update fields
    update_data = challenge_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(challenge, field, value)

    db.commit()
    db.refresh(challenge)

    return challenge


@router.get("/challenges/{challenge_id}", response_model=ChallengeWithObjectives)
async def get_challenge(
    challenge_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get a challenge with objectives (admin only)"""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    objectives = (
        db.query(Objective)
        .filter(Objective.challenge_id == challenge_id)
        .order_by(Objective.sort_order)
        .all()
    )

    return ChallengeWithObjectives(
        id=challenge.id,
        title=challenge.title,
        description=challenge.description,
        is_active=challenge.is_active,
        created_by=challenge.created_by,
        created_at=challenge.created_at,
        objectives=objectives,
    )


@router.delete("/challenges/{challenge_id}")
async def delete_challenge(
    challenge_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a challenge (admin only)"""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    # SQLAlchemy will handle cascade deletes for:
    # - objectives (cascade="all, delete-orphan")
    # - challenge_links (cascade="all, delete-orphan")
    # - user_challenge_progress (cascade="all, delete-orphan")
    # And objectives will cascade delete user_objective_progress
    db.delete(challenge)
    db.commit()

    return {"ok": True, "message": f"Challenge '{challenge.title}' deleted successfully"}


# Objective Management
@router.post("/challenges/{challenge_id}/objectives", response_model=ObjectiveResponse, status_code=status.HTTP_201_CREATED)
async def create_objective(
    challenge_id: int,
    objective_data: ObjectiveCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create an objective under a challenge (admin only)"""
    # Verify challenge exists
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    objective = Objective(
        challenge_id=challenge_id,
        title=objective_data.title,
        description=objective_data.description,
        points=objective_data.points,
        sort_order=objective_data.sort_order,
        is_required=objective_data.is_required,
    )

    db.add(objective)
    db.commit()
    db.refresh(objective)

    return objective


@router.put("/objectives/{objective_id}", response_model=ObjectiveResponse)
async def update_objective(
    objective_id: int,
    objective_data: ObjectiveUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update an objective (admin only)"""
    objective = db.query(Objective).filter(Objective.id == objective_id).first()
    if not objective:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objective not found",
        )

    # Update fields
    update_data = objective_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(objective, field, value)

    db.commit()
    db.refresh(objective)

    return objective


# Challenge Linking
@router.post("/challenges/{challenge_id}/link-next", response_model=ChallengeLinkResponse)
async def link_next_challenge(
    challenge_id: int,
    link_data: ChallengeLinkCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Link a next challenge (upsert) (admin only)"""
    # Verify both challenges exist
    from_challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not from_challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source challenge not found",
        )

    to_challenge = db.query(Challenge).filter(Challenge.id == link_data.to_challenge_id).first()
    if not to_challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target challenge not found",
        )

    # Check if link already exists
    existing_link = (
        db.query(ChallengeLink)
        .filter(
            ChallengeLink.from_challenge_id == challenge_id,
            ChallengeLink.condition == link_data.condition,
        )
        .first()
    )

    if existing_link:
        # Update existing link
        existing_link.to_challenge_id = link_data.to_challenge_id
        db.commit()
        db.refresh(existing_link)
        return existing_link
    else:
        # Create new link
        new_link = ChallengeLink(
            from_challenge_id=challenge_id,
            to_challenge_id=link_data.to_challenge_id,
            condition=link_data.condition,
        )
        db.add(new_link)
        db.commit()
        db.refresh(new_link)
        return new_link


# User Management
@router.get("/users", response_model=list[UserListResponse])
async def list_users(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all users (admin only)"""
    users = db.query(User).all()

    result = []
    for user in users:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        role = profile.role.value if profile and profile.role else None

        result.append(
            UserListResponse(
                id=user.id,
                email=user.email,
                created_at=user.created_at,
                is_admin=user.is_admin,
                is_active=user.is_active,
                role=role,
            )
        )

    return result


@router.get("/users/{user_id}/activity", response_model=dict)
async def get_user_activity(
    user_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get user activity/progress summary (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Get challenge progress
    challenge_progress = (
        db.query(UserChallengeProgress)
        .filter(UserChallengeProgress.user_id == user_id)
        .all()
    )

    challenges_completed = sum(1 for cp in challenge_progress if cp.status.value == "COMPLETE")
    challenges_in_progress = sum(1 for cp in challenge_progress if cp.status.value == "IN_PROGRESS")

    # Get objective progress
    objectives_completed = (
        db.query(UserObjectiveProgress)
        .filter(
            UserObjectiveProgress.user_id == user_id,
            UserObjectiveProgress.status == ObjectiveStatus.COMPLETE,
        )
        .count()
    )

    # Calculate total points
    completed_objective_ids = (
        db.query(UserObjectiveProgress.objective_id)
        .filter(
            UserObjectiveProgress.user_id == user_id,
            UserObjectiveProgress.status == ObjectiveStatus.COMPLETE,
        )
        .all()
    )
    completed_ids = [obj_id[0] for obj_id in completed_objective_ids]

    total_points = 0
    if completed_ids:
        total_points = db.query(func.sum(Objective.points)).filter(Objective.id.in_(completed_ids)).scalar() or 0

    # Get detailed challenge progress
    challenge_details = []
    for cp in challenge_progress:
        challenge = db.query(Challenge).filter(Challenge.id == cp.challenge_id).first()
        if challenge:
            total_objectives = db.query(Objective).filter(Objective.challenge_id == challenge.id).count()
            completed_objectives = (
                db.query(UserObjectiveProgress)
                .join(Objective, UserObjectiveProgress.objective_id == Objective.id)
                .filter(
                    UserObjectiveProgress.user_id == user_id,
                    Objective.challenge_id == challenge.id,
                    UserObjectiveProgress.status == ObjectiveStatus.COMPLETE,
                )
                .count()
            )

            challenge_details.append(
                ChallengeProgressDetail(
                    challenge_id=challenge.id,
                    challenge_title=challenge.title,
                    status=cp.status,
                    started_at=cp.started_at,
                    completed_at=cp.completed_at,
                    objectives_completed=completed_objectives,
                    objectives_total=total_objectives,
                )
            )

    return {
        "user_id": user.id,
        "email": user.email,
        "summary": {
            "challenges_completed": challenges_completed,
            "challenges_in_progress": challenges_in_progress,
            "objectives_completed": objectives_completed,
            "total_points": total_points,
        },
        "challenge_progress": challenge_details,
    }


@router.post("/users/{user_id}/reset-password", response_model=PasswordResetResponse)
async def reset_user_password(
    user_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Reset a user's password with a temporary password (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Generate temporary password
    temp_password = generate_temp_password()

    # Hash and save
    user.password_hash = get_password_hash(temp_password)
    db.commit()

    return PasswordResetResponse(
        user_id=user.id,
        email=user.email,
        temporary_password=temp_password,
        message="Password has been reset. User should change it immediately.",
    )

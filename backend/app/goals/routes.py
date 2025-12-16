"""
Goal Routes
Admin endpoints for managing goals and steps
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.common.dependencies import get_db, require_admin
from app.auth.models import User
from app.goals.models import Goal, GoalStep, GoalLink
from app.goals.schemas import (
    GoalCreate,
    GoalUpdate,
    GoalResponse,
    GoalWithSteps,
    GoalStepCreate,
    GoalStepUpdate,
    GoalStepResponse,
    GoalLinkCreate,
    GoalLinkResponse,
)

router = APIRouter()


# Goal Management
@router.get("/goals", response_model=list[GoalResponse])
async def list_goals(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all goals (admin only)"""
    goals = db.query(Goal).order_by(Goal.id).all()
    return goals


@router.post("/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_data: GoalCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new goal (admin only)"""
    goal = Goal(
        title=goal_data.title,
        description=goal_data.description,
        is_active=goal_data.is_active,
        created_by=current_admin.id,
    )

    db.add(goal)
    db.commit()
    db.refresh(goal)

    return goal


@router.put("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal_data: GoalUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a goal (admin only)"""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    # Update fields
    update_data = goal_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)

    db.commit()
    db.refresh(goal)

    return goal


@router.get("/goals/{goal_id}", response_model=GoalWithSteps)
async def get_goal(
    goal_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get a goal with steps (admin only)"""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    steps = (
        db.query(GoalStep)
        .filter(GoalStep.goal_id == goal_id)
        .order_by(GoalStep.sort_order)
        .all()
    )

    return GoalWithSteps(
        id=goal.id,
        title=goal.title,
        description=goal.description,
        is_active=goal.is_active,
        created_by=goal.created_by,
        created_at=goal.created_at,
        steps=steps,
    )


@router.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a goal (admin only)"""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    # SQLAlchemy will handle cascade deletes
    db.delete(goal)
    db.commit()

    return {"ok": True, "message": f"Goal '{goal.title}' deleted successfully"}


# Goal Step Management
@router.post("/goals/{goal_id}/steps", response_model=GoalStepResponse, status_code=status.HTTP_201_CREATED)
async def create_step(
    goal_id: int,
    step_data: GoalStepCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a step under a goal (admin only)"""
    # Verify goal exists
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    step = GoalStep(
        goal_id=goal_id,
        title=step_data.title,
        description=step_data.description,
        points=step_data.points,
        sort_order=step_data.sort_order,
        is_required=step_data.is_required,
    )

    db.add(step)
    db.commit()
    db.refresh(step)

    return step


@router.put("/steps/{step_id}", response_model=GoalStepResponse)
async def update_step(
    step_id: int,
    step_data: GoalStepUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a goal step (admin only)"""
    step = db.query(GoalStep).filter(GoalStep.id == step_id).first()
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal step not found",
        )

    # Update fields
    update_data = step_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(step, field, value)

    db.commit()
    db.refresh(step)

    return step


# Goal Linking
@router.post("/goals/{goal_id}/link-next", response_model=GoalLinkResponse)
async def link_next_goal(
    goal_id: int,
    link_data: GoalLinkCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Link a next goal (upsert) (admin only)"""
    # Verify both goals exist
    from_goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not from_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source goal not found",
        )

    to_goal = db.query(Goal).filter(Goal.id == link_data.to_goal_id).first()
    if not to_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target goal not found",
        )

    # Check if link already exists
    existing_link = (
        db.query(GoalLink)
        .filter(
            GoalLink.from_goal_id == goal_id,
            GoalLink.condition == link_data.condition,
        )
        .first()
    )

    if existing_link:
        # Update existing link
        existing_link.to_goal_id = link_data.to_goal_id
        db.commit()
        db.refresh(existing_link)
        return existing_link
    else:
        # Create new link
        new_link = GoalLink(
            from_goal_id=goal_id,
            to_goal_id=link_data.to_goal_id,
            condition=link_data.condition,
        )
        db.add(new_link)
        db.commit()
        db.refresh(new_link)
        return new_link

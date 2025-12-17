"""
Notification API Routes

Endpoints for fetching and managing notifications
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.common.dependencies import get_db
from app.auth.models import User
from app.auth.utils import get_current_active_user
from app.notifications.models import Notification, NotificationType
from app.notifications.service import NotificationService


router = APIRouter()


# Pydantic schemas
class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    body: str
    related_goal_id: int | None
    related_challenge_id: int | None
    scheduled_for: str
    created_at: str
    read_at: str | None
    dismissed_at: str | None
    is_read: bool
    is_dismissed: bool
    is_active: bool

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int


@router.get("/me/notifications", response_model=NotificationListResponse)
async def get_notifications(
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get active notifications for the current user.

    Returns:
    - notifications: List of active notifications
    - unread_count: Total count of unread notifications
    """
    notifications = NotificationService.get_active_notifications(db, current_user.id, limit)
    unread_count = NotificationService.get_unread_count(db, current_user.id)

    return {
        "notifications": [
            NotificationResponse(
                id=n.id,
                type=n.type.value,
                title=n.title,
                body=n.body,
                related_goal_id=n.related_goal_id,
                related_challenge_id=n.related_challenge_id,
                scheduled_for=n.scheduled_for.isoformat(),
                created_at=n.created_at.isoformat(),
                read_at=n.read_at.isoformat() if n.read_at else None,
                dismissed_at=n.dismissed_at.isoformat() if n.dismissed_at else None,
                is_read=n.is_read,
                is_dismissed=n.is_dismissed,
                is_active=n.is_active,
            )
            for n in notifications
        ],
        "unread_count": unread_count,
    }


@router.post("/me/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    success = NotificationService.mark_as_read(db, notification_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return {"ok": True, "message": "Notification marked as read"}


@router.post("/me/notifications/{notification_id}/dismiss")
async def dismiss_notification(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Dismiss a notification."""
    success = NotificationService.dismiss(db, notification_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return {"ok": True, "message": "Notification dismissed"}


@router.post("/me/notifications/generate")
async def generate_notifications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Manually trigger notification generation for the current user.
    This endpoint can be called periodically or on-demand.

    In production, this would be a background job.
    """
    notifications = []

    # Generate deadline reminders
    deadline_notifications = NotificationService.generate_deadline_reminders(db, current_user.id)
    notifications.extend(deadline_notifications)

    # Generate inactivity nudge (if applicable)
    nudge = NotificationService.generate_inactivity_nudge(db, current_user.id)
    if nudge:
        notifications.append(nudge)

    # Create all notifications
    created_count = NotificationService.create_notifications(db, notifications)

    return {
        "ok": True,
        "message": f"Generated {created_count} notification(s)",
        "count": created_count,
    }

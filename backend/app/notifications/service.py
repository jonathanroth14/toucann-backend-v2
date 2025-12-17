"""
Notification Generation Service

Handles creating notifications for:
- Deadline reminders (7 days, 3 days, 1 day before due_date)
- Inactivity nudges (no progress for X days)
- Streak encouragement (completion, streak break warning)

Principles:
- Notifications are generated, not hand-created
- Always dedupe (no duplicates for same event + day)
- Never replace Today's Mission - only support progress
- Encouraging tone, never guilt-driven
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.notifications.models import Notification, NotificationType
from app.challenges.models import Challenge, UserChallengeProgress, ChallengeStatus
from app.goals.models import Goal, UserGoalProgress, GoalStatus


class NotificationService:
    """Service for generating and managing notifications"""

    @staticmethod
    def generate_deadline_reminders(db: Session, user_id: int) -> list[Notification]:
        """
        Generate deadline reminder notifications for challenges with due_date.

        Fires at: 7 days, 3 days, 1 day before due_date
        Suppresses if challenge is already complete
        """
        notifications = []
        now = datetime.utcnow()

        # Get user's active and incomplete challenges with due dates
        active_challenges = (
            db.query(Challenge, UserChallengeProgress)
            .outerjoin(
                UserChallengeProgress,
                and_(
                    UserChallengeProgress.challenge_id == Challenge.id,
                    UserChallengeProgress.user_id == user_id,
                ),
            )
            .filter(
                Challenge.is_active == True,
                Challenge.visible_to_students == True,
                Challenge.due_date.isnot(None),
                or_(
                    UserChallengeProgress.status == None,
                    UserChallengeProgress.status == ChallengeStatus.NOT_STARTED,
                    UserChallengeProgress.status == ChallengeStatus.IN_PROGRESS,
                ),
            )
            .all()
        )

        for challenge, progress in active_challenges:
            if not challenge.due_date:
                continue

            due_date = challenge.due_date
            days_until_due = (due_date - now).days

            # Check each reminder offset
            for days_before, title_template, body_template in [
                (7, "Upcoming: {title}", "Your '{title}' challenge is due in 7 days. Stay ahead!"),
                (3, "Due Soon: {title}", "Your '{title}' challenge is due in 3 days. You've got this!"),
                (1, "Due Tomorrow: {title}", "'{title}' is due tomorrow. One final push!"),
            ]:
                # Only notify if we're within the reminder window (±12 hours)
                if abs(days_until_due - days_before) < 0.5:
                    # Check for deduplication
                    dedup_key = f"deadline:challenge:{challenge.id}:{days_before}d"

                    existing = db.query(Notification).filter(
                        Notification.user_id == user_id,
                        Notification.dedup_key == dedup_key,
                        Notification.scheduled_for >= now - timedelta(days=1),
                    ).first()

                    if not existing:
                        notification = Notification(
                            user_id=user_id,
                            type=NotificationType.DEADLINE,
                            title=title_template.format(title=challenge.title),
                            body=body_template.format(title=challenge.title),
                            related_challenge_id=challenge.id,
                            scheduled_for=now,
                            dedup_key=dedup_key,
                        )
                        notifications.append(notification)

        return notifications

    @staticmethod
    def generate_inactivity_nudge(db: Session, user_id: int, inactive_days: int = 2) -> Notification | None:
        """
        Generate inactivity nudge if no progress in X days.

        Rules:
        - Max once per day
        - Never stack multiple nudges
        - Encouraging, not guilt-driven
        """
        now = datetime.utcnow()

        # Check if we've already sent a nudge today
        today_nudge = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.type == NotificationType.NUDGE,
            Notification.scheduled_for >= now - timedelta(days=1),
        ).first()

        if today_nudge:
            return None  # Already sent a nudge today

        # Check last activity (objective completion or challenge progress update)
        from app.challenges.models import UserObjectiveProgress

        last_activity = (
            db.query(func.max(UserObjectiveProgress.completed_at))
            .filter(UserObjectiveProgress.user_id == user_id)
            .scalar()
        )

        if not last_activity:
            # No activity yet - send welcome nudge
            dedup_key = f"nudge:inactivity:{user_id}:welcome"
            return Notification(
                user_id=user_id,
                type=NotificationType.NUDGE,
                title="Ready to get started?",
                body="Quick win today: check out your first mission and take one small step forward!",
                scheduled_for=now,
                dedup_key=dedup_key,
            )

        days_since_activity = (now - last_activity).days

        if days_since_activity >= inactive_days:
            # User is inactive - send encouraging nudge
            dedup_key = f"nudge:inactivity:{user_id}:{now.date()}"

            # Randomize message for variety
            import random
            messages = [
                ("Quick win today", "You're one step away from completing your next milestone. Let's finish strong!"),
                ("Ready to continue?", "Your progress is waiting! One small task today keeps the momentum going."),
                ("Let's keep moving", "Small steps lead to big wins. What can you tackle today?"),
            ]
            title, body = random.choice(messages)

            return Notification(
                user_id=user_id,
                type=NotificationType.NUDGE,
                title=title,
                body=body,
                scheduled_for=now,
                dedup_key=dedup_key,
            )

        return None

    @staticmethod
    def generate_streak_encouragement(db: Session, user_id: int, challenge_id: int) -> Notification | None:
        """
        Generate streak encouragement after completing a challenge.

        Triggered when:
        - A challenge is completed
        - A streak is about to break

        Tone: Celebratory and motivating
        """
        now = datetime.utcnow()

        # Check if we've already sent a streak notification today
        today_streak = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.type == NotificationType.STREAK,
            Notification.scheduled_for >= now - timedelta(days=1),
        ).first()

        if today_streak:
            return None  # Already sent a streak notification today

        # Count consecutive days with completions
        from app.challenges.models import UserObjectiveProgress

        recent_completions = (
            db.query(func.date(UserObjectiveProgress.completed_at))
            .filter(
                UserObjectiveProgress.user_id == user_id,
                UserObjectiveProgress.completed_at >= now - timedelta(days=7),
            )
            .distinct()
            .all()
        )

        unique_days = len(recent_completions)

        if unique_days >= 2:
            # User has a streak going - encourage them
            dedup_key = f"streak:encourage:{user_id}:{now.date()}"

            if unique_days == 2:
                title = "Two days strong!"
                body = "Keep it up! Complete today's mission to hit a 3-day streak. 🔥"
            elif unique_days >= 3:
                title = f"{unique_days}-day streak! 🔥"
                body = f"Amazing consistency! One more task today keeps your {unique_days}-day streak alive."
            else:
                title = "Nice work!"
                body = "One more task keeps your momentum going. You've got this!"

            return Notification(
                user_id=user_id,
                type=NotificationType.STREAK,
                title=title,
                body=body,
                related_challenge_id=challenge_id,
                scheduled_for=now,
                dedup_key=dedup_key,
            )

        return None

    @staticmethod
    def create_notifications(db: Session, notifications: list[Notification]) -> int:
        """
        Bulk create notifications.
        Returns count of created notifications.
        """
        if not notifications:
            return 0

        for notification in notifications:
            db.add(notification)

        db.commit()
        return len(notifications)

    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read. Returns True if successful."""
        notification = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )

        if notification:
            notification.read_at = datetime.utcnow()
            db.commit()
            return True

        return False

    @staticmethod
    def dismiss(db: Session, notification_id: int, user_id: int) -> bool:
        """Dismiss a notification. Returns True if successful."""
        notification = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )

        if notification:
            notification.dismissed_at = datetime.utcnow()
            db.commit()
            return True

        return False

    @staticmethod
    def get_active_notifications(db: Session, user_id: int, limit: int = 20) -> list[Notification]:
        """
        Get active notifications for a user.
        Active = not read, not dismissed, scheduled_for <= now
        """
        now = datetime.utcnow()

        return (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
                Notification.dismissed_at.is_(None),
                Notification.scheduled_for <= now,
            )
            .order_by(Notification.scheduled_for.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        """Get count of unread, non-dismissed notifications."""
        now = datetime.utcnow()

        return (
            db.query(func.count(Notification.id))
            .filter(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
                Notification.dismissed_at.is_(None),
                Notification.scheduled_for <= now,
            )
            .scalar()
        )

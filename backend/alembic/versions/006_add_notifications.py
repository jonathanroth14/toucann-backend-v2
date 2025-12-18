"""Add notifications system

Revision ID: 006_add_notifications
Revises: 005_challenge_prefs
Create Date: 2025-01-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_add_notifications'
down_revision = '005_challenge_prefs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Check if enum exists, create if not
    enum_exists = conn.execute(sa.text(
        "SELECT 1 FROM pg_type WHERE typname = 'notificationtype'"
    )).fetchone()

    if not enum_exists:
        conn.execute(sa.text(
            "CREATE TYPE notificationtype AS ENUM ('deadline', 'nudge', 'streak')"
        ))

    # Check if table exists, create if not
    table_exists = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications'"
    )).fetchone()

    if not table_exists:
        # Create table using raw SQL to completely bypass SQLAlchemy's event system
        conn.execute(sa.text("""
            CREATE TABLE notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type notificationtype NOT NULL,
                title VARCHAR NOT NULL,
                body TEXT NOT NULL,
                related_goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
                related_challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
                scheduled_for TIMESTAMP NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP,
                dismissed_at TIMESTAMP,
                dedup_key VARCHAR
            )
        """))

        # Create indexes separately
        conn.execute(sa.text("CREATE INDEX ix_notifications_id ON notifications(id)"))
        conn.execute(sa.text("CREATE INDEX ix_notifications_user_id ON notifications(user_id)"))
        conn.execute(sa.text("CREATE INDEX ix_notifications_scheduled_for ON notifications(scheduled_for)"))
        conn.execute(sa.text("CREATE INDEX ix_notifications_dedup_key ON notifications(dedup_key)"))


def downgrade() -> None:
    # Drop notifications table
    op.drop_table('notifications')

    # Drop notification type enum
    notification_type = sa.Enum('deadline', 'nudge', 'streak', name='notificationtype')
    notification_type.drop(op.get_bind())

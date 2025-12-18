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
    # Check if enum type already exists, create only if it doesn't
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT 1 FROM pg_type WHERE typname = 'notificationtype'"
    )).fetchone()

    if not result:
        # Enum doesn't exist, create it
        notification_type = sa.Enum('deadline', 'nudge', 'streak', name='notificationtype')
        notification_type.create(conn)

    # Create notifications table (reference enum by name)
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('type', sa.Enum('deadline', 'nudge', 'streak', name='notificationtype', create_type=False), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('related_goal_id', sa.Integer(), sa.ForeignKey('goals.id', ondelete='CASCADE'), nullable=True),
        sa.Column('related_challenge_id', sa.Integer(), sa.ForeignKey('challenges.id', ondelete='CASCADE'), nullable=True),
        sa.Column('scheduled_for', sa.DateTime(), nullable=False, index=True, comment='When notification should be shown'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('read_at', sa.DateTime(), nullable=True, comment='When user read the notification'),
        sa.Column('dismissed_at', sa.DateTime(), nullable=True, comment='When user dismissed the notification'),
        sa.Column('dedup_key', sa.String(), nullable=True, index=True, comment='Unique key for deduplication'),
    )


def downgrade() -> None:
    # Drop notifications table
    op.drop_table('notifications')

    # Drop notification type enum
    notification_type = sa.Enum('deadline', 'nudge', 'streak', name='notificationtype')
    notification_type.drop(op.get_bind())

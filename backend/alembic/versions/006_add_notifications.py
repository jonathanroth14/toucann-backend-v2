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
    # Create notification type enum (with checkfirst to avoid duplicate error)
    notification_type = sa.Enum('deadline', 'nudge', 'streak', name='notificationtype')
    notification_type.create(op.get_bind(), checkfirst=True)

    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('type', notification_type, nullable=False),
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

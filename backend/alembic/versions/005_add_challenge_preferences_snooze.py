"""Add user challenge preferences and snooze functionality

Revision ID: 005_add_challenge_preferences_snooze
Revises: 004_add_scheduling
Create Date: 2025-01-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005_add_challenge_preferences_snooze'
down_revision = '004_add_scheduling'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_challenge_preferences table
    op.create_table(
        'user_challenge_preferences',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('second_slot_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('second_slot_challenge_id', sa.Integer(), sa.ForeignKey('challenges.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    # Create snoozed_challenges table
    op.create_table(
        'snoozed_challenges',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('challenge_id', sa.Integer(), sa.ForeignKey('challenges.id', ondelete='CASCADE'), nullable=False),
        sa.Column('snoozed_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('snoozed_until', sa.DateTime(), nullable=False, comment='When challenge becomes available again'),
        sa.Column('reason', sa.String(), nullable=True, comment='Optional reason for snoozing'),
    )

    # Add unique constraint for user_id + challenge_id in snoozed_challenges
    op.create_unique_constraint(
        'uq_user_snoozed_challenge',
        'snoozed_challenges',
        ['user_id', 'challenge_id']
    )


def downgrade() -> None:
    # Drop snoozed_challenges table
    op.drop_constraint('uq_user_snoozed_challenge', 'snoozed_challenges', type_='unique')
    op.drop_table('snoozed_challenges')

    # Drop user_challenge_preferences table
    op.drop_table('user_challenge_preferences')

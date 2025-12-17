"""Add scheduling and recurrence to challenges and goals

Revision ID: 004_add_scheduling
Revises: 003_link_challenges_goals
Create Date: 2025-01-17

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = '004_add_scheduling'
down_revision = '003_link_challenges_goals'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add scheduling fields to challenges
    op.add_column('challenges', sa.Column('start_date', sa.DateTime(), nullable=True))
    op.add_column('challenges', sa.Column('expires_at', sa.DateTime(), nullable=True))
    op.add_column('challenges', sa.Column('recurrence_days', sa.Integer(), nullable=True,
                                          comment='Days until challenge reappears (null = no recurrence)'))
    op.add_column('challenges', sa.Column('recurrence_limit', sa.Integer(), nullable=True,
                                          comment='Max times to recur (null = infinite)'))
    op.add_column('challenges', sa.Column('recurrence_count', sa.Integer(), nullable=False, server_default='0',
                                          comment='Current recurrence count'))
    op.add_column('challenges', sa.Column('original_challenge_id', sa.Integer(), nullable=True,
                                          comment='ID of original challenge if this is a recurrence'))

    # Add foreign key for original_challenge_id
    op.create_foreign_key(
        'fk_challenges_original_challenge',
        'challenges', 'challenges',
        ['original_challenge_id'], ['id'],
        ondelete='SET NULL'
    )

    # Add scheduling fields to goals
    op.add_column('goals', sa.Column('start_date', sa.DateTime(), nullable=True))
    op.add_column('goals', sa.Column('expires_at', sa.DateTime(), nullable=True))
    op.add_column('goals', sa.Column('recurrence_days', sa.Integer(), nullable=True))
    op.add_column('goals', sa.Column('recurrence_limit', sa.Integer(), nullable=True))
    op.add_column('goals', sa.Column('recurrence_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    # Remove scheduling fields from goals
    op.drop_column('goals', 'recurrence_count')
    op.drop_column('goals', 'recurrence_limit')
    op.drop_column('goals', 'recurrence_days')
    op.drop_column('goals', 'expires_at')
    op.drop_column('goals', 'start_date')

    # Remove scheduling fields from challenges
    op.drop_constraint('fk_challenges_original_challenge', 'challenges', type_='foreignkey')
    op.drop_column('challenges', 'original_challenge_id')
    op.drop_column('challenges', 'recurrence_count')
    op.drop_column('challenges', 'recurrence_limit')
    op.drop_column('challenges', 'recurrence_days')
    op.drop_column('challenges', 'expires_at')
    op.drop_column('challenges', 'start_date')

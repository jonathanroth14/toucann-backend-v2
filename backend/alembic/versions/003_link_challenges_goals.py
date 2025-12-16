"""link challenges to goals

Revision ID: 003_link_challenges_goals
Revises: 002_add_goals_system
Create Date: 2024-01-02 00:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_link_challenges_goals'
down_revision = '002_add_goals_system'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add goal_id to challenges table
    op.add_column('challenges', sa.Column('goal_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_challenges_goal_id', 'challenges', 'goals', ['goal_id'], ['id'], ondelete='SET NULL')

    # Add next_challenge_id for chaining
    op.add_column('challenges', sa.Column('next_challenge_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_challenges_next_challenge_id', 'challenges', 'challenges', ['next_challenge_id'], ['id'], ondelete='SET NULL')

    # Add sort_order for ordering within a goal
    op.add_column('challenges', sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'))

    # Add visible_to_students flag
    op.add_column('challenges', sa.Column('visible_to_students', sa.Boolean(), nullable=False, server_default='true'))

    # Add points field (moved from objectives to challenge level)
    op.add_column('challenges', sa.Column('points', sa.Integer(), nullable=False, server_default='10'))

    # Add category and due_date for UI
    op.add_column('challenges', sa.Column('category', sa.String(), nullable=True))
    op.add_column('challenges', sa.Column('due_date', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_constraint('fk_challenges_next_challenge_id', 'challenges', type_='foreignkey')
    op.drop_constraint('fk_challenges_goal_id', 'challenges', type_='foreignkey')

    op.drop_column('challenges', 'due_date')
    op.drop_column('challenges', 'category')
    op.drop_column('challenges', 'points')
    op.drop_column('challenges', 'visible_to_students')
    op.drop_column('challenges', 'sort_order')
    op.drop_column('challenges', 'next_challenge_id')
    op.drop_column('challenges', 'goal_id')

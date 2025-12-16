"""add goals system

Revision ID: 002_add_goals_system
Revises: 001_add_challenges
Create Date: 2024-01-01 00:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_goals_system'
down_revision = '001_add_challenges'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create goals table
    op.create_table(
        'goals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_goals_id'), 'goals', ['id'], unique=False)

    # Create goal_steps table
    op.create_table(
        'goal_steps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('goal_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('points', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_required', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_goal_steps_id'), 'goal_steps', ['id'], unique=False)

    # Create goal_links table
    op.create_table(
        'goal_links',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('from_goal_id', sa.Integer(), nullable=False),
        sa.Column('to_goal_id', sa.Integer(), nullable=False),
        sa.Column('condition', sa.String(), nullable=False, server_default='ON_COMPLETE'),
        sa.ForeignKeyConstraint(['from_goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('from_goal_id', 'condition', name='uq_goal_link_condition')
    )
    op.create_index(op.f('ix_goal_links_id'), 'goal_links', ['id'], unique=False)

    # Create user_goal_progress table
    op.create_table(
        'user_goal_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('goal_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', name='goalstatus'), nullable=False, server_default='NOT_STARTED'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'goal_id', name='uq_user_goal')
    )
    op.create_index(op.f('ix_user_goal_progress_id'), 'user_goal_progress', ['id'], unique=False)

    # Create user_goal_step_progress table
    op.create_table(
        'user_goal_step_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('step_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('INCOMPLETE', 'COMPLETE', name='goalstepstatus'), nullable=False, server_default='INCOMPLETE'),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['step_id'], ['goal_steps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'step_id', name='uq_user_goal_step')
    )
    op.create_index(op.f('ix_user_goal_step_progress_id'), 'user_goal_step_progress', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_goal_step_progress_id'), table_name='user_goal_step_progress')
    op.drop_table('user_goal_step_progress')

    op.drop_index(op.f('ix_user_goal_progress_id'), table_name='user_goal_progress')
    op.drop_table('user_goal_progress')

    op.drop_index(op.f('ix_goal_links_id'), table_name='goal_links')
    op.drop_table('goal_links')

    op.drop_index(op.f('ix_goal_steps_id'), table_name='goal_steps')
    op.drop_table('goal_steps')

    op.drop_index(op.f('ix_goals_id'), table_name='goals')
    op.drop_table('goals')

    # Drop enums
    sa.Enum(name='goalstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='goalstepstatus').drop(op.get_bind(), checkfirst=True)

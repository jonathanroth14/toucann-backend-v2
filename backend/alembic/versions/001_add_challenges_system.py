"""Add challenges and admin system

Revision ID: 001_add_challenges
Revises: 000_initial_schema
Create Date: 2025-12-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_add_challenges'
down_revision = '000_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create challenges table
    op.create_table(
        'challenges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_challenges_id'), 'challenges', ['id'], unique=False)

    # Create objectives table
    op.create_table(
        'objectives',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('challenge_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('points', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_required', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_objectives_id'), 'objectives', ['id'], unique=False)

    # Create challenge_links table
    op.create_table(
        'challenge_links',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('from_challenge_id', sa.Integer(), nullable=False),
        sa.Column('to_challenge_id', sa.Integer(), nullable=False),
        sa.Column('condition', sa.String(), nullable=False, server_default='ON_COMPLETE'),
        sa.ForeignKeyConstraint(['from_challenge_id'], ['challenges.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_challenge_id'], ['challenges.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('from_challenge_id', 'condition', name='uq_challenge_link_condition')
    )
    op.create_index(op.f('ix_challenge_links_id'), 'challenge_links', ['id'], unique=False)

    # Create user_challenge_progress table
    op.create_table(
        'user_challenge_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('challenge_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', name='challengestatus'), nullable=False, server_default='NOT_STARTED'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'challenge_id', name='uq_user_challenge')
    )
    op.create_index(op.f('ix_user_challenge_progress_id'), 'user_challenge_progress', ['id'], unique=False)

    # Create user_objective_progress table
    op.create_table(
        'user_objective_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('objective_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('INCOMPLETE', 'COMPLETE', name='objectivestatus'), nullable=False, server_default='INCOMPLETE'),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['objective_id'], ['objectives.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'objective_id', name='uq_user_objective')
    )
    op.create_index(op.f('ix_user_objective_progress_id'), 'user_objective_progress', ['id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_user_objective_progress_id'), table_name='user_objective_progress')
    op.drop_table('user_objective_progress')

    op.drop_index(op.f('ix_user_challenge_progress_id'), table_name='user_challenge_progress')
    op.drop_table('user_challenge_progress')

    op.drop_index(op.f('ix_challenge_links_id'), table_name='challenge_links')
    op.drop_table('challenge_links')

    op.drop_index(op.f('ix_objectives_id'), table_name='objectives')
    op.drop_table('objectives')

    op.drop_index(op.f('ix_challenges_id'), table_name='challenges')
    op.drop_table('challenges')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS challengestatus')
    op.execute('DROP TYPE IF EXISTS objectivestatus')

"""add student state

Revision ID: 005
Revises: 004
Create Date: 2025-12-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Create student_state table
    op.create_table(
        'student_state',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('second_slot_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_student_state_user')
    )
    op.create_index('ix_student_state_user_id', 'student_state', ['user_id'], unique=True)

    # Create snoozed_challenges table
    op.create_table(
        'snoozed_challenges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('challenge_id', sa.Integer(), nullable=False),
        sa.Column('snoozed_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('snoozed_until', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_snoozed_challenges_user_id', 'snoozed_challenges', ['user_id'])
    op.create_index('ix_snoozed_challenges_challenge_id', 'snoozed_challenges', ['challenge_id'])


def downgrade():
    op.drop_index('ix_snoozed_challenges_challenge_id', table_name='snoozed_challenges')
    op.drop_index('ix_snoozed_challenges_user_id', table_name='snoozed_challenges')
    op.drop_table('snoozed_challenges')

    op.drop_index('ix_student_state_user_id', table_name='student_state')
    op.drop_table('student_state')

"""Add snoozed goal tasks table

Revision ID: 007_snoozed_tasks
Revises: 006_add_notifications
Create Date: 2025-01-18

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007_snoozed_tasks'
down_revision = '006_add_notifications'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Check if table exists, create if not
    table_exists = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'snoozed_goal_tasks'"
    )).fetchone()

    if not table_exists:
        # Create table using raw SQL
        conn.execute(sa.text("""
            CREATE TABLE snoozed_goal_tasks (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                step_id INTEGER NOT NULL REFERENCES goal_steps(id) ON DELETE CASCADE,
                snoozed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                snoozed_until TIMESTAMP NOT NULL,
                UNIQUE (user_id, step_id)
            )
        """))

        # Create indexes
        conn.execute(sa.text("CREATE INDEX ix_snoozed_goal_tasks_id ON snoozed_goal_tasks(id)"))
        conn.execute(sa.text("CREATE INDEX ix_snoozed_goal_tasks_user_id ON snoozed_goal_tasks(user_id)"))


def downgrade() -> None:
    # Drop table using raw SQL
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS snoozed_goal_tasks"))

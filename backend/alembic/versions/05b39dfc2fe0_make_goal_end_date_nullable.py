"""make_goal_end_date_nullable

Revision ID: 05b39dfc2fe0
Revises: 3547bd46bbf7
Create Date: 2026-06-11 19:30:35.384130
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '05b39dfc2fe0'
down_revision: Union[str, Sequence[str], None] = '3547bd46bbf7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.alter_column('goal', 'end_date', existing_type=sa.DATE(), nullable=True)

def downgrade() -> None:
    op.alter_column('goal', 'end_date', existing_type=sa.DATE(), nullable=False)

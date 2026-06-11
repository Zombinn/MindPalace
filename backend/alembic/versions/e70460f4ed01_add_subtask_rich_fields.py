"""add_subtask_rich_fields

Revision ID: e70460f4ed01
Revises: 05b39dfc2fe0
Create Date: 2026-06-11 19:55:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e70460f4ed01'
down_revision: Union[str, Sequence[str], None] = '05b39dfc2fe0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('sub_task', sa.Column('key_points', sa.JSON(), nullable=True))
    op.add_column('sub_task', sa.Column('practice_questions', sa.JSON(), nullable=True))
    op.add_column('sub_task', sa.Column('ref_links', sa.JSON(), nullable=True))

def downgrade() -> None:
    # SQLite doesn't support DROP COLUMN
    pass

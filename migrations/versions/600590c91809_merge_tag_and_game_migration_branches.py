"""Merge tag and game migration branches

Revision ID: 600590c91809
Revises: 79d2c5f72cc2, c5e923a71d25
Create Date: 2025-03-18 14:21:51.253803

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '600590c91809'
down_revision = ('79d2c5f72cc2', 'c5e923a71d25')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass

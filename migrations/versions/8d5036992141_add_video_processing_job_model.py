"""add_video_processing_job_model

Revision ID: 8d5036992141
Revises: 600590c91809
Create Date: 2025-03-22 14:43:02.281796

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8d5036992141'
down_revision = '600590c91809'
branch_labels = None
depends_on = None


def upgrade():
    # Create the video_processing_job table only
    # Add SQLite-compatible error handling to skip if table exists
    try:
        op.create_table('video_processing_job',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('video_id', sa.String(length=32), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('progress', sa.Integer(), nullable=True),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['video_id'], ['video.video_id'], ),
            sa.PrimaryKeyConstraint('id')
        )
    except Exception as e:
        # Skip if table already exists (SQLite compatibility)
        if "already exists" in str(e):
            pass
        else:
            raise


def downgrade():
    # Drop the video_processing_job table
    op.drop_table('video_processing_job')
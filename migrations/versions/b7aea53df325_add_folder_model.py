"""add_folder_model

Revision ID: b7aea53df325
Revises: ddad7ec60442
Create Date: 2025-03-18 13:34:08.642709

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# SQLite doesn't support altering columns, so we need this helper
def get_inspector():
    conn = op.get_bind()
    return inspect(conn)

# revision identifiers, used by Alembic.
revision = 'b7aea53df325'
down_revision = 'ddad7ec60442'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    # For SQLite, we'll skip altering columns and constraints, and focus on adding tables and columns
    
    # Create folder table if it doesn't exist
    inspector = get_inspector()
    if 'folder' not in inspector.get_table_names():
        op.create_table('folder',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('slug', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('visibility', sa.String(length=20), nullable=True),
            sa.Column('parent_id', sa.Integer(), nullable=True),
            sa.Column('owner_id', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_folder_slug'), 'folder', ['slug'], unique=True)
    else:
        print("Table 'folder' already exists, skipping creation")
    
    # Add folder_id and owner_id to video table if they don't exist
    inspector = get_inspector()
    columns = inspector.get_columns('video')
    column_names = [c['name'] for c in columns]
    
    if 'folder_id' not in column_names:
        op.add_column('video', sa.Column('folder_id', sa.Integer(), nullable=True))
    else:
        print("Column 'folder_id' already exists in 'video' table, skipping")
        
    if 'owner_id' not in column_names:
        op.add_column('video', sa.Column('owner_id', sa.Integer(), nullable=True))
    else:
        print("Column 'owner_id' already exists in 'video' table, skipping")
    
    # Skip constraints - we'll enforce relationships at the application level
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    # Drop columns from video table
    # We skipped adding explicit foreign key constraints, so we can directly drop columns
    op.drop_column('video', 'owner_id')
    op.drop_column('video', 'folder_id')
    
    # Drop folder table
    op.drop_index(op.f('ix_folder_slug'), table_name='folder')
    op.drop_table('folder')
    
    # No need to revert user table changes since we're leaving the password column as is
    # and email unique constraint is fine to keep

    # ### end Alembic commands ###

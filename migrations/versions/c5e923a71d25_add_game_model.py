"""Add game model

Revision ID: c5e923a71d25
Revises: a4503f708aee
Create Date: 2025-03-18 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c5e923a71d25'
down_revision = 'a4503f708aee'
branch_labels = None
depends_on = None


def upgrade():
    # Create game table
    op.create_table('game',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create index on slug
    op.create_index(op.f('ix_game_slug'), 'game', ['slug'], unique=True)
    
    # Add game_id column to folder table
    op.add_column('folder', 
        sa.Column('game_id', sa.Integer(), nullable=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_folder_game_id', 'folder', 'game',
        ['game_id'], ['id']
    )
    
    # Add folder_type column to folder table
    op.add_column('folder', 
        sa.Column('folder_type', sa.String(length=20), nullable=True)
    )
    
    # Update existing folders to tag type
    op.execute("UPDATE folder SET folder_type = 'tag'")
    
    # Add game_id column to video table
    op.add_column('video', 
        sa.Column('game_id', sa.Integer(), nullable=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_video_game_id', 'video', 'game',
        ['game_id'], ['id']
    )


def downgrade():
    # Remove foreign key constraints first
    op.drop_constraint('fk_video_game_id', 'video', type_='foreignkey')
    op.drop_constraint('fk_folder_game_id', 'folder', type_='foreignkey')
    
    # Remove columns
    op.drop_column('video', 'game_id')
    op.drop_column('folder', 'folder_type')
    op.drop_column('folder', 'game_id')
    
    # Drop index and table
    op.drop_index(op.f('ix_game_slug'), table_name='game')
    op.drop_table('game')
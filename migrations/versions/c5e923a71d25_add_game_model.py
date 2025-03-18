"""Add game model

Revision ID: c5e923a71d25
Revises: a4503f708aee
Create Date: 2025-03-18 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


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
    
    # Create a new folder table with the additional columns
    op.create_table('folder_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('tag_id', sa.Integer(), nullable=True),
        sa.Column('game_id', sa.Integer(), nullable=True),
        sa.Column('folder_type', sa.String(length=20), nullable=True, server_default='tag'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['game_id'], ['game.id'], ),
        sa.ForeignKeyConstraint(['parent_id'], ['folder_new.id'], ),
        sa.ForeignKeyConstraint(['tag_id'], ['tag.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    
    op.create_index(op.f('ix_folder_new_slug'), 'folder_new', ['slug'], unique=True)
    
    # Copy data from folder to folder_new
    folder = table('folder',
        column('id', sa.Integer),
        column('name', sa.String),
        column('slug', sa.String),
        column('description', sa.Text),
        column('parent_id', sa.Integer),
        column('tag_id', sa.Integer),
        column('created_at', sa.DateTime),
        column('updated_at', sa.DateTime)
    )
    
    folder_new = table('folder_new',
        column('id', sa.Integer),
        column('name', sa.String),
        column('slug', sa.String),
        column('description', sa.Text),
        column('parent_id', sa.Integer),
        column('tag_id', sa.Integer),
        column('game_id', sa.Integer),
        column('folder_type', sa.String),
        column('created_at', sa.DateTime),
        column('updated_at', sa.DateTime)
    )
    
    try:
        # Get existing data and insert into new table
        conn = op.get_bind()
        rows = conn.execute(sa.select([folder.c.id, folder.c.name, folder.c.slug, 
                                      folder.c.description, folder.c.parent_id, 
                                      folder.c.tag_id, folder.c.created_at, 
                                      folder.c.updated_at]))
                                      
        for row in rows:
            conn.execute(folder_new.insert().values(
                id=row[0],
                name=row[1],
                slug=row[2],
                description=row[3],
                parent_id=row[4],
                tag_id=row[5],
                folder_type='tag',  # Set default for existing folders
                created_at=row[6],
                updated_at=row[7]
            ))
    except Exception as e:
        # If no folders exist yet, this is fine
        print(f"Note: No existing folders to migrate: {e}")
    
    # Create a new video table with the game_id column
    op.create_table('video_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('video_id', sa.String(length=32), nullable=False),
        sa.Column('extension', sa.String(length=8), nullable=False),
        sa.Column('path', sa.String(length=2048), nullable=False),
        sa.Column('available', sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('game_id', sa.Integer(), nullable=True),
        sa.Column('folder_id', sa.Integer(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['folder_id'], ['folder_new.id'], ),
        sa.ForeignKeyConstraint(['game_id'], ['game.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index(op.f('ix_video_new_path'), 'video_new', ['path'])
    op.create_index(op.f('ix_video_new_video_id'), 'video_new', ['video_id'])
    
    # Copy data from video to video_new
    video = table('video',
        column('id', sa.Integer),
        column('video_id', sa.String),
        column('extension', sa.String),
        column('path', sa.String),
        column('available', sa.Boolean),
        column('created_at', sa.DateTime),
        column('updated_at', sa.DateTime),
        column('folder_id', sa.Integer),
        column('owner_id', sa.Integer)
    )
    
    video_new = table('video_new',
        column('id', sa.Integer),
        column('video_id', sa.String),
        column('extension', sa.String),
        column('path', sa.String),
        column('available', sa.Boolean),
        column('created_at', sa.DateTime),
        column('updated_at', sa.DateTime),
        column('game_id', sa.Integer),
        column('folder_id', sa.Integer),
        column('owner_id', sa.Integer)
    )
    
    try:
        # Get existing data and insert into new table
        conn = op.get_bind()
        rows = conn.execute(sa.select([video.c.id, video.c.video_id, video.c.extension,
                                      video.c.path, video.c.available, video.c.created_at,
                                      video.c.updated_at, video.c.folder_id, video.c.owner_id]))
                                      
        for row in rows:
            conn.execute(video_new.insert().values(
                id=row[0],
                video_id=row[1],
                extension=row[2],
                path=row[3],
                available=row[4],
                created_at=row[5],
                updated_at=row[6],
                folder_id=row[7],
                owner_id=row[8]
            ))
    except Exception as e:
        # If no videos exist yet, this is fine
        print(f"Note: No existing videos to migrate: {e}")
    
    # Recreate video_tags junction table pointing to new video table
    op.create_table('video_tags_new',
        sa.Column('video_id', sa.String(length=32), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tag_id'], ['tag.id'], ),
        sa.ForeignKeyConstraint(['video_id'], ['video_new.video_id'], ),
        sa.PrimaryKeyConstraint('video_id', 'tag_id')
    )
    
    try:
        # Copy data from video_tags to video_tags_new
        video_tags = table('video_tags',
            column('video_id', sa.String),
            column('tag_id', sa.Integer),
            column('created_at', sa.DateTime)
        )
        
        video_tags_new = table('video_tags_new',
            column('video_id', sa.String),
            column('tag_id', sa.Integer),
            column('created_at', sa.DateTime)
        )
        
        # Get existing data and insert into new table
        conn = op.get_bind()
        rows = conn.execute(sa.select([video_tags.c.video_id, video_tags.c.tag_id, 
                                       video_tags.c.created_at]))
                                       
        for row in rows:
            conn.execute(video_tags_new.insert().values(
                video_id=row[0],
                tag_id=row[1],
                created_at=row[2]
            ))
    except Exception as e:
        # If no video_tags exist yet, this is fine
        print(f"Note: No existing video_tags to migrate: {e}")
    
    # Drop old tables and rename new tables
    # Use try-except to handle cases where tables don't exist yet
    try:
        op.drop_table('video_tags')
    except Exception as e:
        print(f"Note: Could not drop video_tags table: {e}")
    
    try:
        op.drop_table('video')
    except Exception as e:
        print(f"Note: Could not drop video table: {e}")
    
    try:
        op.drop_table('folder')
    except Exception as e:
        print(f"Note: Could not drop folder table: {e}")
    
    try:
        op.rename_table('folder_new', 'folder')
    except Exception as e:
        print(f"Note: Could not rename folder_new to folder: {e}")
    
    try:
        op.rename_table('video_new', 'video')
    except Exception as e:
        print(f"Note: Could not rename video_new to video: {e}")
    
    try:
        op.rename_table('video_tags_new', 'video_tags')
    except Exception as e:
        print(f"Note: Could not rename video_tags_new to video_tags: {e}")


def downgrade():
    # Drop the new tables with error handling
    try:
        op.drop_table('video_tags')
    except Exception as e:
        print(f"Note: Could not drop video_tags table: {e}")
    
    try:
        op.drop_table('video')
    except Exception as e:
        print(f"Note: Could not drop video table: {e}")
    
    try:
        op.drop_table('folder')
    except Exception as e:
        print(f"Note: Could not drop folder table: {e}")
    
    try:
        op.drop_table('game')
    except Exception as e:
        print(f"Note: Could not drop game table: {e}")
    
    # Recreate original tables
    op.create_table('folder',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('tag_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['folder.id'], ),
        sa.ForeignKeyConstraint(['tag_id'], ['tag.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index(op.f('ix_folder_slug'), 'folder', ['slug'], unique=True)
    
    op.create_table('video',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('video_id', sa.String(length=32), nullable=False),
        sa.Column('extension', sa.String(length=8), nullable=False),
        sa.Column('path', sa.String(length=2048), nullable=False),
        sa.Column('available', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('folder_id', sa.Integer(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['folder_id'], ['folder.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index(op.f('ix_video_path'), 'video', ['path'])
    op.create_index(op.f('ix_video_video_id'), 'video', ['video_id'])
    
    op.create_table('video_tags',
        sa.Column('video_id', sa.String(length=32), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tag_id'], ['tag.id'], ),
        sa.ForeignKeyConstraint(['video_id'], ['video.video_id'], ),
        sa.PrimaryKeyConstraint('video_id', 'tag_id')
    )
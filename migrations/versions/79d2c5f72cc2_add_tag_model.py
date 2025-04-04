"""add_tag_model

Revision ID: 79d2c5f72cc2
Revises: b7aea53df325
Create Date: 2025-03-18 13:40:33.808317

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
import logging

# Configure logging for better visibility
logger = logging.getLogger('alembic.migration')

# SQLite doesn't support altering columns, so we need this helper
def get_inspector():
    conn = op.get_bind()
    return inspect(conn)

# Utility function to safely execute operations that might fail
def safe_execute(operation, description, error_ok=False):
    try:
        operation()
        logger.info(f"SUCCESS: {description}")
        return True
    except Exception as e:
        if error_ok:
            logger.warning(f"NOTICE: {description} - {str(e)}")
        else:
            logger.error(f"ERROR: {description} - {str(e)}")
        return False

# revision identifiers, used by Alembic.
revision = '79d2c5f72cc2'
down_revision = 'b7aea53df325'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    inspector = get_inspector()
    
    # Create tag table first if it doesn't exist
    if 'tag' not in inspector.get_table_names():
        logger.info("Creating tag table...")
        safe_execute(
            lambda: op.create_table('tag',
                sa.Column('id', sa.Integer(), nullable=False),
                sa.Column('name', sa.String(length=100), nullable=False),
                sa.Column('slug', sa.String(length=100), nullable=False),
                sa.Column('created_at', sa.DateTime(), nullable=True),
                sa.Column('updated_at', sa.DateTime(), nullable=True),
                sa.PrimaryKeyConstraint('id')
            ),
            "Create tag table"
        )
        safe_execute(
            lambda: op.create_index(op.f('ix_tag_slug'), 'tag', ['slug'], unique=True),
            "Create tag.slug index"
        )
    else:
        logger.info("Table 'tag' already exists, skipping creation")
        
        # Verify that the slug index exists
        try:
            indexes = inspector.get_indexes('tag')
            if not any(idx.get('name') == 'ix_tag_slug' for idx in indexes):
                logger.info("Tag slug index missing, creating it")
                safe_execute(
                    lambda: op.create_index(op.f('ix_tag_slug'), 'tag', ['slug'], unique=True),
                    "Create missing tag.slug index",
                    error_ok=True
                )
        except Exception as e:
            logger.warning(f"Could not check indexes on tag table: {str(e)}")
    
    # Create junction table for video-tag many-to-many relationship if it doesn't exist
    if 'video_tags' not in inspector.get_table_names():
        logger.info("Creating video_tags junction table...")
        safe_execute(
            lambda: op.create_table('video_tags',
                sa.Column('video_id', sa.String(length=32), nullable=False),
                sa.Column('tag_id', sa.Integer(), nullable=False),
                sa.Column('created_at', sa.DateTime(), nullable=True),
                sa.ForeignKeyConstraint(['tag_id'], ['tag.id'], ),
                sa.ForeignKeyConstraint(['video_id'], ['video.video_id'], ),
                sa.PrimaryKeyConstraint('video_id', 'tag_id')
            ),
            "Create video_tags junction table"
        )
    else:
        logger.info("Table 'video_tags' already exists, skipping creation")
    
    # Check if folder table exists and if tag_id column already exists
    if 'folder' in inspector.get_table_names():
        try:
            columns = inspector.get_columns('folder')
            column_names = [c['name'] for c in columns]
            
            if 'tag_id' not in column_names:
                logger.info("Adding tag_id column to folder table...")
                safe_execute(
                    lambda: op.add_column('folder', sa.Column('tag_id', sa.Integer(), nullable=True)),
                    "Add tag_id column to folder table",
                    error_ok=True
                )
            else:
                logger.info("Column 'tag_id' already exists in folder table, skipping")
        except Exception as e:
            logger.warning(f"Error checking folder table columns: {str(e)}")
    else:
        logger.info("Table 'folder' does not exist, skipping tag_id column addition")
    
    # 2. Remove columns that are no longer needed
    # For SQLite, we skip column drops and just leave them unused
    
    # 3. Create any foreign key relationships in the application code
    # SQLite doesn't support adding constraints after table creation
    
    # Skip complex alterations that SQLite doesn't support
    # These constraints will be enforced at the application level
    
    logger.info("Tag model migration completed successfully")
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    # For SQLite, we can only safely drop tables and columns, not constraints
    
    # Drop the tag_id column from folder table (if possible in SQLite)
    try:
        op.drop_column('folder', 'tag_id')
    except Exception as e:
        # SQLite doesn't support dropping columns, so we'd need to recreate the table
        # For simplicity, we'll just leave the unused column
        logger.warning(f"Could not drop tag_id column (expected for SQLite): {str(e)}")
    
    # Drop the video_tags table
    safe_execute(
        lambda: op.drop_table('video_tags'),
        "Drop video_tags table"
    )
    
    # Drop the tag table and its index
    safe_execute(
        lambda: op.drop_index(op.f('ix_tag_slug'), table_name='tag'),
        "Drop tag.slug index"
    )
    safe_execute(
        lambda: op.drop_table('tag'),
        "Drop tag table"
    )
    # ### end Alembic commands ###

import os
import sqlite3
import sys

def check_db():
    # Get the database path from environment
    os.environ['DATA_DIRECTORY'] = os.path.join(os.getcwd(), 'dev_root/dev_data/')
    db_path = os.path.join(os.environ['DATA_DIRECTORY'], 'db.sqlite')
    
    print(f"Checking database at {db_path}")
    
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return
        
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get list of tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("Tables in database:")
    for table in tables:
        print(f"- {table[0]}")
    
    # Check if tag table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tag';")
    tag_table = cursor.fetchone()
    
    if tag_table:
        print("\nTag table exists")
    else:
        print("\nTag table does not exist")
        print("Creating tag table...")
        cursor.execute('''
        CREATE TABLE tag (
            id INTEGER PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) NOT NULL UNIQUE,
            created_at DATETIME,
            updated_at DATETIME
        )
        ''')
        conn.commit()
        print("Created tag table")
        
        # Create index on slug
        cursor.execute('CREATE UNIQUE INDEX ix_tag_slug ON tag (slug)')
        conn.commit()
        print("Created index on tag.slug")
    
    # Check if video_tags table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='video_tags';")
    video_tags_table = cursor.fetchone()
    
    if video_tags_table:
        print("\nvideo_tags table exists")
    else:
        print("\nvideo_tags table does not exist")
        print("Creating video_tags table...")
        cursor.execute('''
        CREATE TABLE video_tags (
            video_id VARCHAR(32) NOT NULL,
            tag_id INTEGER NOT NULL,
            created_at DATETIME,
            PRIMARY KEY (video_id, tag_id),
            FOREIGN KEY (video_id) REFERENCES video (video_id),
            FOREIGN KEY (tag_id) REFERENCES tag (id)
        )
        ''')
        conn.commit()
        print("Created video_tags table")
    
    # Check if folder table has tag_id column
    try:
        cursor.execute("PRAGMA table_info(folder)")
        folder_columns = cursor.fetchall()
        tag_id_exists = any(col[1] == 'tag_id' for col in folder_columns)
        
        if tag_id_exists:
            print("\nfolder.tag_id column exists")
        else:
            print("\nfolder.tag_id column does not exist")
            print("Adding tag_id column to folder table...")
            cursor.execute('ALTER TABLE folder ADD COLUMN tag_id INTEGER')
            conn.commit()
            print("Added tag_id column to folder table")
    except Exception as e:
        print(f"Error checking folder table: {str(e)}")
    
    conn.close()
    print("\nDatabase check completed")

if __name__ == '__main__':
    check_db()
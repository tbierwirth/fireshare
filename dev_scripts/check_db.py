#!/usr/bin/env python3
import os
import sys
import sqlite3
import json

def main():
    data_dir = os.path.join(os.environ.get('HOME'), 'Code', 'fireshare', 'dev_root', 'dev_data')
    db_path = os.path.join(data_dir, 'db.sqlite')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        sys.exit(1)
        
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Check games
    print("\n--- Games ---")
    cursor.execute("SELECT * FROM game")
    games = [dict(row) for row in cursor.fetchall()]
    print(json.dumps(games, indent=2))
    
    # Check videos
    print("\n--- Videos ---")
    cursor.execute("SELECT video_id, game_id, path FROM video")
    videos = [dict(row) for row in cursor.fetchall()]
    print(json.dumps(videos, indent=2))
    
    # Count videos by game
    print("\n--- Video Counts by Game ---")
    cursor.execute("""
        SELECT g.id, g.name, COUNT(v.id) as video_count
        FROM game g
        LEFT JOIN video v ON g.id = v.game_id
        GROUP BY g.id, g.name
    """)
    counts = [dict(row) for row in cursor.fetchall()]
    print(json.dumps(counts, indent=2))
    
    conn.close()

if __name__ == "__main__":
    main()
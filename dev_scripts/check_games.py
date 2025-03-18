#!/usr/bin/env python3
import requests
import json

def main():
    # Get all games
    games_response = requests.get('http://127.0.0.1:5000/api/games')
    games_data = games_response.json()
    print("Games API Response:")
    print(json.dumps(games_data, indent=2))
    
    # Get all videos
    videos_response = requests.get('http://127.0.0.1:5000/api/videos?sort=updated_at+desc')
    videos_data = videos_response.json()
    print("\nVideos API Response:")
    print(f"Total videos: {len(videos_data.get('videos', []))}")
    
    # Check game IDs in videos
    game_counts = {}
    for video in videos_data.get('videos', []):
        game_id = video.get('game_id')
        game_name = video.get('game')
        if game_id:
            if game_id not in game_counts:
                game_counts[game_id] = {'name': game_name, 'count': 0}
            game_counts[game_id]['count'] += 1
    
    print("\nGame counts from videos:")
    print(json.dumps(game_counts, indent=2))

if __name__ == "__main__":
    main()
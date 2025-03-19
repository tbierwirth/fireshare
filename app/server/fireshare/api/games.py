import logging
from flask import Blueprint, request, jsonify, current_app
from flask_login import current_user, login_required
from sqlalchemy import select, func
from .. import db
from ..models import Game, Video
from .utils.response_helpers import api_error, api_success

# Create blueprint with URL prefix
games_bp = Blueprint('games', __name__, url_prefix='/api/games')

@games_bp.route('', methods=['GET'])
def get_games():
    """Get all games"""
    # SQLAlchemy 2.0 query pattern
    stmt = select(Game).order_by(Game.name)
    games = db.session.execute(stmt).scalars().all()
    
    # Manually count videos for each game with extra debugging
    games_with_count = []
    for game in games:
        game_json = game.json()
        
        # SQLAlchemy 2.0 query pattern for count
        stmt = select(func.count()).select_from(Video).filter_by(game_id=game.id)
        video_count = db.session.execute(stmt).scalar_one()
        
        game_json["video_count"] = video_count
        current_app.logger.debug(f"Game {game.name} (ID: {game.id}) has {video_count} videos")
        games_with_count.append(game_json)
    
    # Log overall game counts - SQLAlchemy 2.0 pattern
    stmt = select(func.count()).select_from(Video)
    total_videos = db.session.execute(stmt).scalar_one()
    
    stmt = select(func.count()).select_from(Video).filter(Video.game_id.isnot(None))
    videos_with_games = db.session.execute(stmt).scalar_one()
    
    current_app.logger.info(f"Total videos: {total_videos}, Videos with games: {videos_with_games}")
        
    return jsonify({"games": games_with_count})

@games_bp.route('/search', methods=['GET'])
def search_games():
    """Search for games by name (case-insensitive partial match)"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({"games": []})
    
    # Convert query to lowercase for case-insensitive matching
    query = f"%{query.lower()}%"
    
    # SQLAlchemy 2.0 query pattern
    stmt = select(Game).filter(Game.slug.like(Game.generate_slug(query)))
    games = db.session.execute(stmt).scalars().all()
    
    # Manually count videos for each game
    games_with_count = []
    for game in games:
        game_json = game.json()
        
        # SQLAlchemy 2.0 query pattern for count
        stmt = select(func.count()).select_from(Video).filter_by(game_id=game.id)
        video_count = db.session.execute(stmt).scalar_one()
        
        game_json["video_count"] = video_count
        current_app.logger.debug(f"Game {game.name} (ID: {game.id}) has {video_count} videos")
        games_with_count.append(game_json)
        
    return jsonify({"games": games_with_count})

# Additional endpoints that will be registered directly with the main blueprint
def register_direct_routes(app_or_blueprint):
    """Register routes that aren't part of the /api/games URL structure"""
    
    @app_or_blueprint.route('/api/video/<video_id>/game', methods=['GET', 'PUT'])
    def handle_video_game(video_id):
        """Get or set a video's game"""
        # SQLAlchemy 2.0 query pattern
        stmt = select(Video).filter_by(video_id=video_id)
        video = db.session.execute(stmt).scalar_one_or_none()
        
        if not video:
            return jsonify({"error": "Video not found"}), 404
            
        if request.method == 'GET':
            return jsonify({"game": video.game.name if video.game else None})
            
        if request.method == 'PUT':
            if not current_user.is_authenticated:
                return jsonify({"error": "Authentication required"}), 401
                
            game_name = request.json.get('game')
            if not game_name:
                return jsonify({"error": "No game provided"}), 400
                
            game = video.set_game(game_name)
            return jsonify({"game": game.name}), 200

# Register this module with the main API blueprint
def register_routes(app_or_blueprint):
    app_or_blueprint.register_blueprint(games_bp)
    # Also register non-prefixed routes
    register_direct_routes(app_or_blueprint)
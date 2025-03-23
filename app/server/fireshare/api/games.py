import logging
from flask import Blueprint, request, jsonify, current_app
from flask_login import current_user, login_required
from sqlalchemy import select, func
from .. import db
from ..models import Game, Video
from .utils.response_helpers import api_error, api_success


games_bp = Blueprint('games', __name__, url_prefix='/api/games')

@games_bp.route('', methods=['GET'])
def get_games():
    
    
    stmt = select(Game).order_by(Game.name)
    games = db.session.execute(stmt).scalars().all()
    
    
    games_with_count = []
    for game in games:
        game_json = game.json()
        
        
        stmt = select(func.count()).select_from(Video).filter_by(game_id=game.id)
        video_count = db.session.execute(stmt).scalar_one()
        
        game_json["video_count"] = video_count
        current_app.logger.debug(f"Game {game.name} (ID: {game.id}) has {video_count} videos")
        games_with_count.append(game_json)
    
    
    stmt = select(func.count()).select_from(Video)
    total_videos = db.session.execute(stmt).scalar_one()
    
    stmt = select(func.count()).select_from(Video).filter(Video.game_id.isnot(None))
    videos_with_games = db.session.execute(stmt).scalar_one()
    
    current_app.logger.info(f"Total videos: {total_videos}, Videos with games: {videos_with_games}")
        
    return jsonify({"games": games_with_count})

@games_bp.route('/search', methods=['GET'])
def search_games():
    
    query = request.args.get('q', '')
    if not query:
        return jsonify({"games": []})
    
    
    query = f"%{query.lower()}%"
    
    
    stmt = select(Game).filter(Game.slug.like(Game.generate_slug(query)))
    games = db.session.execute(stmt).scalars().all()
    
    
    games_with_count = []
    for game in games:
        game_json = game.json()
        
        
        stmt = select(func.count()).select_from(Video).filter_by(game_id=game.id)
        video_count = db.session.execute(stmt).scalar_one()
        
        game_json["video_count"] = video_count
        current_app.logger.debug(f"Game {game.name} (ID: {game.id}) has {video_count} videos")
        games_with_count.append(game_json)
        
    return jsonify({"games": games_with_count})

@games_bp.route('/<game_id>', methods=['PUT'])
@login_required
def update_game(game_id):
    
    if not current_user.is_admin():
        return jsonify({"error": "Admin access required"}), 403
    
    
    stmt = select(Game).filter_by(id=game_id)
    game = db.session.execute(stmt).scalar_one_or_none()
    
    if not game:
        return jsonify({"error": "Game not found"}), 404
    
    data = request.json
    new_name = data.get('name')
    
    if not new_name:
        return jsonify({"error": "Name is required"}), 400
        
    
    game.name = new_name
    game.slug = Game.generate_slug(new_name)
    
    db.session.commit()
    
    
    stmt = select(func.count()).select_from(Video).filter_by(game_id=game.id)
    video_count = db.session.execute(stmt).scalar_one()
    
    game_json = game.json()
    game_json["video_count"] = video_count
    
    return jsonify(game_json), 200


def register_direct_routes(app_or_blueprint):
    
    
    @app_or_blueprint.route('/api/video/<video_id>/game', methods=['GET', 'PUT'])
    def handle_video_game(video_id):
        
        
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


def register_routes(app_or_blueprint):
    app_or_blueprint.register_blueprint(games_bp)
    
    register_direct_routes(app_or_blueprint)
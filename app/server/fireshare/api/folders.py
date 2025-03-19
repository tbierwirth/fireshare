from flask import Blueprint, request, jsonify, current_app
from flask_login import current_user, login_required
from sqlalchemy import select, func
from .. import db
from ..models import Folder, Video
from .utils.response_helpers import api_error, api_success

# Create blueprint with URL prefix
folders_bp = Blueprint('folders', __name__, url_prefix='/api/folders')

@folders_bp.route('', methods=['GET'])
def get_folders():
    """Get all folders"""
    # SQLAlchemy 2.0 query pattern
    stmt = select(Folder).order_by(Folder.name)
    folders = db.session.execute(stmt).scalars().all()
    
    # Manually count videos for each folder
    folders_with_count = []
    for folder in folders:
        folder_json = folder.json()
        
        # SQLAlchemy 2.0 count pattern
        stmt = select(func.count()).select_from(Video).filter_by(folder_id=folder.id)
        video_count = db.session.execute(stmt).scalar_one()
        
        folder_json["video_count"] = video_count
        folders_with_count.append(folder_json)
        
    return jsonify({"folders": folders_with_count})

# Additional endpoints that will be registered directly with the main blueprint
def register_direct_routes(app_or_blueprint):
    """Register routes that aren't part of the /api/folders URL structure"""
    
    @app_or_blueprint.route('/api/video/<video_id>/folder', methods=['PUT'])
    @login_required
    def update_video_folder(video_id):
        """Update a video's folder"""
        # SQLAlchemy 2.0 query pattern
        stmt = select(Video).filter_by(video_id=video_id)
        video = db.session.execute(stmt).scalar_one_or_none()
        
        if not video:
            return jsonify({"error": "Video not found"}), 404
            
        folder_id = request.json.get('folder_id')
        if not folder_id:
            return jsonify({"error": "No folder ID provided"}), 400
        
        # SQLAlchemy 2.0 query pattern    
        stmt = select(Folder).filter_by(id=folder_id)
        folder = db.session.execute(stmt).scalar_one_or_none()
        
        if not folder:
            return jsonify({"error": "Folder not found"}), 404
            
        video.folder_id = folder.id
        db.session.commit()
        
        return jsonify({"message": "Folder updated successfully"}), 200

# Register this module with the main API blueprint
def register_routes(app_or_blueprint):
    app_or_blueprint.register_blueprint(folders_bp)
    # Also register non-prefixed routes
    register_direct_routes(app_or_blueprint)
from flask import Blueprint, request, jsonify, current_app
from flask_login import current_user, login_required
from sqlalchemy import select, func
from .. import db
from ..models import Folder, Video
from .utils.response_helpers import api_error, api_success


folders_bp = Blueprint('folders', __name__, url_prefix='/api/folders')

@folders_bp.route('', methods=['GET'])
def get_folders():
    
    
    stmt = select(Folder).order_by(Folder.name)
    folders = db.session.execute(stmt).scalars().all()
    
    
    folders_with_count = []
    for folder in folders:
        folder_json = folder.json()
        
        
        stmt = select(func.count()).select_from(Video).filter_by(folder_id=folder.id)
        video_count = db.session.execute(stmt).scalar_one()
        
        folder_json["video_count"] = video_count
        folders_with_count.append(folder_json)
        
    return jsonify({"folders": folders_with_count})


def register_direct_routes(app_or_blueprint):
    
    
    @app_or_blueprint.route('/api/video/<video_id>/folder', methods=['PUT'])
    @login_required
    def update_video_folder(video_id):
        
        
        stmt = select(Video).filter_by(video_id=video_id)
        video = db.session.execute(stmt).scalar_one_or_none()
        
        if not video:
            return jsonify({"error": "Video not found"}), 404
            
        folder_id = request.json.get('folder_id')
        if not folder_id:
            return jsonify({"error": "No folder ID provided"}), 400
        
        
        stmt = select(Folder).filter_by(id=folder_id)
        folder = db.session.execute(stmt).scalar_one_or_none()
        
        if not folder:
            return jsonify({"error": "Folder not found"}), 404
            
        video.folder_id = folder.id
        db.session.commit()
        
        return jsonify({"message": "Folder updated successfully"}), 200


def register_routes(app_or_blueprint):
    app_or_blueprint.register_blueprint(folders_bp)
    
    register_direct_routes(app_or_blueprint)
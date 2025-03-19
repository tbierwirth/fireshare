from flask import Blueprint, request, jsonify, current_app
from flask_login import current_user, login_required
from sqlalchemy import select, func
from .. import db
from ..models import Tag, Video, video_tags
from .utils.response_helpers import api_error, api_success

# Create blueprint with URL prefix
tags_bp = Blueprint('tags', __name__, url_prefix='/api/tags')

@tags_bp.route('', methods=['GET'])
def get_tags():
    """Get all tags"""
    # SQLAlchemy 2.0 query pattern
    stmt = select(Tag).order_by(Tag.name)
    tags = db.session.execute(stmt).scalars().all()
    
    # Manually count videos for each tag
    tags_with_count = []
    for tag in tags:
        tag_json = tag.json()
        # For tags, we need to count through the association table
        # SQLAlchemy 2.0 pattern for count on a table
        stmt = select(func.count()).select_from(video_tags).where(video_tags.c.tag_id == tag.id)
        video_count = db.session.execute(stmt).scalar_one()
        tag_json["video_count"] = video_count
        tags_with_count.append(tag_json)
        
    return jsonify({"tags": tags_with_count})

@tags_bp.route('/search', methods=['GET'])
def search_tags():
    """Search for tags by name (case-insensitive partial match)"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({"tags": []})
    
    # Convert query to lowercase for case-insensitive matching
    query = f"%{query.lower()}%"
    
    # SQLAlchemy 2.0 query pattern
    stmt = select(Tag).filter(Tag.slug.like(Tag.generate_slug(query)))
    tags = db.session.execute(stmt).scalars().all()
    
    # Manually count videos for each tag
    tags_with_count = []
    for tag in tags:
        tag_json = tag.json()
        # For tags, we need to count through the association table - SQLAlchemy 2.0 style
        stmt = select(func.count()).select_from(video_tags).where(video_tags.c.tag_id == tag.id)
        video_count = db.session.execute(stmt).scalar_one()
        tag_json["video_count"] = video_count
        tags_with_count.append(tag_json)
        
    return jsonify({"tags": tags_with_count})

@tags_bp.route('/<tag_id>', methods=['DELETE'])
@login_required
def delete_tag(tag_id):
    """Delete a tag (admin only)"""
    if not current_user.is_admin():
        return jsonify({"error": "Admin access required"}), 403
    
    # SQLAlchemy 2.0 query pattern    
    stmt = select(Tag).filter_by(id=tag_id)
    tag = db.session.execute(stmt).scalar_one_or_none()
    
    if not tag:
        return jsonify({"error": "Tag not found"}), 404
        
    # Remove the tag from all videos
    for video in tag.videos:
        video.tags.remove(tag)
        
    # Delete the tag
    db.session.delete(tag)
    db.session.commit()
    
    return jsonify({"message": "Tag deleted successfully"}), 200

# Additional endpoints that will be registered directly with the main blueprint
def register_direct_routes(app_or_blueprint):
    """Register routes that aren't part of the /api/tags URL structure"""
    
    @app_or_blueprint.route('/api/video/<video_id>/tags', methods=['GET', 'POST'])
    def handle_video_tags(video_id):
        """Handle video tags (get or add)"""
        # SQLAlchemy 2.0 query pattern
        stmt = select(Video).filter_by(video_id=video_id)
        video = db.session.execute(stmt).scalar_one_or_none()
        
        if not video:
            return jsonify({"error": "Video not found"}), 404
            
        if request.method == 'GET':
            tags_with_count = []
            for tag in video.tags:
                tag_json = tag.json()
                # For tags, we need to count through the association table - SQLAlchemy 2.0 style
                stmt = select(func.count()).select_from(video_tags).where(video_tags.c.tag_id == tag.id)
                video_count = db.session.execute(stmt).scalar_one()
                tag_json["video_count"] = video_count
                tags_with_count.append(tag_json)
                
            return jsonify({"tags": tags_with_count})
            
        if request.method == 'POST':
            if not current_user.is_authenticated:
                return jsonify({"error": "Authentication required"}), 401
                
            tag_names = request.json.get('tags', [])
            if not tag_names:
                return jsonify({"error": "No tags provided"}), 400
                
            added_tags = []
            for tag_name in tag_names:
                added_tag = video.add_tag(tag_name)
                added_tags.append(added_tag.json())
                
            return jsonify({"added_tags": added_tags}), 201

# Register this module with the main API blueprint
def register_routes(app_or_blueprint):
    app_or_blueprint.register_blueprint(tags_bp)
    # Also register non-prefixed routes
    register_direct_routes(app_or_blueprint)
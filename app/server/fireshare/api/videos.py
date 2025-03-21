import json
import os, re, string
import shutil
import random
import logging
from flask import Blueprint, render_template, request, Response, jsonify, current_app, send_file, redirect
from flask_login import current_user, login_required
from sqlalchemy import select, func, text, delete, update
from pathlib import Path

from .. import db
from ..models import Video, VideoInfo, VideoView, Tag, Folder, Game, video_tags
from .utils.path_helpers import get_video_path
from .utils.response_helpers import api_error, api_success

# Create blueprint with URL prefix
videos_bp = Blueprint('videos', __name__, url_prefix='/api/videos')

# Keep the original endpoint for backward compatibility
@videos_bp.route('', methods=['GET'])
@login_required
def get_videos():
    """Get all videos with sorting options (LEGACY ENDPOINT)"""
    sort = request.args.get('sort')
    
    # SQLAlchemy 2.0 query pattern
    if "views" in sort:
        stmt = select(Video).join(VideoInfo)
        videos = db.session.execute(stmt).scalars().all()
    else:
        stmt = select(Video).join(VideoInfo).order_by(text(sort))
        videos = db.session.execute(stmt).scalars().all()

    videos_json = []
    for v in videos:
        vjson = v.json()
        vjson["view_count"] = VideoView.count(v.video_id)
        videos_json.append(vjson)

    if sort == "views asc":
        videos_json = sorted(videos_json, key=lambda d: d['view_count'])
    if sort == 'views desc':
        videos_json = sorted(videos_json, key=lambda d: d['view_count'], reverse=True)

    # Log response for debugging
    logging.info(f"LEGACY get_videos endpoint returning {len(videos_json)} videos")
    
    return jsonify({"videos": videos_json})

# New, more semantically clear endpoint for user's own videos
@videos_bp.route('/my', methods=['GET'])
@login_required
def get_my_videos():
    """Get user's own videos with sorting options (MY VIDEOS section)"""
    sort = request.args.get('sort')
    
    # Detailed logging for debugging
    logging.info(f"get_my_videos called by user {current_user.username} with sort={sort}")
    logging.info(f"User authenticated: {current_user.is_authenticated}, Admin: {current_user.is_admin if hasattr(current_user, 'is_admin') else 'N/A'}")
    
    try:
        # SQLAlchemy 2.0 query pattern
        # Return ALL videos regardless of privacy for the logged-in user's dashboard
        if "views" in sort:
            stmt = select(Video).join(VideoInfo)
            videos = db.session.execute(stmt).scalars().all()
        else:
            stmt = select(Video).join(VideoInfo).order_by(text(sort))
            videos = db.session.execute(stmt).scalars().all()

        # Detailed logging of results for debugging
        logging.info(f"Found {len(videos)} videos in database for My Videos")
        
        videos_json = []
        for v in videos:
            vjson = v.json()
            vjson["view_count"] = VideoView.count(v.video_id)
            videos_json.append(vjson)

        if sort == "views asc":
            videos_json = sorted(videos_json, key=lambda d: d['view_count'])
        if sort == 'views desc':
            videos_json = sorted(videos_json, key=lambda d: d['view_count'], reverse=True)

        # Log response for debugging
        logging.info(f"get_my_videos returning {len(videos_json)} videos")
        
        # Return expected format with videos array
        return jsonify({"videos": videos_json})
        
    except Exception as e:
        logging.error(f"Error in get_my_videos: {str(e)}", exc_info=True)
        return jsonify({"videos": [], "error": str(e)})

@videos_bp.route('/public', methods=['GET'])
def get_public_videos():
    """Get public videos with sorting options"""
    sort = request.args.get('sort')
    
    # SQLAlchemy 2.0 query pattern
    if "views" in sort:
        stmt = select(Video).join(VideoInfo).filter_by(private=False)
        videos = db.session.execute(stmt).scalars().all()
    else:
        stmt = select(Video).join(VideoInfo).filter_by(private=False).order_by(text(sort))
        videos = db.session.execute(stmt).scalars().all()
    
    videos_json = []
    for v in videos:
        vjson = v.json()
        if (not vjson["available"]):
            continue
        vjson["view_count"] = VideoView.count(v.video_id)
        videos_json.append(vjson)

    if sort == "views asc":
        videos_json = sorted(videos_json, key=lambda d: d['view_count'])
    if sort == 'views desc':
        videos_json = sorted(videos_json, key=lambda d: d['view_count'], reverse=True)

    return jsonify({"videos": videos_json})

@videos_bp.route('/random', methods=['GET'])
@login_required
def get_random_video():
    """Get a random video"""
    # SQLAlchemy 2.0 query pattern
    stmt = select(func.count()).select_from(Video)
    row_count = db.session.execute(stmt).scalar_one()
    
    stmt = select(Video).offset(int(row_count * random.random()))
    random_video = db.session.execute(stmt).scalar_one_or_none()
    
    current_app.logger.info(f"Fetched random video {random_video.video_id}: {random_video.info.title}")
    return jsonify(random_video.json())

@videos_bp.route('/public/random', methods=['GET'])
def get_random_public_video():
    """Get a random public video"""
    # SQLAlchemy 2.0 query pattern
    stmt = select(func.count()).select_from(Video).filter(Video.info.has(private=False)).filter_by(available=True)
    row_count = db.session.execute(stmt).scalar_one()
    
    stmt = select(Video).filter(Video.info.has(private=False)).filter_by(available=True).offset(int(row_count * random.random()))
    random_video = db.session.execute(stmt).scalar_one_or_none()
    
    current_app.logger.info(f"Fetched public random video {random_video.video_id}: {random_video.info.title}")
    return jsonify(random_video.json())

# Make video_metadata accessible to be imported by __init__.py
@videos_bp.route('/w/<video_id>')
def video_metadata(video_id):
    """Get video metadata for sharing"""
    # SQLAlchemy 2.0 query pattern
    stmt = select(Video).filter_by(video_id=video_id)
    video = db.session.execute(stmt).scalar_one_or_none()
    domain = f"https://{current_app.config['DOMAIN']}" if current_app.config['DOMAIN'] else ""
    if video:
        return render_template('metadata.html', video=video.json(), domain=domain)
    else:
        return redirect('{}/#/w/{}'.format(domain, video_id), code=302)

# Additional endpoints that will be registered directly with the main blueprint
def register_direct_routes(app_or_blueprint):
    """Register routes that aren't part of the /api/videos URL structure"""
    
    @app_or_blueprint.route('/api/video/details/<id>', methods=["GET", "PUT"])
    def handle_video_details(id):
        """Get or update video details"""
        if request.method == 'GET':
            # SQLAlchemy 2.0 query pattern
            stmt = select(Video).filter_by(video_id=id)
            video = db.session.execute(stmt).scalar_one_or_none()
            
            if video:
                return jsonify(video.json())
            else:
                return jsonify({
                    'message': 'Video not found'
                }), 404
                
        if request.method == 'PUT':
            if not current_user.is_authenticated:
                return Response(response='You do not have access to this resource.', status=401)
                
            # SQLAlchemy 2.0 query pattern
            stmt = select(VideoInfo).filter_by(video_id=id)
            video_info = db.session.execute(stmt).scalar_one_or_none()
            
            if video_info:
                stmt = update(VideoInfo).filter_by(video_id=id).values(**request.json)
                db.session.execute(stmt)
                db.session.commit()
                return Response(status=201)
            else:
                return jsonify({
                    'message': 'Video details not found'
                }), 404
    
    @app_or_blueprint.route('/api/video/delete/<id>', methods=["DELETE"])
    @login_required
    def delete_video(id):
        """Delete a video and its associated files"""
        # SQLAlchemy 2.0 query pattern
        stmt = select(Video).filter_by(video_id=id)
        video = db.session.execute(stmt).scalar_one_or_none()
        
        if video:
            logging.info(f"Deleting video: {video.video_id}")
            
            # Get video info for file paths before deleting
            file_path = f"{current_app.config['VIDEO_DIRECTORY']}/{video.path}"
            link_path = f"{current_app.config['PROCESSED_DIRECTORY']}/video_links/{id}.{video.extension}"
            derived_path = f"{current_app.config['PROCESSED_DIRECTORY']}/derived/{id}"
            
            # Delete associated records using SQLAlchemy 2.0 patterns
            db.session.execute(delete(VideoInfo).filter_by(video_id=id))
            db.session.execute(delete(Video).filter_by(video_id=id))
            db.session.commit()
            
            # Remove files
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                if os.path.exists(link_path):
                    os.remove(link_path)
                if os.path.exists(derived_path):
                    shutil.rmtree(derived_path)
            except OSError as e:
                logging.error(f"Error deleting: {e.strerror}")
            return Response(status=200)
            
        else:
            return Response(status=404, response=f"A video with id: {id}, does not exist.")
    
    @app_or_blueprint.route('/api/video/poster', methods=['GET'])
    def get_video_poster():
        """Get a video's poster image (static or animated)"""
        video_id = request.args['id']
        webm_poster_path = Path(current_app.config["PROCESSED_DIRECTORY"], "derived", video_id, "boomerang-preview.webm")
        jpg_poster_path = Path(current_app.config["PROCESSED_DIRECTORY"], "derived", video_id, "poster.jpg")
        if request.args.get('animated'):
            return send_file(webm_poster_path, mimetype='video/webm')
        else:
            return send_file(jpg_poster_path, mimetype='image/jpg')
    
    @app_or_blueprint.route('/api/video/view', methods=['POST'])
    def add_video_view():
        """Add a view count to a video"""
        video_id = request.json['video_id']
        if request.headers.getlist("X-Forwarded-For"):
            ip_address = request.headers.getlist("X-Forwarded-For")[0].split(",")[0]
        else:
            ip_address = request.remote_addr
        VideoView.add_view(video_id, ip_address)
        return Response(status=200)
    
    @app_or_blueprint.route('/api/video/<video_id>/views', methods=['GET'])
    def get_video_views(video_id):
        """Get the view count for a video"""
        views = VideoView.count(video_id)
        return str(views)
    
    @app_or_blueprint.route('/api/video', methods=['GET'])
    def get_video():
        """Stream a video file with range support"""
        video_id = request.args.get('id')
        subid = request.args.get('subid')
        video_path = get_video_path(video_id, subid)
        file_size = os.stat(video_path).st_size
        start = 0
        length = 10240

        range_header = request.headers.get('Range', None)
        if range_header:
            m = re.search('([0-9]+)-([0-9]*)', range_header)
            g = m.groups()
            byte1, byte2 = 0, None
            if g[0]:
                byte1 = int(g[0])
            if g[1]:
                byte2 = int(g[1])
            if byte1 < file_size:
                start = byte1
            if byte2:
                length = byte2 + 1 - byte1
            else:
                length = file_size - start

        with open(video_path, 'rb') as f:
            f.seek(start)
            chunk = f.read(length)

        rv = Response(chunk, 206, mimetype='video/mp4', content_type='video/mp4', direct_passthrough=True)
        rv.headers.add('Content-Range', 'bytes {0}-{1}/{2}'.format(start, start + length - 1, file_size))
        return rv
    
    # Route removed - now defined at module level for reuse

# Register this module with the main API blueprint
def register_routes(app_or_blueprint):
    app_or_blueprint.register_blueprint(videos_bp)
    # Also register non-prefixed routes
    register_direct_routes(app_or_blueprint)
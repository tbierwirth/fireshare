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


videos_bp = Blueprint('videos', __name__, url_prefix='/api/videos')


@videos_bp.route('', methods=['GET'])
@login_required
def get_videos():
    
    sort = request.args.get('sort', 'updated_at desc')
    
    # Map intuitive sort options to SQL sort expressions
    sort_mapping = {
        'newest': 'updated_at desc',
        'oldest': 'updated_at asc',
        'a-z': 'title asc',
        'z-a': 'title desc'
    }
    
    # Apply mapping if a friendly sort option is used
    sql_sort = sort_mapping.get(sort, sort)
    
    if sort and "views" in sort:
        stmt = select(Video).join(VideoInfo)
        videos = db.session.execute(stmt).scalars().all()
    else:
        stmt = select(Video).join(VideoInfo).order_by(text(sql_sort))
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

    
    logging.info(f"LEGACY get_videos endpoint returning {len(videos_json)} videos")
    
    return jsonify({"videos": videos_json})


@videos_bp.route('/my', methods=['GET'])
@login_required
def get_my_videos():
    
    sort = request.args.get('sort', 'newest')
    
    # Map intuitive sort options to SQL sort expressions
    sort_mapping = {
        'newest': 'updated_at desc',
        'oldest': 'updated_at asc',
        'a-z': 'title asc',
        'z-a': 'title desc'
    }
    
    # Apply mapping if a friendly sort option is used
    sql_sort = sort_mapping.get(sort, sort)
    
    logging.info(f"get_my_videos called by user {current_user.username} with sort={sort} (SQL sort: {sql_sort})")
    logging.info(f"User authenticated: {current_user.is_authenticated}, Admin: {current_user.is_admin() if hasattr(current_user, 'is_admin') else 'N/A'}")
    
    try:
        # Get the current user's ID
        user_id = current_user.id
        
        # First, debug all videos to check if they exist in the database
        all_videos_stmt = select(Video)
        all_videos = db.session.execute(all_videos_stmt).scalars().all()
        logging.info(f"DEBUG: Total videos in database: {len(all_videos)}")
        for v in all_videos:
            logging.info(f"DEBUG: Video ID: {v.video_id}, Owner ID: {v.owner_id}, Game: {v.game.name if v.game else 'None'}")
        
        # Filter videos by owner_id (the current user)
        if sort and "views" in sort:
            stmt = select(Video).join(VideoInfo).filter(Video.owner_id == user_id)
            videos = db.session.execute(stmt).scalars().all()
        else:
            stmt = select(Video).join(VideoInfo).filter(Video.owner_id == user_id).order_by(text(sql_sort))
            videos = db.session.execute(stmt).scalars().all()

        
        logging.info(f"Found {len(videos)} videos in database for user {current_user.username} (ID: {user_id})")
        
        videos_json = []
        for v in videos:
            vjson = v.json()
            vjson["view_count"] = VideoView.count(v.video_id)
            videos_json.append(vjson)

        if sort == "views asc":
            videos_json = sorted(videos_json, key=lambda d: d['view_count'])
        if sort == 'views desc':
            videos_json = sorted(videos_json, key=lambda d: d['view_count'], reverse=True)

        
        logging.info(f"get_my_videos returning {len(videos_json)} videos for user {current_user.username}")
        
        
        return jsonify({"videos": videos_json})
        
    except Exception as e:
        logging.error(f"Error in get_my_videos: {str(e)}", exc_info=True)
        return jsonify({"videos": [], "error": str(e)})

@videos_bp.route('/public', methods=['GET'])
def get_public_videos():
    
    sort = request.args.get('sort', 'newest')
    
    # Map intuitive sort options to SQL sort expressions
    sort_mapping = {
        'newest': 'updated_at desc',
        'oldest': 'updated_at asc',
        'a-z': 'title asc',
        'z-a': 'title desc'
    }
    
    # Apply mapping if a friendly sort option is used
    sql_sort = sort_mapping.get(sort, sort)
    
    logging.info(f"get_public_videos called with sort={sort} (SQL sort: {sql_sort})")
    
    # First, debug all videos to check if they exist in the database
    all_videos_stmt = select(Video)
    all_videos = db.session.execute(all_videos_stmt).scalars().all()
    logging.info(f"DEBUG: Total videos in database (public): {len(all_videos)}")
    for v in all_videos:
        logging.info(f"DEBUG: Video ID: {v.video_id}, Owner ID: {v.owner_id}, Available: {v.available}, Game: {v.game.name if v.game else 'None'}")
    
    # All videos are now public - no filter needed
    if sort and "views" in sort:
        stmt = select(Video).join(VideoInfo)
        videos = db.session.execute(stmt).scalars().all()
    else:
        stmt = select(Video).join(VideoInfo).order_by(text(sql_sort))
        videos = db.session.execute(stmt).scalars().all()
    
    logging.info(f"Found {len(videos)} public videos in database")
    
    videos_json = []
    for v in videos:
        vjson = v.json()
        if (not vjson["available"]):
            logging.info(f"Skipping unavailable video: {v.video_id}")
            continue
        vjson["view_count"] = VideoView.count(v.video_id)
        videos_json.append(vjson)

    if sort == "views asc":
        videos_json = sorted(videos_json, key=lambda d: d['view_count'])
    if sort == 'views desc':
        videos_json = sorted(videos_json, key=lambda d: d['view_count'], reverse=True)

    logging.info(f"get_public_videos returning {len(videos_json)} videos")
    
    return jsonify({"videos": videos_json})

@videos_bp.route('/random', methods=['GET'])
@login_required
def get_random_video():
    
    
    stmt = select(func.count()).select_from(Video)
    row_count = db.session.execute(stmt).scalar_one()
    
    stmt = select(Video).offset(int(row_count * random.random()))
    random_video = db.session.execute(stmt).scalar_one_or_none()
    
    current_app.logger.info(f"Fetched random video {random_video.video_id}: {random_video.info.title}")
    return jsonify(random_video.json())

@videos_bp.route('/public/random', methods=['GET'])
def get_random_public_video():
    
    # All videos are now public - no filter for private needed
    stmt = select(func.count()).select_from(Video).filter_by(available=True)
    row_count = db.session.execute(stmt).scalar_one()
    
    stmt = select(Video).filter_by(available=True).offset(int(row_count * random.random()))
    random_video = db.session.execute(stmt).scalar_one_or_none()
    
    current_app.logger.info(f"Fetched public random video {random_video.video_id}: {random_video.info.title}")
    return jsonify(random_video.json())


@videos_bp.route('/w/<video_id>')
def video_metadata(video_id):
    
    
    stmt = select(Video).filter_by(video_id=video_id)
    video = db.session.execute(stmt).scalar_one_or_none()
    domain = f"https://{current_app.config['DOMAIN']}" if current_app.config['DOMAIN'] else ""
    if video:
        return render_template('metadata.html', video=video.json(), domain=domain)
    else:
        return redirect('{}/#/w/{}'.format(domain, video_id), code=302)


def register_direct_routes(app_or_blueprint):
    
    
    @app_or_blueprint.route('/api/video/details/<id>', methods=["GET", "PUT"])
    def handle_video_details(id):
        
        if request.method == 'GET':
            
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
                
            
            stmt = select(VideoInfo).filter_by(video_id=id)
            video_info = db.session.execute(stmt).scalar_one_or_none()
            
            if video_info:
                # Get request data and remove any private field if present - it's ignored
                update_data = request.json.copy()
                if 'private' in update_data:
                    del update_data['private']  # Remove privacy field from the update
                    
                stmt = update(VideoInfo).filter_by(video_id=id).values(**update_data)
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
        
        
        stmt = select(Video).filter_by(video_id=id)
        video = db.session.execute(stmt).scalar_one_or_none()
        
        if video:
            logging.info(f"Deleting video: {video.video_id}")
            
            
            file_path = f"{current_app.config['VIDEO_DIRECTORY']}/{video.path}"
            link_path = f"{current_app.config['PROCESSED_DIRECTORY']}/video_links/{id}.{video.extension}"
            derived_path = f"{current_app.config['PROCESSED_DIRECTORY']}/derived/{id}"
            
            
            db.session.execute(delete(VideoInfo).filter_by(video_id=id))
            db.session.execute(delete(Video).filter_by(video_id=id))
            db.session.commit()
            
            
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
        video_id = request.args['id']
        webm_poster_path = Path(current_app.config["PROCESSED_DIRECTORY"], "derived", video_id, "boomerang-preview.webm")
        jpg_poster_path = Path(current_app.config["PROCESSED_DIRECTORY"], "derived", video_id, "poster.jpg")
        
        # Check if this is a request for an animated poster
        if request.args.get('animated'):
            # Check if the animated poster exists
            if webm_poster_path.exists():
                return send_file(webm_poster_path, mimetype='video/webm')
            else:
                # Return a default loading file or empty response
                logging.info(f"Animated poster for {video_id} not found, still processing")
                return Response(status=202)  # 202 Accepted - processing in progress
        else:
            # Check if the static poster exists
            if jpg_poster_path.exists():
                return send_file(jpg_poster_path, mimetype='image/jpg')
            else:
                # Return 202 status to indicate processing in progress
                logging.info(f"Static poster for {video_id} not found, still processing")
                return Response(status=202)  # 202 Accepted - processing in progress
    
    # Add direct path parameter route for poster (modern style)
    @app_or_blueprint.route('/api/video/poster/<video_id>', methods=['GET'])
    def get_video_poster_by_id(video_id):
        webm_poster_path = Path(current_app.config["PROCESSED_DIRECTORY"], "derived", video_id, "boomerang-preview.webm")
        jpg_poster_path = Path(current_app.config["PROCESSED_DIRECTORY"], "derived", video_id, "poster.jpg")
        
        # Check if this is a request for an animated poster
        if request.args.get('animated'):
            # Check if the animated poster exists
            if webm_poster_path.exists():
                return send_file(webm_poster_path, mimetype='video/webm')
            else:
                # Return a default loading file or empty response
                logging.info(f"Animated poster for {video_id} not found, still processing")
                return Response(status=202)  # 202 Accepted - processing in progress
        else:
            # Check if the static poster exists
            if jpg_poster_path.exists():
                return send_file(jpg_poster_path, mimetype='image/jpg')
            else:
                # Return 202 status to indicate processing in progress
                logging.info(f"Static poster for {video_id} not found, still processing")
                return Response(status=202)  # 202 Accepted - processing in progress
    
    @app_or_blueprint.route('/api/video/view', methods=['POST'])
    def add_video_view():
        
        video_id = request.json['video_id']
        if request.headers.getlist("X-Forwarded-For"):
            ip_address = request.headers.getlist("X-Forwarded-For")[0].split(",")[0]
        else:
            ip_address = request.remote_addr
        VideoView.add_view(video_id, ip_address)
        return Response(status=200)
    
    @app_or_blueprint.route('/api/video/<video_id>/views', methods=['GET'])
    def get_video_views(video_id):
        
        views = VideoView.count(video_id)
        return str(views)
    
    @app_or_blueprint.route('/api/video', methods=['GET'])
    def get_video():
        
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
    
    


def register_routes(app_or_blueprint):
    app_or_blueprint.register_blueprint(videos_bp)
    
    register_direct_routes(app_or_blueprint)
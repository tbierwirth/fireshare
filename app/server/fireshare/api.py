import json
import os, re, string
import shutil
import random
import logging
from subprocess import Popen
from textwrap import indent
from flask import Blueprint, render_template, request, Response, jsonify, current_app, send_file, redirect
from flask_login import current_user, login_required
from flask_cors import CORS
from sqlalchemy.sql import text
from pathlib import Path


from . import db
from .models import Video, VideoInfo, VideoView, Tag, Folder, Game, video_tags
from .constants import SUPPORTED_FILE_TYPES

templates_path = os.environ.get('TEMPLATE_PATH') or 'templates'
api = Blueprint('api', __name__, template_folder=templates_path)

CORS(api, supports_credentials=True)

def get_video_path(id, subid=None):
    video = Video.query.filter_by(video_id=id).first()
    if not video:
        raise Exception(f"No video found for {id}")
    paths = current_app.config['PATHS']
    subid_suffix = f"-{subid}" if subid else ""
    ext = ".mp4" if subid else video.extension
    video_path = paths["processed"] / "video_links" / f"{id}{subid_suffix}{ext}"
    return str(video_path)

@api.route('/w/<video_id>')
def video_metadata(video_id):
    video = Video.query.filter_by(video_id=video_id).first()
    domain = f"https://{current_app.config['DOMAIN']}" if current_app.config['DOMAIN'] else ""
    if video:
        return render_template('metadata.html', video=video.json(), domain=domain)
    else:
        return redirect('{}/#/w/{}'.format(domain, video_id), code=302)

@api.route('/api/config')
def config():
    paths = current_app.config['PATHS']
    config_path = paths['data'] / 'config.json'
    file = open(config_path)
    config = json.load(file)
    file.close()
    if config_path.exists():
        return config["ui_config"]
    else:
        return jsonify({})

@api.route('/api/admin/config', methods=["GET", "PUT"])
@login_required
def get_or_update_config():
    paths = current_app.config['PATHS']
    if request.method == 'GET':
        config_path = paths['data'] / 'config.json'
        file = open(config_path)
        config = json.load(file)
        file.close()
        if config_path.exists():
            return config
        else:
            return jsonify({})
    if request.method == 'PUT':
        config = request.json["config"]
        config_path = paths['data'] / 'config.json'
        if not config:
            return Response(status=400, response='A config must be provided.')
        if not config_path.exists():
            return Response(status=500, response='Could not find a config to update.')
        config_path.write_text(json.dumps(config, indent=2))
        return Response(status=200)

@api.route('/api/admin/warnings', methods=["GET"])
@login_required
def get_warnings():
    warnings = current_app.config['WARNINGS']
    if request.method == 'GET':
        if len(warnings) == 0:
            return jsonify({})
        else:
            return jsonify(warnings)

@api.route('/api/manual/scan')
@login_required
def manual_scan():
    if not current_app.config["ENVIRONMENT"] == 'production':
        return Response(response='You must be running in production for this task to work.', status=400)
    else:
        current_app.logger.info(f"Executed manual scan")
        Popen("fireshare bulk-import", shell=True)
    return Response(status=200)

@api.route('/api/videos')
@login_required
def get_videos():
    sort = request.args.get('sort')
    if "views" in sort:
        videos = Video.query.join(VideoInfo).all()
    else:
        videos = Video.query.join(VideoInfo).order_by(text(sort)).all()

    videos_json = []
    for v in videos:
        vjson = v.json()
        vjson["view_count"] = VideoView.count(v.video_id)
        videos_json.append(vjson)

    if sort == "views asc":
        videos_json = sorted(videos_json, key=lambda d: d['view_count'])
    if sort == 'views desc':
        videos_json = sorted(videos_json, key=lambda d: d['view_count'], reverse=True)

    return jsonify({"videos": videos_json})

@api.route('/api/video/random')
@login_required
def get_random_video():
    row_count = Video.query.count()
    random_video = Video.query.offset(int(row_count * random.random())).first()
    current_app.logger.info(f"Fetched random video {random_video.video_id}: {random_video.info.title}")
    return jsonify(random_video.json())

@api.route('/api/video/public/random')
def get_random_public_video():
    row_count =  Video.query.filter(Video.info.has(private=False)).filter_by(available=True).count()
    random_video = Video.query.filter(Video.info.has(private=False)).filter_by(available=True).offset(int(row_count * random.random())).first()
    current_app.logger.info(f"Fetched public random video {random_video.video_id}: {random_video.info.title}")
    return jsonify(random_video.json())

@api.route('/api/videos/public')
def get_public_videos():
    sort = request.args.get('sort')
    if "views" in sort:
        videos = Video.query.join(VideoInfo).filter_by(private=False)
    else:
        videos = Video.query.join(VideoInfo).filter_by(private=False).order_by(text(sort))
    
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

@api.route('/api/video/delete/<id>', methods=["DELETE"])
@login_required
def delete_video(id):
    video = Video.query.filter_by(video_id=id).first()
    if video:
        logging.info(f"Deleting video: {video.video_id}")
        VideoInfo.query.filter_by(video_id=id).delete()
        Video.query.filter_by(video_id=id).delete()
        db.session.commit()
        file_path = f"{current_app.config['VIDEO_DIRECTORY']}/{video.path}"
        link_path = f"{current_app.config['PROCESSED_DIRECTORY']}/video_links/{id}.{video.extension}"
        derived_path = f"{current_app.config['PROCESSED_DIRECTORY']}/derived/{id}"
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

@api.route('/api/video/details/<id>', methods=["GET", "PUT"])
def handle_video_details(id):
    if request.method == 'GET':
        # db lookup and get the details title/views/etc
        # video_id = request.args['id']
        video = Video.query.filter_by(video_id=id).first()
        if video:
            return jsonify(video.json())
        else:
            return jsonify({
                'message': 'Video not found'
            }), 404
    if request.method == 'PUT':
        if not current_user.is_authenticated:
            return Response(response='You do not have access to this resource.', status=401)
        video_info = VideoInfo.query.filter_by(video_id=id).first()
        if video_info:
            db.session.query(VideoInfo).filter_by(video_id=id).update(request.json)
            db.session.commit()
            return Response(status=201)
        else:
            return jsonify({
                'message': 'Video details not found'
            }), 404

@api.route('/api/video/poster', methods=['GET'])
def get_video_poster():
    video_id = request.args['id']
    webm_poster_path = Path(current_app.config["PROCESSED_DIRECTORY"], "derived", video_id, "boomerang-preview.webm")
    jpg_poster_path = Path(current_app.config["PROCESSED_DIRECTORY"], "derived", video_id, "poster.jpg")
    if request.args.get('animated'):
        return send_file(webm_poster_path, mimetype='video/webm')
    else:
        return send_file(jpg_poster_path, mimetype='image/jpg')

@api.route('/api/video/view', methods=['POST'])
def add_video_view():
    video_id = request.json['video_id']
    if request.headers.getlist("X-Forwarded-For"):
        ip_address = request.headers.getlist("X-Forwarded-For")[0].split(",")[0]
    else:
        ip_address = request.remote_addr
    VideoView.add_view(video_id, ip_address)
    return Response(status=200)

@api.route('/api/video/<video_id>/views', methods=['GET'])
def get_video_views(video_id):
    views = VideoView.count(video_id)
    return str(views)

@api.route('/api/upload/public', methods=['POST'])
def public_upload_video():
    paths = current_app.config['PATHS']
    with open(paths['data'] / 'config.json', 'r') as configfile:
        try:
            config = json.load(configfile)
        except:
            logging.error("Invalid or corrupt config file")
            return jsonify({"error": "Invalid or corrupt config file"}), 400
        configfile.close()
        
    if not config['app_config']['allow_public_upload']:
        logging.warn("A public upload attempt was made but public uploading is disabled")
        return jsonify({"error": "Public uploads are disabled"}), 401
    
    upload_folder = config['app_config']['public_upload_folder_name']

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
        
    filename = file.filename
    filetype = file.filename.split('.')[-1]
    if not filetype in SUPPORTED_FILE_TYPES:
        return jsonify({"error": f"Unsupported file type: {filetype}"}), 400
        
    # Get the game (required) and tags (optional)
    game = request.form.get('game')
    tags = request.form.getlist('tags[]') if 'tags[]' in request.form else []
    
    # Require a game to be specified
    if not game:
        return jsonify({"error": "Game is required"}), 400
    
    upload_directory = paths['video'] / upload_folder
    if not os.path.exists(upload_directory):
        os.makedirs(upload_directory)
        
    save_path = os.path.join(upload_directory, filename)
    if (os.path.exists(save_path)):
        name_no_type = ".".join(filename.split('.')[0:-1])
        uid = ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(6))
        save_path = os.path.join(paths['video'], upload_folder, f"{name_no_type}-{uid}.{filetype}")
        
    file.save(save_path)
    
    # Scan the video
    cmd = f"fireshare scan-video --path=\"{save_path}\""
    
    # Add game
    cmd += f" --game=\"{game}\""
    
    # Add tags if provided
    if tags:
        tag_list = ','.join(tags)
        cmd += f" --tags=\"{tag_list}\""
        
    Popen(cmd, shell=True)
    
    return jsonify({
        "message": "Video uploaded successfully", 
        "tags": tags
    }), 201

@api.route('/api/upload', methods=['POST'])
@login_required
def upload_video():
    paths = current_app.config['PATHS']
    with open(paths['data'] / 'config.json', 'r') as configfile:
        try:
            config = json.load(configfile)
        except:
            return jsonify({"error": "Invalid or corrupt config file"}), 500
        configfile.close()
    
    upload_folder = config['app_config']['admin_upload_folder_name']

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
        
    filename = file.filename
    filetype = file.filename.split('.')[-1]
    if not filetype in SUPPORTED_FILE_TYPES:
        return jsonify({"error": f"Unsupported file type: {filetype}"}), 400
        
    # Get the game (required) and tags (optional)
    game = request.form.get('game')
    tags = request.form.getlist('tags[]') if 'tags[]' in request.form else []
    
    # Require a game to be specified
    if not game:
        return jsonify({"error": "Game is required"}), 400
    
    upload_directory = paths['video'] / upload_folder
    if not os.path.exists(upload_directory):
        os.makedirs(upload_directory)
        
    save_path = os.path.join(upload_directory, filename)
    if (os.path.exists(save_path)):
        name_no_type = ".".join(filename.split('.')[0:-1])
        uid = ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(6))
        save_path = os.path.join(paths['video'], upload_folder, f"{name_no_type}-{uid}.{filetype}")
        
    file.save(save_path)
    
    # Scan the video
    cmd = f"fireshare scan-video --path=\"{save_path}\""
    
    # Add game
    cmd += f" --game=\"{game}\""
    
    # Add tags if provided
    if tags:
        tag_list = ','.join(tags)
        cmd += f" --tags=\"{tag_list}\""
        
    # Add owner info
    cmd += f" --owner-id={current_user.id}"
    
    Popen(cmd, shell=True)
    
    return jsonify({
        "message": "Video uploaded successfully",
        "tags": tags
    }), 201

@api.route('/api/video')
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

# Game API endpoints
@api.route('/api/games', methods=['GET'])
def get_games():
    """Get all games"""
    games = Game.query.order_by(Game.name).all()
    
    # Manually count videos for each game with extra debugging
    games_with_count = []
    for game in games:
        game_json = game.json()
        video_count = Video.query.filter_by(game_id=game.id).count()
        game_json["video_count"] = video_count
        current_app.logger.debug(f"Game {game.name} (ID: {game.id}) has {video_count} videos")
        games_with_count.append(game_json)
    
    # Log overall game counts
    total_videos = Video.query.count()
    videos_with_games = Video.query.filter(Video.game_id.isnot(None)).count()
    current_app.logger.info(f"Total videos: {total_videos}, Videos with games: {videos_with_games}")
        
    return jsonify({"games": games_with_count})

@api.route('/api/games/search', methods=['GET'])
def search_games():
    """Search for games by name (case-insensitive partial match)"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({"games": []})
    
    # Convert query to lowercase for case-insensitive matching
    query = f"%{query.lower()}%"
    games = Game.query.filter(Game.slug.like(Game.generate_slug(query))).all()
    
    # Manually count videos for each game
    games_with_count = []
    for game in games:
        game_json = game.json()
        video_count = Video.query.filter_by(game_id=game.id).count()
        game_json["video_count"] = video_count
        current_app.logger.debug(f"Game {game.name} (ID: {game.id}) has {video_count} videos")
        games_with_count.append(game_json)
        
    return jsonify({"games": games_with_count})

@api.route('/api/video/<video_id>/game', methods=['GET', 'PUT'])
def handle_video_game(video_id):
    """Get or set a video's game"""
    video = Video.query.filter_by(video_id=video_id).first()
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

# Tag and Folder API endpoints
@api.route('/api/tags', methods=['GET'])
def get_tags():
    """Get all tags"""
    tags = Tag.query.order_by(Tag.name).all()
    
    # Manually count videos for each tag
    tags_with_count = []
    for tag in tags:
        tag_json = tag.json()
        # For tags, we need to count through the association table
        tag_json["video_count"] = db.session.query(video_tags).filter_by(tag_id=tag.id).count()
        tags_with_count.append(tag_json)
        
    return jsonify({"tags": tags_with_count})

@api.route('/api/tags/search', methods=['GET'])
def search_tags():
    """Search for tags by name (case-insensitive partial match)"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({"tags": []})
    
    # Convert query to lowercase for case-insensitive matching
    query = f"%{query.lower()}%"
    tags = Tag.query.filter(Tag.slug.like(Tag.generate_slug(query))).all()
    
    # Manually count videos for each tag
    tags_with_count = []
    for tag in tags:
        tag_json = tag.json()
        # For tags, we need to count through the association table
        tag_json["video_count"] = db.session.query(video_tags).filter_by(tag_id=tag.id).count()
        tags_with_count.append(tag_json)
        
    return jsonify({"tags": tags_with_count})

@api.route('/api/folders', methods=['GET'])
def get_folders():
    """Get all folders"""
    folders = Folder.query.order_by(Folder.name).all()
    
    # Manually count videos for each folder
    folders_with_count = []
    for folder in folders:
        folder_json = folder.json()
        folder_json["video_count"] = Video.query.filter_by(folder_id=folder.id).count()
        folders_with_count.append(folder_json)
        
    return jsonify({"folders": folders_with_count})

@api.route('/api/video/<video_id>/tags', methods=['GET', 'POST'])
def handle_video_tags(video_id):
    """Handle video tags (get or add)"""
    video = Video.query.filter_by(video_id=video_id).first()
    if not video:
        return jsonify({"error": "Video not found"}), 404
        
    if request.method == 'GET':
        tags_with_count = []
        for tag in video.tags:
            tag_json = tag.json()
            # For tags, we need to count through the association table
            tag_json["video_count"] = db.session.query(video_tags).filter_by(tag_id=tag.id).count()
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

@api.route('/api/video/<video_id>/folder', methods=['PUT'])
@login_required
def update_video_folder(video_id):
    """Update a video's folder"""
    video = Video.query.filter_by(video_id=video_id).first()
    if not video:
        return jsonify({"error": "Video not found"}), 404
        
    folder_id = request.json.get('folder_id')
    if not folder_id:
        return jsonify({"error": "No folder ID provided"}), 400
        
    folder = Folder.query.get(folder_id)
    if not folder:
        return jsonify({"error": "Folder not found"}), 404
        
    video.folder_id = folder.id
    db.session.commit()
    
    return jsonify({"message": "Folder updated successfully"}), 200

@api.route('/api/tags/<tag_id>', methods=['DELETE'])
@login_required
def delete_tag(tag_id):
    """Delete a tag (admin only)"""
    if not current_user.is_admin():
        return jsonify({"error": "Admin access required"}), 403
        
    tag = Tag.query.get(tag_id)
    if not tag:
        return jsonify({"error": "Tag not found"}), 404
        
    # Remove the tag from all videos
    for video in tag.videos:
        video.tags.remove(tag)
        
    # Delete the tag
    db.session.delete(tag)
    db.session.commit()
    
    return jsonify({"message": "Tag deleted successfully"}), 200

@api.after_request
def after_request(response):
    response.headers.add('Accept-Ranges', 'bytes')
    return response

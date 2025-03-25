import json
import os
import string
import random
import logging
from flask import Blueprint, request, jsonify, current_app
from flask_login import current_user, login_required
from subprocess import Popen
from pathlib import Path

from ..constants import SUPPORTED_FILE_TYPES
from .. import util, db


uploads_bp = Blueprint('uploads', __name__, url_prefix='/api/upload')

@uploads_bp.route('/public', methods=['POST'])
def public_upload_video():
    
    paths = current_app.config['PATHS']
    
    
    with open(paths['data'] / 'config.json', 'r') as configfile:
        try:
            config = json.load(configfile)
        except:
            logging.error("Invalid or corrupt config file")
            return jsonify({"error": "Invalid or corrupt config file"}), 400
        finally:
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
        
    
    game = request.form.get('game')
    tags = request.form.getlist('tags[]') if 'tags[]' in request.form else []
    
    
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
    
    # Create initial database records
    from datetime import datetime
    from ..models import Video, VideoInfo, VideoProcessingJob
    
    video_id = util.video_id(Path(save_path))
    relative_path = str(Path(save_path).relative_to(paths['video']))
    created_at = datetime.utcnow()
    updated_at = created_at
    
    # Create video record
    video = Video(
        video_id=video_id, 
        extension=f".{filetype}", 
        path=relative_path, 
        available=True, 
        created_at=created_at, 
        updated_at=updated_at,
        owner_id=None  # Public upload has no owner
    )
    db.session.add(video)
    
    # Create initial video info
    info = VideoInfo(
        video_id=video_id, 
        title=Path(relative_path).stem, 
        private=False  # Public uploads are public by default
    )
    db.session.add(info)
    
    # Create processing job
    job = VideoProcessingJob(video_id=video_id)
    db.session.add(job)
    db.session.commit()
    
    # Start processing
    from ..worker import process_video
    
    # For development, we'll call the processing function directly
    # In production, this would be enqueued in a task queue (like RQ)
    tag_string = ','.join(tags) if tags else None
    
    # Process in the background
    from threading import Thread
    thread = Thread(
        target=process_video, 
        args=(video_id, game, tag_string, None)  # No owner for public uploads
    )
    thread.daemon = True
    thread.start()
    
    return jsonify({
        "message": "Video uploaded successfully",
        "video_id": video_id,
        "job_id": job.id,
        "tags": tags
    }), 201

@uploads_bp.route('', methods=['POST'])
@login_required
def upload_video():
    
    paths = current_app.config['PATHS']
    
    
    with open(paths['data'] / 'config.json', 'r') as configfile:
        try:
            config = json.load(configfile)
        except:
            return jsonify({"error": "Invalid or corrupt config file"}), 500
        finally:
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
        
    
    game = request.form.get('game')
    tags = request.form.getlist('tags[]') if 'tags[]' in request.form else []
    
    
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
    
    # Create initial database records
    from datetime import datetime
    from ..models import Video, VideoInfo, VideoProcessingJob

    video_id = util.video_id(Path(save_path))
    relative_path = str(Path(save_path).relative_to(paths['video']))
    created_at = datetime.utcnow()
    updated_at = created_at
    
    # Create video record
    video = Video(
        video_id=video_id, 
        extension=f".{filetype}", 
        path=relative_path, 
        available=True, 
        created_at=created_at, 
        updated_at=updated_at,
        owner_id=current_user.id
    )
    db.session.add(video)
    
    # Create initial video info
    info = VideoInfo(
        video_id=video_id, 
        title=Path(relative_path).stem, 
        private=False  # All videos are public
    )
    db.session.add(info)
    
    # Create processing job
    job = VideoProcessingJob(video_id=video_id)
    db.session.add(job)
    db.session.commit()
    
    # Start processing
    from ..worker import process_video
    
    # For development, we'll call the processing function directly
    # In production, this would be enqueued in a task queue (like RQ)
    tag_string = ','.join(tags) if tags else None
    
    # Process in the background
    from threading import Thread
    thread = Thread(
        target=process_video, 
        args=(video_id, game, tag_string, current_user.id)
    )
    thread.daemon = True
    thread.start()
    
    return jsonify({
        "message": "Video uploaded successfully",
        "video_id": video_id,
        "job_id": job.id,
        "tags": tags
    }), 201


@uploads_bp.route('/status/<job_id>', methods=['GET'])
def check_processing_status(job_id):
    """Check the status of a video processing job"""
    from ..models import VideoProcessingJob
    
    # Try to convert job_id to integer
    try:
        job_id = int(job_id)
    except ValueError:
        return jsonify({"error": "Invalid job ID format"}), 400
        
    # Query for the job
    job = VideoProcessingJob.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
        
    # Return job status
    return jsonify({
        "job_id": job.id,
        "video_id": job.video_id,
        "status": job.status,
        "progress": job.progress,
        "error": job.error_message,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None
    })

def register_routes(app_or_blueprint):
    app_or_blueprint.register_blueprint(uploads_bp)
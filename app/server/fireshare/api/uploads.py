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
    
    
    cmd = f"fireshare scan-video --path=\"{save_path}\""
    
    
    cmd += f" --game=\"{game}\""
    
    
    if tags:
        tag_list = ','.join(tags)
        cmd += f" --tags=\"{tag_list}\""
        
    Popen(cmd, shell=True)
    
    return jsonify({
        "message": "Video uploaded successfully", 
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
    
    
    cmd = f"fireshare scan-video --path=\"{save_path}\""
    
    
    cmd += f" --game=\"{game}\""
    
    
    if tags:
        tag_list = ','.join(tags)
        cmd += f" --tags=\"{tag_list}\""
        
    
    cmd += f" --owner-id={current_user.id}"
    
    Popen(cmd, shell=True)
    
    return jsonify({
        "message": "Video uploaded successfully",
        "tags": tags
    }), 201


def register_routes(app_or_blueprint):
    app_or_blueprint.register_blueprint(uploads_bp)
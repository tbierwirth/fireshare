
import os
from flask import Blueprint, render_template, redirect, current_app
from flask_cors import CORS
from sqlalchemy import select

templates_path = os.environ.get('TEMPLATE_PATH') or 'templates'
api = Blueprint('api', __name__, template_folder=templates_path)


CORS(api, supports_credentials=True)


from .games import register_routes as register_games_routes
from .videos import register_routes as register_videos_routes
from .tags import register_routes as register_tags_routes
from .folders import register_routes as register_folders_routes
from .config import register_routes as register_config_routes
from .uploads import register_routes as register_uploads_routes
from .setup import register_blueprint as register_setup_blueprint


register_games_routes(api)
register_videos_routes(api)
register_tags_routes(api)
register_folders_routes(api)
register_config_routes(api)
register_uploads_routes(api)
register_setup_blueprint(api)


from .utils.path_helpers import get_video_path


@api.after_request
def after_request(response):
    
    response.headers.add('Accept-Ranges', 'bytes')
    return response


from .videos import video_metadata


@api.route('/w/<video_id>')
def legacy_video_metadata(video_id):
    
    return video_metadata(video_id)
"""
API module for Fireshare application.
This module provides a single blueprint that combines all API endpoints.
"""
import os
from flask import Blueprint, render_template, redirect, current_app
from flask_cors import CORS
from sqlalchemy import select

templates_path = os.environ.get('TEMPLATE_PATH') or 'templates'
api = Blueprint('api', __name__, template_folder=templates_path)

# Apply CORS to API routes
CORS(api, supports_credentials=True)

# Import endpoint registrars
from .games import register_routes as register_games_routes
from .videos import register_routes as register_videos_routes
from .tags import register_routes as register_tags_routes
from .folders import register_routes as register_folders_routes
from .config import register_routes as register_config_routes
from .uploads import register_routes as register_uploads_routes

# Register routes with the main API blueprint
register_games_routes(api)
register_videos_routes(api)
register_tags_routes(api)
register_folders_routes(api)
register_config_routes(api)
register_uploads_routes(api)

# Import utility functions used by the main application
from .utils.path_helpers import get_video_path

# Global API after_request handler
@api.after_request
def after_request(response):
    """Add headers to all API responses."""
    response.headers.add('Accept-Ranges', 'bytes')
    return response

# Re-export needed functions and routes
from .videos import video_metadata

# Backward compatibility routes
@api.route('/w/<video_id>')
def legacy_video_metadata(video_id):
    """Backward compatible redirect to the video metadata page."""
    return video_metadata(video_id)
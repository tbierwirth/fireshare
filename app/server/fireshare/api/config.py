import json
import os
from flask import Blueprint, request, jsonify, Response, current_app
from flask_login import login_required, current_user
from ..models import User
from sqlalchemy import select
from .. import db


config_bp = Blueprint('config', __name__, url_prefix='/api/config')

@config_bp.route('', methods=['GET'])
def get_config():
    
    paths = current_app.config['PATHS']
    config_path = paths['data'] / 'config.json'
    with open(config_path) as file:
        config = json.load(file)
    
    if config_path.exists():
        return jsonify(config["ui_config"])
    else:
        return jsonify({})


def register_direct_routes(app_or_blueprint):
    
    @app_or_blueprint.route('/api/user/settings', methods=["GET", "PUT"])
    @login_required
    def get_or_update_user_settings():
        """
        Handle user-specific settings that persist between sessions.
        These settings can be accessed by any authenticated user.
        """
        paths = current_app.config['PATHS']
        user_settings_dir = paths['data'] / 'user_settings'
        
        # Create user settings directory if it doesn't exist
        if not user_settings_dir.exists():
            os.makedirs(user_settings_dir, exist_ok=True)
            
        user_settings_path = user_settings_dir / f"{current_user.id}.json"
        
        if request.method == 'GET':
            if user_settings_path.exists():
                with open(user_settings_path) as file:
                    settings = json.load(file)
                return jsonify(settings)
            else:
                return jsonify({
                    "darkMode": False,
                    "defaultViewStyle": "card",
                    "cardSize": 300
                })
                
        if request.method == 'PUT':
            settings = request.json.get("settings", {})
            
            if not settings:
                return Response(status=400, response='Settings must be provided.')
                
            # Save the settings to the user's settings file
            user_settings_path.write_text(json.dumps(settings, indent=2))
            return Response(status=200)
    
    
    @app_or_blueprint.route('/api/admin/config', methods=["GET", "PUT"])
    @login_required
    def get_or_update_config():
        
        paths = current_app.config['PATHS']
        
        if request.method == 'GET':
            config_path = paths['data'] / 'config.json'
            with open(config_path) as file:
                config = json.load(file)
            
            if config_path.exists():
                return jsonify(config)
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
    
    @app_or_blueprint.route('/api/admin/warnings', methods=["GET"])
    @login_required
    def get_warnings():
        
        warnings = current_app.config['WARNINGS']
        
        if len(warnings) == 0:
            return jsonify({})
        else:
            return jsonify(warnings)
    
    @app_or_blueprint.route('/api/setup/status', methods=["GET"])
    def get_setup_status():
        """
        Returns the setup status of the application.
        This endpoint is public and does not require authentication.
        It helps the UI determine if this is a fresh installation that needs setup.
        """
        from sqlalchemy import select, func
        from ..models import User
        import logging
        
        logger = logging.getLogger('fireshare')
        
        # Check if we're in setup mode
        setup_mode = current_app.config.get('SETUP_MODE', False)
        logger.info(f"Setup status check: SETUP_MODE = {setup_mode}")
        
        # Count users
        user_count = db.session.execute(select(func.count()).select_from(User)).scalar_one()
        logger.info(f"Setup status check: User count = {user_count}")
        
        # Determine if we need setup based on user count or explicit flag
        needs_setup = setup_mode or user_count == 0
        logger.info(f"Setup status check: needs_setup = {needs_setup}")
                
        # Return setup status
        response = {}
        if needs_setup:
            response = {
                "needsSetup": True,
                "setupSteps": [
                    "Create your admin account",
                    "Configure basic application settings",
                    "Start uploading videos"
                ]
            }
        else:
            response = {"needsSetup": False}
            
        logger.info(f"Setup status response: {response}")
        return jsonify(response)
    
    @app_or_blueprint.route('/api/manual/scan')
    @login_required
    def manual_scan():
        
        if not current_app.config["ENVIRONMENT"] == 'production':
            return Response(response='You must be running in production for this task to work.', status=400)
        else:
            from subprocess import Popen
            current_app.logger.info(f"Executed manual scan")
            Popen("fireshare bulk-import", shell=True)
            
        return Response(status=200)


def register_routes(app_or_blueprint):
    app_or_blueprint.register_blueprint(config_bp)
    
    register_direct_routes(app_or_blueprint)
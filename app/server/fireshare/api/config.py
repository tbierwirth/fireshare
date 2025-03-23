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
        from ..models import User, InviteCode
        
        # Check if we're in setup mode
        setup_mode = current_app.config.get('SETUP_MODE', False)
        
        # Alternative check - count users
        user_count = db.session.execute(select(func.count()).select_from(User)).scalar_one()
        
        # Get the setup invite code if available
        setup_invite_code = current_app.config.get('SETUP_INVITE_CODE', None)
        
        # If we don't have a stored invite code but we're in setup mode, find one
        if not setup_invite_code and (setup_mode or user_count <= 1):
            # Look for any active invite code
            invite = db.session.execute(
                select(InviteCode)
                .filter_by(used_by_id=None)
                .filter(InviteCode.expires_at > db.func.current_timestamp())
                .order_by(InviteCode.created_at.desc())
            ).scalar_one_or_none()
            
            if invite:
                setup_invite_code = invite.code
                current_app.config['SETUP_INVITE_CODE'] = setup_invite_code
                
        # Determine if we need setup based on user count or explicit flag
        needs_setup = setup_mode or user_count <= 1
                
        # Only return detailed information if we actually need setup
        if needs_setup:
            return jsonify({
                "needsSetup": True,
                "inviteCode": setup_invite_code,
                "defaultUsername": current_app.config.get('SETUP_USERNAME', 'admin'),
                "isDefaultAdminUser": True,
                "setupSteps": [
                    "Log in with the default admin account",
                    "Register your personal admin account using the invite code",
                    "Delete the default admin account for security"
                ]
            })
        else:
            return jsonify({"needsSetup": False})
    
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
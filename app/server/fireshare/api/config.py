import json
from flask import Blueprint, request, jsonify, Response, current_app
from flask_login import login_required
from ..models import User

# Create blueprint with URL prefix
config_bp = Blueprint('config', __name__, url_prefix='/api/config')

@config_bp.route('', methods=['GET'])
def get_config():
    """Get UI configuration"""
    paths = current_app.config['PATHS']
    config_path = paths['data'] / 'config.json'
    with open(config_path) as file:
        config = json.load(file)
    
    if config_path.exists():
        return jsonify(config["ui_config"])
    else:
        return jsonify({})

# Additional endpoints that will be registered directly with the main blueprint
def register_direct_routes(app_or_blueprint):
    """Register routes that aren't part of the /api/config URL structure"""
    
    @app_or_blueprint.route('/api/admin/config', methods=["GET", "PUT"])
    @login_required
    def get_or_update_config():
        """Get or update the full configuration (admin only)"""
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
        """Get system warnings (admin only)"""
        warnings = current_app.config['WARNINGS']
        
        if len(warnings) == 0:
            return jsonify({})
        else:
            return jsonify(warnings)
    
    @app_or_blueprint.route('/api/manual/scan')
    @login_required
    def manual_scan():
        """Trigger a manual scan of videos"""
        if not current_app.config["ENVIRONMENT"] == 'production':
            return Response(response='You must be running in production for this task to work.', status=400)
        else:
            from subprocess import Popen
            current_app.logger.info(f"Executed manual scan")
            Popen("fireshare bulk-import", shell=True)
            
        return Response(status=200)

# Register this module with the main API blueprint
def register_routes(app_or_blueprint):
    app_or_blueprint.register_blueprint(config_bp)
    # Also register non-prefixed routes
    register_direct_routes(app_or_blueprint)
import json
from flask import Blueprint, request, jsonify, Response, current_app
from flask_login import login_required
from ..models import User


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
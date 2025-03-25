"""
Setup API module for first-time application configuration.
This module provides endpoints for checking setup status and creating admin accounts.
"""
import json
import logging
from flask import Blueprint, jsonify, request, current_app, Flask
from sqlalchemy import select, func
from werkzeug.security import generate_password_hash
from .. import db
from ..models import User

# Create a dedicated blueprint for setup-related endpoints
setup_bp = Blueprint('setup', __name__, url_prefix='/api/setup')
logger = logging.getLogger('fireshare.api.setup')

@setup_bp.route('/status', methods=['GET'])
def get_setup_status():
    """
    Check if the application needs setup based on:
    1. First priority: Check user count - if we have users, setup is complete
    2. Second priority: Check setupCompleted flag in config.json 
    3. Third priority: Check SETUP_MODE flag
    
    Returns:
        JSON with needsSetup flag and setupSteps if needed
    """
    logger.info("Setup status endpoint hit - checking if setup is needed")
    
    # First check if any users exist - this is the most reliable way to determine if setup is done
    user_count = db.session.execute(select(func.count()).select_from(User)).scalar_one()
    logger.info(f"Setup status check - found {user_count} users")
    
    # If users exist, setup is definitely complete
    if user_count > 0:
        logger.info("Setup status: COMPLETE - users exist in database")
        
        # Make sure config reflects this
        try:
            paths = current_app.config['PATHS']
            config_path = paths['data'] / 'config.json'
            if config_path.exists():
                with open(config_path) as file:
                    config = json.load(file)
                
                # Only update if needed
                if not config.get("setupCompleted", False):
                    config["setupCompleted"] = True
                    config_path.write_text(json.dumps(config, indent=2))
                    logger.info("Updated config.json to reflect completed setup based on user count")
        except Exception as e:
            logger.error(f"Error updating config file: {str(e)}")
        
        return jsonify({
            "needsSetup": False, 
            "setupCompleted": True,
            "userCount": user_count
        })
    
    # If we got here, no users exist - check config for override
    setup_completed = False
    try:
        paths = current_app.config['PATHS']
        config_path = paths['data'] / 'config.json'
        if config_path.exists():
            with open(config_path) as file:
                config = json.load(file)
                setup_completed = config.get("setupCompleted", False)
                logger.debug(f"Setup completion check from config.json: {setup_completed}")
    except Exception as e:
        logger.error(f"Error reading config file: {str(e)}")
    
    # If config says setup is complete despite no users, trust it
    if setup_completed:
        logger.info("Setup status: COMPLETE - config.json says setup is complete despite no users")
        return jsonify({
            "needsSetup": False, 
            "setupCompleted": True,
            "userCount": 0,
            "source": "config"
        })
    
    # Finally check for setup mode flag
    setup_mode = current_app.config.get('SETUP_MODE', False)
    logger.info(f"Setup status: NEEDED - user_count={user_count}, setup_mode={setup_mode}, config_setup_completed={setup_completed}")
    
    # Return setup needed with steps
    return jsonify({
        "needsSetup": True,
        "setupSteps": [
            "Create your admin account",
            "Configure basic application settings",
            "Start uploading videos"
        ],
        "userCount": user_count
    })

@setup_bp.route('/admin', methods=['POST'])
def create_admin():
    """
    Create an initial admin account during first-time setup.
    Only works if no users exist or setup mode is enabled.
    
    Expected request body:
    {
        "username": "adminuser",
        "password": "secure_password",
        "email": "admin@example.com" (optional)
    }
    
    Returns:
        Success message if admin creation successful
        Error message if validation fails or admin already exists
    """
    # Check if setup is needed
    setup_mode = current_app.config.get('SETUP_MODE', False)
    user_count = db.session.execute(select(func.count()).select_from(User)).scalar_one()
    needs_setup = setup_mode or user_count == 0
    
    if not needs_setup:
        return jsonify({"error": "Setup has already been completed"}), 400
        
    # Parse request data
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    username = data.get('username')
    password = data.get('password')
    email = data.get('email', '')
    
    # Validate required fields
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
        
    # Check username length
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
        
    # Check password length
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    
    # Check if username already exists
    existing_user = db.session.execute(
        select(User).filter_by(username=username)
    ).scalar_one_or_none()
    
    if existing_user:
        return jsonify({"error": "Username already exists"}), 400
    
    # Create admin user
    try:
        # Use Werkzeug's default modern hashing (not sha256)
        hashed_password = generate_password_hash(password)
        
        new_user = User(
            username=username,
            password=hashed_password,
            email=email,
            admin=True,
            active=True
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Disable setup mode
        current_app.config['SETUP_MODE'] = False
        
        # Remove setup warning if it exists
        warnings = current_app.config.get('WARNINGS', [])
        setup_warning = "SETUP_REQUIRED: First-time setup required. Create your admin account to get started."
        if setup_warning in warnings:
            warnings.remove(setup_warning)
        
        # Update config.json to mark setup as completed
        paths = current_app.config['PATHS']
        config_path = paths['data'] / 'config.json'
        
        try:
            if config_path.exists():
                with open(config_path) as file:
                    config = json.load(file)
                
                # Add setup completion flag to config
                config["setupCompleted"] = True
                
                # Write updated config back to file
                config_path.write_text(json.dumps(config, indent=2))
                logger.info(f"Updated config.json to mark setup as completed")
            else:
                logger.warning(f"Config file not found at {config_path}")
        except Exception as e:
            logger.error(f"Error updating config file: {str(e)}")
            
        logger.info(f"Created admin user '{username}' during setup")
        
        return jsonify({
            "message": "Admin user created successfully",
            "username": username,
            "setupCompleted": True
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating admin user: {str(e)}")
        return jsonify({"error": f"Error creating admin user: {str(e)}"}), 500

def register_blueprint(app_or_blueprint):
    """
    Register the setup blueprint with the Flask application or another blueprint.
    This follows the same pattern as other API modules.
    """
    # If we're passed a blueprint, just register the routes directly on it
    if isinstance(app_or_blueprint, Blueprint):
        # Register setup status endpoint directly on the parent blueprint
        @app_or_blueprint.route('/setup/status', methods=['GET'])
        def get_setup_status_direct():
            """
            Direct route for setup status check
            """
            return get_setup_status()
            
        # Also register directly at the root level for maximum compatibility
        @app_or_blueprint.route('/api/setup/status', methods=['GET'])
        def get_setup_status_root():
            """
            Root-level route for setup status check
            This ensures the endpoint is accessible even if blueprint registration fails
            """
            return get_setup_status()
            
        # Also register the admin creation endpoint directly
        @app_or_blueprint.route('/setup/admin', methods=['POST'])
        def create_admin_direct():
            """
            Direct route for admin creation during setup
            """
            return create_admin()
            
        logger.info("Registered setup routes directly on parent blueprint")
    else:
        # If we're passed the app directly, register our blueprint
        app_or_blueprint.register_blueprint(setup_bp)
        logger.info("Registered setup blueprint with app")
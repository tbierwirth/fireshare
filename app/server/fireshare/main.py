import os
from flask import Blueprint, render_template, current_app, redirect
from flask_login import current_user
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from .models import User
from . import db

templates_path = os.environ.get('TEMPLATE_PATH') or 'templates'

main = Blueprint('main', __name__, template_folder=templates_path)

CORS(main, supports_credentials=True)




def check_setup_status():
    """
    Checks if the application needs setup and sets the appropriate flags.
    Does not create any users, only sets up the app state for first-time setup.
    """
    from sqlalchemy import select, func
    from .models import User
    import logging
    
    logger = logging.getLogger('fireshare')
    
    # Check if ANY users exist
    user_count = db.session.execute(select(func.count()).select_from(User)).scalar_one()
    
    # First-time setup - no users at all
    if user_count == 0:
        logger.info(f"===== FIRST-TIME SETUP REQUIRED =====")
        logger.info(f"No users found - application is in setup mode")
        
        # Enable setup mode
        current_app.config['SETUP_MODE'] = True
        
        # Add a special warning that the frontend can detect
        setup_warning = "SETUP_REQUIRED: First-time setup required. Create your admin account to get started."
        if setup_warning not in current_app.config['WARNINGS']:
            current_app.config['WARNINGS'].append(setup_warning)
        
        logger.info(f"Application is ready for first-time setup")
        return True
    else:
        # Application already has users, so no setup needed
        current_app.config['SETUP_MODE'] = False
        return False
    
@main.before_app_request
def before_request():
    """
    Before each request, check if the application needs setup.
    This only runs once on the first request.
    """
    if not getattr(current_app, '_setup_checked', False):
        check_setup_status()
        current_app._setup_checked = True


@main.route('/', defaults={'path': ''})
@main.route('/#/<path:path>')
def index(path):
    return render_template('index.html')


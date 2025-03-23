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




def create_admin_if_needed():
    from sqlalchemy import select, func
    from .models import User, InviteCode, UserRole, UserStatus
    import secrets
    import string
    import logging
    import datetime
    
    logger = logging.getLogger('fireshare')
    
    # Check if ANY users exist (not just admin)
    user_count = db.session.execute(select(func.count()).select_from(User)).scalar_one()
    
    # First-time setup - no users at all
    if user_count == 0 and not current_app.config['DISABLE_ADMINCREATE']:
        username = current_app.config['ADMIN_USERNAME'] or 'admin'
        password = current_app.config['ADMIN_PASSWORD'] or 'admin'
        
        logger.info(f"===== FIRST-TIME SETUP =====")
        logger.info(f"No users found - creating default admin user: {username}")
        
        # Create default admin user
        admin_user = User(
            username=username, 
            password=generate_password_hash(password),
            admin=True,
            role=UserRole.ADMIN.value,
            status=UserStatus.ACTIVE.value
        )
        db.session.add(admin_user)
        db.session.flush()  # Get the ID without committing
        
        # Generate a one-time invite code for initial setup
        alphabet = string.ascii_letters + string.digits
        invite_code = ''.join(secrets.choice(alphabet) for _ in range(16))
        
        # Create invite code record with longer expiration (30 days for setup)
        invite = InviteCode(
            code=invite_code,
            created_by_id=admin_user.id,
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=30)
        )
        db.session.add(invite)
        
        # Store the setup information in app config for the UI to display
        current_app.config['SETUP_INVITE_CODE'] = invite_code
        current_app.config['SETUP_MODE'] = True
        current_app.config['SETUP_USERNAME'] = username
        
        # Add a special warning that the frontend can detect
        setup_warning = "SETUP_REQUIRED: First-time setup required. Use the invite code from the setup page to create your admin account."
        if setup_warning not in current_app.config['WARNINGS']:
            current_app.config['WARNINGS'].append(setup_warning)
        
        db.session.commit()
        
        # Print setup information for the logs
        logger.info(f"Default admin user created successfully")
        
        # Show warning if default credentials are used
        if username == 'admin' and password == 'admin':
            logger.warning(f"WARNING: Using default admin credentials! Please change them immediately!")
            logger.warning(f"A setup invite code has been generated: {invite_code}")
            logger.warning(f"Use this code to create your personal admin account, then delete the default admin.")
        
        logger.info(f"===== FIRST-TIME SETUP COMPLETE =====")
        return
    
    # Check for admin users specifically
    admin_query = select(User).filter_by(admin=True, ldap=False)
    admin = db.session.execute(admin_query).scalar_one_or_none()
    
    # Create admin if no admin users exist
    if not admin and not current_app.config['DISABLE_ADMINCREATE']:
        username = current_app.config['ADMIN_USERNAME'] or 'admin'
        password = current_app.config['ADMIN_PASSWORD'] or 'admin'
        
        admin_user = User(
            username=username, 
            password=generate_password_hash(password),
            admin=True,
            role=UserRole.ADMIN.value,
            status=UserStatus.ACTIVE.value
        )
        db.session.add(admin_user)
        db.session.commit()
        logger.info(f"Created admin user: {username}")
    
    # Update admin password if it changed in environment variables
    elif admin and current_app.config['ADMIN_PASSWORD'] and not check_password_hash(admin.password, current_app.config['ADMIN_PASSWORD']):
        admin_query = select(User).filter_by(admin=True, ldap=False)
        row = db.session.execute(admin_query).scalar_one_or_none()
        if row:
            row.password = generate_password_hash(current_app.config['ADMIN_PASSWORD'])
            db.session.commit()
            logger.info("Updated admin password to match environment variable")
    
    # Update admin username if it changed in environment variables
    if admin and current_app.config['ADMIN_USERNAME'] and admin.username != current_app.config['ADMIN_USERNAME']:
        admin_query = select(User).filter_by(admin=True, ldap=False)
        row = db.session.execute(admin_query).scalar_one_or_none()
        if row:
            row.username = current_app.config['ADMIN_USERNAME'] or admin.username
            db.session.commit()
            logger.info(f"Updated admin username to: {current_app.config['ADMIN_USERNAME']}")


@main.before_app_request
def before_request():
    
    if not getattr(current_app, '_admin_created', False):
        create_admin_if_needed()
        current_app._admin_created = True


@main.route('/', defaults={'path': ''})
@main.route('/#/<path:path>')
def index(path):
    return render_template('index.html')


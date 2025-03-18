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

# In Flask 3.x, before_app_first_request was removed
# This functionality is moved to the create_app function
# Since this is a blueprint, we need to handle admin creation differently
def create_admin_if_needed():
    # Create the admin user if it doesn't already exist
    # Update to SQLAlchemy 2.0 query pattern
    from sqlalchemy import select
    
    # Execute query with new SQLAlchemy 2.0 pattern
    admin_query = select(User).filter_by(admin=True, ldap=False)
    admin = db.session.execute(admin_query).scalar_one_or_none()
    
    if not admin and not current_app.config['DISABLE_ADMINCREATE']:
        username = current_app.config['ADMIN_USERNAME'] or 'admin'
        admin_user = User(username=username, password=generate_password_hash(current_app.config['ADMIN_PASSWORD'] or 'admin', method='sha256'), admin=True)
        db.session.add(admin_user)
        db.session.commit()
    if admin and not check_password_hash(admin.password, current_app.config['ADMIN_PASSWORD']):
        admin_query = select(User).filter_by(admin=True, ldap=False)
        row = db.session.execute(admin_query).scalar_one_or_none()
        if row:
            row.password = generate_password_hash(current_app.config['ADMIN_PASSWORD'], method='sha256')
            db.session.commit()
    if admin and current_app.config['ADMIN_USERNAME'] and admin.username != current_app.config['ADMIN_USERNAME']:
        admin_query = select(User).filter_by(admin=True, ldap=False)
        row = db.session.execute(admin_query).scalar_one_or_none()
        if row:
            row.username = current_app.config['ADMIN_USERNAME'] or admin.username
            db.session.commit()

# This will run when the first request is received
@main.before_app_request
def before_request():
    # Use a simple flag in the app config to ensure this runs only once
    if not getattr(current_app, '_admin_created', False):
        create_admin_if_needed()
        current_app._admin_created = True


@main.route('/', defaults={'path': ''})
@main.route('/#/<path:path>')
def index(path):
    return render_template('index.html')


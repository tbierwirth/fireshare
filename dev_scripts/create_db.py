import os

# Set environment variables
os.environ['FLASK_APP'] = 'app/server/fireshare'
os.environ['DATA_DIRECTORY'] = os.path.abspath(os.path.join(os.path.dirname(__file__), 'dev_root/dev_data/'))
os.environ['VIDEO_DIRECTORY'] = os.path.abspath(os.path.join(os.path.dirname(__file__), 'dev_root/dev_videos/'))
os.environ['PROCESSED_DIRECTORY'] = os.path.abspath(os.path.join(os.path.dirname(__file__), 'dev_root/dev_processed/'))
os.environ['ADMIN_USERNAME'] = 'admin'
os.environ['ADMIN_PASSWORD'] = 'admin'

# Import Flask app and database
from app.server.fireshare import create_app, db
from app.server.fireshare.models import User, UserRole

# Create the Flask app
app = create_app()

# Create the database tables
with app.app_context():
    db.create_all()
    
    # Create admin user if it doesn't exist
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(
            username='admin',
            password='admin',
            role=UserRole.ADMIN.value,
            admin=True
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin user created!")
    else:
        print("Admin user already exists!")
    
    print("Database tables created successfully!")
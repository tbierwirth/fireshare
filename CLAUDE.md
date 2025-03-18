# Fireshare Project Notes

*IMPORTANT: Keep this document updated as development progresses*

## Project Overview
Fireshare is a self-hosted application for sharing game clips or videos via unique links. Key capabilities:
- Video hosting with public/private visibility settings
- Basic folder organization based on top-level directories
- User authentication (currently admin-only plus public uploads)
- Video processing with thumbnails and previews
- Responsive UI for desktop and mobile

## Directory Structure & Architecture

### Root Directory
- `/app`: Main application code
- `/migrations`: Database migration files using Alembic
- `/run_local.sh`: Script to run the local development server
- `/docker-compose.yml`: Docker Compose configuration for production
- `/entrypoint.sh`: Docker entrypoint script

### Backend (`/app/server`)
- `/app/server/fireshare/`: Main Flask application
  - `__init__.py`: Application factory and configuration
  - `api.py`: REST API routes for video management
  - `auth.py`: Authentication endpoints and logic
  - `main.py`: Main entry point
  - `models.py`: SQLAlchemy database models
  - `util.py`: Utility functions for video processing, hashing
  - `constants.py`: Application constants
  - `cli.py`: Command-line interface commands
  - `schedule.py`: Scheduled tasks

### Frontend (`/app/client`)
- `/app/client/src/`: React application source
  - `components/`: Reusable UI components
    - `admin/`: Admin-specific components
    - `alert/`: Notification components
    - `forms/`: Form components (login, etc.)
    - `misc/`: Miscellaneous components
    - `modal/`: Modal dialog components
    - `nav/`: Navigation components
    - `search/`: Search components
    - `utils/`: Utility components
  - `views/`: Page components
  - `services/`: API service wrappers
  - `common/`: Common utilities and constants
  - `assets/`: Static assets
  - `App.js`: Main application component
  - `index.js`: Application entry point

## Core Systems & Workflows

### Authentication System
- Session-based authentication using Flask-Login
- User model with admin flag and LDAP support
- New enhancements:
  - User roles (admin, regular user)
  - User statuses (active, suspended, deleted)
  - Invite code registration system
  - Profile management

### Video Processing Workflow
1. Videos placed in configured source directory
2. Flask CLI command `bulk-import` scans for new videos
3. For each new video:
   - Generate unique video ID using xxhash
   - Create thumbnails and preview videos using ffmpeg
   - Extract metadata (duration, resolution, codec)
   - Add to database
4. Serve videos through web interface with unique links

### Database Models
- **User**: Authentication and user information
- **Video**: Core video metadata and file location
- **VideoInfo**: Extended video information like title, description
- **VideoView**: Tracks video views by IP address
- **InviteCode** (New): For invite-based registration

### Frontend Architecture
- React functional components with hooks
- Material UI for component library
- React Router for navigation
- Axios for API requests
- Client-side state using React state hooks
- Dark theme configuration

### Security Model
- Admin-only access to dashboard
- Authentication required for most operations
- Public feed for publicly visible videos
- Public upload option (if configured)

## Configuration
The application uses environment variables and a config.json file:

### Environment Variables
- `FLASK_APP`: Flask application entry point
- `FLASK_DEBUG`: Debug mode flag
- `ENVIRONMENT`: Environment (dev/prod)
- `DATA_DIRECTORY`: Directory for application data
- `VIDEO_DIRECTORY`: Directory for source videos
- `PROCESSED_DIRECTORY`: Directory for processed video data
- `ADMIN_PASSWORD`: Default admin password
- `ADMIN_USERNAME`: Default admin username
- `LDAP_*`: LDAP configuration variables

### Config.json
Stores UI configuration and other settings manageable through the admin interface.

## API Endpoints

### Authentication
- `/api/login`: User login
- `/api/logout`: User logout
- `/api/loggedin`: Check login status
- `/api/register`: Register with invite code (new)
- `/api/profile`: Get/update user profile (new)
- `/api/users`: List/manage users (admin only, new)
- `/api/invite`: Manage invite codes (admin only, new)

### Videos
- `/api/videos`: Get all videos (requires authentication)
- `/api/videos/public`: Get public videos
- `/api/video/random`: Get random video
- `/api/video/public/random`: Get random public video
- `/api/video/details/<id>`: Get/update video details
- `/api/video/delete/<id>`: Delete video
- `/api/video/poster`: Get video poster
- `/api/video/view`: Add video view
- `/api/upload`: Upload new videos

## Environment Setup
- Backend: Python Flask (see requirements.txt)
- Frontend: React with Material UI
- Development server: `./run_local.sh` for backend, `cd app/client && npm start` for frontend
- Database: SQLite with Flask-SQLAlchemy and Alembic migrations

## Our Enhancements
### 1. User System (In Progress)
- Enhanced User model with roles, status, and profile fields
- Created InviteCode model for invite-based registration
- Added endpoints for user/profile management
- Implementation status: Backend API updated, database schema migrated, frontend to be updated

### 2. Planned Folder System
- Plans to implement proper folder organization with database models
- Will allow moving videos between folders
- Folder permissions based on user roles
- Integration with the enhanced user system

## Current Development Status
- Dependencies updated to more recent versions
- User system backend implementation complete
- Database migration created but needs fix for SQLite constraints
- Need to complete frontend updates for user system
- Folder system to be implemented after user system is complete

## Migration Notes
- SQLite limitations cause issues with ALTER TABLE operations
- Need to fix migration by marking it as completed: `flask db stamp ddad7ec60442`
- Future migrations should be carefully designed for SQLite compatibility

## Next Steps
1. Fix migration by marking it as completed
2. Update frontend authentication to work with new backend
3. Create frontend UI components for user management and registration
4. Implement folder system with database model and UI

## Code Style Guidelines
- Backend: Follow Flask conventions, RESTful API design
- Frontend: Use functional React components with hooks
  - Material UI for consistent UI components
  - React hooks for state and effects
  - Shared services for API communication
- Both: Clear, descriptive variable and function names
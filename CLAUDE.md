# Fireshare Project Notes

*IMPORTANT: Keep this document updated as development progresses*

## Project Overview
Fireshare is a self-hosted application for sharing game clips or videos via unique links. Key capabilities:
- Video hosting with public/private visibility settings
- Basic folder organization based on top-level directories
- User authentication (currently admin-only plus public uploads)
- Video processing with thumbnails and previews
- Responsive UI for desktop and mobile

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
- Both: Clear, descriptive variable and function names
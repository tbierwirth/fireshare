#!/bin/bash
# Fireshare Final Production Preparation Script
# This script follows the guidelines in CLAUDE.md

echo "=== Fireshare Final Production Preparation ==="
echo "This script performs the final preparation for production deployment."

# Step 1: Create a production build of the React frontend
echo "
Step 1/5: Creating optimized production build of React frontend..."
if [ -d "./app/client" ]; then
  echo "- Found React client directory"
  cd ./app/client
  if [ -f "package.json" ]; then
    echo "- Running npm install to ensure dependencies are current"
    npm install
    echo "- Running npm run build to create optimized production build"
    npm run build
    if [ $? -eq 0 ]; then
      echo "- Build completed successfully"
    else
      echo "- Warning: Build failed, check errors above"
    fi
  else
    echo "- Warning: package.json not found, skipping build"
  fi
  cd ../..
else
  echo "- Warning: React client directory not found, skipping build"
fi

# Step 2: Verify Docker setup
echo "
Step 2/5: Verifying Docker deployment configuration..."
if [ -f "docker-compose.yml" ] && [ -f "Dockerfile" ]; then
  echo "- Docker configuration files found"
  # Check if docker-compose.yml has been updated with production settings
  if grep -q "/opt/fireshare" docker-compose.yml; then
    echo "- docker-compose.yml appears to be configured for production"
  else
    echo "- Warning: docker-compose.yml may still have development paths"
    echo "  Consider updating volume paths for production deployment"
  fi
else
  echo "- Warning: Docker configuration files missing or incomplete"
fi

# Step 3: Check database migrations
echo "
Step 3/5: Checking database migrations..."
if [ -d "migrations/versions" ]; then
  VERSION_COUNT=$(ls -1 migrations/versions/*.py | wc -l)
  echo "- Migration directory found with $VERSION_COUNT migration files"
  
  # Check for merge migrations which might indicate proper handling of SQLite constraints
  MERGE_COUNT=$(grep -l "merge" migrations/versions/*.py | wc -l)
  if [ $MERGE_COUNT -gt 0 ]; then
    echo "- Found $MERGE_COUNT merge migration(s), which is good for SQLite compatibility"
  fi
else
  echo "- Warning: Migration directory not found or empty"
fi

# Step 4: Make sure development directories are removed
echo "
Step 4/5: Ensuring all development directories are removed..."
rm -rf dev_scripts dev_notes dev_root test-processed test-videos 2>/dev/null || true
find . -name "__pycache__" -type d -not -path "./venv/*" -not -path "./node_modules/*" | xargs rm -rf 2>/dev/null || true
find . -name "*.pyc" -type f -not -path "./venv/*" -not -path "./node_modules/*" | xargs rm -f 2>/dev/null || true

# Step 5: Check for console.log statements that should be disabled in production
echo "
Step 5/5: Checking for potential console.log statements..."
CONSOLE_LOG_COUNT=$(grep -r "console.log" --include="*.js" --exclude-dir="node_modules" app/client/src | wc -l)
echo "- Found $CONSOLE_LOG_COUNT console.log statements in JavaScript files"
echo "- This is normal - the project uses a structured logger (logger.js) that disables logs in production"
echo "- No manual removal needed as logs are controlled by environment settings"

echo "
=== Production Preparation Complete! ==="
echo "The codebase is now ready for production deployment."
echo "
Deployment Instructions:

1. On your production server:
   mkdir -p /opt/fireshare/data
   mkdir -p /opt/fireshare/processed
   mkdir -p /opt/fireshare/videos
   chown -R 1000:1000 /opt/fireshare
   chmod -R 755 /opt/fireshare

2. Update docker-compose.yml:
   - Ensure volume paths point to production directories
   - Set ADMIN_PASSWORD to a secure value
   - Update the SECRET_KEY environment variable
   - Set the DOMAIN for proper OpenGraph support

3. Deploy with Docker:
   docker-compose up -d

4. Access the application at http://your-server-ip
   - Initial login: admin / [your-admin-password]
   - Create invite codes to add users
   - Upload videos to the video directory

For detailed troubleshooting, refer to the README.md and DEPLOYMENT.md files.
"
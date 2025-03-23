#/bin/bash

nginx -g 'daemon on;'

PUID=${PUID:-1000}
PGID=${PGID:-1000}

useradd appuser || true

groupmod -o -g "$PGID" appuser
usermod -o -u "$PUID" appuser

chown -R appuser:appuser $DATA_DIRECTORY
chown -R appuser:appuser $VIDEO_DIRECTORY
chown -R appuser:appuser $PROCESSED_DIRECTORY

su appuser

echo '
-------------------------------------'
echo "
User uid:    $(id -u appuser)
User gid:    $(id -g appuser)
-------------------------------------
"

# Remove any lockfiles on startup
runuser -u appuser -- rm $DATA_DIRECTORY/*.lock 2> /dev/null

# Remove job db on start
runuser -u appuser -- rm /jobs.sqlite


# Fix corrupted API __init__.py file
echo "Fixing potential API __init__.py corruption..."
bash /fix-api-init.sh
# Ensure fixed file has correct permissions
chown -R appuser:appuser /usr/local/lib/python3.9/site-packages/fireshare/

# Try to run migrations, if they fail, stamp the migration
runuser -u appuser -- flask db upgrade || {
    echo "Migration failed, attempting to stamp the migration to continue..."
    runuser -u appuser -- flask db stamp b7aea53df325 || echo "Stamping also failed, but continuing..."
}
gunicorn --bind=127.0.0.1:5000 "fireshare:create_app(init_schedule=True)" --user appuser --group appuser --workers 3 --threads 3 --preload

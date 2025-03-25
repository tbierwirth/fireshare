#!/bin/bash
set -e  # Exit on error

# Configure HTTPS if enabled
if [ "$ENABLE_HTTPS" = "true" ]; then
    echo "HTTPS is enabled, configuring SSL..."
    
    # Check if SSL certificate and key are provided
    if [ -z "$SSL_CERT_PATH" ] || [ -z "$SSL_KEY_PATH" ]; then
        echo "ERROR: HTTPS is enabled but SSL_CERT_PATH or SSL_KEY_PATH is not set"
        echo "Please provide both SSL_CERT_PATH and SSL_KEY_PATH when enabling HTTPS"
        exit 1
    fi
    
    # Check if certificate files exist
    if [ ! -f "$SSL_CERT_PATH" ] || [ ! -f "$SSL_KEY_PATH" ]; then
        echo "ERROR: SSL certificate or key file does not exist"
        echo "Certificate path: $SSL_CERT_PATH"
        echo "Key path: $SSL_KEY_PATH"
        exit 1
    fi
    
    # Create SSL directories if they don't exist
    mkdir -p /etc/ssl/certs
    mkdir -p /etc/ssl/private
    
    # Copy SSL certificate and key
    cp "$SSL_CERT_PATH" /etc/ssl/certs/fireshare.crt
    cp "$SSL_KEY_PATH" /etc/ssl/private/fireshare.key
    
    # Set proper permissions
    chmod 644 /etc/ssl/certs/fireshare.crt
    chmod 600 /etc/ssl/private/fireshare.key
    
    # Use the HTTPS nginx configuration
    cp /app/nginx/prod.conf.https /etc/nginx/nginx.conf
    echo "HTTPS configuration complete"
else
    echo "Using standard HTTP configuration"
fi

# Start nginx
nginx -g 'daemon on;'

PUID=${PUID:-1000}
PGID=${PGID:-1000}

useradd appuser || true

groupmod -o -g "$PGID" appuser
usermod -o -u "$PUID" appuser

# Ensure data directories exist and have correct permissions
mkdir -p $DATA_DIRECTORY
mkdir -p $VIDEO_DIRECTORY  
mkdir -p $PROCESSED_DIRECTORY

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
runuser -u appuser -- rm $DATA_DIRECTORY/*.lock 2> /dev/null || true

# Remove job db on start
runuser -u appuser -- rm /jobs.sqlite 2> /dev/null || true

# Fix corrupted API __init__.py file
echo "Fixing potential API __init__.py corruption..."
bash /fix-api-init.sh
# Ensure fixed file has correct permissions
chown -R appuser:appuser /usr/local/lib/python3.9/site-packages/fireshare/

# Database setup and migration with enhanced recovery
echo "Starting database migrations..."

# First attempt - standard migration
if ! runuser -u appuser -- flask db upgrade; then
    echo "Migration failed, attempting recovery steps..."
    
    # Try to stamp to a known good version and continue
    echo "Step 1: Attempting to stamp the migration to continue..."
    if ! runuser -u appuser -- flask db stamp b7aea53df325; then
        echo "Stamping failed, trying more aggressive recovery..."
        
        # Try to stamp head - this can work in some corrupted DB scenarios
        echo "Step 2: Attempting to stamp to migration head..."
        if ! runuser -u appuser -- flask db stamp head; then
            echo "Stamping to head failed, trying final recovery option..."
            
            # Stamp to the latest commit we know about
            echo "Step 3: Attempting to stamp to latest known commit..."
            runuser -u appuser -- flask db stamp 8d5036992141 || true
            
            # Last resort - try upgrading again
            echo "Step 4: Attempting migration upgrade again..."
            runuser -u appuser -- flask db upgrade || {
                echo "WARN: All migration recovery attempts failed. Continuing anyway, but setup may be needed."
                echo "The app will enter setup mode on first launch if database is not properly configured."
            }
        fi
    fi
    
    # Upgrade after stamping to continue from stamped point
    runuser -u appuser -- flask db upgrade || true
fi

echo "Starting Fireshare application..."
gunicorn --bind=127.0.0.1:5000 "fireshare:create_app(init_schedule=True)" --user appuser --group appuser --workers 3 --threads 3 --preload

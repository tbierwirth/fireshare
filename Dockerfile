FROM node:16.15-slim as client
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY app/client/package.json ./
COPY app/client/package-lock.json ./
COPY app/client/.env.* ./
RUN npm ci --silent
RUN npm install react-scripts@5.0.1 -g --silent && npm cache clean --force;
COPY app/client/ ./
RUN npm run build

FROM python:3.9-slim-buster
WORKDIR /
RUN apt-get update && apt-get install --no-install-recommends -y \
    nginx nginx-extras supervisor build-essential gcc \
    libc-dev libffi-dev python3-pip ffmpeg python-dev \
    libldap2-dev libsasl2-dev libssl-dev && rm -rf /var/lib/apt/lists/*;
RUN adduser --disabled-password --gecos '' nginx
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log
# Create directories with proper permissions
RUN mkdir -p /data /processed /videos /backups
COPY entrypoint.sh /
COPY app/nginx/prod.conf /etc/nginx/nginx.conf
COPY app/server/ /app/server
COPY migrations/ /migrations
COPY --from=client /app/build /app/build

# Create helpful scripts for container setup and recovery
# 1. Script to fix corrupted API module
COPY app/server/fireshare/api/__init__.py /tmp/correct_init.py
RUN echo '#!/bin/bash\nmkdir -p /usr/local/lib/python3.9/site-packages/fireshare/api/\ncp /tmp/correct_init.py /usr/local/lib/python3.9/site-packages/fireshare/api/__init__.py' > /fix-api-init.sh && chmod +x /fix-api-init.sh

# 2. Script to back up the database (useful for debugging or recovery)
RUN echo '#!/bin/bash\nBACKUP_DIR=/backups\nDATETIME=$(date +%Y%m%d_%H%M%S)\necho "Creating backup of database"\ncp /data/db.sqlite $BACKUP_DIR/db_backup_$DATETIME.sqlite\necho "Backup created at $BACKUP_DIR/db_backup_$DATETIME.sqlite"\n' > /backup-db.sh && chmod +x /backup-db.sh

# Install the application
RUN pip install --no-cache-dir /app/server

# Set environment variables
ENV FLASK_APP /app/server/fireshare:create_app()
ENV FLASK_ENV production
ENV ENVIRONMENT production
ENV DATA_DIRECTORY /data
ENV VIDEO_DIRECTORY /videos
ENV PROCESSED_DIRECTORY /processed
ENV TEMPLATE_PATH=/app/server/fireshare/templates
ENV ADMIN_PASSWORD admin

# Enable setup mode by default for first-time installations
ENV SETUP_MODE true

# HTTPS configuration (disabled by default)
ENV ENABLE_HTTPS false
# Default to empty - need to be supplied when running container for HTTPS
ENV SSL_CERT_PATH ""
ENV SSL_KEY_PATH ""

# Expose both HTTP and HTTPS ports
EXPOSE 80 443
CMD ["bash", "/entrypoint.sh"]

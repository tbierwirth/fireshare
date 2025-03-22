# Fireshare Production Deployment Guide

This guide explains how to deploy Fireshare to a production environment using Docker. Fireshare is designed to be self-hosted and is recommended for use in small to medium-sized deployments.

## Prerequisites

- Ubuntu Server 24.04 (or similar Linux distribution)
- Docker and Docker Compose installed
- At least 2GB RAM and 10GB free disk space
- Network access to ports 80/443

## Preparation Steps

1. **Create Directories for Persistent Storage**

```bash
# Create directories for Docker volumes
sudo mkdir -p /opt/fireshare/data
sudo mkdir -p /opt/fireshare/processed
sudo mkdir -p /opt/fireshare/videos

# Set appropriate permissions
sudo chown -R 1000:1000 /opt/fireshare
sudo chmod -R 755 /opt/fireshare
```

2. **Set Up Environment Variables**

Create a `.env` file in the deployment directory to store environment variables:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
DATA_DIRECTORY=/data
VIDEO_DIRECTORY=/videos
PROCESSED_DIRECTORY=/processed
ENVIRONMENT=prod
```

3. **Configure Docker Compose**

Create or edit the `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  fireshare:
    image: shaneisrael/fireshare:latest
    container_name: fireshare
    restart: unless-stopped
    ports:
      - "80:80"
    environment:
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - DATA_DIRECTORY=${DATA_DIRECTORY}
      - VIDEO_DIRECTORY=${VIDEO_DIRECTORY}
      - PROCESSED_DIRECTORY=${PROCESSED_DIRECTORY}
      - ENVIRONMENT=${ENVIRONMENT}
    volumes:
      - /opt/fireshare/data:/data:rw
      - /opt/fireshare/processed:/processed:rw
      - /opt/fireshare/videos:/videos:rw
```

## Deployment

1. **Deploy with Docker Compose**

```bash
# Navigate to the directory containing docker-compose.yml
docker-compose up -d
```

2. **Verify Deployment**

```bash
# Check if the container is running
docker ps

# View logs
docker logs fireshare
```

3. **Access the Application**

Open a web browser and go to `http://your-server-ip`

- Login with the admin credentials you set in the environment variables
- Create invite codes to add additional users
- Upload videos to the video directory

## Uploading Videos

There are several ways to upload videos to Fireshare:

1. **Web Interface**
   - Use the upload button in the dashboard
   - Select a game and optional tags for organization

2. **Copy to Video Directory**
   - Copy video files directly to the `/opt/fireshare/videos` directory on your server
   - Run the bulk import process from the admin dashboard

3. **Automatic Scanning**
   - Configure scheduled tasks in the admin settings to automatically scan for new videos

## Security Considerations

1. **HTTPS Setup**

For secure access, set up HTTPS using a reverse proxy like Nginx or Traefik, or use Cloudflare.

2. **Firewall Configuration**

```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

3. **Regular Backups**

Set up regular backups of the data directory which contains the SQLite database:

```bash
# Example backup script
tar -czf fireshare-backup-$(date +%Y%m%d).tar.gz /opt/fireshare/data
```

## Troubleshooting

1. **Container fails to start**
   - Check logs: `docker logs fireshare`
   - Verify volume permissions
   - Ensure ports are not in use by other services

2. **Database issues**
   - Ensure the data directory has proper permissions
   - Check the SQLite database file existence and permissions

3. **Video processing issues**
   - Verify ffmpeg is working inside the container
   - Check processed directory permissions
   - Ensure video files are in supported formats (MP4, WebM, etc.)

## Upgrading

To upgrade to a newer version of Fireshare:

```bash
# Pull the latest image
docker pull shaneisrael/fireshare:latest

# Restart the container
docker-compose down
docker-compose up -d
```

## Advanced Configuration

For advanced configuration options, refer to:

- [LDAP.md](LDAP.md) for LDAP authentication setup
- [CLAUDE.md](CLAUDE.md) for detailed system documentation
- [README.md](README.md) for general usage instructions

## Support

If you encounter issues with your deployment, please check:

- GitHub Issues: https://github.com/ShaneIsrael/fireshare/issues
- Project Documentation: README.md and CLAUDE.md

For commercial support or custom deployments, contact the project maintainers.
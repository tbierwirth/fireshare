# GitHub Actions Workflows for Fireshare

This directory contains GitHub Actions workflows for automating the build and deployment of Fireshare.

## Docker Build and Publish Workflow

The main workflow is defined in `docker-build.yml` and handles both building and publishing Docker images to Docker Hub in a single workflow.

### Workflow Triggers

- **Push to `main` or `develop` branches**: When changes are made to app files, migrations, Dockerfile, or entrypoint.sh
- **New version tags**: When a tag like `v1.0.0` is pushed
- **Pull requests**: To test builds without pushing (dry run)
- **Manual trigger**: Can be run manually with optional custom tag

### Build and Publish Behavior

The workflow automatically handles both building and publishing (pushing to Docker Hub) with the following behavior:

1. **For pushes to `main` branch**:
   - Builds the image
   - Publishes to Docker Hub with tags:
     - `tbierwirth/fireshare:latest`
     - Specific version tags when using `v*` tags (e.g., `v1.0.0` becomes `tbierwirth/fireshare:1.0.0` and `tbierwirth/fireshare:1.0`)

2. **For pushes to `develop` branch**:
   - Builds the image
   - Publishes to Docker Hub with tag:
     - `tbierwirth/fireshare:develop`

3. **For pull requests**:
   - Builds the image only (validation)
   - Does not publish to Docker Hub

4. **For manual workflow runs**:
   - Builds the image
   - If a custom tag is provided, publishes to Docker Hub with that tag

### Workflow Features

- **Multi-Architecture Support**: Builds for both AMD64 (x86_64) and ARM64 (aarch64) architectures
- **Efficient Caching**: Uses GitHub Actions cache for faster builds
- **Workflow Summaries**: Provides detailed build and publish information in the workflow run summary
- **Conditional Publishing**: Only publishes images for actual pushes or manual triggers, not for PR validation

### Required Secrets

To use this workflow, you need to set up the following secrets in your GitHub repository:

1. `DOCKER_USERNAME`: Your Docker Hub username
2. `DOCKER_PASSWORD`: Your Docker Hub access token or password

### Old Workflows

The repository previously contained multiple separate workflows:

- `docker-publish-main.yml`: For main branch publishing
- `docker-publish-develop.yml`: For develop branch publishing

These have been consolidated into the single `docker-build.yml` workflow for better maintenance and consistency. The old workflow files can be removed using the provided `cleanup.sh` script.
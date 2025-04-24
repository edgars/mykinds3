#!/bin/bash
set -e

# Configuration
IMAGE_NAME="seudesinfluencer"
IMAGE_TAG="latest"
DOCKER_HUB_USERNAME=""  # Set your Docker Hub username here if publishing

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print section header
section() {
  echo -e "\n${YELLOW}==== $1 ====${NC}\n"
}

# Check if buildx is available
if ! docker buildx version > /dev/null 2>&1; then
  section "Error: Docker Buildx not available"
  echo "Docker Buildx is required for multi-architecture builds."
  echo "Please make sure you're using Docker Desktop or have Buildx installed."
  exit 1
fi

# Create a new builder instance if it doesn't exist
section "Setting up builder"
if ! docker buildx inspect mybuilder > /dev/null 2>&1; then
  echo "Creating new builder instance..."
  docker buildx create --name mybuilder --use
else
  echo "Using existing builder instance..."
  docker buildx use mybuilder
fi

# Bootstrap the builder instance
echo "Bootstrapping builder..."
docker buildx inspect --bootstrap

# Build for multiple platforms
section "Building multi-architecture images (linux/amd64, linux/arm64)"

# If Docker Hub username is provided, push to registry
if [ -n "$DOCKER_HUB_USERNAME" ]; then
  section "Building and pushing to Docker Hub"
  echo "You will be prompted to log in to Docker Hub"
  docker login
  
  # Build and push to registry
  docker buildx build --platform linux/amd64,linux/arm64 \
    -t ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG} \
    --push .
  
  echo -e "\n${GREEN}Images built and pushed to Docker Hub as ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}${NC}"
  echo -e "Pull with: docker pull ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"
else
  # Build locally
  section "Building local images"
  echo "Building AMD64 image..."
  docker buildx build --platform linux/amd64 \
    -t ${IMAGE_NAME}:${IMAGE_TAG}-amd64 \
    --load .
    
  echo "Building ARM64 image..."
  docker buildx build --platform linux/arm64 \
    -t ${IMAGE_NAME}:${IMAGE_TAG}-arm64 \
    --load .
  
  section "Verification"
  echo "Images created:"
  docker images | grep ${IMAGE_NAME}
  
  echo -e "\n${GREEN}Multi-architecture build complete!${NC}"
  echo -e "To run on AMD64: docker run -d -p 3000:3000 ${IMAGE_NAME}:${IMAGE_TAG}-amd64"
  echo -e "To run on ARM64: docker run -d -p 3000:3000 ${IMAGE_NAME}:${IMAGE_TAG}-arm64"
fi 
#!/bin/bash
set -e

# Configuration
IMAGE_NAME="seudesinfluencer"
IMAGE_TAG="latest"
PLATFORM="linux/amd64"
CONTAINER_NAME="seudesinfluencer-app"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print section header
section() {
  echo -e "\n${YELLOW}==== $1 ====${NC}\n"
}

# Build the Docker image for AMD64
section "Building Docker image for ${PLATFORM}"
docker buildx build --platform ${PLATFORM} \
  -t ${IMAGE_NAME}:${IMAGE_TAG} \
  --load .

# Verify the image was created
section "Verifying image"
docker images | grep ${IMAGE_NAME}

# Instructions for running
section "Instructions"
echo -e "${GREEN}Image built successfully: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
echo -e "To run the container:"
echo -e "  docker run -d -p 3000:3000 --name ${CONTAINER_NAME} ${IMAGE_NAME}:${IMAGE_TAG}"
echo -e "To stop the container:"
echo -e "  docker stop ${CONTAINER_NAME}"
echo -e "To remove the container:"
echo -e "  docker rm ${CONTAINER_NAME}"

# Ask if user wants to run the container
section "Run container?"
read -p "Do you want to run the container now? (y/n): " answer
if [ "$answer" == "y" ] || [ "$answer" == "Y" ]; then
  # Check if container with same name is already running
  if docker ps -a | grep -q ${CONTAINER_NAME}; then
    echo "Container with name ${CONTAINER_NAME} already exists. Removing it..."
    docker rm -f ${CONTAINER_NAME}
  fi
  
  # Run the container
  echo "Starting container..."
  docker run -d -p 3000:3000 --name ${CONTAINER_NAME} ${IMAGE_NAME}:${IMAGE_TAG}
  
  echo -e "\n${GREEN}Container started! Access the application at http://localhost:3000${NC}"
fi 
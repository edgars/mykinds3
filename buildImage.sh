#!/bin/bash

# Set variables
IMAGE_NAME="mykinds3"
VERSION="latest"
DOCKER_USERNAME="edgars"  # Replace with your Docker Hub username

# Clean up any existing containers and images
echo "Cleaning up existing containers and images..."
docker rm -f $(docker ps -aq) 2>/dev/null || true
docker rmi $(docker images -q ${DOCKER_USERNAME}/${IMAGE_NAME}:*) 2>/dev/null || true

# Build the Docker image for Linux/amd64 platform
echo "Building Docker image for Linux/amd64 platform..."
docker build --platform linux/amd64 --no-cache -t ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION} .

# Tag the image as latest
docker tag ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION} ${DOCKER_USERNAME}/${IMAGE_NAME}:latest

echo "Build complete!"
echo "Image tagged as:"
echo "- ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
echo "- ${DOCKER_USERNAME}/${IMAGE_NAME}:latest" 
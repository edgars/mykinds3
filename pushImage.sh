#!/bin/bash

# Set variables
IMAGE_NAME="mykinds3"
VERSION="1.0.0"
DOCKER_USERNAME="edgars"  # Replace with your Docker Hub username

# Push the versioned image
echo "Pushing version ${VERSION} for Linux/amd64 platform..."
docker push --platform linux/amd64 ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}

# Push the latest tag
echo "Pushing latest tag for Linux/amd64 platform..."
docker push --platform linux/amd64 ${DOCKER_USERNAME}/${IMAGE_NAME}:latest

echo "Push complete!"
echo "Images pushed:"
echo "- ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
echo "- ${DOCKER_USERNAME}/${IMAGE_NAME}:latest" 
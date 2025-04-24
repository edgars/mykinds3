#!/bin/bash

# Exit on error
set -e

# Configuration
IMAGE_NAME="seudesinfluencer"
DOCKER_HUB_USERNAME="edgars"
TAG="latest"
FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"

echo "Pushing image to Docker Hub"
docker push $FULL_IMAGE_NAME

echo "Successfully pushed $FULL_IMAGE_NAME to Docker Hub" 
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
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print section header
section() {
  echo -e "\n${YELLOW}==== $1 ====${NC}\n"
}

# Check prereqs
section "Checking prerequisites"

# Check for Next.js config
if [ ! -f next.config.js ]; then
  echo -e "${RED}Error: next.config.js not found${NC}"
  exit 1
fi

# Check for standalone output in next.config.js
if ! grep -q "output.*standalone" next.config.js; then
  echo -e "${RED}Warning: 'output: \"standalone\"' not found in next.config.js${NC}"
  echo -e "The Docker build might fail. Please ensure your next.config.js includes:"
  echo -e "output: 'standalone'"
fi

# Check for Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
  exit 1
fi

# Check if buildx is available
if ! docker buildx version &> /dev/null; then
  echo -e "${RED}Error: Docker Buildx is not available${NC}"
  echo "Docker Buildx is required for platform-specific builds."
  exit 1
fi

# Check for fonts directory and required fonts
section "Checking fonts"
if [ ! -d "fonts" ]; then
  echo "Creating fonts directory..."
  mkdir -p fonts
fi

# Check for required font files
REQUIRED_FONTS=(
  "NotoSans-Regular.ttf"
  "NotoSans-Bold.ttf"
  "NotoSans-Italic.ttf"
  "NotoSans-VariableFont_wdth,wght.ttf"
)

FONTS_MISSING=false
for font in "${REQUIRED_FONTS[@]}"; do
  if [ ! -f "fonts/$font" ]; then
    echo -e "${RED}Missing font: $font${NC}"
    FONTS_MISSING=true
  else
    echo -e "${GREEN}Found font: $font${NC}"
  fi
done

if [ "$FONTS_MISSING" = true ]; then
  echo -e "${YELLOW}Warning: Some required fonts are missing.${NC}"
  echo "Please ensure all the necessary fonts are in the fonts directory before building."
  read -p "Do you want to continue anyway? (y/n): " continue_anyway
  if [ "$continue_anyway" != "y" ] && [ "$continue_anyway" != "Y" ]; then
    echo "Build aborted. Please add the missing fonts and try again."
    exit 1
  fi
fi

# Build the Docker image for AMD64
section "Building Docker image for ${PLATFORM}"
docker buildx build --platform ${PLATFORM} \
  -t ${IMAGE_NAME}:${IMAGE_TAG} \
  --no-cache \
  --progress=plain \
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
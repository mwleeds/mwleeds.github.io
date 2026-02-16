#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Wedding Registry Build Script ===${NC}\n"

# Parse command line arguments
BUILD_WEBPACK=true
BUILD_JEKYLL=false
SERVE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-webpack)
      BUILD_WEBPACK=false
      shift
      ;;
    --jekyll)
      BUILD_JEKYLL=true
      shift
      ;;
    --serve)
      SERVE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --no-webpack    Skip webpack build"
      echo "  --jekyll        Build Jekyll site with Docker"
      echo "  --serve         Start development server with Docker Compose"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Build webpack bundle
if [ "$BUILD_WEBPACK" = true ]; then
  echo -e "${YELLOW}Building webpack bundle...${NC}"

  cd jekyll-theme-easy-wedding

  # Build Docker image
  docker build --no-cache -f Dockerfile.build -t jekyll-webpack-builder . > /tmp/webpack-build.log 2>&1

  # Extract bundle
  container_id=$(docker create jekyll-webpack-builder)
  docker cp "$container_id:/app/assets/main-bundle.js" assets/js/main-bundle.js
  docker rm "$container_id"

  echo -e "${GREEN}✓ Webpack bundle built successfully${NC}"
  echo -e "  Output: assets/js/main-bundle.js\n"

  cd ..
fi

# Build Jekyll site
if [ "$BUILD_JEKYLL" = true ]; then
  echo -e "${YELLOW}Building Jekyll site with Docker...${NC}"

  # Build the Docker image if it doesn't exist
  if ! docker image inspect jekyll-builder &> /dev/null; then
    echo -e "${BLUE}Building Jekyll Docker image (first time only)...${NC}"
    docker build -f Dockerfile.dev -t jekyll-builder . > /tmp/jekyll-build.log 2>&1
  fi

  # Run Jekyll build in container with volume mount
  docker run --rm \
    -v "$(pwd):/srv/jekyll" \
    -e JEKYLL_ENV=production \
    jekyll-builder \
    bundle exec jekyll build

  echo -e "${GREEN}✓ Jekyll site built successfully${NC}"
  echo -e "  Output: _site/\n"
fi

# Start development server
if [ "$SERVE" = true ]; then
  echo -e "${YELLOW}Starting development server...${NC}"
  echo -e "${BLUE}Access the site at: http://localhost:4000/${NC}"
  echo -e "${BLUE}Admin dashboard: http://localhost:4000/admin/${NC}"
  echo -e "${BLUE}Registry page: http://localhost:4000/registry/${NC}"
  echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"

  docker compose up
fi

echo -e "${GREEN}Build complete!${NC}"

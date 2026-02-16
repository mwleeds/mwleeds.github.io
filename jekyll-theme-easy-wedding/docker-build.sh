#!/bin/bash
set -e

echo "Building webpack bundle in Docker..."

# Build the Docker image
docker build -f Dockerfile.build -t jekyll-webpack-builder .

# Create a container and copy the built files
echo "Extracting built files..."
container_id=$(docker create jekyll-webpack-builder)
docker cp "$container_id:/app/assets/main-bundle.js" ./assets/main-bundle.js
docker rm "$container_id"

echo "Build complete! Bundle saved to assets/main-bundle.js"

#!/bin/bash
# VM Setup Script - Run this first on your GCP VM

set -e

echo "Installing dependencies..."

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential python3 unzip wget

# Install PM2 globally
sudo npm install -g pm2

# Create working directory
mkdir -p ~/patent-search/uspto-data
cd ~/patent-search

# Run Qdrant
docker run -d \
  --name qdrant \
  --restart always \
  -p 6333:6333 \
  -v ~/qdrant_storage:/qdrant/storage \
  qdrant/qdrant

echo "Setup complete! Now run: npm install"

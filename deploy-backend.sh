#!/usr/bin/env bash

set -e

################################
# CONFIGURATION
################################
SERVER="adelie"
REMOTE_DIR="~/driftbackend"
################################

echo "Deploying backend to $SERVER..."

# Check if .env exists locally (for reference, but don't copy it)
if [ ! -f .env ]; then
    echo "  Warning: No .env file found locally."
    echo "   Make sure you have created .env on the server with ZETTLE_API_KEY and ZETTLE_CLIENT_ID"
fi

# Create remote directory if it doesn't exist
echo "Creating remote directory..."
ssh $SERVER "mkdir -p $REMOTE_DIR"

# Copy necessary files
echo "Copying files to server..."
scp -r backend/ $SERVER:$REMOTE_DIR/
scp compose.prod.yml $SERVER:$REMOTE_DIR/docker-compose.yml
scp Dockerfile.backend $SERVER:$REMOTE_DIR/
scp package.json $SERVER:$REMOTE_DIR/
scp pnpm-lock.yaml $SERVER:$REMOTE_DIR/
scp pnpm-workspace.yaml $SERVER:$REMOTE_DIR/

# Deploy on server
echo "Building and starting Docker containers..."
ssh $SERVER "cd $REMOTE_DIR && docker-compose down && docker-compose up -d --build"

echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "   1. Ensure .env file exists on server with ZETTLE_API_KEY and ZETTLE_CLIENT_ID"
echo "   2. Check logs: ssh $SERVER 'cd $REMOTE_DIR && docker-compose logs -f backend'"
echo "   3. Test API: ssh $SERVER 'curl http://localhost:3000/api/'"
echo ""
echo "Configure reverse proxy to expose backend at https://api-drift.tihlde.org"

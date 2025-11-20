#!/bin/bash

# Deploy script for Game Platform
# Server: 95.216.27.123 (Hetzner)
# Domain: games.cur8.fun

set -e

echo "🚀 Starting deployment to games.cur8.fun..."

# Navigate to project directory
cd /opt/Ggameplatform

echo "📥 Pulling latest changes from Git..."
git pull origin master

echo "📝 Setting up environment files..."
# Copy production env.js if not exists
if [ ! -f frontend/env.js ]; then
    cp frontend/env.production.js frontend/env.js
    echo "✅ Created frontend/env.js from production template"
fi

# Copy backend .env if not exists
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from example"
fi

echo "🔨 Building Docker containers..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 5

echo "📊 Container status:"
docker-compose ps

echo "🧹 Cleaning up unused Docker resources..."
docker system prune -f

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Frontend: https://games.cur8.fun"
echo "🔌 Backend API: https://games.cur8.fun/docs"
echo "💚 Health Check: https://games.cur8.fun/health"
echo ""
echo "📋 Useful commands:"
echo "  docker-compose logs -f          # View logs"
echo "  docker-compose restart          # Restart services"
echo "  docker-compose down             # Stop services"
echo "  docker exec -it gameplatform_backend bash  # Enter backend container"
echo ""

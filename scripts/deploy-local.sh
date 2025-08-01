#!/bin/bash

# Local deployment script for testing
# This script mimics the GitHub Actions deployment process locally

set -e

echo "🚀 Starting local deployment test..."

# Check if required environment variables are set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Error: CLOUDFLARE_API_TOKEN is not set"
    echo "Please set it with: export CLOUDFLARE_API_TOKEN=your_token"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL is not set"
    echo "Please set it with: export DATABASE_URL=your_database_url"
    exit 1
fi

echo "✅ Environment variables are set"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Check types
echo "🔍 Checking types..."
bun run check-types

# Build applications
echo "🏗️ Building applications..."
bun run build

# Deploy server
echo "🔧 Deploying server to Cloudflare Workers..."
cd apps/server
bun run deploy

# Run database migrations
echo "🗄️ Running database migrations..."
bun run db:migrate

# Deploy web app
echo "🌐 Deploying web app to Cloudflare Pages..."
cd ../web
bun run deploy

echo "✅ Local deployment test completed successfully!"
echo "🌐 Web app deployed to Cloudflare Pages"
echo "🔧 Server deployed to Cloudflare Workers"
echo "🗄️ Database migrations applied" 
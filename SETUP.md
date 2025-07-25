# Ecomantem Setup Guide

## Environment Variables Setup

### 1. Database (PostgreSQL)

**Option A: Neon.tech (Recommended)**
1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection strings:
   - `DATABASE_URL` - Direct connection string
   - `DATABASE_URL_POOLER` - Pooled connection string (recommended for production)

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL locally
# Create database and user
createdb ecomantem
createuser -P ecomantem_user
```

### 2. Authentication (Better Auth)

Generate a secure secret:
```bash
# Generate a random 32-character secret
openssl rand -base64 32
```

Set the URLs:
- `BETTER_AUTH_SECRET` - Your generated secret
- `BETTER_AUTH_URL` - Backend URL (http://localhost:3000 for dev)

### 3. CORS Configuration

Set `CORS_ORIGIN` to your frontend URL:
- Development: `http://localhost:3001`
- Production: `https://yourdomain.com`

### 4. Cloudflare R2 (Image Storage)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Object Storage
3. Create API token with R2 permissions:
   - Go to "My Profile" → "API Tokens"
   - Create token with R2:Edit permissions
4. Create R2 bucket:
   ```bash
   wrangler r2 bucket create ecomantem-todo-images
   ```
5. Get your Account ID from the right sidebar

Set these variables:
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare Account ID
- `R2_ACCESS_KEY_ID` - API token Access Key ID  
- `R2_SECRET_ACCESS_KEY` - API token Secret Access Key

## Setup Commands

1. **Copy environment file:**
   ```bash
   cp apps/server/.env.example apps/server/.env
   ```

2. **Fill in your environment variables** in `apps/server/.env`

3. **Install dependencies:**
   ```bash
   bun install
   ```

4. **Generate and push database schema:**
   ```bash
   bun run db:generate
   bun run db:push
   ```

5. **Create admin user:**
   After setting up the database, manually set a user as admin:
   ```sql
   UPDATE "user" SET is_admin = true WHERE email = 'your-admin-email@example.com';
   ```

6. **Start development servers:**
   ```bash
   # Start backend (in one terminal)
   bun run dev:server
   
   # Start frontend (in another terminal)  
   bun run dev:web
   ```

## Production Deployment

For Cloudflare Workers deployment:

1. **Set secrets** (don't put these in wrangler.jsonc):
   ```bash
   wrangler secret put BETTER_AUTH_SECRET
   wrangler secret put DATABASE_URL
   wrangler secret put DATABASE_URL_POOLER
   wrangler secret put CLOUDFLARE_ACCOUNT_ID
   wrangler secret put R2_ACCESS_KEY_ID
   wrangler secret put R2_SECRET_ACCESS_KEY
   ```

2. **Update wrangler.jsonc** with production CORS_ORIGIN in vars section

3. **Deploy:**
   ```bash
   bun run deploy
   ```

## Features Included

- ✅ Todo management with image attachments
- ✅ User authentication (email/password)
- ✅ Admin-only chat system (WebSocket)
- ✅ Image storage via Cloudflare R2
- ✅ Secure WebSocket connections
- ✅ Database migrations with Drizzle ORM

## Troubleshooting

**Database connection issues:**
- Ensure your DATABASE_URL is correct
- Check if your database allows external connections
- Verify SSL settings match your provider

**R2 upload issues:**
- Verify your API token has R2:Edit permissions
- Check that the bucket name matches in wrangler.jsonc
- Ensure CLOUDFLARE_ACCOUNT_ID is correct

**WebSocket connection fails:**
- Verify user has admin role in database
- Check that session is valid
- Ensure WebSocket upgrade headers are being sent
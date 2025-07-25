# Ecomantem Deployment Guide

This guide covers deploying both the backend (Cloudflare Workers) and frontend (static hosting) for production.

## 🚀 Backend Deployment (Cloudflare Workers)

### Prerequisites

1. **Cloudflare Account**
   - Sign up at [cloudflare.com](https://cloudflare.com)
   - Install Wrangler CLI: `npm install -g wrangler`
   - Login: `wrangler login`

2. **Production Database**
   - Use [Neon.tech](https://neon.tech) (recommended) or any PostgreSQL provider
   - Ensure it accepts external connections

### Step 1: Set Up Cloudflare R2 Bucket

```bash
# Create R2 bucket for images
wrangler r2 bucket create ecomantem-todo-images

# Verify bucket was created
wrangler r2 bucket list
```

### Step 2: Configure Durable Objects

The Durable Object is already configured in `wrangler.jsonc`. Verify the configuration:

```json
{
  "durable_objects": {
    "bindings": [
      {
        "name": "ADMIN_CHAT",
        "class_name": "AdminChat",
        "script_name": "ecomantem-server"
      }
    ]
  }
}
```

### Step 3: Set Production Secrets

**Never put secrets in `wrangler.jsonc` - use Wrangler secrets:**

```bash
# Navigate to server directory
cd apps/server

# Set authentication secrets
wrangler secret put BETTER_AUTH_SECRET
# Enter: Your secure random string (generate with: openssl rand -base64 32)

wrangler secret put BETTER_AUTH_URL
# Enter: https://your-api-domain.your-subdomain.workers.dev

# Set database secrets
wrangler secret put DATABASE_URL
# Enter: Your production PostgreSQL connection string

wrangler secret put DATABASE_URL_POOLER
# Enter: Your pooled connection string (if different)

# Set Cloudflare R2 secrets
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Enter: Your Cloudflare Account ID (found in dashboard sidebar)

wrangler secret put R2_ACCESS_KEY_ID
# Enter: Your R2 API token access key

wrangler secret put R2_SECRET_ACCESS_KEY
# Enter: Your R2 API token secret key
```

### Step 4: Update Public Variables

Edit `apps/server/wrangler.jsonc` and update the `vars` section:

```json
{
  "vars": {
    "NODE_ENV": "production",
    "CORS_ORIGIN": "https://your-frontend-domain.com"
  }
}
```

### Step 5: Deploy Backend

```bash
# Generate database schema (if not done)
bun run db:generate

# Build and deploy
wrangler deploy

# The deployment will output your Worker URL:
# https://ecomantem-server.your-subdomain.workers.dev
```

### Step 6: Run Database Migrations

```bash
# Push schema to production database
bun run db:push

# Create admin user manually in your database
# Connect to your production database and run:
# UPDATE "user" SET is_admin = true WHERE email = 'admin@yourdomain.com';
```

## 🌐 Frontend Deployment

### Option A: Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Navigate to web app
   cd apps/web
   
   # Deploy
   vercel
   ```

2. **Configure Environment Variables in Vercel Dashboard**
   - Go to your project settings
   - Add environment variable:
     - `VITE_API_URL`: `https://your-worker-url.workers.dev`

3. **Build Settings**
   - Framework Preset: `Vite`
   - Build Command: `bun run build`
   - Output Directory: `dist`
   - Install Command: `bun install`

### Option B: Netlify

1. **Deploy via Git**
   - Connect your GitHub repository
   - Set build settings:
     - Build command: `cd apps/web && bun run build`
     - Publish directory: `apps/web/dist`

2. **Environment Variables**
   - Add in Netlify dashboard:
     - `VITE_API_URL`: `https://your-worker-url.workers.dev`

### Option C: Cloudflare Pages

1. **Connect Repository**
   - Go to Cloudflare Dashboard → Pages
   - Connect your GitHub repository

2. **Build Settings**
   - Framework preset: `None`
   - Build command: `cd apps/web && bun install && bun run build`
   - Build output directory: `apps/web/dist`

3. **Environment Variables**
   - Add in Pages settings:
     - `VITE_API_URL`: `https://your-worker-url.workers.dev`

## 🔧 Post-Deployment Configuration

### 1. Update CORS Settings

Update your backend's CORS_ORIGIN secret:

```bash
wrangler secret put CORS_ORIGIN
# Enter: https://your-frontend-domain.com
```

### 2. Test Deployment

1. **Test Authentication**
   - Visit your frontend URL
   - Create a new account
   - Verify login works

2. **Test Todo Functionality**
   - Create a todo
   - Upload an image
   - Verify image displays correctly

3. **Test Admin Chat**
   - Set a user as admin in database
   - Access `/admin-chat` route
   - Test real-time messaging

### 3. Set Up Custom Domain (Optional)

**For Cloudflare Workers:**
```bash
# Add custom domain to worker
wrangler route add "api.yourdomain.com/*" ecomantem-server
```

**For Frontend:**
- Configure DNS to point to your hosting provider
- Set up SSL certificate (usually automatic)

## 🔒 Security Checklist

- [ ] All secrets stored in Wrangler secrets (not in code)
- [ ] CORS_ORIGIN set to production frontend URL
- [ ] Database uses SSL connections
- [ ] R2 bucket has appropriate access controls
- [ ] Admin users manually verified in database
- [ ] HTTPS enabled on all endpoints

## 🐛 Troubleshooting

### Common Issues

**"CORS Error"**
- Verify `CORS_ORIGIN` secret matches your frontend URL exactly
- Check that both HTTP and HTTPS protocols match

**"Database Connection Failed"**
- Verify `DATABASE_URL` is correct
- Ensure database allows external connections
- Check SSL mode settings

**"R2 Upload Fails"**
- Confirm `CLOUDFLARE_ACCOUNT_ID` is correct
- Verify R2 API tokens have correct permissions
- Check bucket name matches `wrangler.jsonc`

**"WebSocket Connection Denied"**
- Ensure user has `is_admin = true` in database
- Verify session cookies are being sent
- Check that authentication is working

**"Durable Object Error"**
- Verify Durable Object binding in `wrangler.jsonc`
- Check that `AdminChat` class is exported in `src/index.ts`

### Debugging Commands

```bash
# View Worker logs
wrangler tail

# Check R2 bucket contents
wrangler r2 object list ecomantem-todo-images

# Test database connection
bun run db:studio

# View current secrets (names only)
wrangler secret list
```

## 📊 Monitoring

### Cloudflare Analytics
- Worker performance metrics
- Request volume and errors
- Geographic distribution

### Database Monitoring
- Connection pool usage
- Query performance
- Storage usage

### R2 Storage
- Upload success rates
- Storage usage
- Bandwidth consumption

## 🔄 Updates and Maintenance

### Updating Backend
```bash
cd apps/server
wrangler deploy
```

### Updating Frontend
- Push changes to your repository
- Most platforms auto-deploy on git push

### Database Migrations
```bash
# Generate new migration
bun run db:generate

# Apply to production
bun run db:push
```

## 🚨 Rollback Procedures

### Backend Rollback
```bash
# Deploy previous version
wrangler rollback
```

### Database Rollback
- Restore from database backup
- Manually revert schema changes if needed

### Frontend Rollback
- Revert git commit and push
- Or use hosting platform's rollback feature

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Cloudflare Workers documentation
3. Check your hosting platform's docs
4. Verify all environment variables are set correctly
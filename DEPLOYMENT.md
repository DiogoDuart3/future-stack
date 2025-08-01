# Deployment Guide

This project uses GitHub Actions to automatically deploy changes to production when code is pushed to the `main` branch.

## GitHub Actions Workflow

The deployment workflow (`.github/workflows/deploy.yml`) consists of three main jobs:

1. **Build Job**: Builds both the web and server applications
2. **Deploy Server Job**: Deploys the server to Cloudflare Workers and runs database migrations
3. **Deploy Web Job**: Deploys the web app to Cloudflare Pages
4. **Notify Job**: Provides deployment status notifications

## Required GitHub Secrets

To enable automatic deployment, you need to configure the following secrets in your GitHub repository:

### 1. CLOUDFLARE_API_TOKEN
- **Purpose**: Authenticates with Cloudflare for deploying to Workers and Pages
- **How to get it**:
    1. Log in to the Cloudflare dashboard ↗.
    2. Select Manage Account > Account API Tokens.
    3. Select Create Token > find Edit Cloudflare Workers > select Use Template.
    4. Customize your token name.
    5. Scope your token.

### 2. DATABASE_URL
- **Purpose**: Connection string for the PostgreSQL database
- **Format**: `postgresql://username:password@host:port/database`
- **How to get it**: Copy from your database provider (e.g., Neon, Supabase, etc.)

## Setting up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the exact names above

## Manual Deployment

You can also trigger deployments manually:

1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Select the **Deploy to Production** workflow
4. Click **Run workflow** → **Run workflow**

## Deployment Process

1. **Trigger**: Push to `main` branch or manual trigger
2. **Build**: Type checking and building both applications
3. **Deploy Server**: 
   - Deploy to Cloudflare Workers
   - Run database migrations
4. **Deploy Web**: Deploy to Cloudflare Pages
5. **Notify**: Success/failure notifications

## Troubleshooting

### Common Issues

1. **Build failures**: Check TypeScript errors in the build logs
2. **Deployment failures**: Verify your Cloudflare API token has correct permissions
3. **Database migration failures**: Ensure DATABASE_URL is correct and database is accessible

### Logs

- Build logs: Check the "build" job in GitHub Actions
- Server deployment logs: Check the "deploy-server" job
- Web deployment logs: Check the "deploy-web" job

## Environment Variables

The following environment variables are used during deployment:

- `CLOUDFLARE_API_TOKEN`: For Cloudflare authentication
- `DATABASE_URL`: For database connections and migrations
- `NODE_ENV`: Set to "production" in wrangler.jsonc

## Security Notes

- Never commit secrets to the repository
- Use GitHub Secrets for all sensitive data
- Regularly rotate your Cloudflare API token
- Monitor deployment logs for any security issues 
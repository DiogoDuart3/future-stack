# CI/CD Pipeline Documentation

This document outlines the Continuous Integration and Continuous Deployment (CI/CD) processes for the Starter Kit application, including database migration strategies and production deployment workflows.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Migration Strategy](#database-migration-strategy)
- [Deployment Workflows](#deployment-workflows)
- [Environment Management](#environment-management)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring and Alerts](#monitoring-and-alerts)
- [Security Considerations](#security-considerations)

## 🎯 Overview

The Starter Kit application uses a modern stack with:
- **Backend**: Cloudflare Workers (serverless)
- **Frontend**: Static hosting (Vercel/Netlify/Cloudflare Pages)
- **Database**: PostgreSQL (Neon.tech)
- **Storage**: Cloudflare R2
- **ORM**: Drizzle ORM with migrations

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Static)      │◄──►│   (Workers)     │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Storage       │
                       │   (Cloudflare R2)│
                       └─────────────────┘
```

## 🗄️ Database Migration Strategy

### Migration Types

#### 1. **Schema Migrations** (Breaking Changes)
- **When**: Adding/removing columns, changing data types, adding constraints
- **Strategy**: Zero-downtime migrations with careful planning
- **Timing**: During maintenance windows or low-traffic periods

#### 2. **Data Migrations** (Non-Breaking)
- **When**: Adding new data, updating existing data, adding indexes
- **Strategy**: Can be applied immediately
- **Timing**: Any time

#### 3. **Rolling Migrations** (Large Datasets)
- **When**: Migrating large amounts of data
- **Strategy**: Batch processing with progress tracking
- **Timing**: Off-peak hours

### Migration Workflow

#### Pre-Migration Checklist

```bash
# 1. Create migration
bun run db:generate

# 2. Review generated migration
cat apps/server/src/db/migrations/[timestamp]_migration_name.sql

# 3. Test migration locally
bun run db:push

# 4. Verify application works with new schema
bun run dev:server
```

#### Production Migration Process

```bash
# 1. Backup production database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply migration to staging (if available)
# Set DATABASE_URL to staging database
bun run db:push

# 3. Apply to production
# Set DATABASE_URL to production database
bun run db:push

# 4. Verify migration success
bun run db:studio
```

### Migration Best Practices

#### ✅ Do's
- **Always backup before migrations**
- **Test migrations on staging first**
- **Use transactions for complex migrations**
- **Monitor migration performance**
- **Have rollback plan ready**

#### ❌ Don'ts
- **Never run migrations during peak hours**
- **Don't skip testing on staging**
- **Avoid long-running migrations during business hours**
- **Don't forget to update application code before migration**

### Migration Timing Guidelines

| Migration Type | Recommended Time | Downtime Required |
|----------------|------------------|-------------------|
| Schema changes | 2-4 AM UTC | Minimal |
| Data migrations | Any time | None |
| Large data updates | 1-5 AM UTC | None |
| Index creation | 2-4 AM UTC | Minimal |

## 🚀 Deployment Workflows

### Automated Deployment (Recommended)

#### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run check-types
      - run: bun run build

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      
      - name: Setup Cloudflare CLI
        run: npm install -g wrangler
      
      - name: Deploy Backend
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          cd apps/server
          wrangler deploy
      
      - name: Run Database Migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          cd apps/server
          bun run db:push

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      
      - name: Build Frontend
        run: |
          cd apps/web
          bun run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./apps/web
```

### Manual Deployment Process

#### Backend Deployment

```bash
# 1. Navigate to server directory
cd apps/server

# 2. Build and test locally
bun run build
bun run check-types

# 3. Deploy to Cloudflare Workers
wrangler deploy

# 4. Verify deployment
curl https://your-worker-url.workers.dev/health
```

#### Frontend Deployment

```bash
# 1. Navigate to web directory
cd apps/web

# 2. Build application
bun run build

# 3. Deploy (choose one):
# Option A: Vercel
vercel --prod

# Option B: Netlify
netlify deploy --prod --dir=dist

# Option C: Cloudflare Pages
wrangler pages deploy dist --project-name=Starter Kit
```

### Environment-Specific Deployments

#### Staging Environment

```bash
# Set staging environment variables
export DATABASE_URL="postgresql://staging-db-url"
export CORS_ORIGIN="https://staging.yourdomain.com"

# Deploy to staging
wrangler deploy --env staging
```

#### Production Environment

```bash
# Set production environment variables
export DATABASE_URL="postgresql://production-db-url"
export CORS_ORIGIN="https://yourdomain.com"

# Deploy to production
wrangler deploy --env production
```

## 🌍 Environment Management

### Environment Variables

#### Backend (Cloudflare Workers)

```bash
# Production secrets
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put DATABASE_URL
wrangler secret put CORS_ORIGIN

# Staging secrets (if using environments)
wrangler secret put BETTER_AUTH_SECRET --env staging
wrangler secret put DATABASE_URL --env staging
```

#### Frontend

```bash
# Vercel
vercel env add VITE_API_URL production

# Netlify
netlify env:set VITE_API_URL https://api.yourdomain.com

# Cloudflare Pages
wrangler pages secret put VITE_API_URL --project-name=Starter Kit
```

### Environment Configuration

#### Development
- Database: Local PostgreSQL or Neon dev instance
- Storage: Local file system or R2 dev bucket
- CORS: `http://localhost:3001`

#### Staging
- Database: Dedicated staging PostgreSQL instance
- Storage: R2 staging bucket
- CORS: `https://staging.yourdomain.com`

#### Production
- Database: Production PostgreSQL instance
- Storage: R2 production bucket
- CORS: `https://yourdomain.com`

## 🔄 Rollback Procedures

### Backend Rollback

```bash
# 1. List recent deployments
wrangler deployments list

# 2. Rollback to previous version
wrangler rollback [deployment-id]

# 3. Verify rollback
curl https://your-worker-url.workers.dev/health
```

### Database Rollback

#### Schema Rollback
```bash
# 1. Revert migration file
git revert [migration-commit]

# 2. Generate new migration
bun run db:generate

# 3. Apply rollback migration
bun run db:push
```

#### Data Rollback
```bash
# 1. Restore from backup
psql $DATABASE_URL < backup_20241201_143022.sql

# 2. Verify data integrity
bun run db:studio
```

### Frontend Rollback

#### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

#### Netlify
```bash
# List deployments
netlify deploy:list

# Rollback
netlify rollback [deployment-id]
```

## 📊 Monitoring and Alerts

### Health Checks

#### Backend Health Endpoint

```typescript
// Add to your server routes
app.get('/health', async (c) => {
  try {
    // Check database connection
    await db.execute(sql`SELECT 1`);
    
    // Check R2 connection
    await TODO_IMAGES.list();
    
    return c.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.VERSION || '1.0.0'
    });
  } catch (error) {
    return c.json({ 
      status: 'unhealthy',
      error: error.message 
    }, 500);
  }
});
```

#### Frontend Health Check

```typescript
// Add to your frontend
const checkHealth = async () => {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    
    if (data.status !== 'healthy') {
      throw new Error('Backend unhealthy');
    }
    
    return true;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};
```

### Monitoring Setup

#### Cloudflare Analytics
- Worker performance metrics
- Request volume and errors
- Geographic distribution
- Response times

#### Database Monitoring
- Connection pool usage
- Query performance
- Storage usage
- Slow query alerts

#### Application Monitoring
- Error tracking (Sentry)
- Performance monitoring
- User experience metrics
- Custom business metrics

### Alert Configuration

#### Critical Alerts
- Database connection failures
- Worker deployment failures
- High error rates (>5%)
- Response time degradation

#### Warning Alerts
- High memory usage
- Database connection pool exhaustion
- Storage quota approaching limits
- Unusual traffic patterns

## 🔒 Security Considerations

### Secrets Management

#### Never Commit Secrets
```bash
# ❌ Wrong - Don't do this
echo "DATABASE_URL=postgresql://..." >> .env
git add .env

# ✅ Correct - Use environment-specific secrets
wrangler secret put DATABASE_URL
```

#### Rotate Secrets Regularly
```bash
# Quarterly secret rotation
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

### Access Control

#### Database Access
- Use connection pooling
- Implement row-level security
- Regular access reviews
- Audit logging

#### API Security
- Rate limiting
- Input validation
- CORS configuration
- Authentication middleware

### Compliance

#### Data Protection
- Encrypt data at rest
- Encrypt data in transit
- Regular security audits
- GDPR compliance (if applicable)

## 📅 Deployment Schedule

### Recommended Schedule

| Day | Time (UTC) | Activity |
|-----|------------|----------|
| Monday | 2-4 AM | Minor updates, bug fixes |
| Wednesday | 2-4 AM | Feature releases |
| Friday | 2-4 AM | Database migrations |
| Weekend | Avoid | Emergency fixes only |

### Maintenance Windows

#### Planned Maintenance
- **Duration**: 30 minutes
- **Notification**: 24 hours in advance
- **Rollback Plan**: Always ready
- **Monitoring**: Enhanced during window

#### Emergency Maintenance
- **Duration**: As needed
- **Notification**: Immediate
- **Impact**: Minimal
- **Communication**: Real-time updates

## 🚨 Emergency Procedures

### Incident Response

#### 1. **Immediate Response**
```bash
# 1. Assess impact
curl https://your-worker-url.workers.dev/health

# 2. Check logs
wrangler tail

# 3. Rollback if necessary
wrangler rollback
```

#### 2. **Communication Plan**
- **Internal**: Slack/Discord notification
- **External**: Status page update
- **Escalation**: On-call engineer contact

#### 3. **Post-Incident**
- Root cause analysis
- Process improvement
- Documentation update
- Team review

### Disaster Recovery

#### Database Recovery
```bash
# 1. Stop application
# 2. Restore from backup
psql $DATABASE_URL < latest_backup.sql

# 3. Verify data integrity
bun run db:studio

# 4. Restart application
wrangler deploy
```

#### Application Recovery
```bash
# 1. Deploy from last known good version
git checkout [last-good-commit]
wrangler deploy

# 2. Verify functionality
curl https://your-worker-url.workers.dev/health

# 3. Monitor for issues
wrangler tail
```

## 📚 Additional Resources

### Documentation
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Neon Database Documentation](https://neon.tech/docs)

### Tools
- **Database**: Neon Console, Drizzle Studio
- **Monitoring**: Cloudflare Analytics, Sentry
- **Deployment**: Wrangler CLI, Vercel CLI
- **Testing**: Playwright, Vitest

### Support Channels
- **Technical Issues**: GitHub Issues
- **Deployment Problems**: Cloudflare Support
- **Database Issues**: Neon Support
- **Frontend Issues**: Vercel/Netlify Support

---

## 📝 Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-01 | 1.0.0 | Initial CI/CD documentation |
| 2024-12-01 | 1.1.0 | Added database migration strategies |
| 2024-12-01 | 1.2.0 | Enhanced rollback procedures |

---

**Last Updated**: December 1, 2024  
**Maintained By**: Development Team  
**Next Review**: January 1, 2025 
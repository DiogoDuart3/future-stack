# Local Development Setup

## Database Setup

### 1. Install PostgreSQL Locally

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**macOS (using Postgres.app):**
- Download from https://postgresapp.com/
- Install and start the app

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE ecomantem;

# Create user (optional)
CREATE USER ecomantem WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE ecomantem TO ecomantem;

# Exit psql
\q
```

### 3. Environment Variables

Create a `.env` file in the `apps/server` directory:

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecomantem
```

### 4. Run Migrations

```bash
cd apps/server
bun run db:generate
bun run db:push
```

### 5. Start Development Server

```bash
bun run dev
```

## Database Management

- **View data:** `bun run db:studio`
- **Generate migrations:** `bun run db:generate`
- **Apply migrations:** `bun run db:push`

## Switching Between Local and Cloud

The database configuration automatically switches based on `NODE_ENV`:
- `NODE_ENV=development` → Uses local PostgreSQL
- `NODE_ENV=production` → Uses Neon (cloud) 
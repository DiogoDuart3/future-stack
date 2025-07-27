# Todos Package Testing Guide

## Quick Start

To test the shared todos functionality between both web apps:

### 1. Start the Server

```bash
# From the root directory
bun run dev:server
```

This starts the server on `http://localhost:3000`

### 2. Start the Main Web App

```bash
# In a new terminal
bun run dev:web
```

This starts the main web app on `http://localhost:3001`

### 3. Start the TanStack Start App

```bash
# In a new terminal, from the root directory
cd apps/web-tanstack-start
bun run dev
```

This starts the TanStack Start app (usually on `http://localhost:3000` or another available port)

## Testing the Shared Package

### What Both Apps Now Share

✅ **ORPC Integration**
- Both apps use ORPC for server communication
- Main web app: Uses typed ORPC client with router types
- TanStack Start app: Uses manual ORPC calls with same endpoints
- Both connect to `/rpc` endpoint on port 3000

✅ **Shared Logic from `@future-stack/todos`**
- Types and validation (Zod schemas)
- File validation (5MB limit, image types)  
- Utility functions for file handling
- Consistent data structures

✅ **Same Server Integration**
- `/rpc` endpoint for todos operations (getAll, toggle, delete)
- `/todos/create-with-image` for multipart file uploads
- Same authentication (cookies with `credentials: include`)
- Same error handling patterns

✅ **Same Features**
- Create todos (with/without images)
- Toggle completion status  
- Delete todos
- View todos with fresh image URLs from R2 storage

### Testing Scenarios

1. **Create a todo in one app** → **Refresh the other app** → Should see the same todo
2. **Upload an image** → Should work in both apps with proper validation
3. **Toggle completion** → Should sync between apps
4. **Delete todos** → Should sync between apps

### Troubleshooting

**If you see connection errors:**
- Make sure the server is running on port 3000
- Check that the `.env` files have `VITE_SERVER_URL=http://localhost:3000`
- Look at the browser developer console for specific error messages

**If images don't work:**
- The server needs proper R2/S3 credentials for image storage
- Check the server logs for upload errors

## Package Structure

```
packages/todos/
├── src/
│   ├── types.ts       # Shared types & Zod schemas
│   ├── utils.ts       # File validation & utilities  
│   ├── storage.ts     # LocalStorage for offline support
│   ├── api.ts         # Server API client
│   ├── hooks.ts       # React Query hooks
│   └── index.ts       # Main exports
```

Both apps import from `@future-stack/todos` and get the same functionality with their own UI implementations.
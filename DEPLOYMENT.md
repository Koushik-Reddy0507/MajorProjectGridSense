# GridSense Deployment Guide

## Frontend Deployment (Vercel)

### Option 1: Deploy via Vercel CLI
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` from the project root
3. Follow the prompts to link your project

### Option 2: Deploy via Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run frontend:build`
   - **Output Directory**: `frontend/dist`
4. Add Environment Variables:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co/rest/v1/
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_API_URL=/api
   ```
5. Deploy!

## Backend Deployment (Render/Railway)

### Deploy to Render
1. Go to https://render.com
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   ```
   SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co/rest/v1/
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   CORS_ORIGINS=https://your-vercel-app.vercel.app
   BACKEND_DEBUG=false
   ```

## Important: Update Backend URL in vercel.json

After deploying your backend, update `vercel.json` with your actual backend URL:

```json
{
  "version": 2,
  "name": "gridsense",
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://YOUR-ACTUAL-BACKEND-URL.onrender.com/api/$1"
    },
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## Local Development

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Start development servers**:
   ```bash
   npm run dev
   ```

3. **Access**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Troubleshooting

### Blank Page Issue
- The `vercel.json` configuration handles SPA routing by redirecting all routes to `index.html`
- Ensure the `rewrites` or `routes` configuration is correct

### CORS Errors
- Add your Vercel domain to `CORS_ORIGINS` in backend environment variables
- Format: `https://your-app.vercel.app`

### API Connection Failed
- Verify the backend URL in `vercel.json` is correct
- Check that the backend is running and accessible
- Ensure environment variables are set correctly
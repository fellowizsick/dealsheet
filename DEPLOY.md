# Deployment Guide

## Option 1: Docker (Local)

```bash
# Set your Gemini key
set GEMINI_API_KEY=AIzaSyCBhIS-Bg5gvSAXvH4zv2l3_Wlsc--fOFA

# Build and run both services
docker-compose up --build
```

Backend: http://localhost:8000  
API docs: http://localhost:8000/docs

## Option 2: Railway (Backend) + Vercel (Frontend)

### Backend → Railway

1. Push repo to GitHub
2. Go to [railway.app](https://railway.app), create new project from repo
3. Root directory: `backend`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add env vars:
   - `GEMINI_API_KEY` = your key
   - `FRONTEND_URL` = your Vercel URL (e.g., https://your-app.vercel.app)
   - `RATE_LIMIT_PER_DAY` = 50

### Frontend → Vercel

1. Import the frontend folder into Vercel
2. Root directory: `frontend`
3. Env var: `NEXT_PUBLIC_API_URL` = your Railway URL (e.g., https://your-app.railway.app)

### Important: CORS

The backend already reads `FRONTEND_URL` from env and locks CORS to that origin.
Make sure this env var matches your Vercel domain exactly.

## Env Vars Summary

| Variable | Where | Example |
|----------|-------|---------|
| `GEMINI_API_KEY` | Backend | `AIzaSy...` |
| `FRONTEND_URL` | Backend | `https://myapp.vercel.app` |
| `RATE_LIMIT_PER_DAY` | Backend | `50` |
| `NEXT_PUBLIC_API_URL` | Frontend | `https://myapp.railway.app` |
| `JWT_SECRET` | Backend (optional) | Auto-generated if not set |

# Toucann Deployment Checklist

## Backend Changes Required

✅ **CORS Configuration**
- The backend already supports CORS configuration via `CORS_ORIGINS` environment variable
- Default includes `http://localhost:3000` for development
- **ACTION:** When deploying frontend, add your production URL to CORS_ORIGINS
  ```env
  CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
  ```

✅ **New Endpoint Added**
- Added `GET /admin/challenges` to list all challenges
- Required for admin dashboard to display challenge list

## Frontend Setup

### Local Development

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_API_BASE=http://localhost:8000
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

   Visit http://localhost:3000

### Production Deployment (Vercel)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com
   - Click "Import Project"
   - Connect your GitHub repository
   - Configure:
     - Framework: Next.js
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Environment Variables:
       - `NEXT_PUBLIC_API_BASE`: Your Railway backend URL (e.g., `https://your-app.up.railway.app`)

3. **Update Backend CORS**
   - In Railway, add your Vercel URL to `CORS_ORIGINS`:
     ```env
     CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
     ```

## Backend Deployment (Railway)

If not already deployed:

1. **Create Railway Project**
   - Go to https://railway.app
   - Create new project from GitHub repo

2. **Add PostgreSQL**
   - Add PostgreSQL service
   - Railway auto-sets `DATABASE_URL`

3. **Set Environment Variables**
   ```env
   SECRET_KEY=<generate-secure-random-string>
   CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
   ```

4. **Deploy**
   - Railway auto-deploys from `backend/` directory
   - Migrations run automatically via Dockerfile

## Testing Checklist

### Backend Health Check
```bash
curl https://your-backend.up.railway.app/health
# Should return: {"status":"healthy","service":"Toucann Backend"}
```

### Frontend Health Check
- Visit https://your-app.vercel.app
- Should see homepage with "Get Started" button

### Authentication Flow
1. Go to `/login`
2. Login with admin credentials
3. Should redirect to `/admin/challenges`
4. Token should be in localStorage

### Admin Flow
1. Visit `/admin/challenges`
2. Click "Create Challenge"
3. Fill form and submit
4. Should see new challenge in list
5. Click "Manage" on challenge
6. Add objectives
7. Link to next challenge

### Student Flow
1. Visit `/student`
2. Should see active challenge
3. Click "Mark Complete" on objective
4. Progress bar should update
5. Complete all objectives
6. Should see "Challenge Complete" message
7. Click "Check for Next Challenge"
8. Should load next linked challenge

## Database Setup

### Promote User to Admin

After deploying, promote a user to admin:

```bash
# Via Railway CLI
railway run psql $DATABASE_URL -c "UPDATE users SET is_admin = true WHERE email = 'admin@example.com';"

# Or via Railway dashboard
# Open PostgreSQL service > Connect > Run query
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```

### Create Test Data

```bash
# Register test users via API
curl -X POST https://your-backend.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'

curl -X POST https://your-backend.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "student123"}'
```

## Common Issues

### CORS Errors
**Problem:** Frontend shows CORS error in console
**Solution:** Add frontend URL to backend `CORS_ORIGINS` environment variable

### 401 Unauthorized
**Problem:** All API requests return 401
**Solution:** Check if logged in, token in localStorage, and backend SECRET_KEY hasn't changed

### Challenges Not Loading
**Problem:** Admin page shows no challenges
**Solution:** Ensure user has `is_admin=true` in database

### Next Challenge Not Appearing
**Problem:** Student completes challenge but no next challenge
**Solution:** Verify challenge link exists in database via `/admin/challenges/[id]` link-next feature

## Environment Variables Summary

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://...
SECRET_KEY=<secure-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
DEBUG=False
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_BASE=https://your-backend.up.railway.app
```

## Security Notes

- ✅ JWT tokens stored in localStorage (consider httpOnly cookies for production)
- ✅ Admin access enforced server-side via `is_admin` flag
- ✅ All admin endpoints require authentication
- ✅ Password hashing via bcrypt
- ⚠️ Use HTTPS in production (both frontend and backend)
- ⚠️ Use strong SECRET_KEY (generate via `openssl rand -hex 32`)
- ⚠️ Restrict CORS_ORIGINS to specific domains in production

## Monitoring

- **Backend Health:** `GET /health`
- **Backend Docs:** `GET /docs` (Swagger UI)
- **Frontend:** Check Vercel dashboard for build logs
- **Backend:** Check Railway dashboard for deployment logs

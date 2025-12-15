# Toucann - Academic Challenge Platform

A full-stack education platform with FastAPI backend and Next.js frontend for managing academic challenges, objectives, and student progress.

## 🚀 Features

### Backend (FastAPI + PostgreSQL)
- JWT-based authentication
- Admin challenge management (CRUD)
- Automatic challenge chaining/progression
- User activity tracking
- RESTful API with Swagger docs
- Alembic database migrations
- Railway-ready deployment

### Frontend (Next.js 14 + TypeScript)
- Modern, card-based dashboard UI
- Admin panel for challenge management
- Student view with real-time progress
- JWT token authentication
- Responsive Tailwind CSS design
- Vercel-ready deployment

## 📁 Project Structure

```
toucann-backend-v2/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── admin/        # Admin routes & schemas
│   │   ├── auth/         # Authentication
│   │   ├── challenges/   # Challenge models & routes
│   │   ├── users/        # User profiles
│   │   └── common/       # Dependencies & utilities
│   ├── alembic/          # Database migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── railway.toml
├── frontend/             # Next.js frontend
│   ├── src/
│   │   ├── app/          # Pages (App Router)
│   │   ├── components/   # React components
│   │   └── lib/          # API client & auth
│   ├── package.json
│   └── tailwind.config.ts
└── DEPLOYMENT_CHECKLIST.md
```

## 🛠️ Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL
- (Optional) Railway account for backend
- (Optional) Vercel account for frontend

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and SECRET_KEY

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

Backend runs at http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_BASE=http://localhost:8000

# Start dev server
npm run dev
```

Frontend runs at http://localhost:3000

## 🔑 Initial Admin Setup

After registering your first user, promote them to admin:

```bash
psql $DATABASE_URL -c "UPDATE users SET is_admin = true WHERE email = 'admin@example.com';"
```

## 📚 API Endpoints

### Authentication
- `POST /auth/register` - Register user
- `POST /auth/login` - Login (returns JWT)
- `GET /auth/me` - Get current user

### Admin (requires `is_admin=true`)
- `GET /admin/challenges` - List all challenges
- `POST /admin/challenges` - Create challenge
- `GET /admin/challenges/{id}` - Get challenge details
- `PUT /admin/challenges/{id}` - Update challenge
- `POST /admin/challenges/{id}/objectives` - Add objective
- `PUT /admin/objectives/{id}` - Update objective
- `POST /admin/challenges/{id}/link-next` - Chain challenges
- `GET /admin/users` - List users
- `GET /admin/users/{id}/activity` - User progress
- `POST /admin/users/{id}/reset-password` - Reset password

### Student
- `GET /me/active-challenge` - Get current challenge
- `POST /me/objectives/{id}/complete` - Complete objective

## 🎯 User Flows

### Admin Flow
1. Login at `/login`
2. Go to `/admin/challenges`
3. Create challenge with title & description
4. Click "Manage" to add objectives
5. Link to next challenge for auto-progression
6. View user activity in admin panel

### Student Flow
1. Login at `/login`
2. Go to `/student`
3. View active challenge with objectives
4. Click "Mark Complete" on objectives
5. Watch progress bar update
6. Complete all objectives → next challenge auto-activates

## 🚢 Deployment

### Backend to Railway

```bash
cd backend
railway init
railway link
railway up
```

Add PostgreSQL service and set `SECRET_KEY` environment variable.

### Frontend to Vercel

```bash
cd frontend
vercel
```

Set `NEXT_PUBLIC_API_BASE` to your Railway backend URL.

### Important: Update CORS

After deploying frontend, add your Vercel URL to backend CORS:

```env
CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for detailed instructions.

## 🧪 Testing

### Test Backend
```bash
# Health check
curl http://localhost:8000/health

# Create user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
```

### Test Frontend
1. Visit http://localhost:3000
2. Click "Login"
3. Enter admin credentials
4. Navigate to Admin → Challenges
5. Create a challenge and objectives
6. Switch to Student view

## 📖 Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

## 🔒 Security

- JWT tokens for authentication
- Server-side admin authorization
- bcrypt password hashing
- CORS protection
- SQL injection prevention via SQLAlchemy
- Environment-based configuration

## 🗄️ Database Schema

### Core Tables
- `users` - Authentication & admin flags
- `profiles` - User profiles with roles
- `challenges` - Academic challenges
- `objectives` - Challenge objectives
- `challenge_links` - Challenge chaining
- `user_challenge_progress` - User progress tracking
- `user_objective_progress` - Objective completion

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test locally
4. Submit PR

## 📝 License

MIT

## 🆘 Troubleshooting

**CORS errors?**
- Add frontend URL to backend `CORS_ORIGINS`

**401 Unauthorized?**
- Check localStorage for token
- Verify user is admin for admin endpoints

**Migrations not working?**
- Check `DATABASE_URL` is correct
- Run `alembic upgrade head`

**Frontend not connecting?**
- Verify `NEXT_PUBLIC_API_BASE` is set
- Check backend is running

For more help, see [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

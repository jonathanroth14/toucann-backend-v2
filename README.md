# Toucann - Academic Challenge Platform

A full-stack education platform with FastAPI backend and Next.js frontend for managing academic challenges, objectives, and student progress.

## 🚀 Features

### Backend (FastAPI + PostgreSQL)
- **Two-tier Learning System**: Goals (long-term arcs) + Challenges (daily tasks)
- JWT-based authentication
- Admin goal and challenge management (CRUD)
- Automatic challenge chaining/progression
- Student "Today's Task" focused UX (one challenge at a time)
- User activity tracking
- RESTful API with Swagger docs
- Alembic database migrations
- Railway-ready deployment

### Frontend (Next.js 14 + TypeScript)
- **Glassmorphism Design**: Blurry blob backgrounds, glass cards, gradient borders
- **Today's Task Spotlight**: Single-focus challenge card to prevent overwhelm
- Horizontal progress tracker with challenge nodes
- Admin panel for goal-challenge hierarchy management
- Student dashboard with Level, Achievements, and Progress stats
- "See Progress" toggle to show/hide full challenge list
- "+ Add Another Task" button for self-directed learning
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
│   │   ├── goals/        # Goal models & routes (NEW)
│   │   ├── students/     # Student dashboard routes (NEW)
│   │   ├── users/        # User profiles
│   │   └── common/       # Dependencies & utilities
│   ├── alembic/          # Database migrations
│   │   └── versions/
│   │       ├── 001_add_challenges.py
│   │       ├── 002_add_goals_system.py
│   │       └── 003_link_challenges_goals.py (NEW)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── railway.toml
├── frontend/             # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   │   └── goals/    # Goals admin UI
│   │   │   ├── student/      # Student dashboard (REDESIGNED)
│   │   │   └── page.tsx
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

### Admin - Goals (requires `is_admin=true`)
- `GET /admin/goals` - List all goals
- `POST /admin/goals` - Create goal
- `GET /admin/goals/{id}` - Get goal with steps
- `PUT /admin/goals/{id}` - Update goal
- `DELETE /admin/goals/{id}` - Delete goal
- `POST /admin/goals/{id}/steps` - Add step to goal
- `POST /admin/goals/{id}/link-next` - Chain goals

### Admin - Challenges (requires `is_admin=true`)
- `GET /admin/challenges` - List all challenges
- `POST /admin/challenges` - Create challenge (with goal_id, next_challenge_id, etc.)
- `GET /admin/challenges/{id}` - Get challenge details
- `PUT /admin/challenges/{id}` - Update challenge (supports goal linking)
- `DELETE /admin/challenges/{id}` - Delete challenge
- `POST /admin/challenges/{id}/objectives` - Add objective
- `PUT /admin/objectives/{id}` - Update objective
- `POST /admin/challenges/{id}/link-next` - Chain challenges (deprecated, use next_challenge_id)

### Admin - Users (requires `is_admin=true`)
- `GET /admin/users` - List users
- `GET /admin/users/{id}/activity` - User progress
- `POST /admin/users/{id}/reset-password` - Reset password

### Student - Today's Task
- `GET /student/today` - Get Today's Task (current challenge with goal context)
- `POST /student/challenges/{id}/complete` - Complete challenge (auto-chains to next)
- `POST /me/objectives/{id}/complete` - Complete objective
- `POST /me/next-challenge` - Request next challenge (for self-directed learning)

### Student - Legacy (still supported)
- `GET /me/active-challenge` - Get current challenge
- `GET /me/active-goal` - Get current goal with steps
- `POST /me/goal-steps/{id}/complete` - Complete goal step

## 🎯 User Flows

### Admin Flow - Goals & Challenges
1. Login at `/login`
2. **Create a Goal** (long-term arc):
   - Go to `/admin/goals`
   - Create goal with title & description (e.g., "Get ready for college")
   - Optionally add steps to the goal
3. **Create Challenges** (daily tasks):
   - Go to `/admin/challenges`
   - Create challenge with:
     - Title & description
     - Link to goal via `goal_id`
     - Set `next_challenge_id` for chaining
     - Set `sort_order` for display order
     - Toggle `visible_to_students`
     - Set points, category, due date
   - Add objectives (required/optional)
4. **Chain Challenges**:
   - Use `next_challenge_id` field OR
   - Use "Link Next Challenge" button
5. View user activity in admin panel

### Student Flow - Today's Task UX
1. Login at `/login`
2. Go to `/student` → See **glassmorphic dashboard**:
   - **Blurry blob background** with animations
   - **Level & Achievements** cards
   - **Today's Task** spotlight card with gradient border
   - ONE challenge at a time (focus, no overwhelm)
3. Complete objectives:
   - Click "Complete" on each objective
   - Watch progress bar fill
4. When all objectives complete:
   - **"+ Add Another Task"** button appears
   - Click to get next challenge
5. **"See Progress"** toggle:
   - Shows horizontal progress tracker
   - All challenges in goal as nodes
   - Current challenge highlighted
6. **Auto-chaining**:
   - When challenge complete → next challenge auto-activates
   - Student sees updated "Today's Task"

### Design Features
- **Glassmorphism**: Glass cards with backdrop blur
- **Blurry blobs**: Animated gradient circles in background
- **Gradient borders**: Animated on Today's Task card
- **Pill badges**: Styled tags for categories
- **Horizontal progress tracker**: Challenge nodes with checkmarks
- **One-focus UX**: Single challenge spotlight to prevent overwhelm

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

### Goals System (Long-term Arcs)
- `goals` - Long-term learning goals
- `goal_steps` - Steps within goals
- `goal_links` - Goal chaining
- `user_goal_progress` - User goal progress
- `user_goal_step_progress` - Step completion

### Challenges System (Daily Tasks)
- `challenges` - Academic challenges
  - Links to `goals` via `goal_id`
  - Links to next challenge via `next_challenge_id`
  - Fields: `sort_order`, `visible_to_students`, `points`, `category`, `due_date`
- `objectives` - Challenge objectives
- `challenge_links` - Challenge chaining (legacy, prefer `next_challenge_id`)
- `user_challenge_progress` - User progress tracking
- `user_objective_progress` - Objective completion

### Key Relationships
- **Goals → Challenges**: One goal has many challenges (`challenges.goal_id → goals.id`)
- **Challenge Chaining**: Simple FK (`challenges.next_challenge_id → challenges.id`)
- **Challenge → Objectives**: One challenge has many objectives
- **User Progress**: Separate progress tracking for goals, challenges, and objectives

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

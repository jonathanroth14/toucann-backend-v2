# Toucann Frontend

Modern Next.js 14 dashboard for the Toucann education platform.

## Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **JWT Authentication** with localStorage
- **Admin Dashboard** for challenge management
- **Student View** for active challenges

## Prerequisites

- Node.js 18+ and npm
- Backend API running (see `../backend/README.md`)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

For production, set to your deployed backend URL (e.g., `https://your-app.up.railway.app`).

### 3. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── challenges/      # Admin challenge management
│   │   │       ├── page.tsx     # List challenges
│   │   │       └── [id]/
│   │   │           └── page.tsx # Challenge detail
│   │   ├── login/
│   │   │   └── page.tsx         # Login page
│   │   ├── student/
│   │   │   └── page.tsx         # Student challenge view
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page
│   │   └── globals.css          # Global styles
│   ├── components/
│   │   └── Navbar.tsx           # Navigation component
│   └── lib/
│       ├── api.ts               # API client functions
│       └── auth.ts              # Auth helpers
├── public/                      # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## Pages

### `/login`
- Email + password authentication
- Stores JWT token in localStorage
- Redirects to admin dashboard on success

### `/admin/challenges`
- Lists all challenges (admin only)
- Create new challenges
- View challenge cards with "Manage" button

### `/admin/challenges/[id]`
- View challenge details
- Add/edit objectives
- Link next challenge for auto-progression

### `/student`
- View active challenge
- Complete objectives
- Auto-progress to next challenge when done
- Real-time progress tracking

## Authentication Flow

1. User logs in at `/login`
2. JWT token stored in `localStorage`
3. Token automatically added to API requests via `Authorization: Bearer <token>`
4. 401 responses clear token and redirect to `/login`

## API Integration

All API calls are in `src/lib/api.ts`:

- `authApi.login(email, password)` - Login
- `authApi.getMe()` - Get current user
- `adminApi.listChallenges()` - List all challenges
- `adminApi.createChallenge(data)` - Create challenge
- `adminApi.createObjective(challengeId, data)` - Add objective
- `adminApi.linkNextChallenge(from, to)` - Chain challenges
- `studentApi.getActiveChallenge()` - Get active challenge
- `studentApi.completeObjective(id)` - Mark objective complete

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variable
vercel env add NEXT_PUBLIC_API_BASE
```

Or connect your GitHub repo to Vercel:
1. Go to https://vercel.com
2. Import your repository
3. Add environment variable `NEXT_PUBLIC_API_BASE`
4. Deploy

## Backend Requirements

Your backend must have:

1. **CORS enabled** for your frontend domain:
   ```python
   CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
   ```

2. **Endpoints** (see backend README):
   - POST /auth/login (form-urlencoded)
   - GET /auth/me
   - GET /admin/challenges
   - POST /admin/challenges
   - GET /admin/challenges/{id}
   - POST /admin/challenges/{id}/objectives
   - POST /admin/challenges/{id}/link-next
   - GET /me/active-challenge
   - POST /me/objectives/{id}/complete

## Development Tips

- Use browser DevTools Network tab to debug API calls
- Check Console for authentication errors
- Token stored in localStorage as `toucann_token`
- All authenticated pages check token on mount

## Build for Production

```bash
npm run build
npm run start
```

## Troubleshooting

**CORS errors?**
- Add your frontend URL to backend `CORS_ORIGINS` env var
- Check backend is running and accessible

**401 Unauthorized?**
- Check token in localStorage (DevTools > Application > Local Storage)
- Try logging in again
- Verify backend SECRET_KEY hasn't changed

**Can't see challenges?**
- Ensure you're logged in as admin (`is_admin=true` in database)
- Check browser console for errors

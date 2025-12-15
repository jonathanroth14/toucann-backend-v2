# Toucann Backend API

FastAPI backend for the Toucann education platform with JWT authentication, PostgreSQL database, and Railway deployment support.

## Features

- **FastAPI** web framework
- **JWT-based authentication** with password hashing
- **PostgreSQL** database with SQLAlchemy ORM
- **Alembic** database migrations
- **Pydantic v2** for data validation
- **Railway-ready** deployment configuration

## Project Structure

```
backend/
├── app/
│   ├── auth/          # Authentication module
│   ├── users/         # User profiles module
│   ├── common/        # Shared dependencies
│   ├── config.py      # Application configuration
│   └── main.py        # FastAPI application entry point
├── alembic/           # Database migrations
├── requirements.txt   # Python dependencies
├── Dockerfile        # Docker configuration
└── railway.toml      # Railway deployment config
```

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key (use a secure random string)

### 3. Run Database Migrations

```bash
alembic upgrade head
```

### 4. Start the Server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get access token
- `GET /auth/me` - Get current user info (requires authentication)

### User Profiles

- `POST /users/profile` - Create user profile
- `GET /users/profile` - Get current user's profile
- `PUT /users/profile` - Update user profile
- `DELETE /users/profile` - Delete user profile

### Challenges (Student-facing)

- `GET /me/active-challenge` - Get current active challenge with objectives and progress
- `POST /me/objectives/{objective_id}/complete` - Mark objective as complete

### Admin (Requires admin access)

**Challenge Management:**
- `POST /admin/challenges` - Create a challenge
- `PUT /admin/challenges/{challenge_id}` - Update a challenge
- `GET /admin/challenges/{challenge_id}` - Get challenge with objectives
- `POST /admin/challenges/{challenge_id}/objectives` - Create objective
- `PUT /admin/objectives/{objective_id}` - Update objective
- `POST /admin/challenges/{challenge_id}/link-next` - Link next challenge

**User Management:**
- `GET /admin/users` - List all users
- `GET /admin/users/{user_id}/activity` - Get user activity and progress
- `POST /admin/users/{user_id}/reset-password` - Reset user password

### General

- `GET /health` - Health check endpoint
- `GET /` - API information
- `GET /docs` - Interactive API documentation (Swagger UI)

## Database Models

### User
- `id` - Primary key
- `email` - User email (unique)
- `password_hash` - Hashed password
- `is_active` - Account status
- `is_admin` - Admin flag
- `created_at` - Account creation timestamp

### Profile
- `id` - Primary key
- `user_id` - Foreign key to User
- `full_name` - User's full name
- `role` - User role (student, guardian, advisor, school_admin)
- `expected_grad_year` - Expected graduation year
- `newsletter_opt_in` - Newsletter subscription preference

### Challenge
- `id` - Primary key
- `title` - Challenge title
- `description` - Challenge description
- `is_active` - Whether challenge is active
- `created_by` - Foreign key to User (admin who created it)
- `created_at` - Creation timestamp

### Objective
- `id` - Primary key
- `challenge_id` - Foreign key to Challenge
- `title` - Objective title
- `description` - Objective description
- `points` - Points awarded for completion
- `sort_order` - Display order
- `is_required` - Whether objective is required to complete challenge

### ChallengeLink
- `id` - Primary key
- `from_challenge_id` - Foreign key to Challenge
- `to_challenge_id` - Foreign key to Challenge (next challenge)
- `condition` - Trigger condition (e.g., "ON_COMPLETE")

### UserChallengeProgress
- `id` - Primary key
- `user_id` - Foreign key to User
- `challenge_id` - Foreign key to Challenge
- `status` - Progress status (NOT_STARTED, IN_PROGRESS, COMPLETE)
- `started_at` - When user started
- `completed_at` - When user completed

### UserObjectiveProgress
- `id` - Primary key
- `user_id` - Foreign key to User
- `objective_id` - Foreign key to Objective
- `status` - Completion status (INCOMPLETE, COMPLETE)
- `completed_at` - When user completed

## Deployment

### Railway

1. Connect your repository to Railway
2. Add a PostgreSQL database service
3. Set environment variables:
   - `DATABASE_URL` (automatically set by Railway)
   - `SECRET_KEY` (generate a secure random string)
4. Deploy!

Railway will automatically:
- Build the Docker image
- Run database migrations
- Start the FastAPI server

## Development

### Creating Database Migrations

After modifying models:

```bash
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

### Promoting a User to Admin

To promote a user to admin, connect to your database and run:

```sql
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```

Or using psql:

```bash
psql $DATABASE_URL -c "UPDATE users SET is_admin = true WHERE email = 'admin@example.com';"
```

### Running Tests

```bash
pytest
```

## Security Notes

- Always use a strong, randomly generated `SECRET_KEY` in production
- Never commit `.env` files to version control
- Use HTTPS in production
- Regularly update dependencies for security patches

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

### Running Tests

```bash
pytest
```

## Security Notes

- Always use a strong, randomly generated `SECRET_KEY` in production
- Never commit `.env` files to version control
- Use HTTPS in production
- Regularly update dependencies for security patches

"""
Common Dependencies
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator, TYPE_CHECKING
from fastapi import Depends, HTTPException, status

from app.config import get_settings

if TYPE_CHECKING:
    from app.auth.models import User

settings = get_settings()

# Create database engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=settings.debug,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency
    Yields a database session and closes it after use
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_current_active_user_dependency():
    """Helper to avoid circular import at module level"""
    from app.auth.utils import get_current_active_user
    return get_current_active_user


async def require_admin(current_user: "User" = Depends(_get_current_active_user_dependency())):
    """
    Dependency to require admin access
    Usage in routes: current_admin = Depends(require_admin)

    This properly uses FastAPI's dependency injection to get the current user
    and validates they have admin privileges.
    """
    from app.auth.models import User

    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

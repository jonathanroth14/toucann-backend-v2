"""
Common Dependencies
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from fastapi import Depends, HTTPException, status

from app.config import get_settings

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


async def require_admin(current_user=Depends(None)):
    """
    Dependency to require admin access
    Usage in routes: current_admin = Depends(require_admin)
    """
    from app.auth.utils import get_current_active_user

    # Get current user if not already provided
    if current_user is None:
        current_user = await get_current_active_user()

    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

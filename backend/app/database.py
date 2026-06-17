from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

# Database setup
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,          # Increase base connections from 5 to 20
    max_overflow=10,       # Allow up to 10 additional burst connections
    pool_timeout=30,       # Max seconds to wait for an available connection
    pool_recycle=1800      # Automatically recycle connections every 30 minutes
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) # Create a session factory that will be used to create database sessions

Base = declarative_base()  #Base class for SQLAlchemy models 

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
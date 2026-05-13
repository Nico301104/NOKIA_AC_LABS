from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Database setup

engine = create_engine(settings.DATABASE_URL) # Create SQLAlchemy engine using the DATABASE_URL from settings
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) # Create a session factory that will be used to create database sessions

Base = declarative_base()  #Base class for SQLAlchemy models 

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .config import settings

# Authentication utilities for password hashing, token creation, and user retrieval

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") # Use bcrypt for password hashing
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") # Look in header for auth token

# Verify the provided password against the stored hashed password
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Hash the password for storage
def get_password_hash(password):
    return pwd_context.hash(password)

# Create a JWT access token
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# Retrieve the current user based on the provided JWT token
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])    # Decode the JWT token using the secret key and algorithm
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Verify that the user exists in the database
    user = db.query(User).filter(User.FullName == username).first()
    if user is None:
        raise credentials_exception
    return user
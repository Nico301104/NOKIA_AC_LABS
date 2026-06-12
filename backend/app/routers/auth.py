from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..models import User
from ..schemas import UserLogin, Token, UserOut
from ..auth import verify_password, create_access_token, get_current_user
from ..config import settings

# Authentication router for handling login and user info retrieval

router = APIRouter(
    prefix="/auth", #All routes in this router will be prefixed with /auth
    tags=["Authentication"] #All routes in this router will be tagged as "Authentication" in Swagger UI
)

# Login endpoint to authenticate users and return JWT tokens
@router.post("/login", response_model=Token) 
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
        
    query = text("""
        SELECT 
            USER_ID as id, 
            FULL_NAME as full_name, 
            EMAIL as email, 
            TEAM as team, 
            HASHED_PASSWORD as hashed_password 
        FROM USERS 
        WHERE RTRIM(FULL_NAME) = :full_name
    """)
    
    result = db.execute(query, {"full_name": user_credentials.FullName})
    user = result.fetchone()
    
    
    if not user or not verify_password(user_credentials.Password, user._mapping["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user._mapping["full_name"]}) # Create a JWT token with the username as the subject (sub) claim

    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60}
  
# Endpoint to get the current logged-in user's information  
@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
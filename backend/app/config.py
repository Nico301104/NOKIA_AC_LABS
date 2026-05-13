import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# Read configuration from environment variables or .env file

class Settings(BaseSettings):
    # --- DATABASE ---
    DATABASE_URL: str
    
    # --- AUTH / SECURITY ---
    SECRET_KEY: str
    ALGORITHM: str 
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # --- CORS / FRONTEND ---
    CORS_ORIGINS: str

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
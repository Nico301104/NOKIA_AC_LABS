from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth
from app.database import engine, Base

Base.metadata.create_all(bind=engine)

# Initialize the FastAPI app
app = FastAPI(
    title="Nokia Ticketing System API",
    version="1.0.0"
)

app.include_router(auth.router)

# CORS Middleware Configuration
origins = settings.CORS_ORIGINS.split(",") 
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True, 
    allow_methods=["*"],  # Permit all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Permit all headers (Authorization, Content-Type, etc.)
)

# Endpoint Test 
@app.get("/", tags=["Health Check"])
def health_check():
    return {
        "status": "online", 
        "message": "App is running successfully!"
    }
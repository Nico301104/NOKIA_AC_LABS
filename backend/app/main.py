from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import auth, tickets, users, kpi, chat
from .database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nokia Ticketing System API",
    version="1.0.0"
)

origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(users.router)
app.include_router(kpi.router)
app.include_router(chat.router)

# Endpoint Test 
@app.get("/", tags=["Health Check"])
def health_check():
    return {
        "status": "online", 
        "message": "App is running successfully!"
    }
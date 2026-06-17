from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Ticketing App API")

router = APIRouter()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
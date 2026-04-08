from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.db.connection import init_db
from app.exports.router import router as exports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Ensure upload and output directories exist (absolute paths)
    _backend = Path(__file__).resolve().parents[1]
    (_backend / "uploads").mkdir(parents=True, exist_ok=True)
    (_backend / "outputs").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="Wave Audio Animation API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(exports_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}

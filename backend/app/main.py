from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.routers import games
from app.routers import admin
from app.routers import users
from app.database import init_db
from app.leaderboard_triggers import setup_leaderboard_triggers

app = FastAPI(
    title="HTML5 Game Platform API",
    description="Modular and scalable game platform backend",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# Initialize leaderboard triggers
setup_leaderboard_triggers()

# Include routers
app.include_router(games.router, prefix="/games", tags=["games"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(users.router, prefix="/users", tags=["users"])

# Static files serving
static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# SDK files serving
sdk_path = Path(__file__).parent.parent.parent / "sdk"
if sdk_path.exists():
    app.mount("/sdk", StaticFiles(directory=str(sdk_path)), name="sdk")

# Game files serving
games_path = Path(__file__).parent / "games"
games_path.mkdir(exist_ok=True)
app.mount("/games", StaticFiles(directory=str(games_path), html=True), name="games")

# Frontend files serving
frontend_path = Path(__file__).parent.parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

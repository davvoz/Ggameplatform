from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.routers import games
from app.database import init_db

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

# Include routers
app.include_router(games.router, prefix="/games", tags=["games"])

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

@app.get("/")
async def root():
    return {
        "message": "HTML5 Game Platform API",
        "version": "1.0.0",
        "endpoints": {
            "games": "/games",
            "docs": "/docs",
            "static": "/static",
            "game_files": "/games"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

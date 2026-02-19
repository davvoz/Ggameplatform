from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.routers import games
from app.routers import admin
from app.routers import users
from app.routers import quests
from app.routers import game_statuses
from app.routers import coins
from app.routers import levels
from app.routers import leaderboard
from app.routers import steem_posts
from app.routers import platform
from app.routers import community
from app.routers import community_stats
from app.routers import push_notifications
from app.routers import campaigns
from app.games.rainbow_rush_be.router import router as rainbow_rush_router
from app.games.briscola_be.router import router as briscola_router
from app.database import init_db
from app.leaderboard_triggers import setup_leaderboard_triggers
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import mimetypes
import time
import os
import logging
from dotenv import load_dotenv

# Register WebP MIME type (not recognized by default on Windows)
mimetypes.add_type('image/webp', '.webp')

# Load environment variables from .env file
load_dotenv()

# Configure logging with timestamp
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

class NoCacheMiddleware(BaseHTTPMiddleware):
    """Middleware to prevent caching of HTML, CSS, and JS files"""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Apply no-cache headers to HTML, CSS, JS files
        if any(request.url.path.endswith(ext) for ext in ['.html', '.css', '.js']):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            response.headers['X-Version'] = str(int(time.time()))
        
        return response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers"""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        # X-Frame-Options: DENY for admin/auth, permissive solo per /games/*
        if request.url.path.startswith('/games/'):
            # Allow iframe embedding for games
            pass
        else:
            # Block clickjacking on admin/auth endpoints
            response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Content Security Policy - permissive for Swagger UI and games
        if request.url.path in ['/docs', '/openapi.json']:
            # Allow CDN resources for Swagger UI
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https:; "
                "connect-src 'self'; "
                "font-src 'self' data:;"
            )
        elif request.url.path.startswith('/games/'):
            # Very permissive CSP for game iframes - allow CDN scripts, source maps, and WebSocket
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://esm.sh https:; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https:; "
                "img-src 'self' data: https: http:; "
                "connect-src 'self' ws: wss: https://esm.sh http://localhost:3000 http://localhost:8000; "
                "frame-src 'self'; "
                "font-src 'self' data:; "
                "media-src 'self' data: blob:;"
            )
        else:
            # Default CSP for other endpoints (permissive for games with CDN libraries)
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https:; "
                "connect-src 'self' ws: wss: https://esm.sh https://api.steemit.com https://sds.steemworld.org; "
                "frame-src 'self'; "
                "font-src 'self' data:;"
            )
        response.headers['Content-Security-Policy'] = csp
        
        return response

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="HTML5 Game Platform API",
    description="Modular and scalable game platform backend",
    version="1.0.0"
)

# Add rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add security middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(NoCacheMiddleware)

# CORS configuration - Use environment variable for allowed origins
allowed_origins_str = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000"
)
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

# Check if we should allow all origins (for LAN access)
allow_all_origins = os.getenv("ALLOW_ALL_ORIGINS", "false").lower() == "true"

if allow_all_origins:
    # More permissive CORS for LAN access
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"http://.*",  # Allow any HTTP origin on LAN
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Cache-Control", "Pragma"],
    )
    print("⚠️  CORS: Allowing all HTTP origins (LAN mode)")
else:
    # Strict CORS for production
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Cache-Control", "Pragma"],
    )
    print(f"🔒 CORS: Allowing specific origins: {allowed_origins}")

# Initialize database
init_db()

# Initialize leaderboard triggers
setup_leaderboard_triggers()

# Include routers
app.include_router(games.router, prefix="/games", tags=["games"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(quests.router, prefix="/quests", tags=["quests"])
app.include_router(game_statuses.router, prefix="/game-statuses", tags=["game-statuses"])
app.include_router(coins.router, tags=["coins"])
app.include_router(levels.router, tags=["levels"])
app.include_router(leaderboard.router, tags=["leaderboard"])
app.include_router(steem_posts.router, tags=["steem-posts"])
app.include_router(platform.router, prefix="/api/platform", tags=["platform"])
app.include_router(community.router, tags=["community"])
app.include_router(community.rest_router, tags=["community-api"])
app.include_router(community_stats.router, tags=["community-stats"])
app.include_router(rainbow_rush_router, prefix="/api", tags=["Rainbow Rush API"])
app.include_router(briscola_router, tags=["Briscola Multiplayer"])
app.include_router(push_notifications.router, tags=["push-notifications"])
app.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])

# Scheduler startup/shutdown events
@app.on_event("startup")
async def startup_schedulers():
    """Start schedulers on application startup."""
    from app.weekly_scheduler import start_scheduler
    from app.multiplier_scheduler import start_scheduler as start_multiplier_scheduler
    from app.daily_quest_scheduler import start_daily_quest_scheduler
    from app.telegram_notifier import send_telegram_info
    
    start_scheduler()
    print("✅ Weekly leaderboard scheduler started")
    
    start_multiplier_scheduler()
    print("✅ Multiplier scheduler started")
    
    start_daily_quest_scheduler()
    print("✅ Daily quest reset scheduler started")
    
    # Send startup notification
    send_telegram_info(
        "Platform Startup",
        "Game platform backend has started successfully. All schedulers are running."
    )

@app.on_event("shutdown")
async def shutdown_schedulers():
    """Stop schedulers on application shutdown."""
    from app.weekly_scheduler import stop_scheduler
    from app.multiplier_scheduler import stop_scheduler as stop_multiplier_scheduler
    from app.daily_quest_scheduler import stop_daily_quest_scheduler
    from app.telegram_notifier import send_telegram_warning
    
    stop_scheduler()
    print("🛑 Weekly leaderboard scheduler stopped")
    
    stop_multiplier_scheduler()
    print("🛑 Multiplier scheduler stopped")
    
    stop_daily_quest_scheduler()
    print("🛑 Daily quest reset scheduler stopped")
    
    # Send shutdown notification
    send_telegram_warning(
        "Platform Shutdown",
        "Game platform backend is shutting down. All schedulers have been stopped."
    )

# Static files serving
static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# SDK files serving - now in backend/sdk/
sdk_path = Path(__file__).parent.parent / "sdk"  # /app/sdk in Docker
if sdk_path.exists():
    app.mount("/sdk", StaticFiles(directory=str(sdk_path)), name="sdk")
    print(f"✅ SDK mounted at /sdk from {sdk_path}")
else:
    print(f"⚠️ SDK directory not found at {sdk_path}")

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

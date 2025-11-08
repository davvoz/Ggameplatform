# Game Platform Backend

FastAPI-based backend for the HTML5 game platform.

## Features

- RESTful API for game management
- SQLite database for game metadata
- Static file serving for games and assets
- CORS enabled for frontend integration
- Pydantic validation for all inputs
- Production-ready architecture

## Installation

```bash
pip install -r requirements.txt
```

## Running the Server

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Games

- `POST /games/register` - Register a new game
- `GET /games/list` - List all games (with optional filters)
- `GET /games/{gameId}/metadata` - Get game metadata
- `PUT /games/{gameId}` - Update game metadata
- `DELETE /games/{gameId}` - Delete a game

### Static Files

- `/static/*` - Static assets (thumbnails, icons, etc.)
- `/games/{gameId}/*` - Game files (HTML, JS, assets)

### System

- `GET /` - API information
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database operations
│   ├── models.py            # Data models
│   ├── schemas.py           # Pydantic schemas
│   ├── routers/
│   │   ├── __init__.py
│   │   └── games.py         # Game endpoints
│   ├── static/              # Static files
│   └── games/               # Game directories
├── requirements.txt
└── README.md
```

## Database Schema

Games table:
- `game_id` (TEXT, PRIMARY KEY)
- `title` (TEXT, NOT NULL)
- `description` (TEXT)
- `author` (TEXT)
- `version` (TEXT)
- `thumbnail` (TEXT)
- `entry_point` (TEXT, NOT NULL)
- `category` (TEXT)
- `tags` (TEXT, JSON array)
- `created_at` (TEXT, ISO timestamp)
- `updated_at` (TEXT, ISO timestamp)
- `metadata` (TEXT, JSON object)

## Example Game Registration

```json
{
  "gameId": "space-shooter-v1",
  "title": "Space Shooter",
  "description": "An exciting space shooting game",
  "author": "Game Studio",
  "version": "1.0.0",
  "thumbnail": "/static/thumbnails/space-shooter.png",
  "entryPoint": "index.html",
  "category": "action",
  "tags": ["space", "shooter", "arcade"],
  "metadata": {
    "minPlayers": 1,
    "maxPlayers": 1,
    "difficulty": "medium",
    "rating": 4.5,
    "featured": true
  }
}
```

# HTML5 Game Platform

A complete, modular, and scalable platform for hosting and playing HTML5 games with secure iframe isolation and real-time bidirectional communication.

## 🎮 Features

- **Game Catalog** - Browse games with filtering and search
- **Secure Player** - Sandboxed iframe execution
- **Real-time Communication** - postMessage-based protocol
- **Framework Agnostic** - Works with Phaser, Unity, Godot, Three.js, etc.
- **Mobile First** - Responsive design for all devices
- **RESTful API** - Complete backend for game management
- **Developer SDK** - Easy integration for game developers

## 🚀 Quick Start

### Option 1: Automated Start (Windows)

```batch
start.bat
```

This will automatically:
- Set up the Python environment
- Install dependencies
- Start backend and frontend servers
- Open the platform in your browser

### Option 2: Manual Start

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Visit: http://localhost:8000/docs

**Frontend:**
```bash
cd frontend
python -m http.server 3000
```

Visit: http://localhost:3000

### Try the Sample Game

1. Start the platform: `start.bat`
2. Register the sample game: `register_game.bat`
3. Play at: http://localhost:3000/#/play/space-clicker

### Integrate Your Own Game

```html
<script src="../../sdk/platformsdk.obf.js"></script>
<script>
  PlatformSDK.init().then(() => {
    PlatformSDK.sendScore(100);
    PlatformSDK.on('pause', () => game.pause());
  });
</script>
```

## 📁 Project Structure

```
├── backend/        # FastAPI backend
├── frontend/       # Vanilla JS frontend  
├── sdk/            # Game integration SDK
└── protocol.json   # Communication protocol
```

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for complete documentation.

## 🛠️ Technology Stack

- **Backend:** Python, FastAPI, SQLite
- **Frontend:** Vanilla JS, HTML5, CSS3
- **SDK:** JavaScript (ES6+), UMD
- **Protocol:** postMessage API

## 📖 Documentation

- [Complete Project Structure](PROJECT_STRUCTURE.md)
- [Backend Documentation](backend/README.md)
- [SDK Documentation](sdk/README.md)
- [Protocol Specification](protocol.json)

## 🎯 API Endpoints

- `POST /games/register` - Register a new game
- `GET /games/list` - List all games
- `GET /games/{gameId}/metadata` - Get game details

Full API docs at: http://localhost:8000/docs

## 🔐 Security

- Iframe sandboxing with restricted permissions
- Origin validation on all messages
- Input validation with Pydantic
- CORS protection

## 📦 Components

### Backend
Production-ready FastAPI server with SQLite database, Pydantic validation, and static file serving.

### Frontend
Mobile-first single-page application with catalog, detail pages, and fullscreen game player.

### Runtime Shell
Manages iframe communication, event handling, and state management between platform and games.

### SDK
Framework-agnostic library for game developers with TypeScript support and comprehensive documentation.

## 🎮 Sample Game Integration

Check the SDK documentation for examples with:
- Phaser 3
- Unity WebGL
- Three.js
- Vanilla JavaScript

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for architecture details.

---

**Version:** 1.0.0  
**Created:** November 8, 2025

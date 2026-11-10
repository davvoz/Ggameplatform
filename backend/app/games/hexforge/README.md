# Hexforge — phase 1: battle prototype

City-building and hero-squad game with asynchronous PvP. Design doc: Claude Docs
"Hexforge — Game Design Document".

Phase 1 answers one question: **is watching an attack fun, and do the choices
before it matter?** The player picks a squad of 4 heroes (3 classes), the entry
side, a priority target and a tactic; the server simulates the attack on a
hand-built test city and the client plays the replay.

Nothing is stored yet, the game is not registered on the platform and gives no XP.

## Layout

| Path | What |
| --- | --- |
| `backend/app/games/hexforge_be/simulation.py` | Deterministic battle simulation (10 ticks/s, max 90 s) |
| `backend/app/games/hexforge_be/pathfinding.py` | A* on the grid; walls are passable at a cost (heroes break them) |
| `backend/app/games/hexforge_be/catalog.py` | Hero and building stats — the balancing knobs |
| `backend/app/games/hexforge_be/demo_city.py` | The test city |
| `backend/app/games/hexforge_be/router.py` | `GET /api/hexforge/city/demo`, `POST /api/hexforge/battle` |
| `js/replay.js` | Rebuilds the battlefield at any moment from the battle log (no simulation in the client) |
| `js/render.js` | Isometric canvas renderer, placeholder shapes |
| `js/main.js` | Setup panel, replay controls, report |

## Run

Start the backend (`start.bat`, or `uvicorn app.main:app --port 8000` from `backend/`),
then open `http://localhost:8000/games/hexforge/index.html`.

Dev helper for screenshots: `?at=20` launches the saved attack and freezes the
replay at second 20; `?at=end` opens the report.

## Tests

```bash
# backend: simulation, rules, API
cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .

# frontend: projection and replay
cd backend/app/games/hexforge && npm test
```

### Test fixture

`tests/fixtures/battle.json` is a real battle from the server. After changing the
simulation, regenerate it from `backend/`:

```bash
python -c "import json; from app.games.hexforge_be.simulation import simulate; from app.games.hexforge_be.demo_city import demo_city; c = demo_city(); b = simulate(c, ['guardian','neon_blade','neon_blade','technomancer'], 'south', 'production', 'spread'); b['city'] = c; json.dump(b, open('app/games/hexforge/tests/fixtures/battle.json', 'w'), separators=(',', ':'))"
```

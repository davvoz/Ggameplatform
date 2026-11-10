# Hexforge — phase 1: battle prototype

City-building and hero-squad game with asynchronous PvP. Design doc: Claude Docs
"Hexforge — Game Design Document".

Phase 1 answers one question: **is watching an attack fun, and do the choices
before it matter?** The player picks a squad of 4 heroes (3 classes), the entry
side, a priority target and a tactic; the server simulates the attack on a
hand-built test city and the client plays the replay.

The game is not registered on the platform yet and gives no XP.

## Phase 2 (in progress): your own city

Step 1 (done, API only): every signed-in player gets a saved starter city,
4 heroes and materials. Production buildings fill up over time (lazily, up
to 8 hours) and are emptied with `collect`. The `/me` routes need the
platform session cookie (`session_token`).

| Route | What |
| --- | --- |
| `GET /api/hexforge/me` | Your state, created on the first visit |
| `POST /api/hexforge/me/collect` | `{building_ids?}` — collect production |
| `POST /api/hexforge/me/buildings/{id}/move` | `{x, y}` — 400 `occupied` / `outside_city` if illegal |

A save that loses a race with another request answers 409 `state_changed_retry`
and changes nothing.

Step 2 (done): the game opens on **My city**. Production buildings show a
bubble with what they hold; tapping one collects it, **Collect all** empties
them all. Selecting a building shows its details; **Move** previews the
footprint under the pointer (green fits, red does not) and a tap moves it.
Signed-out players see a notice and can still use **Test battle**.

| Path | What |
| --- | --- |
| `js/main.js` | Shell: tabs, input routing, frame loop |
| `js/city.js` | My city: collect, select, move |
| `js/battle.js` | Test battle: setup, replay, report |
| `js/cityRules.js` | Client copy of the placement rules (preview only; the server decides) |

Next steps: the forge, computer cities with loot.

## Layout

| Path | What |
| --- | --- |
| `backend/app/games/hexforge_be/simulation.py` | Deterministic battle simulation (10 ticks/s, max 90 s) |
| `backend/app/games/hexforge_be/pathfinding.py` | A* on the grid; walls are passable at a cost (heroes break them) |
| `backend/app/games/hexforge_be/catalog.py` | Hero and building stats — the balancing knobs |
| `backend/app/games/hexforge_be/demo_city.py` | The test city |
| `backend/app/games/hexforge_be/router.py` | `GET /api/hexforge/city/demo`, `POST /api/hexforge/battle`, and the `/me` routes below |
| `backend/app/games/hexforge_be/economy.py` | Materials, lazy production (capped at 8 h), starter city, placement rules |
| `backend/app/games/hexforge_be/player_service.py` | Load/save a player's state with a version check; collect, move |
| `backend/app/games/hexforge_be/models.py` | `hexforge_players`: one row per player, city/heroes/materials as JSON |
| `js/replay.js` | Rebuilds the battlefield at any moment from the battle log (no simulation in the client) |
| `js/render.js` | Isometric canvas renderer, placeholder shapes |
| `js/battle.js` | Setup panel, replay controls, report |

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

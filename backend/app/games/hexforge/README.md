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

Step 3 (done): **the forge**. Fixed recipes (`hexforge_be/forge.py`): exact
cost, exact time, no randomness. Two jobs run at once; a finished job is
claimed with a tap. Forged buildings go to **storage** and are placed from
there (same green/red preview); forged heroes join the roster. Ownership is
capped per group (8 towers, 6 traps, 60 walls, 2 of each producer, 8 heroes),
counting placed + stored + being forged. **Dismantle** (with a confirm that
shows the refund) gives back half the recipe; the core and the vault stay.
Forge and storage live inside the city JSON, so cities saved before step 3
load unchanged.

| Route | What |
| --- | --- |
| `POST /api/hexforge/me/forge` | `{recipe}` — 400 `forge_busy` / `limit_reached` / `not_enough_materials` |
| `POST /api/hexforge/me/forge/{job}/claim` | 400 `not_ready` before its time |
| `POST /api/hexforge/me/place` | `{type, x, y}` — from storage |
| `POST /api/hexforge/me/buildings/{id}/dismantle` | refund half; 400 `cannot_dismantle` for core/vault |

Step 4 (done): **outposts**. The second tab is now **Attack**: five
hand-built computer cities (`hexforge_be/outposts.py`) of rising difficulty —
with the starter squad over all 36 side/priority/tactic combinations, the win
rate goes 100 % → 94 % → 83 % → 69 % → 39 %, and a test keeps it rising. The
first is open; each first victory opens the next. A win takes 20 % of the
outpost's treasury (30 % if the core falls); an outpost already cleared pays
half. Each attack costs 1 energy (5 max, +1 per hour, lazy like production).
The squad is 4 heroes from your roster; heroes who fall are injured for
15 minutes. Campaign and energy live inside the city JSON.

| Route | What |
| --- | --- |
| `GET /api/hexforge/me/outposts` | Outposts with layout, status and loot preview, plus your state |
| `POST /api/hexforge/me/outposts/{id}/attack` | `{hero_ids[4], side, priority, tactic}` — replay + rewards; 400 `no_energy` / `hero_injured` / `outpost_locked` / `bad_squad` |

The old test battle (`/api/hexforge/battle` on the test city) remains only for
the `?at=` screenshot helper.

Phase 2 is complete.

## Phase 3 (in progress): PvP between players

Step 1 (done): **get the city ready to defend** (`hexforge_be/defense.py`).
Every tower has an **aim**: *Closest* (default), *Weakest* (finishes off the
hero with the least health) or *Back line* (ranged heroes first). A Guardian
close to the tower still draws its fire whatever the aim. In **My city**,
**Test my defenses** throws four standard squads at the city from every side
with every priority and tactic (144 raids, about a second on the server) and
reports how many it holds, per squad and per side, with the replay of the
worst raid. The test is read-only and free; it is deterministic, so a better
score always means a better city.

| Route | What |
| --- | --- |
| `POST /api/hexforge/me/buildings/{id}/aim` | `{aim}` — 400 `not_a_tower` for anything but a tower |
| `POST /api/hexforge/me/defense/test` | the report, `worst` carries the replay (limit 20/min) |

Step 2 (done): **attack other players** (`hexforge_be/pvp.py`). The Attack
tab has two targets, **Outposts** and **Rivals**. The arena opens when you
clear the first outpost; until then you cannot attack players and nobody can
attack you. **Find a rival** picks one of the 5 attackable players nearest in
strength (towers and traps); asking again picks another. The attacker sees
the rival's layout without traps and without tower aims, and the loot at
stake. A raid costs 1 energy; a win takes 20 % (30 % if the core falls) of
what lies above the vault's protection (400 of each material) — the rival
loses exactly what you take. The rival then gets a 3-hour shield; attacking a
player ends your own shield. Both players are saved in one transaction with
a version check each, and every raid is logged in `hexforge_attacks` with
its inputs, so its replay can be rebuilt later (the battle is deterministic).

| Route | What |
| --- | --- |
| `POST /api/hexforge/me/rivals/find` | scout a rival; `rival` is null when nobody can be attacked; 400 `arena_locked` |
| `POST /api/hexforge/me/rivals/attack` | `{hero_ids[4], side, priority, tactic}` — 400 `no_rival` / `rival_unavailable` / `no_energy` / `hero_injured` |

`GET /api/hexforge/me/outposts` also returns the scouted `rival` and every
state now carries `pvp: {arena, shield_until}`.

Next: trophies and the in-game leaderboard.

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

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
rate goes 100 % → 89 % → 81 % → 64 % → 19 %, and a test keeps it rising. The
first is open; each first victory opens the next. **Only bringing down the
core wins** (the owner's rule: no victory with a city still standing); a win
takes 30 % of the outpost's treasury, a defeat nothing; an outpost already
cleared pays half. Each attack costs 1 energy (5 max, +1 per hour, lazy like production).
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
clear the first outpost; until then you cannot attack players. Anyone can be
attacked from the start, guests too, unless their shield is up (a city needs
a tower to be raided). **Find a rival** picks one of the 5 attackable players nearest in
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

Step 3 (done): **trophies and the ranking**. Trophies are the PvP score and
never reset (a `trophies` column on `hexforge_players`, added to older
databases by `_migrate_hexforge_trophies` in `app/database.py`). A won raid
takes 30 trophies from the rival, a lost one hands them 20; every 25 trophies
of difference move both by 1 (win 5–50, loss 5–40), so beating a stronger
rival pays more. Nobody goes below 0. The scout now matches by trophies
first, then strength. The rival card shows their trophies, league and what
the raid is worth; the report shows the change. Leagues: Bronze 0, Silver
200, Gold 500, Neon 1000, Mythic 2000. The new **Ranking** tab shows your
trophies, league, rank and the top 50 (players with at least 1 trophy).

| Route | What |
| --- | --- |
| `GET /api/hexforge/me/leaderboard` | `{top: [{rank, name, trophies, league, me}], me: {trophies, rank, league, next_league}}` |

Step 4 (done): **raids on your city**. My city lists the latest 20 raids
(who, when, breached or held, what they took, trophies lost or won). Raids
you have not read light up the My city tab with a badge and a banner;
**Got it** marks them read. **Watch** rebuilds the replay from the logged
inputs (the battle is deterministic, so nothing heavy is stored).
**Revenge**, for a day after a raid and while the raider can be attacked,
scouts the raider directly and opens Attack → Rivals on them. The current
shield is shown above the list. New columns on `hexforge_attacks`
(`defender_trophies`, `seen`) are added by the same startup migration.

| Route | What |
| --- | --- |
| `GET /api/hexforge/me/defenses` | `{raids: [...], unseen}` |
| `POST /api/hexforge/me/defenses/seen` | mark every raid as read |
| `GET /api/hexforge/me/defenses/{id}/replay` | the rebuilt replay; 400 `unknown_raid` if it was not on you |
| `POST /api/hexforge/me/defenses/{id}/revenge` | scout the raider; 400 `revenge_unavailable` |

Phase 3 PvP is complete.

## Phase 4 (in progress): a real game

Art direction chosen by the owner: **Forgia Infernale** (iron, basalt, molten
metal, embers), over Neon Arcano and Ologramma Tattico. Step 1 (done): the
city and the battles are drawn in it (`js/forgeArt.js`): a basalt plain, the core as a great forge with a molten pool, gothic
towers with braziers (amber fire, copper horns with arcs, ice crystals), each
producer with its material's glow, armoured heroes with a class-coloured ring
at their feet, fireballs, lightning, frost bursts, explosions and embers.
Towers now report their `range`: a selected tower shows its reach in My
city, and the Attack setup shows every enemy tower's reach. The panel takes
the same palette.

Step 2 (done): **the interface**, made to feel like a mobile city-builder
(the owner turned down a first side-panel version as "too much like a
management tool"). The map fills the screen and can be dragged, pinched or
wheel-zoomed (`js/camera.js`); it opens framed on the city, a little wider
than a tall phone so buildings read well. Over it float the player plate
(name, trophies, league bar; tap for the ranking), the material pills, a big
molten **Attack** button and round **Defense** and **Forge** buttons with
badges. Tapping a building shows its name and round actions (Move, Aim,
Dismantle) and slides the map so it stays in sight. Forge, Defense and
Ranking are sheets rising from the bottom (a side panel on wide screens,
`js/sheets.js`): the forge is a grid of picture cards; a claimed building
goes straight to placing. The attack plan shows the target full screen with
arrows on the map edges for the entry side, a hero card per class (tap to
add, − to remove), one-tap choices for target and formation and a Fight!
button; the battle has portraits with health bars; the result is a big
verdict with the destruction ring and the loot. Grenze Gotisch for names,
Chakra Petch for numbers (Google Fonts); icons are an inline SVG sprite.
`GET /me` now also returns the player's display name, and `pvp.next_league`.
`?debug` exposes the renderer as `globalThis.hexforge` for automated
screenshots.

Heroes, redone: each is drawn in profile with a pose (`drawHero` in
`js/forgeArt.js`): walking legs, the Guardian's overhead hammer smash behind
a tower shield, the Neon Blade's twin dagger cuts with a glowing arc and a
front flip over walls, the Technomancer's floating robe, staff and charged
orb that throws a bolt. Blows are wound up before they land and followed
through after (`poseOfBlow` in `js/replay.js`); heroes flash when hit,
topple when downed, face their target, and are nudged apart so they never
stand inside each other (drawing only). On the server the Neon Blade now
really **leaps**: a `leap` event (from, to, until) carries it over the walls
in one arc, and no hero ever stops on top of a standing wall.

The squad is picked hero by hero (`js/heroTiles.js`): each hero has its own
tile and name (Blade 1, Blade 2…) and shows whether it is ready, in the
squad (lit, with a check) or hurt (greyed, a red cross, the time left and a
ring that fills as it heals). Tapping a hurt hero or a full squad says why
nothing happened. The forge's Heroes tab shows the same tiles.

Animations (`js/fx.js`): collecting makes the material's gems burst out of
the building and fly into their counter at the top, which bumps and counts
up as they land; tapping a recipe sends its picture flying into the forge
slot; claiming pops a "forged!" card with spinning rays (tap to skip), then
a building goes straight to placing. Reduced motion skips the trips.

The result waits for the last heroes to finish falling, and a defeat says
the core still stands.

Sound (`js/audio.js`), all synthesised with Web Audio, no files: button
clicks, sheets opening, the forge's anvil, collect chimes and one note per
gem landing, the claim fanfare, placing and dismantling; in battle every
log event has its sound (hammer, daggers, mage bolt, nova, leap, fireball,
lightning, frost, trap, a building collapsing, a hero falling), the war horn
on Fight!, a victory fanfare or a defeat lament. A low forge drone plays in
the city; war drums only while a battle plays. Levels were balanced by
rendering each sound offline and measuring it. Sound starts on the first
finished tap (phones only allow that), pauses with the tab hidden, and the
speaker button mutes it and remembers the choice.

Every building and hero says what it is for in one short line
(`what` in `js/labels.js`): on the forge cards, under the name of a tapped
building, and in a toast when a hero joins the squad. Hero tiles also carry
a one- or two-word job (Tank, Leaps walls, Ranged).

The city view turns a quarter at a time (the round button under the
speaker), so buildings hidden behind others come to the front; the turn is
remembered on the device. The world never turns: the renderer lays
everything out in turned "view" coordinates (`rotatePoint`, `rotateRect`,
`rotateVector` in `js/iso.js`) and draws the art there unturned, and taps
are turned back to world cells. Attacks and replays are always seen unturned.

## Phase 5 (in progress): progression

Cities grow stronger over time, so the player and the heroes must grow too.
Planned steps: (1) player level, (2) speed-up bonuses with daily and weekly
rewards, (3) hero evolution, (4) craftable hero items, (5) the Explorer.

Step 1, the player's level (`hexforge_be/progress.py`): playing earns XP:
collecting (1 per 25 units), forging (about 1 per minute of the job),
attacking (outpost 40 for a win / 15 for a loss, players 50 / 20). Level 1
needs 100 XP, each next level 50 more. Each level adds one hero slot (8 at
level 1) and a gift of materials; level 5 also opens a third forge slot.
Progress lives in `city["progress"]` (`granted` = last level whose gift was
handed out, so gifts are never doubled). In the city the shield shows the
level with the XP bar under the name; every gain shows "+N XP", and a new
level pops a card with its gifts and a fanfare. The battle result shows
the XP earned and a reached level.

Step 2, bonuses and rewards (`hexforge_be/rewards.py`, `js/rewardsPanel.js`,
`js/bonusPicker.js`). Bonuses stay in an inventory until used: Hourglass
(−15 min) and Golden hourglass (−1 h) on a forge job, a hurt hero or the
energy; Healing salve heals a hero at once; Energy flask gives a charge (never
above the maximum). The Rewards button (badge = what waits to be claimed)
opens a sheet with:
- a 7-day calendar: one gift a day, growing, day 7 the biggest; a missed day
  loses nothing, the next visit claims the next day; then it starts again
- 3 daily tasks picked from a pool (the same all day for a player: collect,
  forge, claim, attack, win...), each paying XP and a bonus once claimed
- a weekly chest that opens after 12 claimed tasks in the week
- the bonus inventory.
Days and weeks are UTC, weeks start on Monday. A running forge job shows
"Speed up"; in the attack plan a hurt hero and the energy pill open the same
bonus picker. Rewards pop a card with what was won (then a level-up card if
their XP reached one).

Step 3, hero evolution (`hexforge_be/evolution.py`, `js/heroPanel.js`).
Every hero who fights earns its own XP (10, +1 per 100 damage up to 30, +5
if it survived, +10 for a victory). At 150 XP it can evolve into one of two
forms of its class; at 600 that form ascends:
- Guardian: Bastion (tougher, draws fire from farther) or Warlord (heavier
  hammer that also hits the buildings around)
- Neon Blade: Phantom (faster, strikes more often) or Reaper (harder blows,
  far harder on towers)
- Technomancer: Archon (bigger, stronger, more frequent nova) or Arcanist
  (much longer reach, harder hits)
Evolved heroes get +10% health and damage, ascended +25%, on top of their
form's speciality. Evolving is a forge job (a slot, materials, 2 h; ascending
4 h and 2.5× the materials); the hero cannot fight meanwhile, hourglasses
speed it up. The simulation takes squad entries as a class name or
{cls, form, tier}, so old replays still replay. Each form wears its own gear
in its accent colour (big shield, spiked hammer and red plume, light scarf
and wings, long green blades and horns, rune ring and orbs, crystal staff);
ascended heroes are taller and burn with an aura. In the forge's Heroes tab
every hero opens its card (stats, XP, the two forms with what changes, the
cost); an arrow badge marks those that can evolve. The battle report shows
the XP each hero earned.

Step 4, hero items (`hexforge_be/items.py`). Every hero carries one weapon of
its class and one spell (any class). Weapons: Rune Maul (+damage) and Aegis
Plate (+health) for the Guardian, Plasma Edge (+damage) and Flux Daggers
(faster blows) for the Neon Blade, Storm Staff (+damage and nova) and Focus
Lens (+reach) for the Technomancer. Spells: Ward Sigil (a shield that soaks
the first blows), Mending Rune (heals during the fight), Haste Rune (speed).
Items are forged like anything else (forge tab Items, 20-25 min) and land in
the armoury (`city["items"]`, up to 24) at level 1; an upgrade is a forge job
up to level 5 (the recipe times the new level, 20 min times the level), and
the item keeps working meanwhile. Effects grow linearly with the level: a
full level-5 kit is worth about one evolution. The hero card shows the two
gear slots (tap to equip, swap or take off) and the stats with the items;
the squad carries its items into the simulation as {type, level}, so replays
rebuild the same fight. In battle a ward is a bubble that fades as it soaks,
and a mending hero sheds green motes while its health climbs back.

Next: a game that explains itself (first-game guide, previews before every choice). Next: register the game on the platform (Fun
section, XP and daily quests).

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
| `js/render.js` | Isometric canvas renderer: ground, picking, overlays, battle effects, embers |
| `js/forgeArt.js` | The "Forgia Infernale" art: every building and hero drawn from shapes (no image files) |
| `js/battle.js` | Attack plan, replay controls, result |
| `js/city.js` | My city: selection, placing, forge and defense sheets |
| `js/camera.js` | Zoom and pan of the map (pure, tested) |

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

### Phase 5, step 5: the Explorer (`hexforge_be/explorers.py`)

A hero forged like the others (it takes a hero slot; several are allowed)
that **never fights**: it is left out of every squad and does not evolve.
From its hero card it goes on a mission the player picks: **Scouting** (1 h),
**Expedition** (4 h) or **Long voyage** (8 h). The loot stays a surprise
until it comes back: materials, often bonuses, sometimes a hero item, plus
player XP. The loot is drawn from a seed fixed when the trip starts, so it
cannot be re-rolled. Its own items: **Treasure Map** (weapon, +10 % loot per
level) and **Trail Boots** (spell, −6 % mission time per level); it carries
nothing else.

| Route | Effect |
| --- | --- |
| `POST /api/hexforge/me/heroes/{id}/explore` | `{mission: scout\|expedition\|voyage}`; 400 `not_an_explorer`, `on_mission` |
| `POST /api/hexforge/me/heroes/{id}/return` | the state plus `loot` {materials, bonuses, item, xp, levels}; 400 `not_ready`, `no_mission` |

State: a hero may carry `mission: {kind, started_at, ready_at, seed}`;
`missions` lists the trips. A squad with an Explorer is refused with
`explorer_cannot_fight`.

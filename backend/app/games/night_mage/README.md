# Night Mage

A one-gesture arcade game for the weekly leaderboard. A mage stands in a
haunted clearing; the forest sends wave after wave of monsters. **Tap a
monster** to blast it with a bolt, **tap an arrow or a fireball** to burn it
out of the air, **tap the mage** to raise the shield (it blocks blows and
sends shots back). Same gesture on desktop (click), plus Space for the shield.
Every hit fills the **storm**: once full, tap its button (or press E) and a
lightning falls on every monster in sight.

After a night that reached wave 3, the player **sends an invader**: a monster
with their name over its head that turns up in other players' nights for two
days. What it does out there (hearts taken, mages defeated, times slain) is
shown to its owner on the title screen.

An invader is the **boss of its wave** (every second wave, one per wave): it
comes last, once the wave's monsters are down. A band with INVADER!, the
owner's name, the monster and its level warns for 1.8 s, then it steps in
alone, bigger, with a boss bar under the score. Plain bolts do not stagger
it; only critical hits (during its wind-up) stop it and push it back a little.

Built on the art of the user's earlier prototype (`C:\progetti\fantasygame`):
sprites, painted scenes and their surfaces are reused; the code is new.

## Playing

| | Touch / mouse | Keyboard |
|---|---|---|
| Blast a monster | tap it | |
| Burn an arrow or a fireball | tap it | |
| Shield (blocks, reflects shots, shoves monsters back) | tap the mage | Space, Enter |
| Storm (when its button is full) | tap the button under the round ones | E |
| Take a gift (heart, chain, frost, power, nova) | tap it | |
| Start, play again | the big button | Space, Enter |
| Pause | pause button | P, Esc |

Landscape on phones (the platform turns it; held upright, the game asks to turn).
With a mouse (`(hover: hover) and (pointer: fine)`) the screens always name the keys:
the title's rules say CLICK and show the E key, the countdown lists them, and in the
fight "SPACE: SHIELD" stays in the bottom left corner and the storm button shows E.
The title shows four rules by example: the monsters, the shots, the shield, the storm.

## Energy and critical hits

Tapping fast does not win: **one tap, one monster**. Bats, warriors and archers
fall to a single bolt (Ken takes two, invaders more), but every bolt (at a
monster, a shot or nothing) costs one of the 4 crystals over the mage's head,
and they come back at 1.5 a second (`ENERGY` in `Tuning.js`). A tap with none
left does nothing (the crystals blink red; it is not a miss). Gifts and the
shield are free. The danger is how many come at once and when they strike, so
the skill is choosing targets and timing. A bolt landing while a monster winds
up (the red "!") is **critical** (`CRITICAL`): double damage, the blow is
stopped, 2 crystals back (one more than it cost), 50 points.

Tuned with `npm run measure` (pilots of four skills, which also differ in how
often they catch a wind-up): waves reached about 10 / 10 / 12 / 14 with 1.4 to
2.2 taps a second (it was 3 to 8.6). The shield's recharge is the ring of cells
at the mage's feet.

## Powers between the waves

After every wave the night stands still and three powers are offered
(`config/Boons.js`, drawn by the week's seed so everybody gets the same
cards for the same choices); one is taken, by a tap or by 1 2 3, and kept
for the night. Some can be taken more than once (the squares on the card):
two more hearts, twin bolt (one cast in three, then in two, hits a second
monster), long shield, quick shield, storm caller, big crystal, quick
crystals, thorn shield, vampire (a heart every 40 kills), lucky (twice the
gifts), sharp eye (criticals x3 and a crystal more). `sim/Boons.js` offers
them and applies the ones that change the mage or the storm; the others are
read where they act in `sim/Simulation.js`. The taken ones show small in the
bottom left corner.

So that long nights stay tense, every 10 waves the monsters' blows take one
heart more (said on screen at waves 11, 21...), and their wind-ups get
quicker as their step does. With powers the pilots reach waves ~11 / 12 / 14 / 17
(`npm run measure`; the pilots now have a reaction time too).

## Score

All of it lives in `js/sim/ScoreKeeper.js` and `js/config/Tuning.js`.

- Kills pay the monster's points (bat 100, archer 250, warrior 300, brawler 450) times the multiplier.
- **Combo**: every hit (bolt, burnt shot, reflected shot) keeps it alive; every 4 hits raise the
  multiplier, up to **x6**. A missed tap, a wound or 2.6 s without hits break it.
- Burnt shots pay 25. Cleared waves pay 250 x wave, flawless waves 400 x wave more.
- **Invaders** have (4 + 0.6 x level) times the health of their wave's monsters of the same kind
  (`INVADER` in `Tuning.js`) and pay 5 times their points.
- **Storm** (`sim/Storm.js`, `STORM` in `Tuning.js`): 40 hits fill it; called, it burns the shots in
  flight and drops a lightning (3 damage) on each monster on screen, nearest first. Lightnings keep the
  combo going but do not fill the next storm. Tuned with `npm run measure`: about one wave more for
  every skill, not a wipe of the late waves.

## Structure

Dependencies point one way: everything may read the simulation, the
simulation knows nothing about the rest.

| Folder | Role | Rule |
|---|---|---|
| `js/sim/` | Mage, monsters, shots, taps, combo, waves, scenes | No browser, no clock, no `Math.random`: deterministic |
| `js/sim/enemies/` | One class per monster, behaviour only (`think`) | Stats in `config/Enemies.js`, class in `registry.js` |
| `js/core/` | Seeded RNG, fixed timestep loop | No game knowledge |
| `js/render/` | Renderer, viewport, world view, effects, HUD, screens, title demo | Reads the simulation, never changes it |
| `js/audio/` | Synthesised sound effects and music (`Score.js`: the loop as data, `Music.js`: its player) | Reacts to simulation events; calm music around the fight, its own in it |
| `js/input/` | Pointer and keyboard | One tap = one world point |
| `js/platform/` | SDK, leaderboard, invasion API | Behind the `PlatformGateway` contract |
| `js/app/` | The flow (title, countdown, fight, results), the autopilot | Receives its parts from `main.js` |
| `js/config/` | Tuning, monsters, sprites, scenes and maps, grades, weathers, strings | Data only |

`js/main.js` is the composition root, the only file that names concrete classes.
The server side is `backend/app/games/night_mage_be/` (see below).

## Maps

A **scene** is a painted background plus its walkable surfaces; a **map** is a
way to play a scene: as painted or mirrored, with a colour grade and a weather.
Four scenes give the twelve maps in `js/config/Scenes.js`; the night moves to
the next map every four waves, in an order the week's seed decides.

New scene:

1. Open `tools/heightmap-editor.html` (the editor of the prototype, unchanged), load the image
   at 960 x 540, draw one layer per walkable surface (floor, each ledge), export the JSON.
2. Save the image as `assets/scenes/<name>.webp` and the JSON as `assets/scenes/<name>.json`.
3. Add the scene to `SCENES` and as many maps as you like to `MAPS` in `js/config/Scenes.js`.
   New grades go in `js/config/Grades.js`, new weathers in `js/config/Weathers.js`.

Monsters walk on every ledge at least 140 px long; walkers above the mage
step off the nearer end and drop down, archers keep their ledge.

## Extending

- **New monster**: stats in `config/Enemies.js` (and `WAVE_MIX`), a class extending
  `Enemy` with `think` in `sim/enemies/`, a line in `registry.js`, sheets and poses in
  `config/Sprites.js`, a colour in `render/Effects.js`; a new shot needs its pixel art in `render/ShotArt.js`, and a monster that shoots a
  `muzzle` (where the shot leaves the sprite, measured on its release frame).
- **New gift**: a kind in `sim/Pickups.js`, its effect in `Simulation.#collect`, an icon in
  `render/PickupArt.js`, a word in `config/Strings.js`.

## Determinism

Same seed and same taps at the same ticks give the same night. The simulation
runs in fixed 60 Hz ticks and takes every random choice from `core/Rng.js`,
forked per purpose and per wave, so invaders closing a wave do not change the
monsters of the others. The weekly seed comes from the ISO week
(`platform/PlatformGateway.js`). Looks (sparks, weather, shake) use their own
seeded stream in `render/jitter.js`.

## Invasions (server)

`backend/app/games/night_mage_be/`, mounted at `/api/night_mage`:

| Route | What |
|---|---|
| `GET /invaders?count=6` | other players' active invaders for one night (never your own, one per owner, least seen first) |
| `POST /invaders` `{kind, wave}` | send one (session needed); level from the wave; at most 3 active, the oldest retires |
| `POST /invaders/report` `{outcomes}` | what each invader did in a night (damage clamped to 5) |
| `GET /me/invaders` | totals of the last 7 days, shown on the title (session needed) |

No anti-cheat by design. The level rule exists on both sides and
`tests/rules.test.js` checks they agree. The table `night_mage_invaders` is
created at startup by `init_db`.

## Tests and tools

```
npm test                 # simulation, storm, terrain, determinism, rules, flow
npm run measure          # autopilots of four skills: how far they get
cd ../../.. && python -m unittest discover -s app/games/night_mage_be/tests -t .
```

`tools/prepare_sprites.py <prototype spritesheets folder> [actor ...]` turns the
prototype's PNG sheets into the game's WebP sheets: it checks every sheet keeps
its size (the game cuts frames by size) and clears the white background left
around Ken's figure and between his legs. Ken's left walk is not taken from the
prototype (drawn differently, and worse): it is his right walk mirrored frame
by frame. `python -m unittest discover -s tools -p "test_*.py"` tests the script.

`tools/shots.js` serves this folder (and `/sdk`), opens a page in headless
Chrome and saves screenshots; `index.html?autoplay&skip=1800` lets the
autopilot play. The webp preview is made from the png:
`python -c "from PIL import Image; Image.open('thumbnail.png').convert('RGB').resize((640,360)).save('thumbnail_preview.webp', quality=88)"`.

## Platform

Registered by `python scripts/register_night_mage.py` (safe to run again):
ranked, landscape, XP from score and play time, four daily quests read from
the run's `extra_data` (`enemies_defeated`, `waves_cleared`, `invaders_slain`,
`shots_down`), coin and STEEM rewards copied from Blocky Road. STEEM stays off
until switched on by hand in the admin; the script never changes it on an
existing game. In production: deploy, then the "Register a game" workflow with
`night_mage`.

The lettering is Pixelify Sans (SIL Open Font License, `assets/font/OFL.txt`).

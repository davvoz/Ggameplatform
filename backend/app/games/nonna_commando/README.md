# Nonna Commando

A run-and-gun arcade game for the weekly leaderboard. The Supremo bulldozed
Nonna's trattoria to build the stage for his 50th birthday party. Bad idea.
Three missions (a seaside town at sunset, the harbour at night, the palace),
two mini bosses, three bosses, one furious grandmother with a red bandana.

Everybody plays the same seeded run for a week; the score of a whole run goes
to the platform leaderboard.

## Playing

| | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move, aim up, crouch / aim down in the air | Arrows or WASD | Stick, d-pad | Left stick (appears under the thumb) |
| Fire (hold for auto fire; the slipper when someone is close) | Z, J, Ctrl | X, Y, RT | FIRE |
| Jump (down + jump drops through platforms) | X, K, Space | A | JUMP |
| Meatball bomb | C, L, Shift | B, RB, LT | BOMB |
| Pause | P, Esc | Start | pause button |

The army's house rule, so every shot can be read: standing soldiers shoot at
chest height (crouch), kneeling ones and shockwaves come low (jump), anything
that arcs shows where it lands, anything with a red blink can be shot down.
Moves that need a crouch or a jump flash DUCK! or JUMP!.

## Score

The score is the point of the game, so all of it lives in `js/sim/ScoreKeeper.js`.

- **Heat**: kills add heat, every 5 heat raises the multiplier up to **x8**.
  After 3 seconds without kills it cools one step at a time; getting hurt drops
  it to x1. Hitting anything keeps it warm, so boss fights don't kill it.
- **Style**: slipper kills +100% and extra heat, point blank +50%, airborne
  (blown up or falling) +50%, chain kills from barrels and clowns +25%,
  balloon troopers dropped by popping their balloons +50%.
- **Pickups** are multiplied too: cannoli, gifts, coins shaken out of enemies
  on a hot streak (they vanish: greed against safety). Shooting down rockets,
  shells and cherry bombs pays SWAT points.
- **Mission tally**: accuracy, time under par, grandkids freed (3 per mission),
  all three gold teeth (hidden in crates, on high balconies), flawless.
- **Bosses** pay fixed points plus a speed bonus. Lives left after the last
  boss pay a bonus. An extra life every 200,000 points.

## Structure

The dependencies point one way: everything may read the simulation, the
simulation knows nothing about the rest.

| Folder | Role | Rule |
|---|---|---|
| `js/sim/` | Player, enemies, bosses, shots, combat, score, missions | No browser, no clock, no `Math.random`, no engine trigonometry: deterministic |
| `js/sim/enemies/`, `js/sim/bosses/` | One class per enemy, behaviour only | Stats in `config/Enemies.js`, class in `enemies/registry.js` |
| `js/sim/levels/` | The three missions as data | Built with the helpers in `build.js` |
| `js/core/` | Seeded RNG, deterministic math, fixed timestep loop, pool | No game knowledge |
| `js/render/` | Renderer, HUD, screens, effects, sprite bank, pixel font | Reads the simulation, never changes it |
| `js/render/art/` | Every sprite and background, painted in code at load | Hard pixels and a dark outline, no glow |
| `js/audio/` | Synthesised effects and a small tracker with original tunes | Reacts to simulation events |
| `js/input/` | Keyboard, gamepad, touch pad | All reduce to one bitmask per tick |
| `js/platform/` | Server and SDK | Behind the `PlatformGateway` contract |
| `js/app/` | States (title with a demo, play, pause, results) | Receives its parts from `js/main.js` |
| `js/config/` | Tuning, palette, weapons, enemy stats | Data only |

`js/main.js` is the composition root, the only file that names concrete classes.

## Extending

- **New enemy**: stats in `config/Enemies.js`, a class extending `Enemy` (write
  `think`), a line in `enemies/registry.js`, a look in `render/art/SoldierArt.js`
  (humanoids) or `ObjectArt.js`, a mapping in `render/ActorSprites.js`.
- **New boss**: extend `Boss`: `attacks` (method names per phase), `phases`
  (health fractions), one method per attack returning true when done.
- **New weapon**: an entry in `config/Weapons.js`, a shot in
  `sim/Projectiles.js` if it needs a new kind, a gun map in `render/art/NonnaArt.js`,
  a pickup in `sim/Pickups.js`.
- **New mission**: a file in `sim/levels/`, a line in `Missions.js`, a theme
  in `render/art/SceneryArt.js` if it is a new place.

## Determinism

Same seed and same buttons give exactly the same run and score, on any device.
The simulation runs in fixed 60 Hz ticks, takes every random choice from
`core/Rng.js` (forked per mission and per purpose), uses the polynomial
`sinX`/`cosX`/`atan2X` of `core/MathX.js` and literal direction tables instead
of `Math.sin` (which engines may round differently), and never reads the
clock. The renderer and the audio only consume events, and use their own
randomness for effects. `tests/determinism.test.js` replays recorded runs tick
by tick and scans the simulation sources for forbidden calls.

The weekly seed is computed from the ISO week (`platform/PlatformGateway.js`),
so everyone faces the same run between two leaderboard resets.

## Art

Everything is pixel art painted by code into a sprite bank at load
(`render/art/buildArt.js`, about 570 frames in a few 1024 px atlases). Nonna is
drawn in two halves, legs and upper body, so every aim works with every leg
pose. Each frame is stored as drawn, mirrored and as a white hit flash, so
drawing never needs transforms. The game renders at 384x216 and is scaled with
hard pixels. While playing, a screen wider than 16:9 (a phone on its side) is
filled edge to edge by leaving out up to 48 rows of sky and pavement, so
everything is bigger; the game itself always sees the whole 384x216 world. The street of a mission is baked in 128 px chunks during its first
second, into recycled canvases.

## Tests and tools

```
npm test                 # rules, scoring, determinism, a full campaign played by the pilot
npm run measure          # bots of different skill: how far they get, what they score
npm run cover            # draws tools/cover.html into thumbnail.png
```

`tools/shots.js` serves this folder (and `/sdk`), opens a page in headless
Chrome and saves screenshots. With `index.html?autoplay&mission=1&skip=900` the
demo pilot plays a real run, fast-forwarded by `skip` ticks.
`tools/sheet.html?filter=grunt` and `tools/pose.html` show the sprites large.
The webp preview is made from the png:
`python -c "from PIL import Image; Image.open('thumbnail.png').resize((640,360)).save('thumbnail_preview.webp', quality=88)"`.

## Platform

Registered by `python scripts/register_nonna_commando.py` (safe to run again):
ranked, landscape (`"orientation": "landscape"` in `extra_data`), XP from the
score (capped) and from play time, four daily quests read from the run's
`extra_data` (`enemies_defeated`, `hostages_rescued`, `levels_completed`,
`gold_teeth`), coin and STEEM rewards copied from Blocky Road. Whether STEEM
is paid rotates by hand every week in the admin; the script never changes it
on an existing game. No backend module is needed.

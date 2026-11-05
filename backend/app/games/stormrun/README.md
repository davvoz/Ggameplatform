# Rainbow Rush: Stormrun

An endless one-button runner for the weekly leaderboard. You are the last drop of
colour: tap to jump, tap again in the air to jump again, press longer to jump
higher. Catch seven drops to paint a rainbow and push the storm back. The score
is the metres covered. Everyone runs the same course for a week.

## Structure

The dependencies point one way: everything may read the simulation, the
simulation knows nothing about the rest.

| Folder | Role | Rule |
|---|---|---|
| `js/sim/` | Course, runner, storm, paint, score | No browser, no clock, no trigonometry: deterministic |
| `js/core/` | Seeded random generator, fixed timestep loop | No game knowledge |
| `js/render/` | Camera, art baked at load, a list of layers | Reads the simulation, never changes it |
| `js/audio/` | Synthesised sound | Reacts to simulation events |
| `js/input/` | Pressed or not | Touch, mouse and keyboard look the same |
| `js/platform/` | Server and SDK | Behind the `PlatformGateway` contract |
| `js/ui/` | The few HTML screens | No game rules |
| `js/app/` | States and coordination | Receives its parts from `js/main.js` |
| `js/config/` | Tuning, colours, words, typeface | Data only |
| `tools/cover/` | The cover of the game | Draws with the art of the game |

`js/main.js` is the composition root, the only file that names concrete classes.

## Extending

- **New obstacle:** an entry in `sim/ObstacleTypes.js`, a rule in `sim/CoursePatterns.js`, a drawing in `render/art/ObstacleArt.js`.
- **New drop pattern:** an entry in `DropPatterns` in `sim/CoursePatterns.js`.
- **New scenery:** an entry in `Biomes` in `config/Palette.js`.
- **Something new on screen:** a layer, added to the list in `render/SceneRenderer.js`.

## Determinism

Same seed and same presses give exactly the same run, on any device. For this
the simulation runs in fixed ticks, takes all randomness from `core/Rng.js` and
computes the terrain with polynomials, because `Math.sin` and similar functions
can differ between JavaScript engines. `tests/determinism.test.js` enforces it.

## Style

A naive painted country: wobbly ink lines, colour printed slightly off the line,
paper grain, and characters with a face (the storm, the sun, the clouds, the
stumps). No glow, no gradients, no emoji: `tests/art-rules.test.js` fails if any
appear.

All the text uses one typeface, DynaPuff (SIL Open Font License, in
`assets/fonts/`, so no external server is needed). Text baked into sprites waits
for it in `core/loadFonts.js`. The logo is drawn by `render/art/TitleArt.js`, used
by both the start screen and the cover.

The game declares `"orientation": "landscape"` in its `extra_data`: the platform
reads it in `renderGamePlayer` and uses the whole area instead of the 9:16 frame.
The installed app is locked upright by `manifest.json`, so there the platform turns
the frame by 90 degrees in `game-player.css`: the player turns the phone.

## Cover

`npm run cover` draws the poster in `tools/cover/cover.js` and writes
`thumbnail.png` and `thumbnail_preview.webp`. The catalogue crops the sides of
narrow cards, so keep what matters in the middle 1000 units.

## Rewards on screen

After a run the platform computes the XP and sends `showXPBanner`, and
`showLevelUpModal` if the player went up a level. Each game draws these itself.
Here they are paper stickers made by `ui/Screens.js`, kept outside the screens
because the answer of the server can arrive at any moment.

## Tests

```
npm test                       # rules, determinism, balance, art rules
node tests/support/measure.js  # how long each bot survives: use it to tune SimConfig
```

To play a real game in headless Chrome and save screenshots, serve this folder
and run `node tests/visual/run-e2e.js http://127.0.0.1:8765 <output-dir>`.

## Platform

The backend is `app/games/stormrun_be` (the seed of the week, `GET /api/stormrun/week`).
The game is registered by `python scripts/register_stormrun.py`, which is safe to
run again. STEEM rewards are off until `STEEM_REWARDS = 1` is set there.

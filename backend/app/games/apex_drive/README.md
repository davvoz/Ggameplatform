# Apex Drive (working title)

A pseudo-3D racer in the style of the 16-bit consoles: a career of worlds
and tracks, races against rivals with their own way of driving, nitro and
pickups on the road, prize money spent in a garage on parts (tier by tier)
and on mods (the tactical build: slots, energy, trade-offs).
Landscape, full screen, drawn at 180 rows with square pixels.

Today the career has six worlds. SUNSET COAST (dusk, mountains) has three
tracks: DUSK VALLEY (3 laps), PIER CIRCUIT (short, 6 laps) and CLIFF ROAD
(hilly, 3 laps, in a light drizzle). NEON CITY (night, skylines, neon) has
NEON AVENUE, UNDERPASS (4 laps, two tunnels: `tunnels` on the track,
`render/road/tunnel.js`) and STORM BYPASS (heavy rain with lightning, its
own `scenery`, two stretches of `roadworks`: a lane shut by barriers the
drivers steer round). AURORA PEAKS (the polar night: an aurora drifting
over snowy peaks, snow poles, cabins, a snowman) has ICE FIELDS (falling
snow), GLACIER PASS (clear, an ice tunnel at the summit) and WHITEOUT (a
short ring, 7 laps, in a blizzard: the far world veiled white, gusts that
whiten the screen); all
three have **broken road**: patched, cracked asphalt with no lane marks,
warning signs before it, and potholes that slow the car, knock it and jolt
it aside (`broken` on the track, `config/Hazards.js`, `sim/Potholes.js`,
`render/road/potholes.js`); the rivals steer round them. XENO WASTES (a
hostile planet under a blood-red sky, a ringed gas giant, basalt spires
veined with magma; acid crystals, tentacle stalks, giant ribs by the road)
runs over **the abyss**: roads on pillars of rock over a sea of magma far
below, roads that narrow, fork in two branches with the void between them,
and stop at striped ramps before gaps only a fast car clears (see **The
abyss**). MAGMA RIFT (3 laps, ashfall: embers and ash), SPORE CANYON (4
laps, spores: the air thick and green, a jump on one branch of each fork)
and THE MAW (5 laps, acid storm: green rain and green lightning, every trap
in one short lap). SUNKEN CITY (a drowned metropolis on the sea floor:
light falling in shafts and rippling over the road, towers leaning where
they sank, the reef, shoals of fish; coral, kelp, giant clams, broken
columns, a stone giant's head, the old street lamps) has **ocean currents**
(see **Under the sea**) and roads in **glass tubes**: CORAL AVENUE (3
laps, clear water: a current to ride, one to fight, one pushing across, a
long tube), THE TRENCH (4 laps, murky: a narrow bridge over the trench with
a current pushing towards the edge, a fork over it) and ATLANTIS RING (5
laps, a storm on the surface: tubes, currents and the trench in one short
lap). GRID VORTEX (roads of light over a plain ruled in neon, a huge
setting sun in bands, mountains drawn in light; light pylons, neon palms,
data obelisks, holographic signs, pyramids of light) has roads that **roll
up into tubes** driven all the way round (see **The vortex**): HYPERLOOP (3
laps, a clear night: two long tubes, a turbo strip up a wall in each), THE
SPIRAL (4 laps, data rain: three tubes bending hard, a turbo strip near the
ceiling) and EVENT HORIZON (5 laps, a surge: a short lap nearly all in the
tube). Fourteen weathers (clear, drizzle, storm, snow, blizzard, ashfall,
spores, acid storm, clear water, murky, surface storm, clear night, data
rain, surge), a song per world. Every system is data
driven, so more of each is data, not code (see **Extending**).

Locally the backend serves it at `http://localhost:8000/games/apex_drive/index.html`.
Every career lives on the server (see **Server**); the browser keeps only
the settings. From a plain static server the game runs OFFLINE: the career
lasts for the visit and the weekly challenge is closed.

## The flow

```
TITLE ──> WORLDS ──> TRACKS ──> GARAGE ──> RACE ──> RESULTS
 (demo race)  (cards)   (map, facts)  (parts, mods)  (grid, lights,   (place, prize,
                │           └──────────── RACE ───────>   laps, flag)    unlocks)
                └──> CHALLENGE ──> (GARAGE) ──> RACE ──> CHALLENGE
                     (this week's track, your best)     (time sent, points)
```

Every screen is drawn in the canvas with the same pixel widgets
(`render/ui/widgets.js`): buttons rise into place, sink when pressed, the
focused one bobs and has an arrow; screens change behind a wipe of big
pixels (`render/ui/Wipe.js`). Arrows move the focus, Enter or Space press,
Esc goes back; everything is also a tap.

## Playing

| | Keyboard (and mouse) | Touch screen |
|---|---|---|
| Throttle | Up, W (mouse: hold on the road) | always open while racing; on the grid, hold the road to launch |
| Steer | Left / Right, A / D | hold the left or the right half: gently at first, full lock after half a second (`TOUCH` in `config/Tuning.js`) |
| Straight on | | lift your fingers |
| Brake | Down, S | hold the BRAKE button (bottom left) |
| Nitro | Space, Shift, N, X | the NITRO button (bottom right) |
| Pause | P, Esc | the pause button (top middle) |
| Full screen | the button top right (through the platform's SDK) | |
| Sound on / off | the speaker button (title) or SOUND ON/OFF in the SOUND panel | the same |
| Volumes (effects, music) | arrows + Enter in the SOUND panel | the speaker on the title, SOUND in the pause menu: - / + or a tap on the bar |

- **Start**: three red lights, then GO. Throttle pressed in the last 0.4 s
  before GO is a PERFECT START (free nitro); held from earlier, a WHEELSPIN.
- **Nitro**: a few charges a race, never more than 5 (more with parts and mods, refilled by
  pickups). Power and traction up for 2.4 s.
- **Slipstream**: close behind a car, its wake cuts the drag (SLIPSTREAM on
  the HUD).
- **Bends**: their push grows with the square of the speed; past the grip the
  car slides wide and loses speed. Better tyres move the limit.
- **Contact**: running into a car trades speed and hurts both; side by side
  the cars push apart. Leaving the road into a prop is a crash. Damage costs
  engine power (the green bar).
- **Pickups** (they come back every lap): cash, nitro, repair, shield, boost.
- **The flag**: once every rival is home the race is over; a player still
  out on the road is last, with no time.

## Rivals

Five drivers (`config/Drivers.js`), each with colours, a tuned car and a
behaviour (`sim/ai/behaviours.js`): VEX the **racer** (racing line, nitro on
straights), BRICK the **rammer** (steers into you side by side, heavy),
NYX the **blocker** (moves into your line when you are close behind: late,
as seen in its mirror, for a few seconds, then it rests; both only while
you race for a place, never a lap apart),
ZIP the **weaver** (swerves lane to lane), OTTO the **cruiser** (keeps a lane).
They all share `sim/ai/driving.js`: slow before a bend to what their grip
holds, go round a slower car, lift rather than ram it. A small rubber band
keeps the pack together. The player starts last on the grid.

The rivals **upgrade their cars** along the career, as the player does
(`sim/rivals.js`): before a track each has spent a share of the prizes a
driver finishing 2nd won on every track before it (`RIVAL_UPGRADES` in
`config/Tuning.js`), at the garage's prices, on the parts it likes, one tier
of each in turn (`buys` in `config/Drivers.js`: BRICK armour first, VEX
tyres first...). Stock on the first track, they grow with the economy; the
world's `difficulty` only fine-tunes on top. The track screen shows them
(RIVALS: a pip per tier bought).

Two cars touching are settled along the way they overlap least: more in
line, the car behind runs into the one in front (speed shared out, set
apart along the road); more side by side, they rub (set apart across the
road, the one coming through keeps its speed and its place).

Cars a lap down are on the road like any other: they block, bump and give
a slipstream (`Track.gap` measures the road distance the short way round;
cars count their distance since the start). Going by a rival, the player
shouts at it in a speech bubble (`render/hud/Taunts.js`, lines in
`config/Taunts.js`): a jibe, or, gold, a mock for one a lap down.

## The car

`config/Parts.js` has the stock car and seven part categories bought tier by
tier in the PARTS tab (engine, gearbox, tyres, aero, armor, nitro, mod bay).
`config/Mods.js` has the mods of the MODS tab: each takes a slot and draws
energy from the mod bay, most with a price on the road (RAM PLATES hit harder
but weigh more, NOS INJECTOR is stronger with a charge less, GHOST ECU trades
armor for power...). The garage previews every item on the rating bars:
green what it adds, red what it takes. `sim/Build.js` turns a build into
stats: every effect `mul`tiplies or `add`s to a stat.

## Sound

Synthesised with Web Audio, no files (`js/audio/`). Every effect is a recipe
of tones and noise bursts in `config/Sounds.js`: the lights, GO, perfect
start, laps, the flag, nitro, bumps, crashes, places won and lost, each
pickup, and the menus (move, confirm, back, buy, fit, refused, the wipe).
While racing `EngineSound` plays the engine (its note climbs through five
gears and drops at each shift, higher on nitro; the filter opens with the
revs), tyres hissing in a slide and squealing (a warbling note) when steering
hard at speed, the grass rumbling, the wind, and the
nearest rival heard on its side. `audio/engineState.js` works all that out
from the race (pure, tested). Browsers allow sound only after a touch or a
key: the first one starts it. Mute and the two volumes (effects with the
engine, music; 0..10, `LEVELS` in `config/Sounds.js`, heard as the square)
are remembered (`apex_drive.settings.v1`); `screens/SoundPanel.js` sets them.

### Music

Chiptune, synthesised too. `config/Music.js` holds the instruments (pulse
lead, triangle bell, pulse arpeggio, square bass, a noise drum kit) and the
songs, written like tracker patterns: one token a sixteenth note, `A4` a
note, `-` hold, `.` silence, kit letters on the drum channel. A song is a
list of sections and the section it loops from; `audio/score.js` compiles it
(and throws on a typo), `audio/MusicPlayer.js` books its notes ~0.3 s ahead
of the audio clock, fades from song to song, and lowers the music in pause.

Each screen names its song (`Screen.music`): the menus play PIT LANE, a race
plays its track's song, or its world's (`music` in `config/Worlds.js`), from
the green light to the flag. A new world's music: a song in `SONGS` and its
id on the world.

## Physics

`sim/Car.js`. Forward: the engine pushes with power / speed, capped by
traction; air drag (less in a slipstream) and rolling hold it back; top
speed is where they meet (`topSpeed` in `sim/Build.js` finds it, the garage
shows it). Sideways: steering grows with speed, a bend pushes outward with
speed squared over grip; past `grip x slipLimit` the car slides. The
weather's grip (drizzle 0.75, snow 0.7, blizzard 0.58) takes from all three: bends, pulling away and
braking, so better tyres soften the rain without cancelling it. Every number
is in `config/Tuning.js` (`PHYSICS`, `CONTACT`, `DRAFT`, `RACE`).

## The abyss

Where a track runs over the void (`abyss`, `narrows`, `forks`, `jumps` on
the track, numbers in `ABYSS` of `config/Hazards.js`):

- **Ribbons** (`sim/Ground.js`): every segment's road is a list of ribbons
  of asphalt (middle and half width, in half widths of the usual road): one
  full ribbon on most of the road (`FULL`), a narrower one where it narrows,
  two on a fork, none over a gap. Beside them is ground (off the road, slow
  but solid) unless the segment is over the abyss: there it is void. A
  narrowing and a fork ease in and out (`narrowEase`, `forkEase`), slowly
  enough to steer with them.
- **Jumps** (`sim/Flight.js`): a ramp is the last `ramp` segments before a
  gap, striped across. A car that runs out of asphalt leaving it flies: it
  rises at `kick` of its speed, gravity brings it down; on asphalt it lands
  (too hard knocks it), over the void it falls. Anywhere else, out of
  asphalt over the void, it falls at once. In the air the wheels touch
  nothing (`Car.loose`: no thrust, no brakes, no steering, no contact).
- **A fall** lasts `fallTime`: the screen darkens, then the car is back on
  the road ahead (`respawnPlace`: the nearest ribbon, the road whole for
  `respawnClear` segments, never on a ramp), nearly stopped and damaged,
  passing through the others for a moment.
- **The rivals** (`sim/ai/driving.js`) keep to the ribbon they are heading
  for (its middle taken further on, so they follow a branch that bends away
  or comes back), further from the edges where the asphalt is narrow, take
  the branch nearest them, and go flat out at a ramp's middle, with nitro if
  they are short of the speed that clears it (`lipsOf`, worked out once a
  track).
- **The tests** (`tests/abyss.test.js`) check that every jump of the game is
  cleared at a fair speed on a straight, and that every faster car, up to
  1.4 x the reference speed, still lands on asphalt (not past a branch's
  end); that nothing lies or stands over the void; and that the rivals finish
  the hostile world's races, seldom falling.

## Under the sea

- **Currents** (`currents: [[from, to, along, across]]` on a track,
  strengths -1..1, `CURRENTS` in `config/Hazards.js`, `sim/Currents.js`): the
  water along the road pushes the car on or holds it back (an acceleration,
  `along` behind the car, a stronger `against`: only the push is held by the
  server's bound), across it drifts the car towards an edge (`across` half
  widths a second, a good share of the wheel); they ease in and out. The
  rivals steer against the drift. The road shows them as big arrows of silt
  pointing the way the water flows; entering one, the player hears it and
  reads it (CURRENT >>, UNDERTOW!, CROSSCURRENT: the race's `current` event).
- **Glass tubes** (`tubes: [[from, to]]`, `render/road/tube.js`): drawn
  over the road like the tunnels, but seen through: highlights along the
  glass, a metal ring every few segments, a collar at the mouth, a faint tint
  inside.
- **The light** (`water` in the theme, `render/road/water.js`): caustics,
  two tiles of a light net sliding different ways over the road and the sea
  floor, brightest where their lines cross, fading with the distance.
- **The trenches** are the abyss of the hostile world with another palette
  (`abyss` in the theme): a dark floor, vents glowing cyan.
- **The server's bound**: a forward current makes a car faster than on a
  flat road; `tests/currents.test.js` checks that even the fastest build, on
  nitro in the deepest slipstream all the lap with every current behind it,
  stays slower than the lap the server refuses (`apex_drive_be/rules.py`).

## The vortex

- **Rolling up** (`vortex: [[from, to]]` on a track, `VORTEX` in
  `config/Hazards.js`, `sim/Vortex.js`): each segment of the stretch has a
  `roll`, eased from 0 (the flat road) to 1 (a closed tube) and back; in
  between it is a half pipe. Across, the surface is an arc of a circle of
  radius `VORTEX.radius / roll` touching the road's line at the bottom; a
  car's x stays the distance along the surface from the bottom. In a closed
  tube x goes round (`CIRCLE` a lap): every distance across between cars,
  pickups and aims is `track.across(z, from, to)`, the shorter way round.
- **The walls pull you down**: a car on a wall slides towards the bottom;
  in bends the push outward carries it up the outer wall, like a bobsleigh.
  On the upper half only speed holds it on: under `VORTEX.stick` of the
  reference speed (less on the upper walls) it lets go, drops across the
  tube (`drop`: LOST GRIP!) and lands hard at the bottom, slower.
- **Turbo strips** (`turbo: [[from, to, x]]`): a strip along the surface
  at x; on it a car burns free nitro, so the server's bound (nitro all lap)
  holds. **Pickups**: in a closed tube one lane in three is on the ceiling.
- **The rivals** keep to the bottom against the walls' pull and ride a turbo
  strip when they are fast enough to hold on up there.
- **Drawing it** (`render/road/vortex.js`): on a vortex track the whole
  road is drawn in pieces, not rows (see step 8 below), and the camera rolls
  with the car so the surface under it is always down; the backdrop and
  everything standing on the road turn with it.

## How the road is drawn

1. **The road is a list of segments straight ahead** (`sim/Track.js`).
2. **Projection** (`render/road/project.js`): each segment within 300 of the
   camera becomes a strip of the screen; bends are faked by sliding segments
   sideways more and more (`x += dx; dx += curve`), hills by their heights.
3. **Scanlines** (`render/road/raster.js`): strips are painted row by row,
   near to far; a crest hides what lies behind it. Each strip remembers the
   row where nearer road starts (`clip`).
4. **Sprites** (`render/road/place.js`, `render/RaceView.js`): props, pickups
   and rivals stand on their strip, scaled by the road's width there, drawn
   far to near and cut at the clip row; the player's car at its own depth.
   Cars have poses (`render/art/poses.js`): straight, and right turns drawn
   by hand in `config/Cars.js` (`turns`, slight then full), mirrored for the
   left. The drawn lean follows the steering at its own pace through every
   pose (`render/art/lean.js`, `LEAN` in `config/Tuning.js`).
5. **Backdrop** (`render/Backdrop.js`): layers one full turn wide that slide
   with the road's heading; on a crest they come down to sit on the road.
6. **The abyss** (`render/road/abyss.js`): the scanlines leave the void as
   VOID pixels; under the asphalt after a gap the far wall drops to the
   floor, every few segments a pillar holds the road up (rock in strata, lit
   red from below), then the magma floor fills the rest, a plane far below
   projected row by row like the road, flowing, lost in a red haze.
7. **Under the sea** (`render/road/water.js`, `render/road/tube.js`): the
   light net and the currents' arrows painted into the road's pixels before
   the abyss; the glass tubes drawn over the road like the tunnels.
8. **The vortex** (`render/road/vortex.js`, only on tracks with one): each
   strip is cut across into pieces (the ground and its neon grid, rumble
   strips, asphalt, lane marks, the walls' panels and seams, a turbo strip),
   each piece a quad from the strip's far cross-section to its near one, cut
   again round the tube's curve, turned with the camera's roll and filled
   far to near. Far strips are merged in batches aligned to their segments
   (no shimmer); pieces overlap by a pixel, so no crack shows between them.

## Structure

| Folder | Role | Rule |
|---|---|---|
| `js/sim/` | Track, car, race, build, career, pickups, potholes, scenery, race setup | No browser, no clock, no `Math.random`: deterministic, tested in Node |
| `js/sim/ai/` | Shared driving, the behaviours | An Aim (where, how hard, nitro) per behaviour |
| `js/screens/` | Title, worlds, tracks, garage, race, results; `Menu` (focus) | Read the career and the race, ask the app to change screen |
| `js/render/` | Race view, backdrop, car sprites, font, frame | Reads the simulation, never changes it |
| `js/render/road/` | Projection, scanlines, potholes, placing sprites, road colours | Pure functions over numbers and a pixel buffer |
| `js/render/hud/` | Race HUD, minimap, banners (lights, laps, flag, pop ups) | |
| `js/render/ui/` | Widgets, easing, wipe, logo, world cards | |
| `js/render/art/` | Pixel art: icons, props | Rows of letters or small painters |
| `js/app/` | `Game`: one screen at a time, behind a wipe; `CareerSync`: the career kept with the server | |
| `js/input/` | Keys and touches: screen actions, and the DriveInput | |
| `js/audio/` | Synth (Web Audio), engine sound, music player and score, the game's sound facade | Plays what the screens and the race's events ask; reads the race |
| `js/platform/` | The game's API (`ApexServer`), the platform's sessions (`PlatformSessions`), the settings (`LocalSave`) | Never throw: a missing server is an answer |
| `js/config/` | Tuning, worlds, tracks, weather, themes, hazards, parts, mods, drivers, pickups, props, cars | Data only |

`js/main.js` is the composition root, the only file that names concrete classes.

## Extending

- **Track**: an entry in `config/Tracks.js` (a closed map of points with
  heights, laps, weather, seed), its key in a world's `tracks`. Tests check it
  closes, turns once and never crosses itself. It unlocks with a podium on the
  track before it.
- **World**: an entry in `config/Worlds.js` (theme, tracks, difficulty, prize
  scale, props, music) and a theme in `config/Themes.js`: sky, fog, the sun
  or the moon, its scenery `layers` (far to near: `clouds`, `stars`,
  `aurora`, `mountains`, `hills`, `skyline`, `planet`, `spires`, `rays`,
  `fish`, `ruins`, `reef`; any can `drift` and `pulse`; a new kind is a
  painter in `render/Backdrop.js`, the hostile world's in
  `render/AlienSky.js`, the sea's in `render/OceanScenery.js`), road and prop
  colours (with `patch` and `hole` if its tracks have broken road, `ramp`
  and an `abyss` if they run over the void, `water` and `tube` under the
  sea). Its card is painted from the
  theme. It unlocks when every track of the world before is on the podium.
- **Weather**: an entry in `config/Weather.js`: grip, fog (and its colour,
  `haze`), icon, a tint over the whole scene, a `veil` over the sky and the
  scenery, what falls (`particles`, a kind of `render/Precipitation.js`:
  `rain` with splashes and lightning, `snow` with sway and gusts) and a hiss
  under the engines (`ambience`).
- **Broken road**: `broken: [[from, to], ...]` (shares of the lap) on a
  track; how many potholes and what they do in `config/Hazards.js`.
- **The abyss**: on a track, `abyss: [[from, to]]` (void beside the road),
  `narrows: [[from, to, halfWidth]]`, `forks: [[from, to, apart]]` (the
  branches' middles `apart` half widths from the road's) and `jumps:
  [[lip, gap, side?]]` (a ramp ending at `lip`, a gap of `gap` segments,
  only on the branch on `side` of a fork). `tests/abyss.test.js` tells you
  if a jump is too hard, in a bend, or lands a fast car in the void.
- **Under the sea**: `currents: [[from, to, along, across]]` and `tubes:
  [[from, to]]` on a track; `tests/currents.test.js` tells you if the
  currents behind a car would let it beat the server's bound.
- **The vortex**: `vortex: [[from, to]]` and `turbo: [[from, to, x]]` on a
  track, a `vortex` in its theme (the walls' colours, the ground's grid);
  `tests/vortex.test.js` tells you if a turbo strip lies outside the tube or
  over the ceiling's seam.
- **Part tier or category**: `config/Parts.js` (and an icon named as the
  category in `render/art/Icons.js`). **Mod**: `config/Mods.js`.
- **Rival**: `config/Drivers.js`; a new behaviour in `sim/ai/behaviours.js`.
- **Pickup**: `config/Pickups.js`, its effect in `Race.#apply`, its icon in
  `RaceView`'s `PICKUP_ICON`. **Prop**: `config/Props.js` and a painter in
  `render/art/PropArt.js`.
- **Screen**: a `MenuScreen` (layout, scene, action, back) in `js/screens/`,
  registered in `main.js`'s `SCREENS`.

Prices, parts, mods, prizes, worlds or tracks changed: run
`node tools/export-economy.js` (the server reads them from there; `npm test`
fails until you do).

Next: the car drawn from its build (parts and mods visible), fog, more
worlds and tracks.

## Server

`backend/app/games/apex_drive_be` (API at `/api/apex_drive`, mounted in
`app/main.py`) keeps every player's career and is its authority: the game
asks it for every purchase, fit and race (`app/CareerSync.js` answers at once
with the same rules, then takes the server's career when it answers; a
refusal brings the server's career back). Its rules are the game's own,
exported to `apex_drive_be/economy.json` by `tools/export-economy.js`.

A race's session (`platform/PlatformSessions.js`) says how it went: mode,
track, place, best lap, time, or a DNF when the race is left. The platform's
ping (`app/routers/pings.py`) reads it through `apex_drive_be/ping.py`: "I won
on NEON AVENUE", PLACE / 1ST on the card, a challenge run's time, never "0
points". Only what is checked gets in: a track of the game (named from
economy.json), a place a race can have, times within reason.

A race is started and finished on the server, which checks the result
against the car it started with: no lap faster than the car could do on
nitro all the way, no more cash than the road holds, no race over before it
could be. These checks turn away the impossible; the race itself runs in the
browser, so they cannot prove a result (that would take replaying the
inputs on the server).

**Weekly challenge**: one track for everybody, the next one in the career's
order every Monday (UTC, as the platform's weekly leaderboard): the track
after the one of the last week raced (from the runs in the database), so new
tracks join the end of the queue by themselves and a week under way keeps
its track when tracks are added; raced with
one's own car against the same rivals (a seed per week). The server scores a
run `10000 x par / time` (par: the race at the reference speed all the way):
the faster, the more points. The game reports those points at the end of the
session with the run's id, and `app/game_score_validators.py` lets through
only a run the server checked, once, of that player and that week. Career
races report 0: they pay credits.

The game says it is the ranked mode: on the world select the challenge is a
card as big as the career's, half the screen each ("WEEKLY LEADERBOARD"
over a podium, "TOP 10 WIN", the time left in the week, or, to a guest,
"SIGN IN TO RANK"), and a ribbon on the challenge screen ("COUNTS ON THE CUR8
WEEKLY LEADERBOARD", or, to a guest, that only Steem players are ranked).
The screen shows the week's standings (`GET /challenge/leaderboard`,
`apex_drive_be/standings.py`): every ranked player's best run, guests and
banned players left out as on the platform, each with their Steem name and
avatar (`render/ui/Avatars.js`: the platform's image service, shrunk to a
pixel portrait; a coloured tile with the initial while it loads or when
there is none), the player's row lit and kept at the bottom when beyond
the first places. Who is playing comes from `GET /me/profile` at boot
(`app.player`): their Steem name is their name in the races too.

A challenge run has the sponsor's boards, in every world (config
`CHALLENGE_ADS`, `sim/Scenery.js` `layAds`, art in `render/art/AdArt.js`):
a banner over the road just after the line, CUR8 WEEKLY CHALLENGE with the
cur8 logo (cars drive under it: it is `overhead`, nobody hits it); boards
along the lap on alternate sides (NO BRAKES!, the cur8 logo alone, HODL
STEEM, luciojolly's Steem avatar alone, TOP 10 WIN); and on the
last stretch VOTE, CUR8, FOR, WITNESS, one word a board, then a giant board
with the logo. An avatar board's picture is loaded from Steem like the
standings' avatars (`app.avatars`) and drawn into the board's frame by
`RaceView` during the race: an image from Steem cannot be read back, and
the boards are shrunk by reading their pixels. The boards off the road are
props like the others (a car off the road hits them); career races have none.

Registration on the platform: `backend/scripts/register_apex_drive.py`.
Backend tests: `cd backend && python -m unittest discover -s app/games/apex_drive_be/tests -t .`

## Tests and tools

```
npm test        # track, car physics, build, career, sync, economy export, race, AI, layout, UI, sound, music
```

`tools/shots.js` serves this folder, opens headless Chrome and saves
screenshots (`--touch` for a phone, `--eval` to run code in the page,
`--follow` for shots asked by the page with `console.log('SHOT name')`).
`?screen=garage&track=duskValley` opens a screen straight away; `?autoplay`
hands the player's wheel to the pilot during races.

The cover (`thumbnail.png`, `thumbnail_preview.webp`) is a moment of a real
race drawn by the game's own art (`tools/cover/cover.js`, the shot is data:
track, place on the lap, rivals): `node tools/cover/render-cover.js` writes
both files; `tools/cover/cover.html` shows it.

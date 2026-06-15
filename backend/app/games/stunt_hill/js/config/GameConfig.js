/**
 * GameConfig — all the vehicle/gameplay "feel" lives here.
 * Internal units: meters, seconds, Newtons. (Pixel conversion happens only in the Renderer.)
 */
export const CONFIG = {
  // World
  gravity:        16.0,   // gravity acceleration (m/s²) — higher = "heavier"

  // Camera / zoom — the render AUTO-FITS so a fixed amount of track is always
  // visible regardless of portrait/landscape (the platform shows games portrait).
  viewMetersX:    24,     // meters of track visible across the screen WIDTH (lower = more zoomed in)
  viewMetersY:    16,     // meters visible across the screen HEIGHT (room for jumps)
  minPPS:         12,     // clamp: min pixels-per-meter
  maxPPS:         40,     // clamp: max pixels-per-meter

  // Chassis
  mass:           120,    // kg
  bodyW:          2.0,    // chassis width (m)
  bodyH:          0.62,   // chassis height (m)
  inertiaScale:   2.2,    // scales the moment of inertia (higher = rotates slower → flips over less)

  // Wheels + suspension
  axle:           0.78,   // axle distance from center (m) → wheelbase = 2*axle
  wheelDrop:      0.26,   // how far below the chassis center the suspension mount sits (m)
  wheelRadius:    0.40,   // wheel radius (m) — visual + contact
  suspRest:       0.42,   // suspension rest length (m)
  suspK:          14000,  // spring stiffness (N/m) — higher = stiffer
  suspDamp:       1900,   // damping (N·s/m) — higher = less bounce

  // Engine
  engineForce:    1400,   // drive force PER WHEEL (N) — the heart of acceleration and the wheelie
  reverseForce:   1000,   // reverse/brake force (N)
  maxSpeed:       21,     // approx top speed (m/s) above which the engine stops pushing

  // Air control (back/front flip)
  airControl:     6,      // angular acceleration in the air (rad/s²): gas = back flip, brake = front flip

  // Boost (nitro) — charged by doing tricks, spent for extra thrust
  maxBoost:       100,    // bar capacity
  boostForce:     2600,   // nitro thrust (N) — ignores maxSpeed
  boostDrain:     42,     // drain per second while held
  boostPerFlip:   28,     // charge per completed flip
  boostPerAirSec: 14,     // charge per second of air time

  // Tricks / scoring
  trickPerFlip:   120,    // base points per flip
  trickPerAirSec: 40,     // base points per second of air time
  maxMultiplier:  8,      // combo multiplier cap
  landUprightCos: 0.2,    // valid landing: just don't end up on the roof (no exact 360° needed)
  comboWindow:    3.0,    // seconds (on the ground) to chain another trick before the combo resets
  bigAirTime:     0.8,    // air time (s) that counts as a "BIG AIR" trick even without a flip
  bigAirPoints:   80,     // base points for a BIG AIR

  // Friction
  rollDrag:       6.0,    // rolling/air resistance (proportional to velocity)
  angularDamp:    2.2,    // chassis rotational damping

  // Body collision (chassis corners touching the ground)
  bodyK:          26000,
  bodyDamp:       1800,
  bodyFriction:   0.7,

  // Crash
  flipCosThresh: -0.7,    // cos(angle) below which the chassis is "on its roof" (≈ past 134° → truly upside down)
  flipTime:       1.1,    // seconds upside down before a crash

  // Match (timed run with lives and a finish line)
  timeLimit:       120,   // seconds per run (2 minutes)
  startLives:      3,     // lives at the start
  maxLives:        5,     // cap (extra lives are found on the track)
  levelLength:     1500,  // meters to the finish line
  finishBonus:     5000,  // points for reaching the finish
  timeBonusPerSec: 30,    // points per remaining second at the finish (faster = more)
};

// Fixed-step simulation loop (deterministic)
export const FIXED_DT = 1 / 360;
export const MAX_SUBSTEPS = 60;

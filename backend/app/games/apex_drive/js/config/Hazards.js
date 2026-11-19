/**
 * Broken road: the stretches a track marks `broken` (config/Tracks.js) have
 * patched, cracked asphalt with no lane marks left, and potholes laid from
 * the track's seed (sim/Potholes.js). A wheel in a pothole slows the car,
 * hurts it a little and jolts it sideways; warning signs stand before every
 * stretch (sim/Scenery.js, config/Props.js SCENERY.roughAt) and the rivals
 * steer round the holes they see.
 *
 * Widths and places are in half widths of road, like everything across it.
 */
export const POTHOLES = {
    /** Chance of a pothole on a segment of broken road (a segment is a fifth of a second's drive at speed)... */
    chance: 0.25,
    /** ...never closer than this many segments to the one before. */
    gap: 18,
    /** Holes lie within this far from the middle, are this wide, and this many segments long. */
    span: 0.68,
    width: [0.26, 0.44],
    length: 3,
    /** Sometimes a second hole on the same segment, this far from the first (room enough to drive between). */
    pairChance: 0.3,
    pairApart: [1.1, 1.4],
    /** A crack (only drawn) on this share of the broken segments. */
    crackChance: 0.35,
    /** A wheel in the hole: the car's middle within the hole's half width plus this. */
    reach: 0.16,
    /** What a hole does: the share of the speed kept, the damage, the sideways jolt (half widths per second). */
    keep: 0.8,
    damage: 3,
    jolt: 0.9,
    /** Under a shield a hole only slows the car this much. */
    shieldKeep: 0.94,
    /** Seconds before the same car can fall in a hole again, and seconds the car is seen bouncing. */
    cooldown: 0.3,
    joltTime: 0.22,
};

/**
 * The void (config/Tracks.js `abyss`, `narrows`, `forks`, `jumps`; sim/Ground.js,
 * sim/Flight.js). Where a track runs over an abyss there is nothing beside
 * the asphalt: a car that leaves it falls. The road may narrow there, part in
 * two branches with the void between them, or stop at a ramp's lip and go on
 * past a gap that only a fast car clears. A car that falls comes back on the
 * road a moment later, nearly stopped and knocked about.
 *
 * Across the road in half widths, along it in segments, heights in world units.
 */
export const ABYSS = {
    /** A narrowing eases in and out over this many segments (a car must have time to move in)... */
    narrowEase: 30,
    /** ...and branches part and meet again over this many (over a second at full speed). */
    forkEase: 70,
    /** ...each this wide (half widths) once apart. */
    branch: 0.56,
    /** The ramp before a gap: this many segments painted in warning stripes. */
    ramp: 6,
    /** A car keeps its wheels on the asphalt up to this share of the half width past the edge (the rumble strip). */
    edge: 1 / 7,
    /** Pull of gravity, world units/s^2. */
    gravity: 3200,
    /** Leaving a ramp, the car rises at this share of its speed (on top of the road's own slope). */
    kick: 0.16,
    /** Landing harder than this (world units/s down) knocks the car: speed kept, damage. */
    hardLanding: 1600,
    landKeep: 0.9,
    landDamage: 2,
    /** Seconds a fall lasts before the car is back on the road... */
    fallTime: 1.5,
    /** ...losing its speed along the road at this rate (per second): it drops, it does not sail on. */
    fallBrake: 3,
    /** Back on the road: this share of the reference speed, this damage, seconds without bumps. */
    respawnSpeed: 0.3,
    fallDamage: 10,
    respawnGrace: 1.2,
    /** A car comes back where the road ahead is whole for this many segments. */
    respawnClear: 30,
    /** The floor of the abyss lies this far below the lowest road of the track. */
    depth: 9000,
};

/**
 * Ocean currents (config/Tracks.js `currents`, sim/Currents.js): the water
 * moving along a stretch of road pushes a car forward (a free slipstream)
 * or holds it back, and moving across it drifts the car towards an edge.
 * Each is a share of these, from -1 to 1; they ease in and out.
 */
export const CURRENTS = {
    /**
     * Along the road: units/s^2 at full strength, forward when positive. A
     * current behind the car is held by the server's speed bound
     * (tests/currents.test.js); one against it is not, and holds it back harder.
     */
    along: 1800,
    against: 4500,
    /** Across it: half widths a second at full strength, to the right when positive. */
    across: 1.5,
    /** Segments a current eases in and out over. */
    ease: 16,
    /** A current this strong (a share, as above) is announced when the player's car enters it. */
    felt: 0.3,
};

/**
 * The grid vortex (config/Tracks.js `vortex` and `turbo`, sim/Vortex.js):
 * stretches where the road rolls up, a half pipe first, then a closed tube
 * the car drives round, walls and ceiling; at the end it opens out flat
 * again. Leaning on a wall pulls the car back down towards the bottom; on
 * the upper half only speed holds it on: too slow, it drops across the tube
 * and lands hard on the bottom. Turbo strips run along a wall: on one the
 * car burns free nitro.
 *
 * Across the road in half widths (a car's x is measured along the surface,
 * from the bottom line), along it in segments.
 */
export const VORTEX = {
    /** The tube's radius, half widths: a lap round it is 2 PI times this. */
    radius: 1.1,
    /** Segments the road takes to roll up into the tube, and to open out flat again. */
    ease: 36,
    /** Half widths a second a car slides towards the bottom on an upright wall (less where it leans less). */
    gravity: 1.3,
    /** Speed ratio (speed / refSpeed) that holds a car on the ceiling; on the upper walls less (with the root of the overhang). */
    stick: 0.62,
    /** Seconds a drop across the tube lasts; then the car keeps this share of its speed, and takes this damage. */
    dropTime: 0.7,
    dropKeep: 0.6,
    dropDamage: 4,
    /** A turbo strip's half width (half widths), and the seconds of nitro each moment on it gives. */
    turboWidth: 0.4,
    turboTime: 0.2,
};

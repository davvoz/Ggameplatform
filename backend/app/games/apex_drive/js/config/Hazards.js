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

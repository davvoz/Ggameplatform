import { drive, racingLine } from './driving.js';

/**
 * How each rival races (config/Drivers.js names one per driver). A behaviour
 * only decides its Aim (where to be, how hard to push, when to burn nitro);
 * sim/ai/driving.js does the driving. Each behaviour is made per racer, so it
 * can keep its own memory (a lane, a rhythm), and takes its randomness from
 * the race's seeded generator, so a race replays the same.
 *
 * A new behaviour: a function here returning {aim(self, race)}, and its key
 * in BEHAVIOURS.
 */

/** Player within this far behind (world units) is worth blocking. */
const BLOCK_RANGE = 2600;
/** Player within this far either way, side by side, is worth ramming. */
const RAM_RANGE = 1300;
/** Player this close ahead: a reason to burn nitro and fight back. */
const CHASE_RANGE = 2200;

/** How far ahead on the road the player is (a lap down or up counts as beside). */
function gapToPlayer(self, race) {
    return race.track.gap(self.car.z, race.player.car.z);
}

/** Takes the racing line, on the limit, nitro on the straights. */
function racer() {
    return {
        aim: (self, race) => ({ x: racingLine(race.track, self.car.z), pace: 1, nitro: true }),
    };
}

/** Keeps a lane of its own at a steady pace; nitro only on the last lap. */
function cruiser(rng) {
    const lane = rng.pick([-0.5, 0, 0.5]);
    return {
        aim: (self, race) => ({ x: lane, pace: 0.94, nitro: self.lap >= race.track.laps }),
    };
}

/** Moves across into the player's way when the player is close behind. */
function blocker() {
    return {
        aim(self, race) {
            const gap = gapToPlayer(self, race);
            const behind = gap < 0 && gap > -BLOCK_RANGE;
            const x = behind ? race.player.car.x : racingLine(race.track, self.car.z);
            return { x, pace: 0.98, nitro: gap > 0 && gap < CHASE_RANGE };
        },
    };
}

/** Steers into the player when side by side, and chases with nitro. */
function rammer() {
    return {
        aim(self, race) {
            const gap = gapToPlayer(self, race);
            const near = Math.abs(gap) < RAM_RANGE;
            const into = race.player.car.x + Math.sign(race.player.car.x - self.car.x) * 0.3;
            const x = near ? into : racingLine(race.track, self.car.z);
            return { x, pace: 0.97, nitro: gap > 0 && gap < CHASE_RANGE };
        },
    };
}

/** Swerves from side to side on its own rhythm: hard to pass, easy to hit. */
function weaver(rng) {
    const phase = rng.range(0, Math.PI * 2);
    const rate = rng.range(0.9, 1.4);
    return {
        aim: (self, race) => ({ x: Math.sin(race.time * rate + phase) * 0.6, pace: 0.97, nitro: true }),
    };
}

export const BEHAVIOURS = { racer, cruiser, blocker, rammer, weaver };

/**
 * A driver for one racer: read(self, race) gives its DriveInput.
 * @param {string} kind a key of BEHAVIOURS
 * @param {import('../../core/Rng.js').Rng} rng
 */
export function createBrain(kind, rng) {
    const make = BEHAVIOURS[kind];
    if (!make) throw new Error(`Unknown behaviour ${kind}`);
    const behaviour = make(rng);
    return { kind, read: (self, race) => drive(self, race, behaviour.aim(self, race)) };
}

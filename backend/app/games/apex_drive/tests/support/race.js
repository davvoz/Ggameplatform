import { computeStats } from '../../js/sim/Build.js';
import { CATALOG } from '../../js/sim/Career.js';
import { createRace } from '../../js/sim/setup.js';

export const DT = 1 / 60;
export const GAS = { steer: 0, throttle: true, brake: false, nitro: false };
export const IDLE = { steer: 0, throttle: false, brake: false, nitro: false };

/** The stock car's stats, with optional parts and mods. */
export function stockStats({ parts = {}, mods = [] } = {}) {
    return computeStats({ parts, mods }, CATALOG);
}

/** A race of the game's first track, already racing (no grid, no lights). */
export function racingRace(options = {}) {
    const race = createRace({ trackId: 'duskValley', playerStats: stockStats(options), seed: options.seed ?? 1 });
    race.skipStart();
    return race;
}

/** Steps a race for so many seconds with the input `drive(race)` gives. */
export function run(race, seconds, drive = () => IDLE) {
    const events = [];
    for (let i = 0; i < Math.round(seconds / DT); i++) {
        race.step(drive(race), DT);
        events.push(...race.drain());
    }
    return events;
}

/** The player driven by the pilot every tick. */
export const pilot = (race) => race.player.brain.read(race.player, race);

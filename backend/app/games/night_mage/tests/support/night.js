import { createEnemy } from '../../js/sim/enemies/registry.js';
import { Simulation } from '../../js/sim/Simulation.js';
import { flatMap } from './maps.js';

/** The feet of the walkers on the flat map. */
export const FLOOR = 440;

export function night(options = {}) {
    return new Simulation({ seed: 7, maps: [flatMap()], ...options });
}

/** Steps the night `ticks` times (or until it is over). @returns the events */
export function run(sim, ticks) {
    const events = [];
    for (let i = 0; i < ticks && !sim.over; i++) {
        sim.step();
        events.push(...sim.drainEvents());
    }
    return events;
}

/** Puts a monster on the field, ready to act. */
export function place(sim, kind, x, y = FLOOR, extra = {}) {
    const enemy = createEnemy(kind, { id: 900 + sim.enemies.length, x, y, layer: 0, ...extra });
    enemy.setState(enemy.flying ? 'fly' : 'walk');
    sim.enemies.push(enemy);
    return enemy;
}

/** Keeps the director from sending its own monsters. */
export function holdWaves(sim) {
    sim.director.phase = 'break';
    sim.director.timer = 1e9;
}

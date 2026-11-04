// Prints how long each bot survives across seeds: the tool used to tune SimConfig.
// Usage: node tests/support/measure.js
import { Simulation } from '../../js/sim/Simulation.js';
import { Rng } from '../../js/core/Rng.js';
import { idleBot, casualBot, goodBot, play } from './bots.js';

const SEEDS = 40;

const bots = {
    idle: () => idleBot(),
    casual: (seed) => casualBot(new Rng(seed).fork('bot')),
    good: (seed) => goodBot(new Rng(seed).fork('bot')),
};

const quantile = (values, q) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)];
const spread = (label, values) =>
    `${label} ${quantile(values, 0.1).toFixed(0)}/${quantile(values, 0.5).toFixed(0)}/${quantile(values, 0.9).toFixed(0)}`;

for (const [name, make] of Object.entries(bots)) {
    const stats = { sec: [], m: [], rainbows: [], hits: [], perfect: [] };
    for (let seed = 1; seed <= SEEDS; seed++) {
        const sim = play(new Simulation(seed * 7919), make(seed));
        stats.sec.push(sim.tick / 60);
        stats.m.push(sim.metres);
        stats.rainbows.push(sim.rainbows);
        stats.hits.push(sim.hits);
        stats.perfect.push(sim.perfectLandings);
    }
    console.log(name.padEnd(8), Object.entries(stats).map(([k, v]) => spread(k, v)).join('  '));
}

/**
 * How far pilots of different skill get: a rough check of the difficulty.
 *
 *     npm run measure
 */
import { Pilot } from '../../js/app/Pilot.js';
import { Simulation } from '../../js/sim/Simulation.js';
import { realMaps } from './maps.js';

const SKILLS = [
    { name: 'sleepy  (3 taps/s, sloppy)', interval: 20, wobble: 26, focus: 0.15, reaction: 0.45 },
    { name: 'casual  (4 taps/s)', interval: 15, wobble: 18, focus: 0.35, reaction: 0.35 },
    { name: 'good    (6 taps/s)', interval: 10, wobble: 12, focus: 0.6, reaction: 0.25 },
    { name: 'expert  (8 taps/s)', interval: 7, wobble: 8, focus: 0.85, reaction: 0.18 },
];
const SEEDS = [1, 2, 3, 4, 5, 6];
const LIMIT = 60 * 60 * 20;

export function measure(skill, seed) {
    const sim = new Simulation({ seed, maps: realMaps() });
    const pilot = new Pilot({ seed: seed * 31, interval: skill.interval, wobble: skill.wobble, focus: skill.focus, reaction: skill.reaction });
    let taps = 0;
    const tap = sim.tap.bind(sim);
    sim.tap = (x, y) => {
        taps += 1;
        tap(x, y);
    };
    while (!sim.over && sim.ticks < LIMIT) {
        pilot.play(sim);
        sim.step();
        sim.drainEvents();
    }
    return { ...sim.report(), tapsPerSecond: taps / (sim.ticks / 60) };
}

const isMain = process.argv[1]?.endsWith('measure.js');
if (isMain) {
    for (const skill of SKILLS) {
        const runs = SEEDS.map((seed) => measure(skill, seed));
        const waves = runs.map((r) => r.wave);
        const avg = (list) => Math.round(list.reduce((a, b) => a + b, 0) / list.length);
        console.log(`${skill.name}: waves ${waves.join(' ')} | score ~${avg(runs.map((r) => r.score))} | minutes ~${(avg(runs.map((r) => r.ticks)) / 3600).toFixed(1)} | combo ~${avg(runs.map((r) => r.bestCombo))} | taps/s ${(runs.reduce((a, r) => a + r.tapsPerSecond, 0) / runs.length).toFixed(1)} | storms ~${avg(runs.map((r) => r.storms))} | crits ~${avg(runs.map((r) => r.criticals))}`);
    }
}

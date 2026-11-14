import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pilot } from '../js/app/Pilot.js';
import { Simulation } from '../js/sim/Simulation.js';
import { realMaps } from './support/maps.js';

const MAX_TICKS = 60 * 60 * 6;

function playNight(seed, pilotSeed = 1, invaders = []) {
    const sim = new Simulation({ seed, maps: realMaps(), invaders });
    const pilot = new Pilot({ seed: pilotSeed, interval: 9 });
    while (!sim.over && sim.ticks < MAX_TICKS) {
        pilot.play(sim);
        sim.step();
        sim.drainEvents();
    }
    return sim.report();
}

test('the same seed and taps give the same night', () => {
    const invaders = [{ id: 'a', kind: 'brawler', level: 2, name: 'x' }];
    assert.deepEqual(playNight(11, 4, invaders), playNight(11, 4, invaders));
});

test('different seeds give different nights', () => {
    assert.notDeepEqual(playNight(11), playNight(12));
});

function sources(dir) {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? sources(path) : [path];
    });
}

test('the simulation never reads the clock, the browser or Math.random', () => {
    const forbidden = /Math\.random|Date\.now|new Date|performance\.|document\.|window\.|globalThis|requestAnimationFrame|localStorage/;
    const dirs = ['../js/sim', '../js/core/Rng.js', '../js/config'];
    for (const dir of dirs) {
        const path = fileURLToPath(new URL(dir, import.meta.url));
        const files = statSync(path).isDirectory() ? sources(path) : [path];
        for (const file of files) {
            const text = readFileSync(file, 'utf8');
            assert.ok(!forbidden.test(text), `${file} uses ${text.match(forbidden)?.[0]}`);
        }
    }
});

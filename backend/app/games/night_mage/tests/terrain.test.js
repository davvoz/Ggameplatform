import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, SCENES } from '../js/config/Scenes.js';
import { GRADES } from '../js/config/Grades.js';
import { WEATHERS } from '../js/config/Weathers.js';
import { createEnemy } from '../js/sim/enemies/registry.js';
import { buildMaps } from '../js/sim/Maps.js';
import { Simulation } from '../js/sim/Simulation.js';
import { Terrain, mirrorLayers } from '../js/sim/Terrain.js';
import { realMaps, sceneSurfaces } from './support/maps.js';

test('every map names a real scene, grade and weather, with a unique id', () => {
    const ids = new Set();
    for (const spec of MAPS) {
        assert.ok(SCENES[spec.scene], spec.id);
        assert.ok(!spec.grade || GRADES[spec.grade], `${spec.id} grade`);
        assert.ok(!spec.weather || WEATHERS[spec.weather], `${spec.id} weather`);
        assert.ok(!ids.has(spec.id), `${spec.id} twice`);
        ids.add(spec.id);
    }
    assert.equal(realMaps().length, MAPS.length);
});

test('a mirrored scene has its surfaces mirrored', () => {
    const layer = [10, 20, null, 40];
    assert.deepEqual(mirrorLayers([layer]), [[40, null, 20, 10]]);
    const surfaces = sceneSurfaces();
    const [plain, mirrored] = buildMaps([
        { id: 'a', scene: 'ruins' },
        { id: 'b', scene: 'ruins', mirror: true },
    ], surfaces);
    const a = new Terrain(plain.terrain);
    const b = new Terrain(mirrored.terrain);
    assert.deepEqual(a.surfacesAt(100), b.surfacesAt(959 - 100));
});

test('the mage stands on the floor of every map', () => {
    for (const map of realMaps()) {
        const sim = new Simulation({ seed: 1, maps: [map] });
        const terrain = new Terrain(map.terrain);
        assert.equal(sim.mage.feetY, terrain.floorAt(sim.mage.x), map.id);
        assert.ok(sim.mage.feetY > 300 && sim.mage.feetY < 540, `${map.id}: feet at ${sim.mage.feetY}`);
    }
});

test('a body falling past a ledge lands on the next surface down', () => {
    const terrain = new Terrain({ width: 960, height: 540, layers: [new Array(960).fill(450), [...new Array(400).fill(300), ...new Array(560).fill(null)]] });
    assert.deepEqual(terrain.landing(100, 200, 320), { layer: 1, y: 300 });
    assert.deepEqual(terrain.landing(600, 200, 460), { layer: 0, y: 450 });
    assert.equal(terrain.landing(600, 200, 400), null);
    assert.equal(terrain.ledges.length, 2);
});

/** A brawler on the ledge of `upper` (layer 1) after 20 seconds, with the mage on the floor at `mageX`. */
function brawlerAfter(upper, mageX) {
    const terrain = new Terrain({ width: 960, height: 540, layers: [new Array(960).fill(450), upper] });
    const startX = upper.findIndex((y) => y != null) + 150;
    const brawler = createEnemy('brawler', { id: 1, x: startX, y: 300, layer: 1 });
    const world = { mage: { x: mageX, feetY: 450 }, terrain, slow: 1, fire: () => {}, strike: () => {} };
    for (let t = 0; t < 60 * 20; t++) brawler.update(world, 1 / 60);
    return brawler;
}

test('a ledge that runs off the screen on the mage\'s side is left by its other end', () => {
    const offLeft = [...new Array(400).fill(300), ...new Array(560).fill(null)];
    const brawler = brawlerAfter(offLeft, 60);
    assert.equal(brawler.y, 450, `stuck on the ledge at x ${brawler.x.toFixed(0)}`);
    assert.ok(Math.abs(brawler.x - 60) < 140, `far from the mage at x ${brawler.x.toFixed(0)}`);
});

test('on a ledge with no end to drop from, a walker waits over the mage on screen', () => {
    const brawler = brawlerAfter(new Array(960).fill(300), 20);
    const { halfWidth } = brawler.body;
    assert.ok(brawler.x >= halfWidth && brawler.x <= 960 - halfWidth, `off screen at x ${brawler.x.toFixed(0)}`);
});

test('warriors on the high ledges of the ruins climb down and reach the mage', () => {
    const [ruins] = buildMaps([{ id: 'r', scene: 'ruins' }], sceneSurfaces());
    const sim = new Simulation({ seed: 1, maps: [ruins] });
    sim.director.phase = 'break';
    sim.director.timer = 1e9;
    const terrain = sim.terrain;
    const high = terrain.ledges.filter((l) => l.y < sim.mage.feetY - 100);
    assert.ok(high.length > 3);
    for (const ledge of high) {
        const x = ledge.minX + 30;
        const warrior = createEnemy('warrior', { id: ledge.layer * 1000 + ledge.minX, x, y: terrain.surfaceOn(ledge.layer, x), layer: ledge.layer });
        warrior.setState('walk');
        sim.enemies.push(warrior);
    }
    for (let t = 0; t < 60 * 30; t++) {
        sim.mage.grace = 99; // keep the mage alive while they arrive
        sim.step();
    }
    for (const w of sim.enemies) {
        assert.ok(w.levelWithMage(sim.mage), `warrior ${w.id} stuck at y ${w.y.toFixed(0)}, x ${w.x.toFixed(0)}`);
        assert.ok(Math.abs(w.x - sim.mage.x) < 140, `warrior ${w.id} far at x ${w.x.toFixed(0)}`);
    }
});

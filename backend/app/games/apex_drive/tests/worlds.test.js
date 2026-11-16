import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS } from '../js/config/Music.js';
import { PROPS, SCENERY } from '../js/config/Props.js';
import { THEMES } from '../js/config/Themes.js';
import { WORLDS } from '../js/config/Worlds.js';
import { PROP_KINDS } from '../js/render/art/PropArt.js';
import { LAYER_KINDS } from '../js/render/Backdrop.js';
import { Career } from '../js/sim/Career.js';
import { layScenery } from '../js/sim/Scenery.js';
import { trackOf } from '../js/sim/setup.js';

test('every world has a theme, a song, props that can be drawn and tracks that exist', () => {
    for (const world of WORLDS) {
        const theme = THEMES[world.theme];
        assert.ok(theme, `${world.id}: theme ${world.theme}`);
        assert.ok(world.music in SONGS, `${world.id}: song ${world.music}`);
        for (const kind of Object.keys(world.props)) {
            assert.ok(kind in PROPS && PROP_KINDS.includes(kind), `${world.id}: prop ${kind}`);
        }
        for (const id of world.tracks) assert.doesNotThrow(() => trackOf(id), id);
    }
});

test('every theme lists scenery layers the backdrop can paint, with what each needs', () => {
    for (const [name, theme] of Object.entries(THEMES)) {
        assert.ok(theme.layers.length > 0, name);
        for (const layer of theme.layers) {
            assert.ok(LAYER_KINDS.includes(layer.kind), `${name}: ${layer.kind}`);
            assert.ok(layer.factor > 0, `${name}: ${layer.kind} factor`);
            if (layer.kind === 'skyline') assert.ok(theme.city?.[layer.look], `${name}: skyline look ${layer.look}`);
            if (layer.kind === 'stars') assert.ok(theme.stars?.colors.length, `${name}: star colours`);
        }
        assert.ok(theme.sky.length > 0 && theme.fog && theme.sun, name);
    }
});

test('buildings stand back from the road and cones sit beyond the kerb, in their own bands', () => {
    const city = WORLDS.find((w) => w.id === 'neonCity');
    for (const id of city.tracks) {
        const props = layScenery(trackOf(id), city, PROPS, SCENERY);
        for (const kind of ['building', 'cone']) {
            const [near, far] = PROPS[kind].at;
            const placed = props.filter((p) => p.kind === kind);
            assert.ok(placed.length > 0, `${id}: no ${kind}`);
            assert.ok(placed.every((p) => Math.abs(p.x) >= near - 1e-9 && Math.abs(p.x) <= far + 1e-9), `${id}: ${kind} out of its band`);
        }
        // a building's inner side never reaches the road (half width 1)
        assert.ok(props.filter((p) => p.kind === 'building').every((p) => Math.abs(p.x) - p.width / 2 > 1.5));
    }
});

test('the city opens once every track of the coast is on the podium', () => {
    const career = new Career({});
    const cityIndex = WORLDS.findIndex((w) => w.id === 'neonCity');
    assert.equal(career.isWorldOpen(cityIndex), false);
    for (const id of WORLDS[cityIndex - 1].tracks) {
        career.finishRace(id, { position: 3, bestLap: 40, cash: 0 }, 1);
    }
    assert.equal(career.isWorldOpen(cityIndex), true);
    assert.equal(career.isTrackOpen(WORLDS[cityIndex].tracks[0]), true);
});

test('roadworks: barriers stand only in the closed lane of each zone, and the drivers keep to the open one', async () => {
    const { createRace } = await import('../js/sim/setup.js');
    const { stockStats, run, pilot } = await import('./support/race.js');
    const track = trackOf('stormBypass');
    const city = WORLDS.find((w) => w.id === 'neonCity');
    const barriers = layScenery(track, city, PROPS, SCENERY).filter((p) => p.kind === 'barrier');
    assert.ok(barriers.length > 10);
    for (const b of barriers) {
        const closed = track.segments[b.segment].closed;
        assert.ok(closed, `barrier outside the works at ${b.segment}`);
        assert.equal(Math.sign(b.x), closed);
        assert.ok(Number.isFinite(b.z));
    }
    // a pilot driving through the first zone is on the open side all along it
    const race = createRace({ trackId: 'stormBypass', playerStats: stockStats(), seed: 4 });
    race.skipStart();
    for (const other of race.racers.filter((r) => !r.isPlayer)) other.car.z = -track.length / 2;
    const [from] = track.segments.filter((s) => s.closed === 1).map((s) => s.index);
    race.player.car.z = (from - 30) * track.segmentLength;
    race.player.car.speed = 8000;
    let worst = -Infinity;
    for (let t = 0; t < 600; t++) {
        run(race, 1 / 60, pilot);
        if (track.segmentAt(race.player.car.z).closed === 1) worst = Math.max(worst, race.player.car.x);
    }
    assert.ok(worst > -Infinity, "the pilot never reached the works");
    assert.ok(worst < -0.15, `the pilot went to ${worst} in a lane closed on the right`);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PICKUP_LAYOUT, PICKUPS } from '../js/config/Pickups.js';
import { PROPS, SCENERY } from '../js/config/Props.js';
import { WORLDS } from '../js/config/Worlds.js';
import { layPickups, PickupField } from '../js/sim/Pickups.js';
import { layScenery } from '../js/sim/Scenery.js';
import { duskValley } from './support/track.js';

test('pickups are laid the same every time, on the lanes, clear of the start', () => {
    const track = duskValley();
    const a = layPickups(track, PICKUPS, PICKUP_LAYOUT);
    assert.deepEqual(a, layPickups(track, PICKUPS, PICKUP_LAYOUT));
    assert.ok(a.length > 20);
    for (const item of a) {
        assert.ok(PICKUP_LAYOUT.lanes.includes(item.x) && item.kind in PICKUPS);
        assert.ok(item.z > PICKUP_LAYOUT.clearStart * track.segmentLength);
    }
});

test('a pickup is taken when driven over within reach, once per lap', () => {
    const field = new PickupField([{ id: 0, z: 1000, x: 0.6, kind: 'cash' }], 10000);
    assert.equal(field.collect(900, 1100, -0.6, 0.3).length, 0, 'too far aside');
    assert.equal(field.collect(900, 1100, 0.5, 0.3).length, 1);
    assert.equal(field.collect(900, 1100, 0.5, 0.3).length, 0);
    assert.equal(field.collect(10900, 11100, 0.5, 0.3).length, 1, 'next lap');
});

test('props stand off the road; chevrons warn on the outside of sharp bends', () => {
    const track = duskValley();
    const props = layScenery(track, WORLDS[0], PROPS, SCENERY);
    assert.ok(props.every((p) => Math.abs(p.x) > 1.2));
    const chevrons = props.filter((p) => p.kind === 'chevron');
    assert.ok(chevrons.length > 5);
    for (const sign of chevrons) {
        const curve = track.segments[sign.segment].curve;
        assert.equal(Math.sign(sign.x), -Math.sign(curve), 'on the outside');
    }
});

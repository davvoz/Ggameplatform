import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PICKUP_LAYOUT, PICKUPS } from '../js/config/Pickups.js';
import { CHALLENGE_ADS, PROPS, SCENERY } from '../js/config/Props.js';
import { WORLDS } from '../js/config/Worlds.js';
import { layPickups, PickupField } from '../js/sim/Pickups.js';
import { layAds, layScenery } from '../js/sim/Scenery.js';
import { createRace } from '../js/sim/setup.js';
import { stockStats } from './support/race.js';
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

test("the challenge's boards: the banner after the line, the boards along the lap, the words and the logo before the line", () => {
    const stats = stockStats();
    const race = createRace({ trackId: 'duskValley', playerStats: stats, challenge: true });
    const count = race.track.segments.length;
    const boards = race.props.filter((p) => p.look);
    const { banner, along, finish } = CHALLENGE_ADS;
    assert.equal(boards[0].look, 'adBanner');
    assert.equal(boards[0].segment, banner.segment, 'over the road just after the line');
    assert.equal(boards[0].x, 0);
    const middle = boards.slice(1, 1 + along.boards.length);
    assert.deepEqual(middle.map((p) => p.look), ['ad:NO BRAKES!', 'adCur8', 'ad:HODL STEEM', 'adAvatar', 'ad:TOP 10 WIN']);
    assert.equal(middle[3].steem, 'luciojolly', 'the avatar board knows whose avatar it shows');
    assert.deepEqual(middle.map((p) => Math.sign(p.x)), [1, -1, 1, -1, 1], 'sides alternate');
    const end = boards.slice(1 + along.boards.length);
    assert.deepEqual(end.map((p) => p.look), [...finish.words.map((w) => `ad:${w}`), 'adLogo']);
    assert.equal(end.at(-1).segment, count - finish.before, 'the logo last, just before the line');
    assert.ok(boards.slice(1).every((p) => Math.abs(p.x) > 1.2), 'the boards stand off the road');
    const others = race.props.filter((p) => !p.look && boards.some((b) => b.segment === p.segment));
    assert.deepEqual(others, [], 'nothing else stands beside them');
    const career = createRace({ trackId: 'duskValley', playerStats: stats });
    assert.ok(!career.props.some((p) => p.look), 'a career race has none');
});

test('nobody hits the banner over the road; a board off the road stops a car like any prop', () => {
    const race = createRace({ trackId: 'duskValley', playerStats: stockStats(), challenge: true });
    const banner = race.props.find((p) => p.look === 'adBanner');
    assert.equal(banner.overhead, true);
    assert.equal(banner.width, 0);
    assert.ok(race.props.filter((p) => p.look && p !== banner).every((p) => !p.overhead && p.width > 0));
});

test('no finish board stands in a tunnel; the boards along the lap move out of one', () => {
    const segments = Array.from({ length: 100 }, (_, i) => ({ tunnel: (i >= 50 && i < 75) || (i >= 10 && i < 14) }));
    const track = { segmentLength: 200, segments };
    const ads = {
        banner: { segment: 2 },
        along: { from: 0.1, to: 0.1, at: 2, boards: [{ kind: 'ad', text: 'HI' }] },
        finish: { ...CHALLENGE_ADS.finish, every: 10, before: 30 },
    };
    const boards = layAds(track, ads, PROPS);
    assert.deepEqual(boards.map((b) => [b.look, b.segment]), [['adBanner', 2], ['ad:HI', 14], ['ad:VOTE', 30], ['ad:CUR8', 40]]);
});

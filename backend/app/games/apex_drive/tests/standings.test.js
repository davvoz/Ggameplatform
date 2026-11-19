import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApexServer } from '../js/platform/ApexServer.js';
import { Avatars, avatarUrl, tileColor } from '../js/render/ui/Avatars.js';
import { SCREEN } from '../js/config/Tuning.js';
import { LINE } from '../js/render/PixelFont.js';
import { BOARD, boardRoom, boardRows, endsIn, maxScroll, panels, trackLayout } from '../js/screens/ChallengeScreen.js';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("a player's Steem avatar is loaded once, shrunk once per size; a failed one stays a tile", async () => {
    const loaded = [];
    const avatars = new Avatars({
        load: (url) => {
            loaded.push(url);
            return url.includes('nobody') ? Promise.reject(new Error('404')) : Promise.resolve({ src: url });
        },
        shrink: (image, size) => ({ image, size }),
    });
    assert.equal(avatars.portrait(null, 9), null, 'no Steem name: no avatar');
    assert.equal(avatars.portrait('luciojolly', 9), null, 'loading');
    assert.equal(avatars.portrait('luciojolly', 9), null);
    await settle();
    const portrait = avatars.portrait('luciojolly', 9);
    assert.equal(portrait.size, 9);
    assert.equal(avatars.portrait('luciojolly', 9), portrait, 'shrunk once');
    assert.equal(avatars.portrait('luciojolly', 16).size, 16);
    avatars.portrait('nobody', 9);
    await settle();
    assert.equal(avatars.portrait('nobody', 9), null);
    assert.deepEqual(loaded, [avatarUrl('luciojolly'), avatarUrl('nobody')], 'each loaded once');
    assert.equal(avatarUrl('a.b-c'), 'https://steemitimages.com/u/a.b-c/avatar/small');
    assert.equal(tileColor('cur8'), tileColor('cur8'));
});

test('the week ends on Monday at midnight UTC, as the platform leaderboard resets', () => {
    assert.equal(endsIn(Date.UTC(2026, 10, 16, 0, 0)), '7D 0H', 'Monday just begun: a whole week');
    assert.equal(endsIn(Date.UTC(2026, 10, 18, 12, 0)), '4D 12H');
    assert.equal(endsIn(Date.UTC(2026, 10, 22, 21, 30)), '2H 30M', 'Sunday night');
});

test('the standings show the first places, and my own at the bottom when I am beyond them', () => {
    const entry = (rank, me = false) => ({ rank, name: `P${rank}`, steem: null, time: 100 + rank, score: 1000 - rank, me });
    const top = [1, 2, 3, 4, 5].map((rank) => entry(rank));
    assert.deepEqual(boardRows({ entries: top, me: null }, 3).map((r) => r.rank), [1, 2, 3]);
    assert.deepEqual(boardRows({ entries: top, me: entry(12, true) }, 3).map((r) => r.rank), [1, 2, 12]);
    const mineShown = [entry(1), entry(2, true), entry(3)];
    assert.deepEqual(boardRows({ entries: mineShown, me: mineShown[1] }, 3).map((r) => r.rank), [1, 2, 3]);
    assert.deepEqual(boardRows({ entries: [], me: null }, 3), []);
});

test('the standings scroll to the last place, my own row kept at the bottom until it comes into sight', () => {
    const entry = (rank, me = false) => ({ rank, name: `P${rank}`, steem: null, time: 100 + rank, score: 1000 - rank, me });
    const all = Array.from({ length: 14 }, (_, i) => entry(i + 1, i === 10));
    const board = { entries: all, me: all[10] };
    const ranks = (scroll) => boardRows(board, 8, scroll).map((r) => r.rank);
    assert.deepEqual(ranks(0), [1, 2, 3, 4, 5, 6, 7, 11], 'mine pinned under the first seven');
    assert.deepEqual(ranks(4), [5, 6, 7, 8, 9, 10, 11, 12], 'mine in sight: no pin');
    assert.equal(maxScroll(board, 8), 7);
    assert.deepEqual(ranks(7), [8, 9, 10, 11, 12, 13, 14], 'the last place reached');
    const beyond = { entries: all.slice(0, 10).map((e) => ({ ...e, me: false })), me: entry(23, true) };
    assert.equal(maxScroll(beyond, 8), 3);
    assert.deepEqual(boardRows(beyond, 8, 3).map((r) => r.rank), [4, 5, 6, 7, 8, 9, 10, 23], 'every one of them, then mine');
    assert.equal(maxScroll({ entries: all.slice(0, 5), me: null }, 8), 0, 'all in sight: nothing to scroll');
});

test("the challenge's panels hold what they show: the standings' rows, the track's facts down to the last run", () => {
    const { h } = panels(SCREEN.height);
    const inside = h - 2;
    assert.ok(boardRoom(h) >= 6, `${boardRoom(h)} rows in sight (the rest scroll)`);
    assert.ok(BOARD.top + boardRoom(h) * BOARD.row - 2 <= inside, 'the last row and its portrait inside the border');
    const { map, line, pitch } = trackLayout(h);
    assert.ok(map >= 48, 'the map stays readable');
    assert.ok(line + 4 * pitch + LINE <= inside - 2, "the last run's points inside the border");
});

test('the server is asked for the profile and the standings at their addresses', async () => {
    const asked = [];
    const server = new ApexServer(async (url) => {
        asked.push(url);
        return { ok: true, status: 200, json: async () => ({}) };
    });
    await server.profile();
    await server.leaderboard();
    assert.deepEqual(asked, ['/api/apex_drive/me/profile', '/api/apex_drive/challenge/leaderboard']);
});

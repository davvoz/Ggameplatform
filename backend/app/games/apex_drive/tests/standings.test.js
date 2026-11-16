import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApexServer } from '../js/platform/ApexServer.js';
import { Avatars, avatarUrl, tileColor } from '../js/render/ui/Avatars.js';
import { boardRows, endsIn } from '../js/screens/ChallengeScreen.js';

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

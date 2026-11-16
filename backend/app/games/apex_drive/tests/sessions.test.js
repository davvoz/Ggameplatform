import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlatformSessions, readLevelUp } from '../js/platform/PlatformSessions.js';
import { levelUpBanner, RewardBanners, xpBanner } from '../js/render/ui/RewardBanners.js';

/** An SDK that writes down every game over. */
function recordingSdk() {
    const ended = [];
    return { ended, sdk: { gameOver: (score, options) => ended.push({ score, ...options.extra_data }) } };
}

test('every way a race ends tells the platform how it went, for its ping', () => {
    const { ended, sdk } = recordingSdk();
    const sessions = new PlatformSessions(sdk);
    sessions.finishCareerRace({ trackId: 'neonAvenue', position: 2, bestLap: 58.1, time: 190.2 });
    sessions.retireCareerRace({ trackId: 'neonAvenue' });
    sessions.finishUnscoredRun({ trackId: 'iceFields', weekId: '2026-W47' });
    sessions.finishChallengeRun({ raceId: 'r1', score: 10569, time: 123.9, trackId: 'iceFields', weekId: '2026-W47' });
    assert.deepEqual(ended, [
        { score: 0, mode: 'career', track: 'neonAvenue', position: 2, best_lap: 58.1, time: 190.2 },
        { score: 0, mode: 'career_dnf', track: 'neonAvenue' },
        { score: 0, mode: 'challenge_unscored', track: 'iceFields', week_id: '2026-W47' },
        { score: 10569, mode: 'challenge', race_id: 'r1', time: 123.9, track: 'iceFields', week_id: '2026-W47' },
    ]);
});

test('alone, without the platform, nothing is sent and nothing breaks', () => {
    const sessions = new PlatformSessions(null);
    assert.doesNotThrow(() => {
        sessions.finishCareerRace({ trackId: 'duskValley', position: 1 });
        sessions.retireCareerRace({ trackId: 'duskValley' });
    });
});

test('the XP and the level ups the platform hands over reach the game once each; a guest gets no coins', async () => {
    const handlers = {};
    const sdk = { on: (name, handler) => { handlers[name] = handler; }, init: async () => {} };
    const sessions = new PlatformSessions(sdk);
    const got = [];
    sessions.onRewards({ onXp: (xp) => got.push(['xp', xp]), onLevelUp: (levelUp) => got.push(['level', levelUp]) });
    await sessions.connect();
    const xp = { xp_earned: 12.5 };
    handlers.showXPBanner(xp);
    handlers.showXPBanner(xp);
    handlers.showLevelUpModal({ new_level: 7, title: 'Speed Demon', coins_awarded: 50, user_data: { is_anonymous: false } });
    assert.deepEqual(got, [['xp', 12.5], ['level', { level: 7, title: 'Speed Demon', coins: 50 }]], 'the SDK fires twice: once is shown');
    assert.deepEqual(readLevelUp({ new_level: 3, coins_awarded: 50, user_data: { is_anonymous: true } }), { level: 3, title: '', coins: 0 });
});

test('the reward banners come one after the other, each for its time', () => {
    const banners = new RewardBanners();
    banners.add(xpBanner(12.5));
    banners.add(levelUpBanner({ level: 7, title: 'Speed Demon', coins: 50 }));
    assert.deepEqual(banners.current.lines.map((l) => l.text), ['+12.50 XP']);
    banners.update(3.6);
    assert.deepEqual(banners.current.lines.map((l) => l.text), ['LEVEL 7!', 'SPEED DEMON', '+50 COINS']);
    banners.update(5.1);
    assert.equal(banners.current, null);
    assert.deepEqual(levelUpBanner({ level: 2, title: '', coins: 0 }).lines.map((l) => l.text), ['LEVEL 2!'], 'no title, no coins: one line');
});

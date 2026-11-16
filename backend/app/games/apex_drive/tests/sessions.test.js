import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlatformSessions } from '../js/platform/PlatformSessions.js';

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

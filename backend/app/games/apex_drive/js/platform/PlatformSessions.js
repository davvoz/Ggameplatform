/**
 * The platform around the game (its SDK, platformsdk.js): one session per
 * race, reported at the flag (or when the race is left before it). A career
 * race scores nothing (its prize is credits); a challenge run reports the
 * points the server gave it, with the run's id, and the platform's
 * leaderboard checks them against that run (backend
 * app/game_score_validators.py). What each session sends also tells the
 * platform's ping how the race went (backend apex_drive_be/ping.py). Alone,
 * without the platform, every call does nothing.
 */
const LOG = '[Apex Drive]';

export class PlatformSessions {
    #sdk;

    constructor(sdk = globalThis.PlatformSDK ?? null) {
        this.#sdk = sdk;
    }

    /** Ties the game to the platform; does not wait long when there is none. */
    async connect(callbacks = {}) {
        if (!this.#sdk) return;
        try {
            await this.#sdk.init({ onStart: () => {}, onExit: () => {}, ...callbacks, timeout: 2500 });
        } catch (error) {
            console.error(LOG, 'SDK init failed', error);
        }
    }

    /**
     * Full screen as the platform does it (on the platform, the whole game
     * frame and its iOS fallback; alone, the page), as Stormrun and Nonna Commando.
     */
    toggleFullscreen(doc = globalThis.document) {
        if (this.#sdk?.toggleFullscreen) this.#sdk.toggleFullscreen();
        else if (doc.fullscreenElement) doc.exitFullscreen().catch(() => {});
        else doc.documentElement.requestFullscreen?.().catch(() => {});
    }

    /** A race starts: a new session. */
    startRace() {
        this.#sdk?.resetSession?.()?.catch?.((error) => console.error(LOG, 'session reset failed', error));
    }

    /**
     * A career race pays credits, not points: its session says how it went
     * (the platform's ping tells the place, not "0 points").
     * @param {{trackId: string, position: number, bestLap: number|null, time: number|null}} race
     */
    finishCareerRace({ trackId, position, bestLap = null, time = null }) {
        this.#sdk?.gameOver?.(0, { extra_data: { mode: 'career', track: trackId, position, best_lap: bestLap, time } });
    }

    /** A career race left before the flag. */
    retireCareerRace({ trackId }) {
        this.#sdk?.gameOver?.(0, { extra_data: { mode: 'career_dnf', track: trackId } });
    }

    /** A challenge run with no score: not finished, or refused by the server. */
    finishUnscoredRun({ trackId, weekId }) {
        this.#sdk?.gameOver?.(0, { extra_data: { mode: 'challenge_unscored', track: trackId, week_id: weekId } });
    }

    /** @param {{raceId: string, score: number, time: number, trackId: string, weekId: string}} run */
    finishChallengeRun({ raceId, score, time, trackId, weekId }) {
        this.#sdk?.gameOver?.(score, { extra_data: { mode: 'challenge', race_id: raceId, time, track: trackId, week_id: weekId } });
    }
}

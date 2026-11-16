/**
 * The platform around the game (its SDK, platformsdk.js): one session per
 * race, reported at the flag (or when the race is left before it). A career
 * race scores nothing (its prize is credits); a challenge run reports the
 * points the server gave it, with the run's id, and the platform's
 * leaderboard checks them against that run (backend
 * app/game_score_validators.py). What each session sends also tells the
 * platform's ping how the race went (backend apex_drive_be/ping.py). Alone,
 * without the platform, every call does nothing.
 *
 * After a session the platform hands the game the XP it earned and, now
 * and then, a level up: it draws neither, the game does (onRewards).
 */
const LOG = '[Apex Drive]';

/** A level up as the platform sends it: a guest gets no coins. */
export function readLevelUp({ new_level: level, title = '', coins_awarded: coins = 0, user_data: user } = {}) {
    return { level: Number(level) || 0, title: String(title ?? ''), coins: user?.is_anonymous ? 0 : Number(coins) || 0 };
}

/** The SDK fires its events twice with the same object: the handler runs once per object. */
function once(handler) {
    const seen = new WeakSet();
    return (payload) => {
        if (payload && typeof payload === 'object') {
            if (seen.has(payload)) return;
            seen.add(payload);
        }
        handler(payload);
    };
}

export class PlatformSessions {
    #sdk;
    #rewards = { onXp: () => {}, onLevelUp: () => {} };

    constructor(sdk = globalThis.PlatformSDK ?? null) {
        this.#sdk = sdk;
    }

    /** @param {{onXp: (xp: number) => void, onLevelUp: (levelUp: {level: number, title: string, coins: number}) => void}} rewards */
    onRewards(rewards) {
        this.#rewards = rewards;
    }

    /** Ties the game to the platform; does not wait long when there is none. */
    async connect(callbacks = {}) {
        if (!this.#sdk) return;
        try {
            this.#sdk.on?.('showXPBanner', once((payload) => this.#rewards.onXp(Number(payload?.xp_earned) || 0)));
            this.#sdk.on?.('showLevelUpModal', once((payload) => this.#rewards.onLevelUp(readLevelUp(payload))));
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

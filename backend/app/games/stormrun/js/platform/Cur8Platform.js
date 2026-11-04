import { fallbackSeed, isoWeekId } from './PlatformGateway.js';

/**
 * The platform through its SDK and public endpoints. Every call fails soft:
 * without a server the game keeps working, it only misses the leaderboard.
 *
 * @implements {import('./PlatformGateway.js').PlatformGateway}
 */

const GAME_ID = 'stormrun';
const WEEK_URL = '/api/stormrun/week';
const STANDINGS_URL = `/api/leaderboard/weekly?game_id=${GAME_ID}&limit=100`;
const STORAGE_KEY = 'stormrun.best';

async function fetchJson(url) {
    try {
        const response = await fetch(url);
        return response.ok ? await response.json() : null;
    } catch {
        return null;
    }
}

function readStoredBest() {
    try {
        return Number(globalThis.localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
        return 0;
    }
}

function writeStoredBest(metres) {
    try {
        globalThis.localStorage.setItem(STORAGE_KEY, String(metres));
    } catch {
        // private browsing: the record simply lasts for this visit
    }
}

export class Cur8Platform {
    #sdk = globalThis.PlatformSDK ?? null;
    #playerId = null;
    #callbacks = { onPause: () => {}, onResume: () => {} };

    async connect() {
        if (!this.#sdk) return;
        try {
            this.#sdk.on?.('config', (config) => this.#readConfig(config));
            await this.#sdk.init({
                onStart: () => {},
                onPause: () => this.#callbacks.onPause(),
                onResume: () => this.#callbacks.onResume(),
                onExit: () => {},
            });
            this.#readConfig(globalThis.platformConfig);
        } catch (error) {
            console.error('[Stormrun] SDK init failed', error);
        }
    }

    onLifecycle(callbacks) {
        this.#callbacks = callbacks;
    }

    async loadWeek() {
        const week = await fetchJson(WEEK_URL);
        if (week?.seed) return { weekId: week.week_id, seed: week.seed };
        const weekId = isoWeekId(new Date());
        return { weekId, seed: fallbackSeed(weekId) };
    }

    async loadBest() {
        const stored = readStoredBest();
        if (!this.#sdk?.loadProgress) return stored;
        try {
            const progress = await this.#sdk.loadProgress();
            return Math.max(stored, Number(progress?.best) || 0);
        } catch {
            return stored;
        }
    }

    saveBest(metres) {
        writeStoredBest(metres);
        this.#sdk?.saveProgress?.({ best: metres });
    }

    startRun() {
        this.#sdk?.resetSession?.().catch?.((error) => console.error('[Stormrun] session reset failed', error));
    }

    finishRun({ metres, drops, rainbows, perfectLandings, weekId }) {
        this.#sdk?.gameOver?.(metres, {
            extra_data: {
                distance: metres,
                coins_collected: drops,
                rainbows,
                perfect_landings: perfectLandings,
                week_id: weekId,
            },
        });
    }

    async loadStandings() {
        const data = await fetchJson(STANDINGS_URL);
        return (data?.leaderboard ?? []).map((entry) => ({
            rank: entry.rank,
            username: entry.username,
            metres: entry.score,
            isPlayer: this.#playerId !== null && entry.user_id === this.#playerId,
        }));
    }

    toggleFullscreen() {
        if (this.#sdk?.toggleFullscreen) {
            this.#sdk.toggleFullscreen();
        } else if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    }

    #readConfig(config) {
        this.#playerId = config?.userId ?? config?.user_id ?? this.#playerId;
    }
}

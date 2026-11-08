import { isoWeekId, weekSeed } from './PlatformGateway.js';

/**
 * The platform through its SDK and public endpoints. Every call fails soft:
 * without a server the game keeps working, it only misses the leaderboard.
 *
 * @implements {import('./PlatformGateway.js').PlatformGateway}
 */
const GAME_ID = 'nonna_commando';
const STANDINGS_URL = `/api/leaderboard/weekly?game_id=${GAME_ID}&limit=100`;
const STORAGE_KEY = 'nonna_commando.best';

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

function writeStoredBest(score) {
    try {
        globalThis.localStorage.setItem(STORAGE_KEY, String(score));
    } catch {
        // private browsing: the record lasts for this visit
    }
}

export class Cur8Platform {
    #sdk = globalThis.PlatformSDK ?? null;
    #playerId = null;
    #callbacks = { onPause: () => {}, onResume: () => {} };
    #rewards = { onXp: () => {}, onLevelUp: () => {} };
    #week = null;

    async connect() {
        if (!this.#sdk) return;
        try {
            this.#sdk.on?.('config', (config) => this.#readConfig(config));
            this.#sdk.on?.('showXPBanner', this.#once((payload) => this.#rewards.onXp(Number(payload?.xp_earned) || 0)));
            this.#sdk.on?.('showLevelUpModal', this.#once((payload) => this.#readLevelUp(payload)));
            await this.#sdk.init({
                onStart: () => {},
                onPause: () => this.#callbacks.onPause(),
                onResume: () => this.#callbacks.onResume(),
                onExit: () => {},
                // alone (no platform around it) the game should not wait long
                timeout: 2500,
            });
            this.#readConfig(globalThis.platformConfig);
        } catch (error) {
            console.error('[Nonna Commando] SDK init failed', error);
        }
    }

    onLifecycle(callbacks) {
        this.#callbacks = callbacks;
    }

    onRewards(callbacks) {
        this.#rewards = callbacks;
    }

    week() {
        if (!this.#week) {
            const weekId = isoWeekId(new Date());
            this.#week = { weekId, seed: weekSeed(weekId) };
        }
        return this.#week;
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

    saveBest(score) {
        writeStoredBest(score);
        this.#sdk?.saveProgress?.({ best: score });
    }

    startRun() {
        this.#sdk?.resetSession?.()?.catch?.((error) => console.error('[Nonna Commando] session reset failed', error));
    }

    /** @param {import('./PlatformGateway.js').RunReport} r */
    finishRun(r) {
        this.#sdk?.gameOver?.(r.score, {
            extra_data: {
                levels_completed: r.missionsCleared,
                reached_mission: r.reachedMission,
                enemies_defeated: r.kills,
                hostages_rescued: r.rescues,
                gold_teeth: r.teeth,
                best_multiplier: r.bestMultiplier,
                victory: r.victory,
                ticks: r.ticks,
                seed: r.seed,
                week_id: r.weekId,
            },
        });
    }

    async loadStandings() {
        const data = await fetchJson(STANDINGS_URL);
        return (data?.leaderboard ?? []).map((entry) => ({
            rank: entry.rank,
            username: entry.username,
            score: entry.score,
            isPlayer: this.#playerId !== null && entry.user_id === this.#playerId,
        }));
    }

    toggleFullscreen() {
        if (this.#sdk?.toggleFullscreen) this.#sdk.toggleFullscreen();
        else if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.().catch(() => {});
    }

    // the SDK fires these events twice with the same object
    #once(handler) {
        const seen = new WeakSet();
        return (payload) => {
            if (payload && typeof payload === 'object') {
                if (seen.has(payload)) return;
                seen.add(payload);
            }
            handler(payload);
        };
    }

    #readLevelUp({ new_level: level, title = '', coins_awarded: coins = 0, user_data: user } = {}) {
        this.#rewards.onLevelUp({ level, title, coins: user?.is_anonymous ? 0 : Number(coins) || 0 });
    }

    #readConfig(config) {
        this.#playerId = config?.userId ?? config?.user_id ?? this.#playerId;
    }
}

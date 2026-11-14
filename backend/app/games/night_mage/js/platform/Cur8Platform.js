import { isoWeekId, weekSeed } from './PlatformGateway.js';

/**
 * The platform through its SDK and the game's own endpoints. Every call
 * fails soft: without a server the game keeps working, it only misses the
 * leaderboard and the invaders.
 *
 * @implements {import('./PlatformGateway.js').PlatformGateway}
 */
const GAME_ID = 'night_mage';
const API = '/api/night_mage';
const STORAGE_KEY = 'night_mage.best';
const LOG = '[Night Mage]';

async function request(url, options = {}) {
    try {
        const response = await fetch(url, { credentials: 'same-origin', ...options });
        return response.ok ? await response.json() : null;
    } catch {
        return null;
    }
}

function postJson(url, body) {
    return request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
    #callbacks = { onPause: () => {}, onResume: () => {} };
    #rewards = { onXp: () => {}, onLevelUp: () => {} };
    #week = null;

    async connect() {
        if (!this.#sdk) return;
        try {
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
        } catch (error) {
            console.error(LOG, 'SDK init failed', error);
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
        this.#sdk?.resetSession?.()?.catch?.((error) => console.error(LOG, 'session reset failed', error));
    }

    finishRun(report) {
        this.#sdk?.gameOver?.(report.score, {
            extra_data: {
                wave_reached: report.wave,
                waves_cleared: report.wavesCleared,
                enemies_defeated: report.kills,
                best_combo: report.bestCombo,
                shots_down: report.shotsDown,
                invaders_slain: report.invadersSlain,
                ticks: report.ticks,
                seed: report.seed,
                week_id: report.weekId,
            },
        });
    }

    async loadInvaders(count) {
        const data = await request(`${API}/invaders?count=${count}`);
        return (data?.invaders ?? []).filter((i) => i && typeof i.id === 'string');
    }

    reportInvaders(outcomes) {
        if (outcomes.length === 0) return;
        postJson(`${API}/invaders/report`, { outcomes }).catch(() => {});
    }

    async sendInvader(kind, wave) {
        const data = await postJson(`${API}/invaders`, { kind, wave });
        return Boolean(data?.invader);
    }

    async loadInbox() {
        const data = await request(`${API}/me/invaders`);
        return data?.totals ?? null;
    }

    toggleFullscreen() {
        if (this.#sdk?.toggleFullscreen) this.#sdk.toggleFullscreen();
        else if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.().catch(() => {});
    }

    get gameId() {
        return GAME_ID;
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
}

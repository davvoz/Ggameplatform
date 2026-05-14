/**
 * Thin wrapper over the global PlatformSDK (loaded from /sdk/platformsdk.min.js).
 * All SDK-aware code in the game funnels through here so we can be replaced/mocked.
 *
 * Responsibilities:
 *   - SDK lifecycle (init, score reporting, level events)
 *   - Capture platform user identity (userId / username) from the `config` event
 *   - Server-authoritative deck persistence (4 slots) via /api/minion-clash/decks
 */
export class PlatformBridge {
    constructor() {
        this._sdk = globalThis.PlatformSDK ?? null;
        this._gameOverSent = false;
        this._userId = null;
        this._username = null;

        // Latch userId as soon as the platform pushes its config payload.
        this._onConfig = (cfg) => {
            if (!cfg || typeof cfg !== 'object') return;
            if (cfg.userId)   this._userId   = String(cfg.userId);
            if (cfg.username) this._username = String(cfg.username);
        };
        this._sdk?.on?.('config', this._onConfig);
    }

    async init() {
        if (!this._sdk?.init) return;
        try {
            await this._sdk.init({ timeout: 5000 });
        } catch (err) {
            console.warn('[minion_clash] PlatformSDK.init failed', err);
        }
        // Backfill in case the `config` event fired before our listener was attached.
        try {
            const cfg = this._sdk?.config ?? globalThis.platformConfig ?? null;
            if (cfg) this._onConfig(cfg);
        } catch (err) {
            console.debug('[minion_clash] config backfill skipped', err);
        }
    }

    on(evt, cb)  { this._sdk?.on?.(evt, cb); }
    off(evt, cb) { this._sdk?.off?.(evt, cb); }

    sendScore(score, meta) {
        try { this._sdk?.sendScore?.(score, meta); } catch (err) { console.warn(err); }
    }

    gameOver(score, meta) {
        if (this._gameOverSent) return;
        this._gameOverSent = true;
        try { this._sdk?.gameOver?.(score, meta); } catch (err) { console.warn(err); }
    }

    levelCompleted(level, meta) {
        try { this._sdk?.levelCompleted?.(level, meta); } catch (err) { console.warn(err); }
    }

    resetGameOver() { this._gameOverSent = false; }

    // ── Identity ────────────────────────────────────────────────

    getUserId()       { return this._userId; }
    getUsername()     { return this._username; }
    isAuthenticated() { return !!this._userId; }

    // ── Deck persistence (server is source of truth) ────────────

    /** Resolve API base URL. Parent shell exposes `config.API_URL`; falls back to same-origin. */
    _apiBase() {
        try {
            const parentCfg = window.parent?.config;
            if (parentCfg?.API_URL) return String(parentCfg.API_URL).replace(/\/+$/, '');
        } catch (err) {
            console.debug('[minion_clash] cross-origin parent.config unavailable', err);
        }
        return '';
    }

    /**
     * Resolve WebSocket base URL by transforming the API base. Falls back to
     * same-origin with the appropriate ws/wss scheme.
     */
    _wsBase() {
        const httpBase = this._apiBase();
        if (httpBase) {
            return httpBase.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
        }
        const proto = (typeof location === 'undefined' || location.protocol !== 'https:') ? 'ws:' : 'wss:';
        const host  = (typeof location === 'undefined') ? '' : location.host;
        return `${proto}//${host}`;
    }

    async _request(path, { method = 'GET', body = null } = {}) {
        const url  = this._apiBase() + path;
        const init = { method, headers: { 'Content-Type': 'application/json' } };
        if (body !== null) init.body = JSON.stringify(body);
        const res = await fetch(url, init);
        if (res.status === 204) return null;
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const msg = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
            throw new Error(msg);
        }
        return data;
    }

    /** GET all 4 deck slots for the current user. Returns null if not logged in. */
    async loadDecks() {
        if (!this._userId) return null;
        try {
            return await this._request(
                `/api/minion-clash/decks?user_id=${encodeURIComponent(this._userId)}`,
            );
        } catch (err) {
            console.warn('[minion_clash] loadDecks failed', err);
            return null;
        }
    }

    /**
     * Save a deck into a slot. Decks are pure card lists; the hero is
     * chosen at run-time in HeroSelectState and is NOT bound to the slot.
     * @param {number} slot 0..3
     * @param {{name?:string, card_ids:string[]}} payload
     * @returns {Promise<object|null>}
     */
    async saveDeck(slot, payload) {
        if (!this._userId) {
            console.warn('[minion_clash] saveDeck: no user logged in');
            return null;
        }
        try {
            return await this._request(`/api/minion-clash/decks/${slot}`, {
                method: 'PUT',
                body: {
                    user_id: this._userId,
                    name:     payload?.name ?? '',
                    card_ids: Array.isArray(payload?.card_ids) ? payload.card_ids : [],
                },
            });
        } catch (err) {
            console.warn('[minion_clash] saveDeck failed', err);
            throw err;  // surface to UI so user sees the validation error
        }
    }

    /** DELETE a deck slot. Returns true on success. */
    async deleteDeck(slot) {
        if (!this._userId) return false;
        try {
            await this._request(
                `/api/minion-clash/decks/${slot}?user_id=${encodeURIComponent(this._userId)}`,
                { method: 'DELETE' },
            );
            return true;
        } catch (err) {
            console.warn('[minion_clash] deleteDeck failed', err);
            return false;
        }
    }
}

/**
 * Thin wrapper over the global PlatformSDK. All SDK-aware code funnels here.
 */
export class PlatformBridge {
    constructor() {
        this._sdk = globalThis.PlatformSDK ?? null;
        this._gameOverSent = false;
        this._userId   = null;
        this._username = null;
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
            console.warn('[roulette] PlatformSDK.init failed', err);
        }
        try {
            const cfg = this._sdk.config ?? globalThis.platformConfig ?? null;
            if (cfg) this._onConfig(cfg);
        } catch (err) {
            console.debug('[roulette] config backfill skipped', err);
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

    resetGameOver() { this._gameOverSent = false; }

    async resetSession() {
        try { await this._sdk?.resetSession?.(); }
        catch (err) { console.warn('[roulette] resetSession failed', err); }
    }

    getUserId() { return this._userId; }
    getUsername() { return this._username; }
}

/**
 * Wraps the global PlatformSDK. Isolates the game from SDK churn.
 * Documented methods used: init(), sendScore(score, meta), gameOver(finalScore, meta),
 * on/off('start'|'pause'|'resume'|'exit'|'config'), getState().
 *
 * Coin API mirrors the pattern used in the Seven game:
 *   GET  /api/coins/:userId/balance
 *   POST /api/coins/:userId/spend   { amount, transaction_type, source_id, description }
 *   POST /api/coins/:userId/award   { amount, transaction_type, source_id, description }
 */
export class PlatformBridge {
    constructor() {
        this.sdk = globalThis.PlatformSDK || null;
        this.userId = null;
        this.username = null;
        this.gameOverSent = false;
        this._listeners = new Map();
    }

    isAvailable() {
        return Boolean(this.sdk);
    }

    async init() {
        if (!this.sdk) {
            console.warn('[PlatformBridge] PlatformSDK not present; running detached.');
            return;
        }
        try {
            await this.sdk.init();
            const state = this.sdk.getState?.();
            if (state?.user) {
                this.userId = state.user.user_id || null;
                this.username = state.user.username || null;
            }
            // Also capture userId from 'config' event (fallback)
            this.on('config', (cfg) => {
                if (cfg?.user) {
                    this.userId = cfg.user.user_id || this.userId;
                    this.username = cfg.user.username || this.username;
                }
                // Some SDK versions nest userId directly
                if (!this.userId && cfg?.userId) {
                    this.userId = cfg.userId;
                }
            });
        } catch (err) {
            console.warn('[PlatformBridge] init failed:', err);
        }

        // Last-resort fallbacks for userId
        if (!this.userId && globalThis.platformConfig?.userId) {
            this.userId = globalThis.platformConfig.userId;
        }
        if (!this.userId && this.sdk?.getConfig) {
            this.userId = this.sdk.getConfig()?.userId ?? null;
        }
    }

    // ── Coin API ─────────────────────────────────────────────────────────────

    _ensureUserId() {
        if (this.userId) return this.userId;
        if (globalThis.platformConfig?.userId) {
            this.userId = globalThis.platformConfig.userId;
            return this.userId;
        }
        if (this.sdk?.getConfig) {
            const cfg = this.sdk.getConfig();
            if (cfg?.userId) { this.userId = cfg.userId; return this.userId; }
        }
        return null;
    }

    async getUserBalance() {
        const userId = this._ensureUserId();
        if (!userId) { console.warn('[PlatformBridge] getUserBalance: no userId'); return null; }
        try {
            const res = await fetch(`/api/coins/${userId}/balance`, { credentials: 'include' });
            if (!res.ok) return null;
            const data = await res.json();
            return data.balance ?? null;
        } catch (err) {
            console.warn('[PlatformBridge] getUserBalance failed:', err);
            return null;
        }
    }

    async spendCoins(amount, description = 'Slot bet') {
        const userId = this._ensureUserId();
        if (!userId) { console.warn('[PlatformBridge] spendCoins: no userId'); return false; }
        try {
            const res = await fetch(`/api/coins/${userId}/spend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    amount,
                    transaction_type: 'game_bet',
                    source_id: 'slot_machine',
                    description
                })
            });
            return res.ok;
        } catch (err) {
            console.warn('[PlatformBridge] spendCoins failed:', err);
            return false;
        }
    }

    async awardCoins(amount, description = 'Slot win') {
        const userId = this._ensureUserId();
        if (!userId) { console.warn('[PlatformBridge] awardCoins: no userId'); return false; }
        try {
            const res = await fetch(`/api/coins/${userId}/award`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    amount: Math.floor(amount),
                    transaction_type: 'game_win',
                    source_id: 'slot_machine',
                    description
                })
            });
            return res.ok;
        } catch (err) {
            console.warn('[PlatformBridge] awardCoins failed:', err);
            return false;
        }
    }

    // ── Session lifecycle ─────────────────────────────────────────────────────

    /**
     * Opens a new server-side game session.
     * runtimeShell.startGameSession() → POST /users/sessions/start.
     * Required before gameOver() so the backend can generate XP and fire showXPBanner.
     * Also clears the gameOverSent guard so the matching gameOver() can fire.
     */
    async resetSession() {
        this.gameOverSent = false;
        try { await this.sdk?.resetSession?.(); } catch (err) {
            console.warn('[PlatformBridge] resetSession failed:', err);
        }
    }

    // ── SDK event wrappers ────────────────────────────────────────────────────

    on(event, fn) {
        if (!this.sdk?.on) return;
        // Remove any previous listener for this event before adding the new one
        // to prevent leaked handlers on the SDK when on() is called more than once.
        const prev = this._listeners.get(event);
        if (prev && this.sdk?.off) this.sdk.off(event, prev);
        this.sdk.on(event, fn);
        this._listeners.set(event, fn);
    }

    off(event) {
        const fn = this._listeners.get(event);
        if (fn && this.sdk?.off) this.sdk.off(event, fn);
        this._listeners.delete(event);
    }

    sendScore(score, meta = {}) {
        if (this.gameOverSent || !this.sdk?.sendScore) return;
        try { this.sdk.sendScore(score, meta); } catch (e) {
            console.warn('[PlatformBridge] sendScore failed:', e);
        }
    }

    gameOver(finalScore, meta = {}) {
        if (this.gameOverSent || !this.sdk?.gameOver) return;
        this.gameOverSent = true;
        try { this.sdk.gameOver(finalScore, meta); } catch (e) {
            console.warn('[PlatformBridge] gameOver failed:', e);
        }
    }
}

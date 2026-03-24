/**
 * Platform SDK Adapter for Sette e Mezzo.
 * Dependency Inversion: abstracts the external PlatformSDK behind a clean interface.
 * Handles session lifecycle, coin transactions, and platform communication.
 */
export class PlatformSDKAdapter {
    #sdk;
    #userId = null;
    #sessionId = null;
    #parentOrigin = null;

    constructor() {
        this.#sdk = window.PlatformSDK;
        this.#parentOrigin = this.#getParentOrigin();
    }

    #getParentOrigin() {
        try {
            if (document.referrer) {
                return new URL(document.referrer).origin;
            }
        } catch (e) {
            console.warn('[PlatformSDKAdapter] Could not determine parent origin:', e);
        }
        return null;
    }

    // ── Availability ──

    isAvailable() {
        return Boolean(this.#sdk);
    }

    get userId() { return this.#userId; }
    get sessionId() { return this.#sessionId; }

    // ── Initialization ──

    async initialize(callbacks = {}) {
        if (!this.isAvailable()) {
            throw new Error('Platform SDK not available');
        }

        this.#sdk.on('config', (config) => {
            if (config?.userId) {
                this.#userId = config.userId;
            }
        });

        await this.#sdk.init(callbacks);

        if (!this.#userId) {
            this.#resolveUserId();
        }
    }

    // ── Score & Game events ──

    async sendScore(score, extraData) {
        if (!this.isAvailable()) return;
        try {
            await this.#sdk.sendScore(score, { extra_data: extraData });
        } catch (_) { /* non-blocking */ }
    }

    sendGameStarted() {
        if (!this.#parentOrigin) return;
        try {
            window.parent.postMessage({
                type: 'gameStarted',
                payload: {},
                timestamp: Date.now(),
                protocolVersion: '1.0.0',
            }, this.#parentOrigin);
        } catch (e) {
            console.error('[PlatformSDKAdapter] Error sending gameStarted:', e);
        }
    }

    async gameOver(score, extraData) {
        if (!this.isAvailable()) return;
        try {
            await this.#sdk.gameOver(score, { extra_data: extraData });
        } catch (_) { /* non-blocking */ }
    }

    async resetSession() {
        if (!this.isAvailable()) return;
        try {
            await this.#sdk.resetSession();
        } catch (_) { /* non-blocking */ }
    }

    // ── Coin API ──

    async getUserBalance() {
        try {
            const userId = this.#ensureUserId();
            if (!userId) return null;

            const res = await fetch(`/api/coins/${userId}/balance`, {
                credentials: 'include',
            });
            if (!res.ok) return null;

            const data = await res.json();
            return data.balance;
        } catch (e) {
            console.error('[PlatformSDKAdapter] Exception getting balance:', e);
            return null;
        }
    }

    async spendCoins(amount, description = 'Game bet') {
        try {
            const userId = this.#ensureUserId();
            if (!userId) return false;

            const res = await fetch(`/api/coins/${userId}/spend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    amount,
                    transaction_type: 'game_bet',
                    source_id: 'setteemezzo',
                    description,
                }),
            });
            return res.ok;
        } catch (e) {
            console.error('[PlatformSDKAdapter] Failed to spend coins:', e);
            return false;
        }
    }

    async awardCoins(amount, description = 'Game win') {
        try {
            const userId = this.#ensureUserId();
            if (!userId) return false;

            const res = await fetch(`/api/coins/${userId}/award`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    amount: Number.parseInt(amount),
                    transaction_type: 'game_win',
                    source_id: 'setteemezzo',
                    description: String(description),
                }),
            });
            return res.ok;
        } catch (e) {
            console.error('[PlatformSDKAdapter] Failed to award coins:', e);
            return false;
        }
    }

    // ── Session API ──

    async startSession() {
        try {
            const userId = this.#ensureUserId();
            if (!userId) return null;

            const res = await fetch('/users/sessions/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: userId,
                    game_id: 'setteemezzo',
                }),
            });
            if (!res.ok) return null;

            const data = await res.json();
            this.#sessionId = data.session.session_id;
            return data.session;
        } catch (e) {
            console.error('[PlatformSDKAdapter] Exception starting session:', e);
            return null;
        }
    }

    async endSession(score, extraData = null) {
        try {
            if (!this.#sessionId) return null;

            const res = await fetch('/users/sessions/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    session_id: this.#sessionId,
                    score: Math.floor(score),
                    duration_seconds: 1,
                    extra_data: extraData || {},
                }),
            });
            if (!res.ok) return null;

            const data = await res.json();
            this.#sessionId = null;
            return data.session;
        } catch (e) {
            console.error('[PlatformSDKAdapter] Exception ending session:', e);
            return null;
        }
    }

    // ── XP notification ──

    showXPNotification(xpAmount, sessionData) {
        if (!this.isAvailable() || !this.#parentOrigin) return;
        try {
            window.parent.postMessage({
                type: 'showXPBanner',
                payload: {
                    xp_earned: xpAmount,
                    xp_breakdown: sessionData?.xp_breakdown || [],
                    extra_data: sessionData?.metadata || sessionData?.extra_data || null,
                },
                timestamp: Date.now(),
                protocolVersion: '1.0.0',
            }, this.#parentOrigin);
        } catch (e) {
            console.error('[PlatformSDKAdapter] Error showing XP notification:', e);
        }
    }

    // ── Private helpers ──

    #ensureUserId() {
        if (this.#userId) return this.#userId;
        this.#resolveUserId();
        return this.#userId;
    }

    #resolveUserId() {
        if (window.platformConfig?.userId) {
            this.#userId = window.platformConfig.userId;
            return;
        }
        if (this.#sdk?.getConfig) {
            const cfg = this.#sdk.getConfig();
            if (cfg?.userId) {
                this.#userId = cfg.userId;
                return;
            }
        }
        const stored = localStorage.getItem('platformUserId');
        if (stored) {
            this.#userId = stored;
        }
    }
}

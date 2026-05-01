import { PlatformNotifications } from './PlatformNotifications.js';
import { PlatformIdentity } from './PlatformIdentity.js';

const PROTOCOL_VERSION = '1.0.0';
const SDK_INIT_TIMEOUT_MS = 5000;

/**
 * Thin wrapper over the global PlatformSDK loaded by index.html.
 * Falls back to no-op when the SDK is not present (local dev / standalone).
 *
 * SRP: only platform plumbing. DOM-side notifications live in
 * {@link PlatformNotifications}; this class never touches the DOM directly.
 */
export class PlatformBridge {
    #sdk;
    #parentOrigin = null;
    #sessionEnabled = true;
    #initPromise = null;

    constructor() {
        this.#sdk = (typeof globalThis !== 'undefined' && globalThis.PlatformSDK)
            ? globalThis.PlatformSDK
            : null;
        this.ready = false;
        this.#parentOrigin = PlatformBridge.#resolveParentOrigin();
    }

    /**
     * Enable or disable platform session reporting (gameStarted / score / gameOver).
     * Used to suppress XP / leaderboard side-effects in standalone modes
     * (e.g. community UGC boards, in-editor test plays).
     * @param {boolean} enabled
     */
    setSessionEnabled(enabled) {
        this.#sessionEnabled = Boolean(enabled);
    }

    /** @returns {boolean} */
    isSessionEnabled() { return this.#sessionEnabled; }

    /** @returns {string|null} */
    static #resolveParentOrigin() {
        try {
            if (document.referrer) return new URL(document.referrer).origin;
        } catch (err) {
            console.warn('[PlatformBridge] Failed to resolve parent origin from referrer:', err);
        }
        return null;
    }

    isAvailable() { return Boolean(this.#sdk); }

    async initialize() {
        if (this.#initPromise) return this.#initPromise;
        if (!this.#sdk || typeof this.#sdk.init !== 'function') return;

        this.#initPromise = (async () => {
            window.addEventListener('message', (event) => this.#onMessage(event));
            await this.#safeCall('init', () => this.#sdk.init({ timeout: SDK_INIT_TIMEOUT_MS }));
            this.ready = true;
        })();
        return this.#initPromise;
    }

    on(evt, cb) {
        if (this.#sdk && typeof this.#sdk.on === 'function') this.#sdk.on(evt, cb);
    }

    sendGameStarted() {
        if (!this.#sessionEnabled) return;
        if (!this.#parentOrigin) return;
        this.#safeSync('postMessage(gameStarted)', () => {
            window.parent.postMessage({
                type: 'gameStarted',
                payload: {},
                timestamp: Date.now(),
                protocolVersion: PROTOCOL_VERSION,
            }, this.#parentOrigin);
        });
    }

    sendScore(score, meta = {}) {
        if (!this.#sessionEnabled) return;
        if (!this.ready) return;
        this.#safeSync('sendScore', () => this.#sdk.sendScore(score, meta));
    }

    gameOver(score, meta = {}) {
        if (!this.#sessionEnabled) return;
        if (!this.ready) return;
        this.#safeSync('gameOver', () => this.#sdk.gameOver(score, meta));
    }

    /** @private */
    #onMessage(event) {
        const data = event.data;
        if (!data?.type) return;
        if (data.protocolVersion !== PROTOCOL_VERSION) return;
        if (this.#parentOrigin && event.origin !== this.#parentOrigin) return;
        if (!this.#parentOrigin && event.origin) this.#parentOrigin = event.origin;

        if (data.type === 'showXPBanner' && data.payload) {
            PlatformNotifications.showXPBanner(data.payload.xp_earned);
        } else if (data.type === 'showLevelUpModal' && data.payload) {
            PlatformNotifications.showLevelUpNotification(data.payload);
        } else if (data.type === 'config' && data.payload) {
            // Platform pushes the authenticated user identity here.
            // Source of truth — replaces the previous localStorage lookup.
            PlatformIdentity.set({
                userId: data.payload.userId ?? null,
                username: data.payload.username ?? null,
            });
        }
    }

    /** @private */
    #safeSync(name, fn) {
        try { fn(); }
        catch (err) { console.warn(`[PlatformBridge] ${name} failed:`, err); }
    }

    /** @private */
    async #safeCall(name, fn) {
        try { await fn(); }
        catch (err) { console.warn(`[PlatformBridge] ${name} failed:`, err); }
    }
}

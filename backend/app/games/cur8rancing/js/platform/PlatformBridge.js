/**
 * Thin wrapper over the global PlatformSDK (loaded as a classic script before
 * the module graph). Every SDK-aware call funnels through here so the game can
 * be mocked/replaced and so `gameOver` is guaranteed to fire exactly once.
 */
export class PlatformBridge {
    constructor() {
        this._sdk = globalThis.PlatformSDK ?? null;
        this._gameOverSent = false;
    }

    /** Initialize the SDK. Resolves even if the platform is absent. */
    async init() {
        if (!this._sdk?.init) return;
        try {
            await this._sdk.init({ timeout: 5000 });
        } catch (err) {
            console.warn('[cur8rancing] PlatformSDK.init failed', err);
        }
    }

    /**
     * @param {string} evt
     * @param {(payload:any)=>void} cb
     */
    on(evt, cb) {
        this._sdk?.on?.(evt, cb);
    }

    /**
     * @param {string} evt
     * @param {(payload:any)=>void} cb
     */
    off(evt, cb) {
        this._sdk?.off?.(evt, cb);
    }

    /**
     * Fire-and-forget score update.
     * @param {number} score
     * @param {object} [meta]
     */
    sendScore(score, meta) {
        try { this._sdk?.sendScore?.(score, meta); } catch (err) { console.warn(err); }
    }

    /**
     * Report the final result. Subsequent calls are ignored.
     * @param {number} score
     * @param {object} [meta]
     */
    gameOver(score, meta) {
        if (this._gameOverSent) return;
        this._gameOverSent = true;
        try { this._sdk?.gameOver?.(score, meta); } catch (err) { console.warn(err); }
    }

    /** Allow a fresh session to report game over again. */
    resetGameOver() {
        this._gameOverSent = false;
    }
}

/**
 * In-memory holder for the platform-authenticated identity.
 *
 * SRP: owns ONLY the current user_id + username for the lifetime of the page.
 * No persistence (no localStorage / cookies). The values are written by
 * {@link PlatformBridge} when it receives the platform's `config` postMessage.
 *
 * Read by data-layer clients that need to forward `?user_id=` to the backend
 * (BoardApiClient, EditorBoardApi). When the game runs outside the platform
 * (direct URL), identity stays null → the backend will reject mutating calls
 * with 401, which is the intended behavior.
 */
let _userId = null;
let _username = null;

export const PlatformIdentity = {
    /** @returns {string|null} */
    getUserId() { return _userId; },

    /** @returns {string|null} */
    getUsername() { return _username; },

    /**
     * Replace the current identity. Called by PlatformBridge on `config`.
     * Pass nulls to clear.
     * @param {{userId?: string|null, username?: string|null}} info
     */
    set(info) {
        _userId = info?.userId ?? null;
        _username = info?.username ?? null;
    },

    /** Drop any in-memory identity (e.g. on logout/exit). */
    clear() { _userId = null; _username = null; },
};

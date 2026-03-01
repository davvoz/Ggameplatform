/**
 * PlatformCoinService — Thin adapter for platform coin operations.
 *
 * Responsibilities:
 *   • Fetch user balance
 *   • Spend coins (with server-side validation)
 *   • Cache balance locally to minimise round-trips
 *
 * Follows the same pattern used by the "seven" game's PlatformSDKAdapter
 * but scoped to the coin features only, keeping it lightweight & reusable.
 */
class PlatformCoinService {
    constructor() {
        /** @type {number|null} */
        this._balance = null;
        /** @type {string|null} */
        this._userId = null;
    }

    // ──────────────────────── Init ────────────────────────

    /** Resolve the userId from the platform config chain. */
    _ensureUserId() {
        if (this._userId) return this._userId;

        // 1. window.platformConfig (set by PlatformSDK on config event)
        if (window.platformConfig?.userId) {
            this._userId = window.platformConfig.userId;
            return this._userId;
        }

        // 2. PlatformSDK.getConfig()
        if (typeof PlatformSDK !== 'undefined' && PlatformSDK.getConfig) {
            const cfg = PlatformSDK.getConfig();
            if (cfg?.userId) {
                this._userId = cfg.userId;
                return this._userId;
            }
        }

        // 3. localStorage fallback
        const stored = localStorage.getItem('platformUserId');
        if (stored) {
            this._userId = stored;
            return this._userId;
        }

        return null;
    }

    /** True when the platform provides a userId (coins are available). */
    isAvailable() {
        return Boolean(this._ensureUserId());
    }

    // ──────────────────────── Balance ────────────────────────

    /**
     * Fetch the current coin balance from the server.
     * @returns {Promise<number>} Balance, or 0 on error.
     */
    async fetchBalance() {
        const userId = this._ensureUserId();
        if (!userId) return 0;

        try {
            const res = await fetch(`/api/coins/${userId}/balance`, { credentials: 'include' });
            if (!res.ok) return this._balance ?? 0;
            const data = await res.json();
            this._balance = data.balance ?? 0;
            return this._balance;
        } catch {
            return this._balance ?? 0;
        }
    }

    /** Cached balance (call fetchBalance at least once first). */
    get balance() {
        return this._balance ?? 0;
    }

    // ──────────────────────── Spend ────────────────────────

    /**
     * Attempt to spend `amount` coins.
     * @param {number} amount
     * @param {string} description  Human-readable reason.
     * @returns {Promise<boolean>} true if the transaction succeeded.
     */
    async spendCoins(amount, description = 'Perk reroll') {
        const userId = this._ensureUserId();
        if (!userId) return false;

        try {
            const res = await fetch(`/api/coins/${userId}/spend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    amount,
                    transaction_type: 'game_bet',
                    source_id: 'space_shooter_2',
                    description
                })
            });

            if (!res.ok) return false;

            // Optimistic local update
            if (this._balance !== null) this._balance -= amount;
            return true;
        } catch {
            return false;
        }
    }
}

export default PlatformCoinService;

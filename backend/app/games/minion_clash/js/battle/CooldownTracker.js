/**
 * Tracks per-card cooldowns (in seconds). A card is in cooldown after being
 * played; once cooldown expires it can be redrawn from the Deck into the Hand.
 */
export class CooldownTracker {
    constructor() { this._cd = new Map(); }

    set(cardId, seconds) { this._cd.set(cardId, seconds); }
    isOnCooldown(cardId) { return (this._cd.get(cardId) ?? 0) > 0; }

    update(dt) {
        for (const [k, v] of this._cd.entries()) {
            const next = v - dt;
            if (next <= 0) this._cd.delete(k);
            else this._cd.set(k, next);
        }
    }

    activeIds() { return new Set(this._cd.keys()); }
    /** Returns 0..1 ratio (1=just played, 0=ready). Returns 0 for inactive ids. */
    progress(cardId, baseCooldown) {
        const v = this._cd.get(cardId);
        if (!v || baseCooldown <= 0) return 0;
        return Math.max(0, Math.min(1, v / baseCooldown));
    }
}

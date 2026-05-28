/**
 * Manages placed chips on the table during a betting round.
 * Each bet instance: { typeId, numbers: number[]|null, amount, multiplier? }
 *
 * Chip placement and amount semantics are HERE — not in states.
 */
export class ChipManager {
    constructor(config) {
        this._config = config;
        this._placedBets = [];
        this._lastBets = [];
    }

    /**
     * Add a chip to a bet. If a matching (typeId + numbers signature) bet exists,
     * stacks the amount onto it. Otherwise creates a new entry.
     */
    place(typeId, numbers, amount, options = {}) {
        if (!typeId)            throw new Error('ChipManager.place: typeId required');
        if (amount <= 0)        throw new Error('ChipManager.place: amount must be > 0');
        const key = this._key(typeId, numbers);
        const existing = this._placedBets.find(b => this._key(b.typeId, b.numbers) === key);
        if (existing) {
            existing.amount += amount;
            return existing;
        }
        const bet = {
            typeId,
            numbers: numbers ? [...numbers] : null,
            amount,
            multiplier: options.multiplier ?? 1,
            vfx: options.vfx ?? null,
        };
        this._placedBets.push(bet);
        return bet;
    }

    clear() {
        this._placedBets = [];
    }

    snapshot() {
        // Called before resolution to remember bets for "rebet".
        this._lastBets = this._placedBets.map(b => ({
            typeId:     b.typeId,
            numbers:    b.numbers ? [...b.numbers] : null,
            amount:     b.amount,
            multiplier: b.multiplier,
            vfx:        b.vfx,
        }));
    }

    /** Re-apply last round's bets. Returns the total wager so caller can validate balance. */
    rebet() {
        this._placedBets = this._lastBets.map(b => ({
            typeId:     b.typeId,
            numbers:    b.numbers ? [...b.numbers] : null,
            amount:     b.amount,
            multiplier: b.multiplier,
            vfx:        b.vfx,
        }));
        return this.totalWagered();
    }

    hasLastBets() { return this._lastBets.length > 0; }

    totalWagered() {
        return this._placedBets.reduce((s, b) => s + b.amount, 0);
    }

    getBets() { return this._placedBets; }

    _key(typeId, numbers) {
        const numStr = numbers ? [...numbers].sort((a, b) => a - b).join(',') : '_';
        return `${typeId}|${numStr}`;
    }
}

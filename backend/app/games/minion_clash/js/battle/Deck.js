/**
 * Deck (draw pile) — cycles forever. Holds card ids in shuffled order.
 * Cards in cooldown are tracked separately by CooldownTracker.
 */
export class Deck {
    constructor(cardIds) {
        if (!Array.isArray(cardIds) || cardIds.length === 0) {
            throw new Error('Deck: cardIds must be non-empty');
        }
        this._all = cardIds.slice();
        this._draw = this._shuffle(cardIds.slice());
    }

    drawNext(skipSet) {
        // Skip cards currently in `skipSet` (e.g., already in hand or on cooldown).
        for (let i = 0; i < this._draw.length; i++) {
            const c = this._draw[i];
            if (!skipSet.has(c)) {
                this._draw.splice(i, 1);
                return c;
            }
        }
        // Draw pile exhausted of valid cards: refill from full deck minus skip.
        this._draw = this._shuffle(this._all.filter((c) => !skipSet.has(c)));
        return this._draw.length > 0 ? this._draw.shift() : null;
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    all() { return this._all.slice(); }
}

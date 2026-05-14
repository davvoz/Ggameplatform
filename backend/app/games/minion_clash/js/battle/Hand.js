import { GameConfig } from '../config/GameConfig.js';

/**
 * Hand: fixed-size slot list. Each slot holds either a cardId or null.
 * Refilled from the Deck (skipping cards currently held or on cooldown).
 */
export class Hand {
    constructor(deck, cooldowns) {
        this._slots = new Array(GameConfig.UI.HAND_SLOTS).fill(null);
        this._deck = deck;
        this._cd = cooldowns;
    }

    get size() { return this._slots.length; }
    get slots() { return this._slots; }

    fill() { this._refill(); }

    cardAt(index) { return this._slots[index]; }

    play(index) {
        const c = this._slots[index];
        if (!c) return null;
        this._slots[index] = null;
        return c;
    }

    update() { this._refill(); }

    _refill() {
        for (let i = 0; i < this._slots.length; i++) {
            if (this._slots[i] === null) this._slots[i] = this._drawNext();
        }
    }

    _drawNext() {
        const skip = new Set(this._cd.activeIds());
        for (const s of this._slots) if (s) skip.add(s);
        return this._deck.drawNext(skip);
    }
}

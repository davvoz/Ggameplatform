import { Card, Suit } from './Card.js';

/**
 * A standard 40-card Neapolitan deck.
 * Fisher-Yates shuffle for fairness.
 */
export class Deck {
    #cards = [];

    constructor() {
        this.reset();
    }

    /** Rebuild and shuffle the deck. */
    reset() {
        this.#cards = [];
        const suits = Object.values(Suit);
        for (const suit of suits) {
            for (let rank = 1; rank <= 10; rank++) {
                this.#cards.push(new Card(rank, suit));
            }
        }
        this.shuffle();
    }

    /** Fisher-Yates shuffle. */
    shuffle() {
        const arr = this.#cards;
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(window.randomSecure() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    /** Draw a card from the top. Returns null if empty. */
    draw() {
        return this.#cards.pop() ?? null;
    }

    get remaining() { return this.#cards.length; }
}

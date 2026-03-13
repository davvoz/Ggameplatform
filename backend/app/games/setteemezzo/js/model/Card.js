/**
 * Italian card suits and values for Sette e Mezzo.
 * Uses a 40-card Neapolitan deck.
 */

export const Suit = Object.freeze({
    DENARI:  'denari',
    COPPE:   'coppe',
    BASTONI: 'bastoni',
    SPADE:   'spade',
});

export const SUIT_SYMBOLS = Object.freeze({
    [Suit.DENARI]:  '🪙',
    [Suit.COPPE]:   '🏆',
    [Suit.BASTONI]: '🪵',
    [Suit.SPADE]:   '⚔️',
});

export const SUIT_COLORS = Object.freeze({
    [Suit.DENARI]:  '#d4af37',
    [Suit.COPPE]:   '#4a9eff',
    [Suit.BASTONI]: '#8B4513',
    [Suit.SPADE]:   '#c0c0c0',
});

/**
 * Face card names (8 = Fante, 9 = Cavallo, 10 = Re).
 * In 7½, face cards are worth 0.5.
 */
const FACE_NAMES = { 8: 'F', 9: 'C', 10: 'R' };

export class Card {
    #rank;    // 1–10
    #suit;
    #faceUp;

    constructor(rank, suit) {
        this.#rank = rank;
        this.#suit = suit;
        this.#faceUp = false;
    }

    get rank() { return this.#rank; }
    get suit() { return this.#suit; }
    get faceUp() { return this.#faceUp; }
    set faceUp(v) { this.#faceUp = !!v; }

    /** Sette e Mezzo value: 1–7 at face value, figure cards = 0.5. */
    get value() {
        return this.#rank >= 8 ? 0.5 : this.#rank;
    }

    /** Display label: rank number or face letter. */
    get label() {
        return FACE_NAMES[this.#rank] ?? String(this.#rank);
    }

    get suitSymbol() {
        return SUIT_SYMBOLS[this.#suit];
    }

    get suitColor() {
        return SUIT_COLORS[this.#suit];
    }

    get isFaceCard() {
        return this.#rank >= 8;
    }
}

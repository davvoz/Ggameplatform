/**
 * Represents a hand in Sette e Mezzo — either player or dealer.
 */
export class Hand {
    #cards = [];

    get cards() { return [...this.#cards]; }
    get count() { return this.#cards.length; }

    /** Total value of all face-up cards. */
    get score() {
        return this.#cards
            .filter(c => c.faceUp)
            .reduce((sum, c) => sum + c.value, 0);
    }

    /** True total including face-down cards. */
    get trueScore() {
        return this.#cards.reduce((sum, c) => sum + c.value, 0);
    }

    get busted() {
        return this.trueScore > 7.5;
    }

    get setteEMezzo() {
        return this.trueScore === 7.5;
    }

    addCard(card) {
        this.#cards.push(card);
    }

    revealAll() {
        for (const c of this.#cards) c.faceUp = true;
    }

    clear() {
        this.#cards.length = 0;
    }
}

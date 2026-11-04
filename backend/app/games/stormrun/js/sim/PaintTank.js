/** The colour the blob carries: one band per drop, a full tank is a rainbow. */
export class PaintTank {
    #capacity;
    bands = 0;

    /** @param {number} capacity */
    constructor(capacity) {
        this.#capacity = capacity;
    }

    /** @returns {boolean} true when this drop completes a rainbow */
    addBand() {
        this.bands++;
        if (this.bands < this.#capacity) return false;
        this.bands = 0;
        return true;
    }

    /** @returns {boolean} true when a band was actually lost */
    loseBand() {
        if (this.bands === 0) return false;
        this.bands--;
        return true;
    }
}

import { STORM, WORLD } from '../config/Tuning.js';

/**
 * The mage's ultimate. Every hit fills it, and a lost heart a little more; once full it can be called: a
 * lightning falls on every monster in sight, nearest to the mage first.
 * Pure state, driven by the simulation.
 */
export class Storm {
    charge = 0;
    /** Hits that fill it this night (boons lower it). */
    needed = STORM.charge;
    /** Lightnings still to fall: `{targetId, at}`, `at` in seconds since the call. */
    strikes = [];
    time = 0;
    calls = 0;

    get ready() {
        return this.charge >= this.needed;
    }

    get active() {
        return this.strikes.length > 0;
    }

    /** From 0 (empty) to 1 (ready). */
    get fill() {
        return Math.min(1, this.charge / this.needed);
    }

    /** A hit landed. @returns {boolean} true when this hit filled it */
    addHit() {
        if (this.ready || this.active) return false;
        this.charge += 1;
        return this.ready;
    }

    /** Pain feeds it too (a lost heart). @returns {number} the charge it actually took */
    feed(amount) {
        if (this.ready || this.active) return 0;
        const gained = Math.min(amount, this.needed - this.charge);
        this.charge += gained;
        return gained;
    }

    /**
     * Calls it on the monsters on screen.
     * @param {{id: number, x: number, alive: boolean}[]} enemies
     * @param {number} fromX where the mage stands
     * @returns {boolean} false when it is not full or nothing is in sight (the charge is kept)
     */
    call(enemies, fromX) {
        if (!this.ready || this.active) return false;
        const targets = enemies
            .filter((e) => e.alive && e.x >= 0 && e.x <= WORLD.width)
            .sort((a, b) => Math.abs(a.x - fromX) - Math.abs(b.x - fromX));
        if (targets.length === 0) return false;
        this.charge = 0;
        this.time = 0;
        this.calls += 1;
        this.strikes = targets.map((e, i) => ({ targetId: e.id, at: STORM.firstStrike + i * STORM.strikeGap }));
        return true;
    }

    /** @returns {{targetId: number}[]} the lightnings falling in this step */
    update(dt) {
        if (!this.active) return [];
        this.time += dt;
        const due = this.strikes.filter((s) => s.at <= this.time);
        this.strikes = this.strikes.filter((s) => s.at > this.time);
        return due;
    }
}

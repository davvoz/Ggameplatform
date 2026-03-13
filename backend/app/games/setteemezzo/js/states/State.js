/**
 * Base class for game states.
 * Subclasses override hooks as needed.
 */
export class State {
    /** @param {import('../core/Game.js').Game} game */
    constructor(game) {
        this._game = game;
    }

    enter() {}
    exit() {}

    /** @param {number} dt - delta time in ms */
    update(dt) {}

    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx) {}
}

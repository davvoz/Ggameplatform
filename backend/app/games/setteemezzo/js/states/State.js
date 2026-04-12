/**
 * Base class for game states.
 * Subclasses override hooks as needed.
 */
export class State {
    /** @param {import('../core/Game.js').Game} game */
    constructor(game) {
        this._game = game;
    }

    enter() {
        throw new Error('State subclasses must implement enter()');
    }
    exit() {
        throw new Error('State subclasses must implement exit()');
    }

    /** @param {number} dt - delta time in ms */
    update(dt) {
        throw new Error('State subclasses must implement update()');
    }

    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx) {
        throw new Error('State subclasses must implement draw()');
    }
}

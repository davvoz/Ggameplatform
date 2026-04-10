/**
 * State - Abstract base class for game states
 * Template Method pattern: defines lifecycle hooks for derived states.
 */

export class State {
    _game;

    constructor(game) {
        this._game = game;
    }

    /**
     * Called when entering this state.
     * @param {Object} data - Optional data passed from transition
     */
    enter(data) { /* no-op: override in subclass */ }

    /**
     * Called when exiting this state.
     */
    exit() { /* no-op: override in subclass */ }

    /**
     * Update game logic.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) { /* no-op: override in subclass */ }

    /**
     * Render this state.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) { /* no-op: override in subclass */ }
}

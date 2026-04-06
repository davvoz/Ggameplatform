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
    enter(data) {}

    /**
     * Called when exiting this state.
     */
    exit() {}

    /**
     * Update game logic.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {}

    /**
     * Render this state.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {}
}

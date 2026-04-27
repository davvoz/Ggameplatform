/**
 * Abstract base for per-state update handlers.
 * Subclasses encapsulate the logic for a single GameState,
 * eliminating the if-chain in Game._update (State Pattern, GoF).
 */
export class GameStateHandler {
    /** @param {import('../Game.js').Game} game */
    constructor(game) {
        this._game = game;
    }

    /** @param {number} dt  Delta time in seconds. */
    // eslint-disable-next-line no-unused-vars
    update(dt) { /* no-op — subclasses override */ }
}

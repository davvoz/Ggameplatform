/**
 * Base class for game states (Template Method pattern).
 *
 * Contract:
 *  - enter()  — REQUIRED: called when the state becomes active.
 *  - update() — optional: called every frame (no-op by default for event-driven states).
 *  - draw()   — optional: called every frame after update (no-op by default).
 *  - exit()   — optional: cleanup when leaving the state (no-op by default).
 */
export class State {
    /** @param {import('../core/Game.js').Game} game */
    constructor(game) {
        if (new.target === State) {
            throw new TypeError('State is abstract — do not instantiate directly');
        }
        this._game = game;
    }

    /** Called once when the state machine enters this state. */
    enter() {
        throw new Error(`${this.constructor.name} must implement enter()`);
    }

    /** Called once when the state machine leaves this state. Override if cleanup is needed. */
    exit() { /* intentional no-op — override in subclass */ }

    /** Called every frame. Override for states with per-frame logic. */
    update(dt) { /* intentional no-op — override in subclass */ }

    /** Called every frame after update. Override for custom rendering. */
    draw(ctx) { /* intentional no-op — override in subclass */ }
}

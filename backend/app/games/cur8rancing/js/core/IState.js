/**
 * Base class for every game state. Acts as the IState interface:
 * concrete states override enter/update/exit. Keeping it a class (not a bare
 * contract) gives safe no-op defaults so states only implement what they need.
 */
export class IState {
    /**
     * @param {import('./ServiceContext.js').ServiceContext} ctx shared services
     */
    constructor(ctx) {
        this.ctx = ctx;
    }

    /** Called once when the state becomes active. */
    enter() {
        // no-op by default
    }

    /**
     * Called every frame while active.
     * @param {number} _dt delta time in seconds
     */
    update(_dt) {
        // no-op by default
    }

    /** Called once when the state is replaced. Must release state-owned resources. */
    exit() {
        // no-op by default
    }
}

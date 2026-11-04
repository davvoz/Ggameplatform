/**
 * @typedef {Object} GameState
 * @property {() => void} enter
 * @property {() => void} [tick] one simulation tick
 */

/** The game is always in exactly one state. */
export class StateMachine {
    /** @type {GameState | null} */
    #current = null;

    /** @param {GameState} state */
    change(state) {
        this.#current = state;
        state.enter();
    }

    tick() {
        this.#current?.tick?.();
    }
}

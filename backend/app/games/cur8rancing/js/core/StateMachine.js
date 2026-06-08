/**
 * Drives the active {@link IState}. Holds no game logic itself: it only
 * sequences enter/exit and forwards update ticks (SRP).
 */
export class StateMachine {
    /** @type {import('./IState.js').IState|null} */
    _current = null;



    /**
     * Replace the active state. The previous state's exit() runs before the
     * next state's enter(), guaranteeing clean resource handover.
     * @param {import('./IState.js').IState} state
     */
    change(state) {
        if (this._current) this._current.exit();
        this._current = state;
        this._current.enter();
    }

    /**
     * @param {number} dt delta time in seconds
     */
    update(dt) {
        if (this._current) this._current.update(dt);
    }

    /** @returns {import('./IState.js').IState|null} */
    get current() {
        return this._current;
    }

    /** Tear down the active state (used on game destroy). */
    dispose() {
        if (this._current) this._current.exit();
        this._current = null;
    }
}

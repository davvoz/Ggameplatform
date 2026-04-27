/**
 * Undo / redo stack using deep-copy snapshots of the config objects.
 * Snapshots are plain JSON, so JSON.parse/stringify is the only safe clone.
 */
export class HistoryManager {
    static MAX_STEPS = 64;

    /** @type {string[]} */
    #past = [];
    /** @type {string[]} */
    #future = [];

    /** Record a snapshot of the current state (call BEFORE mutation). */
    push(state) {
        this.#past.push(JSON.stringify(state));
        if (this.#past.length > HistoryManager.MAX_STEPS) {
            this.#past.shift();
        }
        this.#future = [];
    }

    /** Undo: returns the previous state, or null if nothing to undo. */
    undo(currentState) {
        if (this.#past.length === 0) return null;
        this.#future.push(JSON.stringify(currentState));
        return JSON.parse(this.#past.pop());
    }

    /** Redo: returns the next state, or null if nothing to redo. */
    redo(currentState) {
        if (this.#future.length === 0) return null;
        this.#past.push(JSON.stringify(currentState));
        return JSON.parse(this.#future.pop());
    }

    get canUndo() { return this.#past.length > 0; }
    get canRedo() { return this.#future.length > 0; }
}

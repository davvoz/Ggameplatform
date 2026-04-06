/**
 * StateMachine - Finite state machine for game flow
 * Registry pattern: states registered by name, transition calls enter/exit.
 */

export class StateMachine {
    #states = new Map();
    #currentState = null;
    #currentName = null;

    register(name, state) {
        this.#states.set(name, state);
    }

    transition(name, data = null) {
        if (name === this.#currentName) return;
        
        this.#currentState?.exit();
        this.#currentState = this.#states.get(name) ?? null;
        this.#currentName = name;
        this.#currentState?.enter(data);
    }

    get currentName() { return this.#currentName; }
    get currentState() { return this.#currentState; }

    update(dt) {
        this.#currentState?.update(dt);
    }

    draw(ctx) {
        this.#currentState?.draw(ctx);
    }
}

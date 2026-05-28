/**
 * Lightweight finite state machine.
 * States implement: enter() | exit() | update(dt) | render(ctx) | handleInput(event)
 * Swap occurs at the start of the next update tick — never mid-render.
 */
export class StateMachine {
    _current = null;
    _next = null;

    set(state) {
        if (!state) throw new Error('StateMachine.set: null state');
        this._next = state;
    }

    update(dt) {
        if (this._next) this._swap();
        if (this._current?.update) this._current.update(dt);
    }

    render(ctx) {
        if (this._current?.render) this._current.render(ctx);
    }

    handleInput(event) {
        if (this._current?.handleInput) this._current.handleInput(event);
    }

    _swap() {
        if (this._current?.exit) this._current.exit();
        this._current = this._next;
        this._next = null;
        if (this._current.enter) this._current.enter();
    }

    get current() { return this._current; }
}

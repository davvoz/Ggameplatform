/**
 * Base state class. All game states extend this.
 */
export class State {
    constructor(game) {
        this._game = game;
    }

    enter() { /* override */ }
    exit() { /* override */ }
    update(_dt) { /* override */ }
    draw(_ctx) { /* override */ }
}

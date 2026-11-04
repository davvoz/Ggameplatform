/** The three states of the game: ready to start, running, finished. */

export class ReadyState {
    #game;

    /** @param {import('./Game.js').Game} game */
    constructor(game) {
        this.#game = game;
    }

    enter() {
        this.#game.showReady();
    }
}

export class RunningState {
    #game;

    /** @param {import('./Game.js').Game} game */
    constructor(game) {
        this.#game = game;
    }

    enter() {
        this.#game.beginRun();
    }

    tick() {
        this.#game.advanceRun();
    }
}

export class FinishedState {
    #game;

    /** @param {import('./Game.js').Game} game */
    constructor(game) {
        this.#game = game;
    }

    enter() {
        this.#game.closeRun();
    }
}

/** The storm: it never stops and it speeds up with every metre it covers. */
export class Storm {
    #config;
    #dt;
    #startX;

    x;
    prevX;

    /** @param {typeof import('../config/SimConfig.js').SimConfig} config */
    constructor(config) {
        this.#config = config.storm;
        this.#dt = config.dt;
        this.#startX = config.runner.startX - this.#config.startGap;
        this.x = this.prevX = this.#startX;
    }

    /** @returns {number} current speed */
    get speed() {
        return this.#config.baseSpeed + (this.x - this.#startX) * this.#config.speedPerMetre;
    }

    /** @param {number} runnerX the storm never falls too far behind the runner */
    step(runnerX) {
        this.prevX = this.x;
        this.x = Math.max(this.x + this.speed * this.#dt, runnerX - this.#config.maxGap);
    }

    /** A completed rainbow pushes the storm back. */
    pushBack() {
        this.x -= this.#config.rainbowPush;
    }
}

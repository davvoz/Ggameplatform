/**
 * The tempera blob. It runs by itself: the player only jumps. A press jumps, a
 * second press in the air jumps again, and a longer press jumps higher.
 */

export const RunnerStep = Object.freeze({
    NONE: 'none',
    JUMP: 'jump',
    DOUBLE_JUMP: 'doubleJump',
    LAND: 'land',
});

export class Runner {
    #config;
    #dt;
    #wasHeld = false;
    #jumpHeld = false;
    #bufferTicks = 0;
    #coyoteTicks = 0;
    #airJumps = 0;
    #speed;

    x;
    y;
    vx;
    vy;
    prevX;
    prevY;
    grounded = true;
    airTicks = 0;
    /** Share of the speed that pushed against the ground at the last landing, 0..1. */
    lastImpact = 0;
    /** Air time of the last flight, in ticks. */
    lastAirTicks = 0;

    /**
     * @param {typeof import('../config/SimConfig.js').SimConfig} config
     * @param {number} groundY
     */
    constructor(config, groundY) {
        this.#config = config.runner;
        this.#dt = config.dt;
        this.x = this.prevX = this.#config.startX;
        this.y = this.prevY = groundY;
        this.vx = this.#speed = this.#config.startSpeed;
        this.vy = 0;
    }

    /** @returns {number} */
    get speed() {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    /** @returns {boolean} whether the last landing met the ground cleanly */
    get isPerfectLanding() {
        const c = this.#config;
        return this.lastAirTicks >= c.perfectMinAirTicks && this.lastImpact <= c.perfectMaxImpact;
    }

    /** @returns {number} the speed the run has reached at this point */
    get cruiseSpeed() {
        const c = this.#config;
        return Math.min(c.maxCruiseSpeed, c.cruiseSpeed + (this.x - c.startX) * c.cruisePerMetre);
    }

    /**
     * @param {boolean} held
     * @param {import('./Terrain.js').Terrain} terrain
     * @returns {string} a RunnerStep
     */
    step(held, terrain) {
        const pressed = held && !this.#wasHeld;
        this.#wasHeld = held;
        if (!held) this.#jumpHeld = false;
        this.prevX = this.x;
        this.prevY = this.y;

        if (pressed) this.#bufferTicks = this.#config.bufferTicks;
        else if (this.#bufferTicks > 0) this.#bufferTicks--;

        const jump = this.#tryJump(terrain);
        if (this.grounded) {
            this.#run(terrain);
            return RunnerStep.NONE;
        }

        const landed = this.#fly(terrain);
        if (jump !== RunnerStep.NONE) return jump;
        return landed ? RunnerStep.LAND : RunnerStep.NONE;
    }

    /** Lose speed after hitting something. */
    slowDown(factor) {
        const { minSpeed } = this.#config;
        this.#speed = Math.max(this.#speed * factor, minSpeed);
        this.vx = Math.max(this.vx * factor, minSpeed);
    }

    #tryJump(terrain) {
        if (this.#bufferTicks === 0) return RunnerStep.NONE;
        const c = this.#config;

        if (this.grounded || this.#coyoteTicks > 0) {
            const slope = terrain.slopeAt(this.x);
            const length = Math.sqrt(1 + slope * slope);
            this.vx = this.#speed / length;
            this.vy = c.jumpSpeed + Math.max(0, (this.#speed * slope) / length) * c.rampLift;
            this.#leaveGround();
            this.#airJumps = 1;
            return RunnerStep.JUMP;
        }

        if (this.#airJumps > 0) {
            this.vy = c.doubleJumpSpeed;
            this.#airJumps--;
            this.#bufferTicks = 0;
            this.#jumpHeld = true;
            return RunnerStep.DOUBLE_JUMP;
        }

        return RunnerStep.NONE;
    }

    #leaveGround() {
        this.grounded = false;
        this.airTicks = 0;
        this.#coyoteTicks = 0;
        this.#bufferTicks = 0;
        this.#jumpHeld = true;
    }

    #run(terrain) {
        const c = this.#config;
        const dt = this.#dt;

        const slope = terrain.slopeAt(this.x);
        const length = Math.sqrt(1 + slope * slope);
        const tx = 1 / length;
        const ty = slope / length;

        const pull = -c.slopeEffect * ty + (this.cruiseSpeed - this.#speed) * c.catchUp;
        this.#speed = Math.min(c.maxSpeed, Math.max(c.minSpeed, this.#speed + pull * dt));

        this.vx = this.#speed * tx;
        this.vy = this.#speed * ty;
        this.x += this.vx * dt;
        const nextY = this.y + this.vy * dt - 0.5 * c.gravity * dt * dt;
        const ground = terrain.heightAt(this.x);

        if (nextY > ground) {
            this.y = nextY;
            this.grounded = false;
            this.airTicks = 1;
            this.#coyoteTicks = c.coyoteTicks;
            this.#airJumps = 1;
        } else {
            this.y = ground;
        }
    }

    #fly(terrain) {
        const c = this.#config;
        const dt = this.#dt;

        const floating = this.#jumpHeld && this.vy > 0;
        this.vy -= (floating ? c.gravityHeld : c.gravity) * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.airTicks++;
        if (this.#coyoteTicks > 0) this.#coyoteTicks--;

        const ground = terrain.heightAt(this.x);
        if (this.y > ground) return false;

        const wasFlying = this.airTicks >= c.minFlightTicks;
        this.#land(ground, terrain.slopeAt(this.x));
        return wasFlying;
    }

    #land(ground, slope) {
        const c = this.#config;
        const length = Math.sqrt(1 + slope * slope);
        const tx = 1 / length;
        const ty = slope / length;

        const speed = this.speed;
        const against = this.vy * tx - this.vx * ty;
        this.lastImpact = Math.abs(against) / speed;
        this.lastAirTicks = this.airTicks;

        let along = Math.max(this.vx * tx + this.vy * ty, speed * c.landingKeep);
        if (this.isPerfectLanding) along *= c.perfectBoost;

        this.#speed = Math.min(c.maxSpeed, Math.max(c.minSpeed, along));
        this.vx = this.#speed * tx;
        this.vy = this.#speed * ty;
        this.y = ground;
        this.grounded = true;
        this.airTicks = 0;
    }
}

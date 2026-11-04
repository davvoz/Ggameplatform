import { SimConfig } from '../config/SimConfig.js';
import { Rng } from '../core/Rng.js';
import { Course } from './Course.js';
import { Runner, RunnerStep } from './Runner.js';
import { Storm } from './Storm.js';
import { PaintTank } from './PaintTank.js';

/**
 * One run, as pure data and rules: no browser, no clock, no drawing.
 * Same seed and same presses, tick by tick, give exactly the same run. The
 * rest of the game reads this state and listens to the events it emits.
 */

export const SimEvent = Object.freeze({
    DROP: 'drop',
    RAINBOW: 'rainbow',
    JUMP: 'jump',
    DOUBLE_JUMP: 'doubleJump',
    LAND: 'land',
    PERFECT: 'perfect',
    HIT: 'hit',
    SPLASH: 'splash',
    CAUGHT: 'caught',
});

export class Simulation {
    #config;
    #events = [];
    #recoveryTicks = 0;
    #dropCursor = 0;
    #obstacleCursor = 0;

    tick = 0;
    finished = false;
    held = false;

    drops = 0;
    rainbows = 0;
    perfectLandings = 0;
    hits = 0;
    jumps = 0;

    /** @type {Course} */
    course;
    /** @type {Runner} */
    runner;
    /** @type {Storm} */
    storm;
    /** @type {PaintTank} */
    tank;

    /**
     * @param {number} seed
     * @param {typeof SimConfig} config
     */
    constructor(seed, config = SimConfig) {
        this.#config = config;
        this.course = new Course(new Rng(seed), config);
        this.course.extendTo(config.course.lookAhead);
        this.runner = new Runner(config, this.course.terrain.heightAt(config.runner.startX));
        this.storm = new Storm(config);
        this.tank = new PaintTank(config.paint.bands);
    }

    /** @returns {number} metres covered: this is the score */
    get metres() {
        return Math.floor(this.runner.x - this.#config.runner.startX);
    }

    /** @returns {number} metres between the storm and the runner */
    get gap() {
        return this.runner.x - this.storm.x;
    }

    /** Advance one tick. @param {boolean} held whether the button is pressed */
    step(held) {
        if (this.finished) return;
        const { course: courseConfig } = this.#config;

        this.tick++;
        this.held = held;
        this.course.extendTo(this.runner.x + courseConfig.lookAhead);
        this.#moveRunner(held);
        this.#collectDrops();
        this.#hitObstacles();
        this.storm.step(this.runner.x);

        if (this.storm.x >= this.runner.x) {
            this.finished = true;
            this.#emit(SimEvent.CAUGHT);
        }

        this.#forgetBehind(this.runner.x - courseConfig.keepBehind);
    }

    /** Hand over what happened since the last call. */
    drainEvents() {
        const events = this.#events;
        this.#events = [];
        return events;
    }

    /** Everything a run is, in plain numbers. Two equal runs have equal snapshots. */
    snapshot() {
        const { runner, storm, tank } = this;
        return {
            tick: this.tick,
            x: runner.x,
            y: runner.y,
            vx: runner.vx,
            vy: runner.vy,
            stormX: storm.x,
            bands: tank.bands,
            drops: this.drops,
            rainbows: this.rainbows,
            hits: this.hits,
            perfectLandings: this.perfectLandings,
            finished: this.finished,
        };
    }

    #moveRunner(held) {
        const { runner } = this;
        const result = runner.step(held, this.course.terrain);
        if (result === RunnerStep.JUMP) {
            this.jumps++;
            this.#emit(SimEvent.JUMP);
        }
        if (result === RunnerStep.DOUBLE_JUMP) this.#emit(SimEvent.DOUBLE_JUMP);
        if (result !== RunnerStep.LAND) return;

        this.#emit(SimEvent.LAND, runner.lastImpact);
        if (runner.isPerfectLanding) {
            this.perfectLandings++;
            this.#emit(SimEvent.PERFECT);
        }
    }

    #collectDrops() {
        const { runner, tank } = this;
        const { drops } = this.course;
        const { reach } = this.#config.pickups;
        const centreY = runner.y + this.#config.runner.radius;

        while (this.#dropCursor < drops.length && drops[this.#dropCursor].x < runner.x - reach) {
            this.#dropCursor++;
        }

        for (let i = this.#dropCursor; i < drops.length; i++) {
            const drop = drops[i];
            if (drop.x > runner.x + reach) break;
            if (drop.taken) continue;
            const dx = drop.x - runner.x;
            const dy = drop.y - centreY;
            if (dx * dx + dy * dy > reach * reach) continue;

            drop.taken = true;
            this.drops++;
            this.#emit(SimEvent.DROP, tank.bands);
            if (tank.addBand()) {
                this.rainbows++;
                this.storm.pushBack();
                this.#emit(SimEvent.RAINBOW);
            }
        }
    }

    #hitObstacles() {
        if (this.#recoveryTicks > 0) {
            this.#recoveryTicks--;
            return;
        }

        const { runner } = this;
        const { obstacles } = this.course;
        const { radius } = this.#config.runner;
        const reach = radius * 0.8;
        const centreY = runner.y + radius;

        while (this.#isBehind(obstacles[this.#obstacleCursor], radius)) this.#obstacleCursor++;

        for (let i = this.#obstacleCursor; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            const { halfWidth, halfHeight } = obstacle.type;
            if (obstacle.x - halfWidth > runner.x + radius) break;
            if (obstacle.hit) continue;
            if (Math.abs(centreY - obstacle.y) > halfHeight + reach) continue;
            if (Math.abs(obstacle.x - runner.x) > halfWidth + reach) continue;
            this.#suffer(obstacle);
            return;
        }
    }

    #isBehind(obstacle, radius) {
        return obstacle !== undefined && obstacle.x + obstacle.type.halfWidth < this.runner.x - radius;
    }

    #suffer(obstacle) {
        const { type } = obstacle;
        obstacle.hit = true;
        this.runner.slowDown(type.speedFactor);

        if (!type.losesBand) {
            this.#emit(SimEvent.SPLASH);
            return;
        }

        this.hits++;
        this.#recoveryTicks = this.#config.obstacles.recoveryTicks;
        this.tank.loseBand();
        this.#emit(SimEvent.HIT);
    }

    #forgetBehind(x) {
        const { course } = this;
        const dropsBefore = course.drops.length;
        const obstaclesBefore = course.obstacles.length;
        course.trimBefore(x);
        this.#dropCursor = Math.max(0, this.#dropCursor - (dropsBefore - course.drops.length));
        this.#obstacleCursor = Math.max(0, this.#obstacleCursor - (obstaclesBefore - course.obstacles.length));
    }

    #emit(type, value = 0) {
        this.#events.push({ type, value, x: this.runner.x, y: this.runner.y });
    }
}

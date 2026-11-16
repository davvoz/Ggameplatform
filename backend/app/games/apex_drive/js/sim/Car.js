import { PHYSICS } from '../config/Tuning.js';

/**
 * A car on the road: how far along it is (`z`, never wrapped), how far from
 * the middle (`x`: -1 and 1 are the road's edges), how fast, and its state
 * (health, nitro, shield). Its numbers come from its build (sim/Build.js).
 *
 * Forward: the engine pushes with power / speed, capped by the tyres'
 * traction; air drag (less in a slipstream) and rolling hold it back.
 * Sideways: the wheel moves it, bends push it outward with the square of the
 * speed; past what the grip holds the car slides, wider and slower.
 *
 * @typedef {{steer: number, throttle: boolean, brake: boolean, nitro: boolean}} DriveInput
 *   steer -1 (left) .. 1 (right); nitro: pressed this tick
 * @typedef {{curve: number, grip: number}} RoadUnder the bend under the car and the weather's grip
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class Car {
    z = 0;
    x = 0;
    speed = 0;
    /** The wheel, easing towards the input: -1 .. 1. */
    turn = 0;
    /** Sideways speed from bumps, dying out. */
    shove = 0;
    health;
    nitro;
    /** 0..1: a full gauge (drift charger) becomes a nitro charge. */
    nitroGauge = 0;
    /** Seconds of nitro (or boost) still burning. */
    boostTime = 0;
    shieldTime = 0;
    /** 0..1: how deep in a rival's slipstream, set by the race each tick. */
    draft = 0;
    throttle = false;
    braking = false;
    sliding = false;
    /** How much of the grip the bend takes: 0 on a straight, 1 at the edge of a slide. */
    gripUsed = 0;
    /** Seconds the car still bounces from a pothole (only drawn). */
    jolt = 0;
    stats;

    /** @param {import('./Build.js').Stats} stats */
    constructor(stats) {
        this.stats = stats;
        this.health = stats.health;
        this.nitro = stats.nitroCharges;
    }

    get speedRatio() {
        return this.speed / PHYSICS.refSpeed;
    }

    get kmh() {
        return Math.round(this.speedRatio * PHYSICS.refKmh);
    }

    get offRoad() {
        return Math.abs(this.x) > 1;
    }

    get boosting() {
        return this.boostTime > 0;
    }

    get shielded() {
        return this.shieldTime > 0;
    }

    /** @returns {boolean} whether a charge was lit */
    lightNitro() {
        if (this.nitro <= 0 || this.boosting) return false;
        this.nitro--;
        this.boostTime = this.stats.nitroTime;
        return true;
    }

    /** Free nitro: a perfect start, a boost pad. */
    boost(seconds) {
        this.boostTime = Math.max(this.boostTime, seconds);
    }

    /** @returns {number} the charges that fitted: none once the car holds PHYSICS.maxNitro */
    addNitro(count = 1) {
        const added = Math.max(0, Math.min(count, PHYSICS.maxNitro - this.nitro));
        this.nitro += added;
        return added;
    }

    repair(amount) {
        this.health = Math.min(this.stats.health, this.health + amount);
    }

    shield(seconds) {
        this.shieldTime = Math.max(this.shieldTime, seconds);
    }

    /** @returns {number} the damage taken (none under a shield) */
    hurt(amount) {
        if (this.shielded) return 0;
        const taken = Math.min(this.health, amount * this.stats.bumpTaken);
        this.health -= taken;
        return taken;
    }

    /**
     * @param {DriveInput} input
     * @param {RoadUnder} road
     * @param {number} dt seconds
     * @param {number} [power] extra factor on the engine (the rivals' rubber band)
     */
    step(input, road, dt, power = 1) {
        this.throttle = input.throttle;
        this.braking = input.brake;
        if (input.nitro) this.lightNitro();
        this.boostTime = Math.max(0, this.boostTime - dt);
        this.shieldTime = Math.max(0, this.shieldTime - dt);
        this.jolt = Math.max(0, this.jolt - dt);

        this.speed = Math.max(0, this.speed + this.#pull(input, road.grip, power) * dt);
        if (this.offRoad && this.speed > this.stats.offRoadLimit) {
            this.speed = Math.max(this.stats.offRoadLimit, this.speed - PHYSICS.offRoadDrag * this.stats.offRoadDrag * dt);
        }
        this.#sideways(input, road, dt);
        this.z += this.speed * dt;
    }

    /**
     * Forward acceleration, units/s^2. A wet road (`wet` below 1) takes from
     * what the tyres can put down: the wheels spin sooner, the brakes lock sooner.
     */
    #pull(input, wet, power) {
        const s = this.stats;
        const v = this.speed;
        // forces over the mass; rolling's force grows with the weight, so as a slowing it stays the same
        const air = (s.drag * v * v * (1 - this.draft * s.draftBonus)) / s.mass;
        const rolling = v > 0 ? PHYSICS.rolling : 0;
        if (input.brake) return -PHYSICS.brake * s.brake * wet - air - rolling;
        if (!input.throttle && !this.boosting) return -air - rolling;
        const wear = 1 - PHYSICS.damagePower * (1 - this.health / s.health);
        const nitro = this.boosting ? s.nitroPower : 1;
        const traction = s.traction * wet * (this.boosting ? PHYSICS.nitroTraction : 1);
        const thrust = Math.min((s.power * wear * nitro * power) / Math.max(v, PHYSICS.minThrustSpeed), traction * s.mass);
        return thrust / s.mass - air - rolling;
    }

    #sideways(input, road, dt) {
        const ease = Math.min(1, PHYSICS.turnEase * dt);
        this.turn += (clamp(input.steer, -1, 1) - this.turn) * ease;

        const ratio = this.speedRatio;
        const grip = this.stats.grip * road.grip;
        const pull = road.curve * ratio * ratio * PHYSICS.centrifugal;
        this.gripUsed = Math.abs(pull) / (grip * PHYSICS.slipLimit);
        const excess = Math.max(0, Math.abs(pull) - grip * PHYSICS.slipLimit);
        this.sliding = excess > 0;
        if (this.sliding) {
            this.speed *= Math.max(0, 1 - excess * PHYSICS.slideScrub * dt);
            // a full gauge waits for room: it becomes a charge once one is burnt
            this.nitroGauge = Math.min(1, this.nitroGauge + this.stats.driftCharge * dt);
            if (this.nitroGauge >= 1 && this.addNitro(1) > 0) this.nitroGauge = 0;
        }

        const steer = this.turn * PHYSICS.steer * Math.min(1, ratio);
        const outward = pull / grip + Math.sign(pull) * excess * PHYSICS.slidePush;
        this.shove *= Math.exp(-PHYSICS.shoveDecay * dt);
        this.x += (steer - outward + this.shove) * dt;
        if (Math.abs(this.x) > PHYSICS.maxOffset) {
            this.x = Math.sign(this.x) * PHYSICS.maxOffset;
            this.shove = 0;
        }
    }
}

import { PHYSICS } from '../config/Tuning.js';
import { pushOf } from './Currents.js';
import { FULL, onRibbons } from './Ground.js';
import { onSurface, slideOf } from './Vortex.js';

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
 * @typedef {{curve: number, grip: number, ribbons?: import('./Ground.js').Ribbon[], current?: import('./Currents.js').Current,
 *   roll?: number}} RoadUnder
 *   the bend under the car, the weather's grip, the asphalt there (the whole road if not said),
 *   the water's current (none if not said): it pushes the car along and across the road,
 *   and how far the road is rolled up into the vortex's tube (sim/Vortex.js; flat if not said)
 *
 * In the vortex's tube x goes round, and a wall pulls the car back down
 * towards the bottom; a car too slow up there drops across (sim/Vortex.js).
 *
 * In the air (off a ramp), falling into the void or dropping across the tube the wheels touch nothing:
 * no thrust, no brakes, no steering, only the air holding the car back
 * (sim/Flight.js moves it up and down and lands it).
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
    /** Height above the road's line (world units): up in a jump, below it falling. */
    lift = 0;
    /** Upward speed in the air, world units/s. */
    climb = 0;
    airborne = false;
    /** Seconds since it fell off the road into the void; 0 on the road or in the air. */
    falling = 0;
    /** Seconds since it let go of the vortex's wall, dropping across the tube; 0 holding on. */
    dropping = 0;
    /** Where across it let go from. */
    dropFrom = 0;
    stats;
    /** The asphalt under the car at its last step. */
    #ribbons = FULL;

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
        return !onRibbons(this.#ribbons, this.x);
    }

    /** Wheels on nothing: flying off a ramp, falling, dropping across the tube. */
    get loose() {
        return this.airborne || this.falling > 0 || this.dropping > 0;
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
        this.#ribbons = road.ribbons ?? FULL;
        if (this.loose) {
            this.#coast(input, dt);
            return;
        }

        const push = pushOf(road.current);
        this.speed = Math.max(0, this.speed + (this.#pull(input, road.grip, power) + push.along) * dt);
        if (this.offRoad && this.speed > this.stats.offRoadLimit) {
            this.speed = Math.max(this.stats.offRoadLimit, this.speed - PHYSICS.offRoadDrag * this.stats.offRoadDrag * dt);
        }
        this.#sideways(input, road, dt, push.across + slideOf(road.roll ?? 0, this.x));
        this.z += this.speed * dt;
    }

    /** Wheels on nothing: only the air slows the car, the wheel turns but steers nothing. */
    #coast(input, dt) {
        const s = this.stats;
        this.speed = Math.max(0, this.speed - ((s.drag * this.speed * this.speed) / s.mass) * dt);
        this.turn += (clamp(input.steer, -1, 1) - this.turn) * Math.min(1, PHYSICS.turnEase * dt);
        this.shove *= Math.exp(-PHYSICS.shoveDecay * dt);
        this.x += this.shove * dt;
        this.sliding = false;
        this.gripUsed = 0;
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

    #sideways(input, road, dt, drift) {
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
        this.x += (steer - outward + this.shove + drift) * dt;
        if (road.roll) {
            this.x = onSurface(road, this.x);
        } else if (Math.abs(this.x) > PHYSICS.maxOffset) {
            this.x = Math.sign(this.x) * PHYSICS.maxOffset;
            this.shove = 0;
        }
    }
}

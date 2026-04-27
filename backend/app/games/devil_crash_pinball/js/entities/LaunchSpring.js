import { Collisions } from '../physics/Collisions.js';
import { GameConfig as C } from '../config/GameConfig.js';

// FSM state constants (module-level to avoid per-instance allocation)
const IDLE      = 0;
const CHARGING  = 1;
const LOCKED    = 2;
const RESETTING = 3;
const RELEASING = 4;   // snap-back phase: extends forward, physically pushes ball, fires impulse at full ext

/**
 * Player-controlled launch spring — a level-placed plunger entity.
 *
 * Real pinball plunger mechanic:
 *   IDLE      → pad fully EXTENDED; ball rests on it.
 *   CHARGING  → player holds input; pad RETRACTS (chargeRatio 1→0).
 *   RELEASING → player releases; pad SNAPS FORWARD (chargeRatio 0→1),
 *               physically pushing the ball up the channel;
 *               impulse applied when chargeRatio reaches 1.
 *   LOCKED    → brief freeze after impulse fires (pad at full extension).
 *   RESETTING → snap-back after a passive reset (no launch — post LOCKED).
 *
 * Power = (1 − chargeRatio) × maxPower.
 * Minimum guaranteed power = LAUNCH_SPRING_MIN_PULL × maxPower (handles taps).
 *
 * Coordinates: world-space (top already added by _buildLaunchSprings).
 */
export class LaunchSpring {
    static STATE = Object.freeze({ IDLE, CHARGING, LOCKED, RESETTING, RELEASING });

    /**
     * @param {number} x             world-X of the base/mount (fixed end)
     * @param {number} y             world-Y of the base/mount (fixed end)
     * @param {number} radius        collision radius of the moving pad
     * @param {number} angleDeg      launch direction in degrees (270 = straight up)
     * @param {number} maxPower      impulse speed at full retraction (px/s)
     * @param {number} chargeTime    seconds to fully retract (chargeRatio 1→0)
     * @param {number} maxExtension  max pixels the pad travels from base
     */
    constructor(x, y, radius, angleDeg, maxPower, chargeTime, maxExtension) {
        const rad          = angleDeg * (Math.PI / 180);
        this.x             = x;
        this.y             = y;
        this.radius        = radius;
        this.dirX          = Math.cos(rad);
        this.dirY          = Math.sin(rad);
        this.maxPower      = maxPower;
        this.chargeTime    = chargeTime;
        this.maxExtension  = maxExtension;
        this.onHit         = null;

        this._state        = IDLE;
        this._chargeRatio  = 1;    // 1 = fully extended, 0 = fully retracted
        this._lockedTimer  = 0;
        this._pendingPull  = 0;    // stored pull for deferred impulse
        this._launchBall   = null; // ball reference held during RELEASING
        this.fired         = false; // one-frame flag: true when impulse was applied
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    get state()       { return this._state; }
    get chargeRatio() { return this._chargeRatio; }

    /** How far the spring is pulled back (0 = untouched, 1 = max retraction). */
    get pullRatio() { return 1 - this._chargeRatio; }

    /** World position of the moving pad center. */
    get tipX() { return this.x + this.dirX * this._chargeRatio * this.maxExtension; }
    get tipY() { return this.y + this.dirY * this._chargeRatio * this.maxExtension; }

    // ── Public control API ───────────────────────────────────────────────────

    /**
     * Retract the spring while input is held.
     * No-op when LOCKED or RESETTING (spring already fired).
     * @param {number} dt
     */
    retract(dt) {
        if (this._state === LOCKED || this._state === RESETTING) return;
        this._state       = CHARGING;
        this._chargeRatio = Math.max(0, this._chargeRatio - dt / this.chargeTime);
    }

    /**
     * Begin the release: store pull power, then let the pad SNAP FORWARD.
     * Impulse is deferred until chargeRatio reaches 1 (pad fully extended).
     * During snap-back, resolve() physically pushes the ball up the channel.
     * No-op when already LOCKED / RESETTING / RELEASING.
     * @param {import('../physics/Ball.js').Ball} ball
     */
    release(ball) {
        if (this._state === LOCKED || this._state === RESETTING || this._state === RELEASING) return;
        this._pendingPull = Math.max(C.LAUNCH_SPRING_MIN_PULL, this.pullRatio);
        this._launchBall  = ball;
        this._state       = RELEASING;
    }

    // ── Entity API ───────────────────────────────────────────────────────────

    /** @param {number} dt */
    update(dt) {
        this.fired = false; // clear one-frame flag each tick
        if (this._state === LOCKED) {
            this._lockedTimer -= dt;
            if (this._lockedTimer <= 0) this._state = RESETTING;
        } else if (this._state === RESETTING) {
            this._chargeRatio = Math.min(1, this._chargeRatio + dt * C.LAUNCH_SPRING_RESET_SPEED);
            if (this._chargeRatio >= 1) {
                this._chargeRatio = 1;
                this._state       = IDLE;
            }
        } else if (this._state === RELEASING) {
            // Pad snaps forward; resolve() simultaneously pushes ball up the channel.
            this._chargeRatio = Math.min(1, this._chargeRatio + dt * C.LAUNCH_SPRING_RESET_SPEED);
            if (this._chargeRatio >= 1) {
                this._chargeRatio = 1;
                if (this._launchBall) {
                    this._launchBall.launch(
                        this.dirX * this._pendingPull * this.maxPower,
                        this.dirY * this._pendingPull * this.maxPower,
                    );
                    this._launchBall = null;
                }
                if (this.onHit) this.onHit();
                this._pendingPull = 0;
                this.fired        = true;
                this._state       = LOCKED;
                this._lockedTimer = C.LAUNCH_SPRING_LOCK_TIME;
            }
        }
    }

    /**
     * Keep the ball resting on / being pushed by the moving pad.
     * Active in IDLE, CHARGING, and RELEASING (during snap-back the pad
     * physically drives the ball up the channel before the impulse fires).
     * @param {import('../physics/Ball.js').Ball} ball
     */
    resolve(ball) {
        if (this._state === LOCKED || this._state === RESETTING) return;
        Collisions.circleVsCircle(ball, this.tipX, this.tipY, this.radius, C.LAUNCH_SPRING_RESTITUTION);
    }
}

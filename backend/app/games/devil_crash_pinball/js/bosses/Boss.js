import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Base FSM for bosses + shared animation rig.
 *
 * Rig fields (read by EntityRenderer to apply a unified transform around
 * (boss.x, boss.y) before each subclass draws its art):
 *   breath     : subtle idle pulse (1 ± ~0.04)
 *   squashX/Y  : spring-driven scale (jiggles after a hit, then settles)
 *   recoilX/Y  : directional knockback offset (decays exponentially)
 *   tilt       : small rotation (radians) — flicks on hit, decays
 *   enterAnim  : 0→1 spawn anticipation (back-out overshoot)
 *   defeatAnim : 0→1 death sequence (scale up + fade out)
 *   alpha      : final per-frame draw alpha (defeat fade, etc.)
 *
 * Subclasses override stateUpdate(dt). hit(damage, nx, ny) accepts an
 * optional contact normal so the recoil/squash react in the right direction.
 */
export class Boss {
    static STATE = Object.freeze({
        SLEEP: 0, ENTER: 1, ATTACK: 2, HURT: 3, DEFEATED: 4,
    });

    constructor(x, y, hp, score = C.BOSS_HIT_SCORE) {
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.maxHp = hp;
        this.score = score;
        this.state = Boss.STATE.SLEEP;
        this.timer = 0;
        this.flash = 0;
        this.onScore = null;
        this.onDefeated = null;
        this._initRig();
    }

    /** @private */
    _initRig() {
        this.breath     = 1;
        this.squashX    = 1;
        this.squashY    = 1;
        this._sxVel     = 0;
        this._syVel     = 0;
        this.recoilX    = 0;
        this.recoilY    = 0;
        this.tilt       = 0;
        this._tiltVel   = 0;
        this.enterAnim  = 0;
        this.defeatAnim = 0;
        this.alpha      = 1;
        this._breathT   = 0;
    }

    awake() {
        if (this.state === Boss.STATE.SLEEP) {
            this.state = Boss.STATE.ENTER;
            this.timer = 0;
            this.enterAnim = 0;
        }
    }

    /**
     * Full reset to initial state. Called on game over before a new game.
     * Subclasses must call super.reset() and then restore their own fields.
     */
    reset() {
        this.hp = this.maxHp;
        this.state = Boss.STATE.SLEEP;
        this.timer = 0;
        this.flash = 0;
        this._initRig();
    }

    isAlive() { return this.state !== Boss.STATE.DEFEATED; }

    /** True while still visible (death animation playing or alive). */
    isVisible() {
        return this.state !== Boss.STATE.SLEEP && this.defeatAnim < 1;
    }

    /**
     * Called by section when ball collides with boss hitbox.
     * @param {number} damage
     * @param {number} [nx]  contact normal X (ball→boss). Optional.
     * @param {number} [ny]  contact normal Y (ball→boss). Optional.
     */
    hit(damage = 1, nx = 0, ny = 0) {
        if (this.state === Boss.STATE.SLEEP || this.state === Boss.STATE.DEFEATED) return false;
        this.hp = Math.max(0, this.hp - damage);
        this.flash = 0.18;
        this.state = Boss.STATE.HURT;
        this.timer = 0;
        if (this.onScore) this.onScore(this.score);

        // ── Animation reaction ───────────────────────────────────────────
        // Squash & stretch: project hit normal onto axes; impulse the springs
        // so the body deforms perpendicular to the hit, then springs back.
        const KICK_SQUASH = 0.55;   // axial squash strength
        const KICK_STRETCH = 0.35;  // perpendicular stretch strength
        this._sxVel += -KICK_SQUASH * Math.abs(nx) - KICK_STRETCH * Math.abs(ny);
        this._syVel += -KICK_SQUASH * Math.abs(ny) - KICK_STRETCH * Math.abs(nx);

        // Directional recoil offset (knockback).
        const RECOIL_PX = 9;
        this.recoilX += nx * RECOIL_PX;
        this.recoilY += ny * RECOIL_PX;

        // Quick tilt flick proportional to horizontal hit component.
        this._tiltVel += nx * 6;

        if (this.hp <= 0) {
            this.state = Boss.STATE.DEFEATED;
            this.defeatAnim = 0;
            if (this.onDefeated) this.onDefeated();
        }
        return true;
    }

    update(dt) {
        this.timer += dt;
        if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
        this._tickRig(dt);
        this.stateUpdate(dt);
    }

    /**
     * Advance shared animation rig.
     * - breath: continuous gentle scale pulse (life)
     * - enterAnim: cubic-out with overshoot for spawn pop-in
     * - defeatAnim: cubic-in for death scale + fade
     * - squash springs: critically-damped relaxation toward rest (1, 1)
     * - recoil offset: exponential decay back to 0
     * - tilt: under-damped spring back to 0
     * @private
     */
    _tickRig(dt) {
        // Idle breath — frequency varies very slightly per boss via maxHp seed.
        this._breathT += dt;
        const seed = (this.maxHp % 7) * 0.13;
        this.breath = 1 + Math.sin(this._breathT * (1.6 + seed)) * 0.035;

        // Spawn anticipation (back-out: overshoot then settle).
        if (this.state === Boss.STATE.ENTER || this.enterAnim < 1) {
            this.enterAnim = Math.min(1, this.enterAnim + dt * 2.2);
        }

        // Death sequence — once triggered, runs to 1 then renderer hides.
        if (this.state === Boss.STATE.DEFEATED) {
            this.defeatAnim = Math.min(1, this.defeatAnim + dt * 1.6);
        }

        // Squash springs — toward 1, critically damped.
        const K = 220, D = 22;
        const ax = (1 - this.squashX) * K - this._sxVel * D;
        const ay = (1 - this.squashY) * K - this._syVel * D;
        this._sxVel += ax * dt;
        this._syVel += ay * dt;
        this.squashX += this._sxVel * dt;
        this.squashY += this._syVel * dt;

        // Recoil exponential decay toward 0.
        const RECOIL_DECAY = 1 - Math.exp(-dt * 8);
        this.recoilX -= this.recoilX * RECOIL_DECAY;
        this.recoilY -= this.recoilY * RECOIL_DECAY;

        // Tilt under-damped spring → 0.
        const TK = 90, TD = 8;
        const tAcc = -this.tilt * TK - this._tiltVel * TD;
        this._tiltVel += tAcc * dt;
        this.tilt     += this._tiltVel * dt;
        // Clamp to avoid extreme angular drift if many fast hits stack.
        if (this.tilt >  0.6) { this.tilt =  0.6; this._tiltVel = 0; }
        if (this.tilt < -0.6) { this.tilt = -0.6; this._tiltVel = 0; }

        // Final draw alpha — fades out during defeat.
        this.alpha = 1 - this.defeatAnim;
    }

    /**
     * Combined scale to apply around (x, y) in renderer:
     *   enter pop-in × breath × squash, with defeat scale-up.
     * Returns [sx, sy].
     */
    getRenderScale() {
        // Back-out ease for entrance: t→ 1 + c1 (t-1)^3 + c2 (t-1)^2
        const t  = this.enterAnim;
        const c1 = 1.70158, c2 = c1 + 1;
        const ease = 1 + c1 * Math.pow(t - 1, 3) + c2 * Math.pow(t - 1, 2);
        const enter = this.state === Boss.STATE.SLEEP ? 0 : ease;
        const death = 1 + this.defeatAnim * 0.55;
        const sx = enter * this.breath * this.squashX * death;
        const sy = enter * this.breath * this.squashY * death;
        return [sx, sy];
    }

    /** Override in subclass. */
    stateUpdate(_dt) { /* no-op base */ }
}

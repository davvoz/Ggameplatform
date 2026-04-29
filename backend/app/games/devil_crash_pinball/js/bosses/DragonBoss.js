import { Boss } from './Boss.js';
import { GameConfig as C } from '../config/GameConfig.js';

// ── Sub-states inside ATTACK ────────────────────────────────────────────────
const SUB = Object.freeze({ PROWL: 0, CHARGE: 1, DASH: 2, RECOVER: 3, ROAR: 4 });

// ── Animation tunables ──────────────────────────────────────────────────────
const SPINE_COUNT      = 12;          // serpentine body segments (head excluded)
const SPINE_SEG_LEN    = 11;          // distance between segment centres
const PROWL_SPEED      = 1.45;        // rad/s for sin sway
const PROWL_AMP        = 0.95;        // 0..1 fraction of `range`
const CHARGE_TIME      = 0.55;        // seconds anticipation
const DASH_SPEED       = 480;         // px/s during dash
const DASH_TIME        = 0.42;
const RECOVER_TIME     = 0.45;
const ROAR_TIME        = 1.6;
const ROAR_EVERY       = 3;           // one ROAR every N attack cycles

/**
 * Dragon Boss — "Serpent of Embers".
 *
 * Articulated kinematic chain (head + 12 spine segments) drives a
 * believable serpentine body. Behaviour cycles through telegraphed
 * signature moves: PROWL → CHARGE → DASH → RECOVER, with a periodic
 * ROAR that opens the jaw and unleashes a sustained fire breath.
 *
 * External contract (unchanged): x, y, radius, hp, maxHp, hit, update, reset.
 *
 * Renderer reads: spine[], jawOpen (0..1), breathCharge (0..1),
 * wingPhase (radians), headDir (-1|+1), _sub.
 */
export class DragonBoss extends Boss {
    constructor(centerX, centerY, range = 100) {
        super(centerX, centerY, C.DRAGON_HP, C.BOSS_HIT_SCORE);
        this.cx        = centerX;
        this.cy        = centerY;
        this.range     = range;
        this.radius    = 24;
        this.drawType  = 'dragon';

        this.spine = new Array(SPINE_COUNT);
        for (let i = 0; i < SPINE_COUNT; i++) {
            this.spine[i] = { x: centerX, y: centerY + (i + 1) * SPINE_SEG_LEN };
        }
        this.jawOpen      = 0;
        this.breathCharge = 0;
        this.wingPhase    = 0;
        this.headDir      = 1;

        this._sub        = SUB.PROWL;
        this._subTimer   = 0;
        this._cycleCount = 0;
        this._dashFromX  = centerX;
        this._dashToX    = centerX;
        this._movT       = 0;
    }

    reset() {
        super.reset();
        this.x = this.cx;
        this.y = this.cy;
        for (let i = 0; i < SPINE_COUNT; i++) {
            this.spine[i].x = this.cx;
            this.spine[i].y = this.cy + (i + 1) * SPINE_SEG_LEN;
        }
        this.jawOpen      = 0;
        this.breathCharge = 0;
        this.wingPhase    = 0;
        this.headDir      = 1;
        this._sub         = SUB.PROWL;
        this._subTimer    = 0;
        this._cycleCount  = 0;
        this._movT        = 0;
    }

    stateUpdate(dt) {
        const S = Boss.STATE;
        if (this.state === S.SLEEP || this.state === S.DEFEATED) return;

        this._movT     += dt;
        this._subTimer += dt;
        this.wingPhase += dt * (this._sub === SUB.CHARGE || this._sub === SUB.DASH ? 9 : 4);

        switch (this.state) {
            case S.ENTER:
                if (this.timer > 0.5) { this.state = S.ATTACK; this._enterSub(SUB.PROWL); }
                break;
            case S.ATTACK:
                this._tickSubFSM(dt);
                break;
            case S.HURT:
                if (this.timer > 0.18) this.state = S.ATTACK;
                break;
            default: break;
        }

        this._updateSpine();
    }

    /** @private */
    _tickSubFSM(dt) {
        switch (this._sub) {
            case SUB.PROWL:    this._tickProwl(dt);   break;
            case SUB.CHARGE:   this._tickCharge();    break;
            case SUB.DASH:     this._tickDash(dt);    break;
            case SUB.RECOVER:  this._tickRecover(dt); break;
            case SUB.ROAR:     this._tickRoar(dt);    break;
            default: break;
        }
    }

    /** @private */
    _enterSub(sub) {
        this._sub      = sub;
        this._subTimer = 0;
        if (sub === SUB.CHARGE) {
            this._dashFromX = this.x;
            this._dashToX   = this.cx + (this.x < this.cx ? this.range : -this.range);
            this.headDir    = this._dashToX >= this._dashFromX ? 1 : -1;
        }
    }

    /** @private — slow serpentine sway around centre. */
    _tickProwl(dt) {
        const t = this._movT;
        this.x = this.cx + Math.sin(t * PROWL_SPEED) * this.range * PROWL_AMP;
        this.y = this.cy + Math.cos(t * PROWL_SPEED * 0.6) * 14;
        this.headDir      = Math.cos(t * PROWL_SPEED) >= 0 ? 1 : -1;
        this.jawOpen      = Math.max(0, this.jawOpen - dt * 2);
        this.breathCharge = Math.max(0, this.breathCharge - dt * 2);
        if (this._subTimer > 1.4) this._enterSub(SUB.CHARGE);
    }

    /** @private — pull-back anticipation: jaw opens, throat charges. */
    _tickCharge() {
        const k = Math.min(1, this._subTimer / CHARGE_TIME);
        this.x  = this._dashFromX - this.headDir * k * 14;
        this.y += (this.cy - 8 - this.y) * 0.18;
        this.jawOpen      = k;
        this.breathCharge = k * 0.6;
        if (this._subTimer >= CHARGE_TIME) this._enterSub(SUB.DASH);
    }

    /** @private — high-speed dash across the play range. */
    _tickDash(dt) {
        this.x += this.headDir * DASH_SPEED * dt;
        this.y += (this.cy - this.y) * 0.25;
        this.jawOpen      = 1;
        this.breathCharge = 0.4;
        const reached = (this.headDir > 0 && this.x >= this._dashToX) ||
                        (this.headDir < 0 && this.x <= this._dashToX) ||
                        this._subTimer >= DASH_TIME;
        if (reached) this._enterSub(SUB.RECOVER);
    }

    /** @private — decelerate, drift back toward centre. */
    _tickRecover(dt) {
        this.x += (this.cx - this.x) * Math.min(1, dt * 4);
        this.y += (this.cy - this.y) * Math.min(1, dt * 4);
        this.jawOpen      = Math.max(0, this.jawOpen - dt * 3);
        this.breathCharge = Math.max(0, this.breathCharge - dt * 2);
        if (this._subTimer >= RECOVER_TIME) {
            this._cycleCount++;
            this._enterSub(this._cycleCount % ROAR_EVERY === 0 ? SUB.ROAR : SUB.PROWL);
        }
    }

    /** @private — anchored roar: jaw fully open, sustained fire breath. */
    _tickRoar(dt) {
        this.x += (this.cx - this.x) * Math.min(1, dt * 3);
        this.y += (this.cy - this.y) * Math.min(1, dt * 3);
        this.jawOpen      = 1;
        this.breathCharge = Math.min(1, this.breathCharge + dt * 2.5);
        if (this._subTimer >= ROAR_TIME) this._enterSub(SUB.PROWL);
    }

    /**
     * @private — relaxation kinematic chain (single Jakobsen pass).
     * Each segment is pulled toward its parent at the fixed segment length.
     * Allocation-free; O(SPINE_COUNT) per frame.
     */
    _updateSpine() {
        const head = this.spine[0];
        head.x = this.x;
        head.y = this.y;
        for (let i = 1; i < SPINE_COUNT; i++) {
            const prev = this.spine[i - 1];
            const cur  = this.spine[i];
            const dx = cur.x - prev.x;
            const dy = cur.y - prev.y;
            const d  = Math.hypot(dx, dy) || 1;
            const k  = (d - SPINE_SEG_LEN) / d;
            cur.x -= dx * k;
            cur.y -= dy * k;
        }
    }
}

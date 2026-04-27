import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Base FSM for bosses. Subclasses override stateUpdate(state, dt) and
 * onHit() to change phases.
 *
 * Common states: SLEEP, ENTER, ATTACK, HURT, DEFEATED.
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
    }

    awake() {
        if (this.state === Boss.STATE.SLEEP) {
            this.state = Boss.STATE.ENTER;
            this.timer = 0;
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
    }

    isAlive() { return this.state !== Boss.STATE.DEFEATED; }

    /** Called by section when ball collides with boss hitbox. */
    hit(damage = 1) {
        if (this.state === Boss.STATE.SLEEP || this.state === Boss.STATE.DEFEATED) return false;
        this.hp = Math.max(0, this.hp - damage);
        this.flash = 0.18;
        this.state = Boss.STATE.HURT;
        this.timer = 0;
        if (this.onScore) this.onScore(this.score);
        if (this.hp <= 0) {
            this.state = Boss.STATE.DEFEATED;
            if (this.onDefeated) this.onDefeated();
        }
        return true;
    }

    update(dt) {
        this.timer += dt;
        if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
        this.stateUpdate(dt);
    }

    /** Override in subclass. */
    stateUpdate(_dt) { /* no-op base */ }
}

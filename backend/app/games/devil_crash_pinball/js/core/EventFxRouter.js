import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Maps board events to audio + visual effects.
 *
 * SRP: pure side-effect dispatcher. Owns no state beyond the immutable
 * EVENT_FX table; reads ball position and game session via the Game ref.
 */

/** Boss-kill event types — trigger session counter + premium FX. */
const KILL_TYPES = new Set(['dragon_kill', 'witch_kill', 'golem_kill', 'demon_kill']);

const EVENT_FX = Object.freeze({
    bumper:      { sfx: 'bumper',      color: C.COLOR_GOLD,   r: 14, spd: 280, life: 0.5 },
    drop_target: { sfx: 'target',      color: C.COLOR_RED,    r:  8, spd: 200, life: 0.7 },
    brick:       { sfx: 'brick',       color: '#ff9900',      r:  7, spd: 180, life: 0.6 },
    slingshot:   { sfx: 'sling',       color: '#ff5050',      r: 10, spd: 240, life: 0.5 },
    spring:      { sfx: 'spring',      color: '#00e5ff',      r: 13, spd: 260, life: 0.42 },
    kicker:      { sfx: 'kicker',      color: C.COLOR_GOLD,   r: 16, spd: 320, life: 0.3 },
    warp:        { sfx: 'warp',        color: C.COLOR_PURPLE, r: 20, spd: 300, life: 0.5 },
    warp_enter:  { sfx: 'warp_enter',  color: C.COLOR_PURPLE, r: 28, spd: 360, life: 0.9, shake: 0.1 },
    boss_hit:    { sfx: 'boss',        color: C.COLOR_RED,    r: 12, spd: 260, life: 0.4, shake: 0.15 },
    target_bank: { sfx: 'target_bank', color: C.COLOR_GOLD,   r: 24, spd: 340, life: 0.45, shake: 0.2 },
    brick_wave:  { sfx: 'target_bank', color: C.COLOR_GOLD,   r: 24, spd: 340, life: 0.45, shake: 0.2 },
    combo:       { sfx: 'combo' },
});

const KILL_FX = Object.freeze({
    sfx: 'boss_kill', color: C.COLOR_GOLD, r: 30, spd: 400, life: 0.6, shake: 0.5,
});

export class EventFxRouter {
    /** @param {import('./Game.js').Game} game */
    constructor(game) {
        this._game = game;
    }

    /**
     * React to a board event: dispatch FX, count boss kills.
     * Bank-target completion bonus is owned by {@link Section} — never duplicated here.
     * @param {string} type
     */
    onEvent(type) {
        const g  = this._game;
        const bx = g.ball.pos.x;
        const by = g.ball.pos.y;

        if (KILL_TYPES.has(type)) {
            this._applyFx(KILL_FX, bx, by);
            g.session.bossesDefeated += 1;
            return;
        }
        const fx = EVENT_FX[type];
        if (fx) this._applyFx(fx, bx, by);
    }

    /** @private */
    _applyFx(fx, bx, by) {
        const g = this._game;
        if (fx.sfx)   g.audio.sfx(fx.sfx);
        if (fx.color) g.renderer.spawnHit(bx, by, fx.color, fx.r, fx.spd, fx.life);
        if (fx.shake) g.renderer.addShake(fx.shake);
    }
}

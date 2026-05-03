import { GameConfig as C } from '../config/GameConfig.js';
import { GameState }       from './GameState.js';
import { PerformanceMode } from '../config/PerformanceMode.js';

/**
 * Assembles the per-frame HUD data object.
 *
 * Pre-allocates the payload object once and mutates it in place every frame
 * to honour the "0 allocations in steady state" performance budget.
 */
export class HudPresenter {
    /** @param {import('./Game.js').Game} game */
    constructor(game) {
        this._game = game;
        this._data = HudPresenter._makeEmptyData();
    }

    /** @private */
    static _makeEmptyData() {
        return {
            score: '',
            multiplier: 1,
            zoneLabel: 'BASE',
            zoneColor: C.COLOR_DIM,
            zoneMult: 1,
            ballsLeft: 0,
            mission: null,
            ballSaveTimer: 0,
            gameState: GameState.ATTRACT,
            hintTimer: 0,
            ballReady: false,
            muted: false,
            bgmMuted: false,
            plungerCharge: 0,
            launchHeld: false,
            flipL: false,
            flipR: false,
            timePlayed: 0,
            bossesDefeated: 0,
            isStuck: false,
            tilted: false,
            lowPerf: false,
            canExitToShell: true,
            activeBgmPath: '',
        };
    }

    /** Mutate and return the cached data object. */
    build() {
        const g    = this._game;
        const tier = g.zoneProvider?.getTier(g.ball.pos.y);
        const d    = this._data;

        d.score         = g.score.formatted();
        d.multiplier    = g.score.multiplier;
        d.zoneLabel     = tier?.label ?? 'BASE';
        d.zoneColor     = tier?.color ?? C.COLOR_DIM;
        d.zoneMult      = tier?.mult  ?? 1;
        d.ballsLeft     = g.session.ballsLeft;
        d.mission       = null;
        d.ballSaveTimer = g.session.ballSaveTimer;
        d.gameState     = g.state;
        d.hintTimer     = g.session.hintTimer;
        d.ballReady     = g.state === GameState.BALL_READY;
        d.muted         = g.audio.muted;
        d.bgmMuted      = g.audio.bgmMuted;
        d.plungerCharge = g.plunger.charge;
        d.launchHeld    = g.input.held.launch;
        d.flipL         = g.input.held.flipL;
        d.flipR         = g.input.held.flipR;
        d.timePlayed    = Math.round(g.session.timePlayed);
        d.bossesDefeated = g.session.bossesDefeated;
        d.isStuck       = g.stuck.isDisplayStuck;
        d.tilted        = g.session.tilted;
        d.lowPerf       = PerformanceMode.lowPerf;
        d.canExitToShell  = g.canExitToShell();
        d.activeBgmPath  = g.audio.activeBgmPath;
        return d;
    }
}

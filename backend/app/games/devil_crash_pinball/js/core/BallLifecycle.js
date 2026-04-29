import { GameConfig as C } from '../config/GameConfig.js';
import { GameState } from './GameState.js';
import { Ball }      from '../physics/Ball.js';

/**
 * Elastic ease-out used for ball-spawn materialise animation (0 \u2192 1, with overshoot).
 * Module-level pure function — no per-call alloc.
 */
function elasticEaseOut(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Owns the lifecycle of a single ball: spawn, save, drain animation, game over.
 *
 * SRP: every ball state transition that affects the session goes through here.
 * Game.js stays free of the drain animation phase machine.
 */
export class BallLifecycle {
    /** @param {import('./Game.js').Game} game */
    constructor(game) {
        this._game = game;
        this._drain = this._makeDrainState();
    }

    /** @private */
    _makeDrainState() {
        return {
            timer: 0, drainX: 0, drainY: 0,
            spawnX: 0, spawnY: 0,
            ballSaved: false, gameOver: false,
        };
    }

    /** Drain animation overlay payload (read by Renderer each frame; null when inactive). */
    get drainEffect() {
        return this._game.state === GameState.BALL_DRAIN ? this._drain : null;
    }

    /**
     * Reset and respawn the ball at the validated spawn point.
     * Caller is responsible for transitioning the FSM into BALL_READY (done here).
     */
    loadBall() {
        const g = this._game;
        const { x: spawnX, y: spawnY } = g.board.ballSpawn;
        g.ball.reset(spawnX, spawnY);
        g.session.ballSaveTimer = C.BALL_SAVE_TIME;
        g.session.tilted = false;
        g.stuck.resetTimers();
        g.plunger.reset();

        g.renderer.snapToBall(g.ball);

        if (g.session.ballsLeft === C.BALLS_PER_GAME) g.session.hintTimer = C.HINT_DURATION;

        g.ball.state = Ball.STATE.LIVE;
        g.state = GameState.BALL_READY;
    }

    /**
     * Begin the animated drain sequence at the given world coords.
     * @param {number} drainX
     * @param {number} drainY
     */
    enterDrain(drainX, drainY) {
        const g = this._game;
        g.ball.state = Ball.STATE.LOST;
        g.ball.vel.set(0, 0);

        const saved = g.session.ballSaveTimer > 0;
        const { x: spawnX, y: spawnY } = g.board.ballSpawn;

        g.audio.sfx('lost');
        if (saved) g.audio.sfx('ball_save');
        if (!saved) g.session.ballsLeft -= 1;

        this._drain.timer     = 0;
        this._drain.drainX    = drainX;
        this._drain.drainY    = drainY;
        this._drain.spawnX    = spawnX;
        this._drain.spawnY    = spawnY;
        this._drain.ballSaved = saved;
        this._drain.gameOver  = !saved && g.session.ballsLeft <= 0;

        g.state = GameState.BALL_DRAIN;
        g.renderer.cancelTransition();
        g.renderer.addShake(0.75);
        g.renderer.spawnHit(drainX, drainY, '#ff2222', 36, 420, 0.9);
        g.renderer.spawnHit(drainX, drainY, '#ff8800', 18, 260, 0.7);
    }

    /**
     * Advance the drain animation through its three phases.
     * Called by the BALL_DRAIN state handler.
     * @param {number} dt
     */
    tickDrain(dt) {
        const prev = this._drain.timer;
        this._drain.timer += dt;
        const t = this._drain.timer;

        if (t < C.DRAIN_IMPLODE_END) {
            this._tickImplode(t);
        } else if (t < C.DRAIN_HOLD_END) {
            this._tickHold(prev);
        } else if (!this._drain.gameOver && t < C.DRAIN_SPAWN_END) {
            this._tickSpawn(t, prev);
        } else {
            this._game.ball.warpScale = 1;
            if (this._drain.gameOver) this._gameOver();
            else                      this.loadBall();
        }
    }

    /** @private */
    _tickImplode(t) {
        const raw = t / C.DRAIN_IMPLODE_END;
        this._game.ball.warpScale = 1 - raw * raw;
        this._game.ball.vel.set(0, 0);
    }

    /** @private */
    _tickHold(prev) {
        this._game.ball.warpScale = 0;
        if (prev < C.DRAIN_IMPLODE_END && !this._drain.gameOver) this._teleportBallToSpawn();
    }

    /** @private */
    _tickSpawn(t, prev) {
        const raw = (t - C.DRAIN_HOLD_END) / (C.DRAIN_SPAWN_END - C.DRAIN_HOLD_END);
        this._game.ball.warpScale = elasticEaseOut(raw);
        if (prev < C.DRAIN_HOLD_END) this._spawnBurst();
    }

    /** @private */
    _teleportBallToSpawn() {
        const g  = this._game;
        const sx = this._drain.spawnX;
        const sy = this._drain.spawnY;
        g.ball.pos.x = sx;
        g.ball.pos.y = sy;
        for (const tr of g.ball.trail) {
            tr.x = sx;
            tr.y = sy;
        }
        g.renderer.snapToBall(g.ball);
    }

    /** @private */
    _spawnBurst() {
        const sc = this._drain.ballSaved ? '#ffd700' : '#cc44ff';
        this._game.renderer.spawnHit(this._drain.spawnX, this._drain.spawnY, sc, 28, 300, 0.7);
        this._game.renderer.addShake(0.2);
    }

    /** @private */
    _gameOver() {
        const g = this._game;
        g.state = GameState.GAME_OVER;
        g.session.menuGuard = C.MENU_GUARD_TIME;
        g.input.drain();
        g.audio.stopBgm();
        g.session.timePlayed = (performance.now() - g.session.startTime) / 1000;

        const achievements = [];
        if (g.session.bossesDefeated > 0) achievements.push('mini_boss_slayer');
        if (g.score.score >= C.EXTRA_BALL_SCORE_THRESHOLD) achievements.push('millionaire');

        g.platform.sendScore(g.score.score);
        g.platform.gameOver(g.score.score, {
            timePlayed: Math.round(g.session.timePlayed),
            achievements,
        });
    }
}

import { GameConfig as C } from '../config/GameConfig.js';
import { GameState }       from './GameState.js';
import { Ball }            from '../physics/Ball.js';
import { PhysicsWorld }    from '../physics/PhysicsWorld.js';
import { BoardManager }    from './BoardManager.js';
import { LevelConfigStore }from './LevelConfigStore.js';
import { ScoreManager }    from '../scoring/ScoreManager.js';
import { ZoneMultiplierProvider } from '../scoring/ZoneMultiplierProvider.js';
import { InputManager }    from '../input/InputManager.js';
import { SoundManager }    from '../audio/SoundManager.js';
import { Renderer }        from '../rendering/Renderer.js';
import { HUD }             from '../ui/HUD.js';
import { PlatformBridge }  from '../platform/PlatformBridge.js';

import { GameSession }       from './GameSession.js';
import { EventFxRouter }     from './EventFxRouter.js';
import { BallLifecycle }     from './BallLifecycle.js';
import { PlungerController } from './PlungerController.js';
import { StuckRescuer }      from './StuckRescuer.js';
import { TiltController }    from './TiltController.js';
import { InputRouter }       from './InputRouter.js';
import { HudPresenter }      from './HudPresenter.js';
import { CanvasFitter }      from './CanvasFitter.js';

import { MenuStateHandler }      from './states/MenuStateHandler.js';
import { PausedStateHandler }    from './states/PausedStateHandler.js';
import { DrainStateHandler }     from './states/DrainStateHandler.js';
import { BallReadyStateHandler } from './states/BallReadyStateHandler.js';
import { PlayStateHandler }      from './states/PlayStateHandler.js';

/**
 * Top-level orchestrator. Owns the loop, the FSM, and the wiring between
 * the dedicated controllers ({@link BallLifecycle}, {@link PlungerController},
 * {@link StuckRescuer}, {@link TiltController}, {@link EventFxRouter},
 * {@link InputRouter}, {@link HudPresenter}, {@link CanvasFitter}).
 *
 * No physics, rendering, audio or per-event side-effect logic lives here \u2014
 * Game just coordinates collaborators and ticks the active state handler.
 */
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');

        // Core systems (composition)
        this.ball     = new Ball(C.WORLD_WIDTH - 35, 0);
        this.physics  = new PhysicsWorld(this.ball);
        this.score    = new ScoreManager();
        this.board    = null;
        this.input    = new InputManager(canvas, (cx, cy) => HUD.hitTest(cx, cy, this.state === GameState.BALL_READY));
        this.audio    = new SoundManager();
        this.renderer = new Renderer(canvas);
        this.hud      = new HUD(this.ctx);
        this.platform = new PlatformBridge();

        // FSM + session
        this.state   = GameState.ATTRACT;
        this.session = new GameSession();
        this.elapsed = 0;

        // Edge-detection state for flipper press SFX (one byte each \u2014 no extraction needed)
        this._prevFlipL = false;
        this._prevFlipR = false;

        // Collaborators
        this.fxRouter      = new EventFxRouter(this);
        this.ballLifecycle = new BallLifecycle(this);
        this.plunger       = new PlungerController(this);
        this.stuck         = new StuckRescuer(this);
        this.tilt          = new TiltController(this);
        this.inputRouter   = new InputRouter(this);
        this.hudPresenter  = new HudPresenter(this);
        this._fitter       = new CanvasFitter(canvas);

        // Loop
        this.running         = false;
        this.lastTime        = 0;
        this._consecutiveErr = 0;
        this._loop           = this._loop.bind(this);

        this.score.onExtraBall = () => this._onExtraBall();
        this._stateHandlers    = this._buildStateHandlers();
    }

    async init() {
        await LevelConfigStore.load();
        this.board = new BoardManager(
            (s)    => this._onScore(s),
            (type) => this.fxRouter.onEvent(type),
        );
        this.board.validate();
        this.zoneProvider = new ZoneMultiplierProvider(
            this.board.sections.length * C.SECTION_HEIGHT,
        );
        await this.platform.initialize();
        this.platform.on('pause',  () => this.pause());
        this.platform.on('resume', () => this.resume());
    }

    start() {
        this.running  = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this._loop);
    }

    pause() {
        if (this.state === GameState.PLAY) this.state = GameState.PAUSED;
    }

    resume() {
        if (this.state === GameState.PAUSED) this.state = GameState.PLAY;
    }

    destroy() {
        this.running = false;
        this._fitter.destroy();
        this.input.destroy();
        this.audio.destroy();
    }

    // \u2500\u2500 Public API used by InputRouter / state handlers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

    /** Rescue the live ball: teleport to spawn without consuming a ball. */
    rescueBall() {
        if (this.state !== GameState.PLAY) return;
        if (this.ball.state !== Ball.STATE.LIVE) return;
        this.audio.sfx('ball_save');
        this.ballLifecycle.loadBall();
    }

    togglePause() {
        if (this.state === GameState.PLAY)        this.state = GameState.PAUSED;
        else if (this.state === GameState.PAUSED) this.state = GameState.PLAY;
    }

    startNewGame() {
        this.score.reset();
        this.board.resetTargets();
        this.board.resetBosses();
        this.session.reset();
        this.session.startTime = performance.now();
        this.audio.init();
        if (this.board.main?.audioProfile) {
            this.audio.applyProfile(this.board.main.audioProfile, 0);
        }
        this.audio.playBgm();
        for (const s of this.board.sections) s.boss?.awake();
        this.platform.sendGameStarted();
        this.ballLifecycle.loadBall();
    }

    /** Advance the "ball is live" pipeline (PLAY + BALL_READY share this). */
    tickLive(dt) {
        this._tickFlippers();
        this.board.update(dt);
        this._stepPhysicsAndSection(dt);
        this.score.update(dt);
        if (this.session.ballSaveTimer > 0) {
            this.session.ballSaveTimer = Math.max(0, this.session.ballSaveTimer - dt);
        }
        this.plunger.checkReplunge();
        this._checkDrain();
        this.stuck.updateDisplay(dt);
        this.renderer.follow(this.ball, dt);
    }

    /** Advance the BALL_DRAIN animation. */
    tickDrain(dt) {
        this.ballLifecycle.tickDrain(dt);
        this.board.update(dt);
        this.renderer.follow(this.ball, dt);
    }

    // \u2500\u2500 Internal pipeline \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

    /** @private */
    _onExtraBall() {
        this.session.ballsLeft += 1;
        this.audio.sfx('extra');
        this.hud.pulse();
    }

    /** @private */
    _onScore(amount) {
        const zoneMult = this.zoneProvider.getMultiplier(this.ball.pos.y);
        this.score.add(amount, zoneMult);
        this.platform.sendScore(this.score.score);
        this.hud.pulse();
    }

    /** @private */
    _tickFlippers() {
        const flipL = !this.session.tilted && this.input.held.flipL;
        const flipR = !this.session.tilted && this.input.held.flipR;
        this.board.setFlippers(flipL, flipR);
        if (flipL && !this._prevFlipL) { this.audio.sfx('flipper'); this.renderer.triggerFlipFlash(true); }
        if (flipR && !this._prevFlipR) { this.audio.sfx('flipper'); this.renderer.triggerFlipFlash(false); }
        this._prevFlipL = flipL;
        this._prevFlipR = flipR;
    }

    /** @private */
    _stepPhysicsAndSection(dt) {
        if (this.ball.state !== Ball.STATE.LIVE) return;
        const prev  = this.board.sectionIndexAt(this.ball.pos.y);
        const prevY = this.ball.pos.y;
        this.physics.step(dt, ball => this.board.activeSection(ball));
        const next = this.board.sectionIndexAt(this.ball.pos.y);
        if (next !== prev) this._onSectionChanged(prev, next, prevY);
    }

    /** @private */
    _onSectionChanged(prev, next, prevY) {
        const goingUp = next < prev;
        this.fxRouter.onEvent(goingUp ? 'ramp' : 'ramp_down');
        this.audio.sfx('warp');
        const destSection = this.board.sections[next];
        const isWarpJump  = Math.abs(this.ball.pos.y - prevY) > C.SECTION_HEIGHT * 0.6;
        if (isWarpJump) this.renderer.snapToBall(this.ball);
        this.renderer.triggerFloorTransition(destSection.palette, goingUp);
        this.audio.applyProfile(destSection.audioProfile, C.AUDIO_PROFILE_TRANSITION);
    }

    /** @private */
    _checkDrain() {
        if (this.state !== GameState.PLAY) return;
        if (this.ball.state === Ball.STATE.LIVE && this.board.isDrained(this.ball)) {
            this.ballLifecycle.enterDrain(this.ball.pos.x, this.ball.pos.y);
        }
    }

    // \u2500\u2500 Loop \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

    /** @private */
    _loop(ts) {
        if (!this.running) return;
        const dtRaw = (ts - this.lastTime) / 1000;
        this.lastTime = ts;
        const dt = Math.min(dtRaw, C.FRAME_DT_CLAMP);

        try {
            this._update(dt);
            this._draw();
            this._consecutiveErr = 0;
        } catch (err) {
            console.error('[devil_crash_pinball] frame error', err);
            this._consecutiveErr += 1;
            if (this._consecutiveErr >= C.LOOP_MAX_ERRORS) {
                this.running = false;
                throw err; // fail loud after sustained corruption
            }
        }
        if (this.running) requestAnimationFrame(this._loop);
    }

    /** @private */
    _update(dt) {
        this.elapsed += dt;
        this.hud.update(dt);
        if (this.session.hintTimer > 0) {
            this.session.hintTimer = Math.max(0, this.session.hintTimer - dt);
        }
        this.inputRouter.processEvents();
        this._stateHandlers[this.state].update(dt);
    }

    /** @private */
    _draw() {
        this.renderer.setDrainEffect(this.ballLifecycle.drainEffect);
        this.renderer.draw(this.board, this.ball);
        const data = this.hudPresenter.build();
        this.hud.draw(data, this.canvas.width, this.canvas.height);
    }

    /** @private */
    _buildStateHandlers() {
        const menu = new MenuStateHandler(this);
        return {
            [GameState.ATTRACT]:    menu,
            [GameState.GAME_OVER]:  menu,
            [GameState.PAUSED]:     new PausedStateHandler(this),
            [GameState.BALL_DRAIN]: new DrainStateHandler(this),
            [GameState.BALL_READY]: new BallReadyStateHandler(this),
            [GameState.PLAY]:       new PlayStateHandler(this),
        };
    }
}

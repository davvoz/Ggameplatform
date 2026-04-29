import { GameConfig as C } from '../config/GameConfig.js';
import { GameState } from './GameState.js';
import { Ball } from '../physics/Ball.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { BoardManager } from './BoardManager.js';
import { LevelConfigStore } from './LevelConfigStore.js';
import { ScoreManager } from '../scoring/ScoreManager.js';
import { ZoneMultiplierProvider } from '../scoring/ZoneMultiplierProvider.js';
import { InputManager } from '../input/InputManager.js';
import { SoundManager } from '../audio/SoundManager.js';
import { Renderer } from '../rendering/Renderer.js';
import { HUD } from '../ui/HUD.js';
import { PlatformBridge } from '../platform/PlatformBridge.js';
import { LaunchSpring } from '../entities/LaunchSpring.js';
import { MenuStateHandler } from './states/MenuStateHandler.js';
import { PausedStateHandler } from './states/PausedStateHandler.js';
import { DrainStateHandler } from './states/DrainStateHandler.js';
import { BallReadyStateHandler } from './states/BallReadyStateHandler.js';
import { PlayStateHandler } from './states/PlayStateHandler.js';

// ── Event effects table ──────────────────────────────────────────────────────
// Data-driven: extend here to handle new event types without changing _onEvent.
const KILL_TYPES = new Set(['dragon_kill', 'witch_kill', 'golem_kill', 'demon_kill']);

/** Elastic ease-out used for ball-spawn materialise animation (0→1, with overshoot). */
function _elasticEaseOut(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

const EVENT_FX = {
    bumper:      { sfx: 'bumper',      color: C.COLOR_GOLD,   r: 14, spd: 280, life: 0.5 },
    drop_target: { sfx: 'target',      color: C.COLOR_RED,    r:  8, spd: 200, life: 0.7 },
    brick:       { sfx: 'brick',       color: '#ff9900',      r:  7, spd: 180, life: 0.6 },
    slingshot:   { sfx: 'sling',       color: '#ff5050',      r: 10, spd: 240, life: 0.5 },
    spring:      { sfx: 'spring',      color: '#00e5ff',      r: 13, spd: 260, life: 0.42 },
    kicker:      { sfx: 'kicker',      color: C.COLOR_GOLD,   r: 16, spd: 320, life: 0.3 },
    warp:        { sfx: 'warp',       color: C.COLOR_PURPLE, r: 20, spd: 300, life: 0.5 },
    warp_enter:  { sfx: 'warp_enter', color: C.COLOR_PURPLE, r: 28, spd: 360, life: 0.9, shake: 0.1 },
    boss_hit:    { sfx: 'boss',        color: C.COLOR_RED,    r: 12, spd: 260, life: 0.4, shake: 0.15 },
    target_bank: { sfx: 'target_bank', color: C.COLOR_GOLD,   r: 24, spd: 340, life: 0.45, shake: 0.2 },
    brick_wave:  { sfx: 'target_bank', color: C.COLOR_GOLD,   r: 24, spd: 340, life: 0.45, shake: 0.2 },
    combo:       { sfx: 'combo' },
};

/**
 * Main orchestrator. Owns the game loop, top-level FSM, and wires events
 * between modules. Game does not contain physics or rendering math —
 * it only coordinates.
 */
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Core
        // Dummy position — reset to real spawn in _loadBall() after init().
        this.ball = new Ball(C.WORLD_WIDTH - 35, 0);
        this.physics = new PhysicsWorld(this.ball);
        this.score = new ScoreManager();
        this.board = null;  // populated in init() after LevelConfigStore.load()
        this.input = new InputManager(canvas);
        this.audio = new SoundManager();
        this.renderer = new Renderer(canvas);
        this.hud = new HUD(this.ctx);
        this.platform = new PlatformBridge();

        // Game session
        this.state = GameState.ATTRACT;
        this.ballsLeft = C.BALLS_PER_GAME;
        this.ballSaveTimer = 0;
        this.tiltCount = 0;
        this.tilted = false;
        this.elapsed = 0;
        this.timePlayed = 0;
        this.bossesDefeated = 0;
        this.startTime = 0;

        // Drain animation state (BALL_DRAIN phase data)
        this._drain = { timer: 0, drainX: 0, drainY: 0, spawnX: 0, spawnY: 0, ballSaved: false, gameOver: false };

        // Anti-stuck + on-screen hint timers
        this.stuckTimer = 0;
        this.hintTimer = 0;
        // Position-based stuck detection (catches vibrating-but-trapped balls)
        this._stuckPosRef  = { x: 0, y: 0 };
        this._stuckPosTimer = 0;

        // Dedicated display-stuck tracker for the HUD RESET button.
        // More sensitive than the auto-nudge: 2s window, 60px movement threshold.
        // Latches true and stays true until the ball moves 60px (not reset per-window).
        this._stuckDisplay = false;
        this._stuckDisplayRef  = { x: 0, y: 0 };
        this._stuckDisplayTimer = 0;

        // Plunger charge (0..1)
        this.plungerCharge = 0;
        // Previous flipper state for edge detection (triggers visual flash)
        this._prevFlipL = false;
        // Input guard for menu states: blocks menu-dismiss until timer expires.
        // Prevents held flipper inputs from instantly skipping the game-over screen.
        this._menuInputGuard = 0;
        // Arm flag for menu input: requires inputs to be released after the guard
        // before a press counts. Kills queued/held inputs from the previous round.
        this._menuInputArmed = false;
        this._prevFlipR = false;

        // Loop
        this.running = false;
        this.lastTime = 0;
        this._loop = this._loop.bind(this);

        this._fitCanvas();
        this._onResize = () => this._fitCanvas();
        globalThis.addEventListener('resize', this._onResize);
        globalThis.addEventListener('orientationchange', this._onResize);

        this.score.onExtraBall = () => {
            this.ballsLeft += 1;
            this.audio.sfx('extra');
            this.hud.pulse();
        };

        this._stateHandlers = this._buildStateHandlers();
    }

    async init() {
        await LevelConfigStore.load();
        this.board = new BoardManager(
            (s) => this._onScore(s),
            (type) => this._onEvent(type),
        );
        this._zoneProvider = new ZoneMultiplierProvider(
            this.board.sections.length * C.SECTION_HEIGHT
        );
        await this.platform.initialize();
        this.platform.on('pause', () => this.pause());
        this.platform.on('resume', () => this.resume());
    }

    start() {
        this.running = true;
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
        globalThis.removeEventListener('resize', this._onResize);
        globalThis.removeEventListener('orientationchange', this._onResize);
        this.input.destroy();
        this.audio.destroy();
    }

    // ── Public control actions ───────────────────────────────────────────────

    /**
     * Rescue the ball: teleport it back to spawn without consuming a ball.
     * Only callable while the ball is live in PLAY state.
     * Transitions to BALL_READY so the player must relaunch.
     */
    rescueBall() {
        if (this.state !== GameState.PLAY) return;
        if (this.ball.state !== Ball.STATE.LIVE) return;
        this.audio.sfx('ball_save');
        this._loadBall();
    }

    /**
     * Trigger a tilt via the on-screen button.
     * Delegates to the existing InputManager flag so _handleTilt() in the
     * game loop processes it identically to a keyboard tilt.
     */
    triggerTilt() {
        if (this.state !== GameState.PLAY) return;
        this.input.requestTilt();
    }

    // ── Canvas HUD button handling ──────────────────────────────────────────

    /**
     * Consume the last canvas tap from InputManager and route it to the
     * appropriate action if it landed on a HUD button.
     * Guards inside rescueBall() / triggerTilt() prevent action outside PLAY.
     */
    _checkHudButtons() {
        const tap = this.input.consumeCanvasTap();
        if (!tap) return;
        const cx = tap.x * C.VIEW_WIDTH;
        const cy = tap.y * C.VIEW_HEIGHT;
        const hit = HUD.hitTest(cx, cy);
        if      (hit === 'rescue') this.rescueBall();
        else if (hit === 'tilt')   this.triggerTilt();
        else if (hit === 'bgm')    this.audio.toggleBgm();
        else if (hit === 'sfx')    this.audio.toggleMute();
        else if (hit === 'pause') {
            if (this.state === GameState.PLAY)   this.state = GameState.PAUSED;
            else if (this.state === GameState.PAUSED) this.state = GameState.PLAY;
        }
    }

    // ── FSM transitions ─────────────────────────────────────────────

    _startNewGame() {
        this.score.reset();
        this.board.resetTargets();
        this.board.resetBosses();
        this.ballsLeft = C.BALLS_PER_GAME;
        this.tiltCount = 0;
        this.tilted = false;
        this.bossesDefeated = 0;
        this.timePlayed = 0;
        this.startTime = performance.now();
        this.audio.init();
        // Apply the starting section's audio profile instantly (no ramp at game start)
        if (this.board.main?.audioProfile) {
            this.audio.applyProfile(this.board.main.audioProfile, 0);
        }
        this.audio.playBgm();
        this._wakeAllBosses();
        this.platform.sendGameStarted();
        this._loadBall();
    }

    /** Wake all section bosses immediately at game start. */
    _wakeAllBosses() {
        for (const s of this.board.sections) {
            s.boss?.awake();
        }
    }

    _loadBall() {
        // Ball spawn: read from main_table config if available, else fallback
        const mainCfg  = LevelConfigStore.get('main_table');
        const bs        = mainCfg?.ballStarts?.[0];
        const mainTop   = this.board.main?.top ?? 0;
        const spawnX    = bs?.x ?? (C.WORLD_WIDTH - 35);
        const spawnY    = bs?.y == null ? mainTop + C.SECTION_HEIGHT - 80 : mainTop + bs.y;
        this.ball.reset(spawnX, spawnY);
        this.ballSaveTimer = C.BALL_SAVE_TIME;
        this.tilted = false;
        this.stuckTimer = 0;
        this._stuckPosTimer = 0;
        this._stuckPosRef.x = 0;
        this._stuckPosRef.y = 0;
        this._stuckDisplay = false;
        this._stuckDisplayTimer = 0;
        this._stuckDisplayRef.x = 0;
        this._stuckDisplayRef.y = 0;
        this.plungerCharge = 0;
        // Randomize the launch fork diverter for this ball
        this.board.launchFork?.randomize();
        // Snap camera to the section the ball is in (avoids any leftover
        // lerp from a previous floor).
        this.renderer.snapToBall(this.ball);
        // Plunger must "arm" by seeing the launch input released first.
        // This prevents the same tap that started the game / closed a panel
        // from immediately firing the plunger.
        this.plungerArmed = false;
        // Drop any pending launch edge events leaked from the previous state.
        this.input.consumeLaunch();
        // Show on-screen hints only on the very first ball of a session
        if (this.ballsLeft === C.BALLS_PER_GAME) this.hintTimer = C.HINT_DURATION;
        // If a LaunchSpring is present the ball must be LIVE immediately so
        // physics runs and the spring can hold the ball on the pad.
        // For the built-in virtual plunger the ball stays IDLE (frozen) until
        // _launchBall() fires.
        if (this.board?.launchSpring) this.ball.state = Ball.STATE.LIVE;
        this.state = GameState.BALL_READY;
    }

    _launchBall(power01 = 1) {
        // Plunger: vertical impulse upward, scaled by accumulated charge.
        const k = Math.max(0, Math.min(1, power01));
        const power = C.PLUNGER_MIN_VEL + (C.PLUNGER_MAX_VEL - C.PLUNGER_MIN_VEL) * k;
        this.ball.launch(0, -power);
        this.audio.sfx('launch');
        this.plungerCharge = 0;
        this.state = GameState.PLAY;
    }

    _ballLost() {
        this.audio.sfx('lost');
        if (this.ballSaveTimer > 0) {
            // Ball save grants a fresh ball without consuming
            this.audio.sfx('ball_save');
            this._loadBall();
            return;
        }
        this.ballsLeft -= 1;
        if (this.ballsLeft <= 0) {
            this._gameOver();
        } else {
            this._loadBall();
        }
    }

    /**
     * Begin the animated drain sequence.
     * Freezes the ball, decrements the count, then drives phases via _updateDrain().
     * @param {number} drainX  world-X where the ball touched the death line
     * @param {number} drainY  world-Y where the ball touched the death line
     */
    _enterDrain(drainX, drainY) {
        this.ball.state = Ball.STATE.LOST;
        this.ball.vel.set(0, 0);

        const saved = this.ballSaveTimer > 0;

        // Resolve spawn position (mirrors _loadBall logic)
        const mainCfg = LevelConfigStore.get('main_table');
        const bs      = mainCfg?.ballStarts?.[0];
        const mainTop = this.board.main?.top ?? 0;
        const spawnX  = bs?.x ?? (C.WORLD_WIDTH - 35);
        const spawnY  = bs?.y == null
            ? mainTop + C.SECTION_HEIGHT - 80
            : mainTop + bs.y;

        // Audio — play immediately so it lines up with the implode visuals
        this.audio.sfx('lost');
        if (saved) this.audio.sfx('ball_save');

        if (!saved) this.ballsLeft -= 1;

        this._drain = {
            timer:     0,
            drainX,
            drainY,
            spawnX,
            spawnY,
            ballSaved: saved,
            gameOver:  !saved && this.ballsLeft <= 0,
            ballsLeft: this.ballsLeft,
        };

        this.state = GameState.BALL_DRAIN;
        this.renderer.cancelTransition();
        this.renderer.addShake(0.75);
        this.renderer.spawnHit(drainX, drainY, '#ff2222', 36, 420, 0.9);
        this.renderer.spawnHit(drainX, drainY, '#ff8800', 18, 260, 0.7);
    }

    /**
     * Drive the BALL_DRAIN animation through its three phases.
     * Called every frame while state === BALL_DRAIN.
     */
    _updateDrain(dt) {
        const IMPLODE_END = 0.55;
        const HOLD_END    = 2.5;
        const SPAWN_END   = 3.2;

        const prev = this._drain.timer;
        this._drain.timer += dt;
        const t = this._drain.timer;

        if (t < IMPLODE_END) {
            // Phase 1 — Implode: ease-in shrink to zero
            const raw = t / IMPLODE_END;
            this.ball.warpScale = 1 - raw * raw;
            this.ball.vel.set(0, 0);

        } else if (t < HOLD_END) {
            // Phase 2 — Hold: ball invisible, camera travels to spawn (non-game-over only)
            this.ball.warpScale = 0;
            if (prev < IMPLODE_END && !this._drain.gameOver) this._teleportBallToSpawn();

        } else if (!this._drain.gameOver && t < SPAWN_END) {
            // Phase 3 — Spawn: elastic materialise. Skipped entirely on game over.
            const raw = (t - HOLD_END) / (SPAWN_END - HOLD_END);
            this.ball.warpScale = _elasticEaseOut(raw);
            if (prev < HOLD_END) this._spawnBurst();

        } else {
            // Animation complete
            this.ball.warpScale = 1;
            if (this._drain.gameOver) this._gameOver();
            else                      this._loadBall();
        }
    }

    /** First frame of Hold: teleport ball and trail to spawn point, snap camera. */
    _teleportBallToSpawn() {
        this.ball.pos.x = this._drain.spawnX;
        this.ball.pos.y = this._drain.spawnY;
        for (const tr of this.ball.trail) {
            tr.x = this._drain.spawnX;
            tr.y = this._drain.spawnY;
        }
        this.renderer.snapToBall(this.ball);
    }

    /** Spawn entry burst effect — particles + shake. */
    _spawnBurst() {
        const sc = this._drain.ballSaved ? '#ffd700' : '#cc44ff';
        this.renderer.spawnHit(this._drain.spawnX, this._drain.spawnY, sc, 28, 300, 0.7);
        this.renderer.addShake(0.2);
    }

    _gameOver() {
        this.state = GameState.GAME_OVER;
        this._menuInputGuard = 2;   // block input for 2 s so the game-over banner is visible
        this._menuInputArmed = false;
        // Drop any queued input edges from the drain/play phase so they can't
        // bleed through the guard and dismiss the banner instantly.
        this.input.consumeLaunch();
        this.input.consumeTilt();
        this.input.consumeEsc();
        this.input.consumeCanvasTap();
        this.audio.stopBgm();
        this.timePlayed = (performance.now() - this.startTime) / 1000;
        const achievements = [];
        if (this.bossesDefeated > 0) achievements.push('mini_boss_slayer');
        if (this.score.score >= 1_000_000) achievements.push('millionaire');
        this.platform.sendScore(this.score.score);
        this.platform.gameOver(this.score.score, {
            timePlayed: Math.round(this.timePlayed),
            achievements,
        });
    }


    _onScore(amount) {
        this._addScore(amount);
    }

    _addScore(base) {
        const zoneMult = this._zoneProvider.getMultiplier(this.ball.pos.y);
        const gained = this.score.add(base, zoneMult);
        this.platform.sendScore(this.score.score);
        this.hud.pulse();
        return gained;
    }

    _onEvent(type) {
        const bx = this.ball.pos.x;
        const by = this.ball.pos.y;

        this._applyEventFx(type, bx, by);

        if (KILL_TYPES.has(type)) this.bossesDefeated += 1;

        // Drop target bank completion bonus (legacy path for floors without auto-reset)
        if (type === 'drop_target' && this._allTargetsDown()) {
            this._addScore(C.TARGET_BANK_BONUS);
            this.score.bumpMultiplier(1);
            this.board.resetTargets();
            this.renderer.spawnHit(bx, by, C.COLOR_GOLD, 28, 360, 0.4);
        }

    }

    /** Dispatches audio + visual effects for a given event type. Pure side-effects, no state mutation. */
    _applyEventFx(type, bx, by) {
        if (KILL_TYPES.has(type)) {
            this.audio.sfx('boss_kill');
            this.renderer.addShake(0.5);
            this.renderer.spawnHit(bx, by, C.COLOR_GOLD, 30, 400, 0.6);
            return;
        }
        const fx = EVENT_FX[type];
        if (!fx) return;
        if (fx.sfx)   this.audio.sfx(fx.sfx);
        if (fx.color) this.renderer.spawnHit(bx, by, fx.color, fx.r, fx.spd, fx.life);
        if (fx.shake) this.renderer.addShake(fx.shake);
    }

    _allTargetsDown() {
        for (const s of this.board.sections) {
            for (const t of s.targets) if (t.standing) return false;
        }
        return true;
    }

    // ── Loop ────────────────────────────────────────────────────────

    _loop(ts) {
        if (!this.running) return;
        const dtRaw = (ts - this.lastTime) / 1000;
        this.lastTime = ts;
        const dt = Math.min(dtRaw, 0.05);

        // Defensive: a single render error must not kill the game loop.
        // Without this, an exception in _update/_draw skips the trailing
        // requestAnimationFrame and the page appears frozen.
        try {
            this._update(dt);
            this._draw();
        } catch (err) {
            console.error('[devil_crash_pinball] frame error', err);
        }
        requestAnimationFrame(this._loop);
    }

    _menuInputPressed() {
        // Used ONLY for ATTRACT/GAME_OVER screens: any input starts a new game.
        // Only accept edge events (consumeLaunch) — steady flipper holds must NOT
        // count, otherwise a player still holding a flipper at game-over would
        // restart immediately when the menu input guard expires.
        return this.input.consumeLaunch();
    }

    /** Update the plunger while in BALL_READY. Returns true once the ball is launched. */
    _updatePlunger(dt) {
        // Arm guard: wait for input to be released once before accepting any press.
        // Kills the residual event that dismissed the attract / game-over panel.
        if (!this.plungerArmed) {
            if (!this.input.launchHeld) this.plungerArmed = true;
            this.input.consumeLaunch();
            return false;
        }
        const ls = this.board.launchSpring;
        if (ls) return this._updatePlungerEntity(dt, ls);
        return this._updatePlungerBuiltIn(dt);
    }

    /** Delegate charge/release to all level-placed LaunchSpring entities. @private */
    _updatePlungerEntity(dt, ls) {
        const all = this.board.launchSprings;

        // Spring completed snap-back and applied impulse → transition to PLAY.
        // (fired is set by LaunchSpring.update() the same frame the impulse fires;
        //  board.update() runs after _updatePlunger so we detect it next frame.)
        if (all.some(s => s.fired)) {
            this.audio.sfx('launch');
            this.plungerCharge = 0;
            this.state = GameState.PLAY;
            return true;
        }

        if (this.input.launchHeld) {
            for (const s of all) s.retract(dt);
            this.plungerCharge = ls.pullRatio;
            this.input.consumeLaunch();
            return false;
        }

        // Spring is already snapping forward — show charge falling to 0, wait for fire.
        if (all.some(s => s.state === LaunchSpring.STATE.RELEASING)) {
            this.plungerCharge = ls.pullRatio;
            return false;
        }

        const wasPulled = all.some(s => s.pullRatio > 0);
        const wasTapped = this.input.consumeLaunch();
        if (wasPulled || wasTapped) {
            for (const s of all) s.release(this.ball); // starts RELEASING, no immediate impulse
            return false;
        }
        return false;
    }

    /** Fallback built-in plunger — used when no LaunchSpring is in the level. @private */
    _updatePlungerBuiltIn(dt) {
        if (this.input.launchHeld) {
            this.plungerCharge = Math.min(1, this.plungerCharge + dt / C.PLUNGER_CHARGE_TIME);
            // Drop the edge event so it does not fire again on release
            this.input.consumeLaunch();
            return false;
        }
        if (this.plungerCharge > 0) {
            const charged = this.plungerCharge;
            this._launchBall(charged);
            return true;
        }
        // Tap (no hold) on the launch zone -> minimum-power launch
        if (this.input.consumeLaunch()) {
            this._launchBall(0);
            return true;
        }
        return false;
    }

    _handleTilt() {
        if (!this.input.consumeTilt() || this.tilted) return;
        this.tiltCount++;
        this.audio.sfx('tilt');
        this.renderer.addShake(0.4);

        // Physical nudge: random horizontal kick + upward push, like slamming the table.
        // Strength escalates with each tilt press to feel increasingly desperate.
        if (this.ball.state === Ball.STATE.LIVE) {
            const intensity = 0.7 + this.tiltCount * 0.25;
            const dir = Math.random() < 0.5 ? -1 : 1;
            this.ball.vel.x += dir * 280 * intensity * (0.7 + Math.random() * 0.6);
            this.ball.vel.y += -340 * intensity * (0.5 + Math.random() * 0.5);
            this.renderer.spawnHit(
                this.ball.pos.x, this.ball.pos.y,
                '#ff4400', 14, 260, 0.5
            );
        }

        if (this.tiltCount >= C.TILT_SHAKE_LIMIT) this.tilted = true;
    }

    _stepPhysicsAndSection(dt) {
        if (this.ball.state !== Ball.STATE.LIVE) return;
        const prev  = this.board.sectionIndexAt(this.ball.pos.y);
        const prevY = this.ball.pos.y;
        this.physics.step(dt, ball => this.board.activeSection(ball));
        const next = this.board.sectionIndexAt(this.ball.pos.y);
        if (next !== prev) {
            const goingUp = next < prev;
            this._onEvent(goingUp ? 'ramp' : 'ramp_down');
            this.audio.sfx('warp');
            // Palette-warp sweep into the destination floor.
            const destSection = this.board.sections[next];
            // If the ball jumped more than 60 % of a section height in one
            // physics step it was teleported by a WarpHole (not gravity).
            // In that case snap the camera immediately so the ball stays on
            // screen; the visual transition still fires for the colour flash.
            const isWarpJump = Math.abs(this.ball.pos.y - prevY) > C.SECTION_HEIGHT * 0.6;
            if (isWarpJump) this.renderer.snapToBall(this.ball);
            this.renderer.triggerFloorTransition(destSection.palette, goingUp);
            this.audio.applyProfile(destSection.audioProfile, C.AUDIO_PROFILE_TRANSITION);
        }
    }

    /**
     * If the ball rolls back onto the LaunchSpring pad during PLAY, switch back
     * to BALL_READY so the player can charge and fire again (re-plunge).
     * Only triggers when the spring is IDLE (fully reset) and the ball centre
     * is within pad-collision range.
     */
    _checkReplunge() {
        if (this.state !== GameState.PLAY) return;
        const ls = this.board.launchSprings.find(
            s => s.state === LaunchSpring.STATE.IDLE
                && Math.hypot(this.ball.pos.x - s.tipX, this.ball.pos.y - s.tipY)
                   <= this.ball.radius + s.radius + 4
        );
        if (!ls) return;
        // Ball is back on a pad — allow replunge
        this.plungerCharge = 0;
        this.plungerArmed  = false;
        this.input.consumeLaunch();
        this.state = GameState.BALL_READY;
    }

    _checkDrain() {
        // Only drain during active play — not in BALL_READY, BALL_DRAIN, menus, etc.
        if (this.state !== GameState.PLAY) return;
        if (this.ball.state === Ball.STATE.LIVE && this.board.isDrained(this.ball)) {
            this._enterDrain(this.ball.pos.x, this.ball.pos.y);
        }
    }

    /**
     * Dedicated display-stuck tracker for the HUD RESET button.
     * More sensitive than the auto-nudge check:
     *   - Window: 2 s (vs 3 s for nudge)
     *   - Movement threshold: 60 px (vs 40 px for nudge)
     * Latches true once triggered and only clears when the ball has actually
     * travelled > 60 px from the reference point (not a rolling window reset).
     */
    _updateStuckDisplay(dt) {
        if (this.ball.state !== Ball.STATE.LIVE || this.state !== GameState.PLAY) {
            this._stuckDisplay = false;
            this._stuckDisplayTimer = 0;
            this._stuckDisplayRef.x = this.ball.pos.x;
            this._stuckDisplayRef.y = this.ball.pos.y;
            return;
        }
        const dx = this.ball.pos.x - this._stuckDisplayRef.x;
        const dy = this.ball.pos.y - this._stuckDisplayRef.y;
        const moved = Math.hypot(dx, dy);
        if (moved > 60) {
            // Ball moved enough — clear the flag and start a fresh window.
            this._stuckDisplay = false;
            this._stuckDisplayTimer = 0;
            this._stuckDisplayRef.x = this.ball.pos.x;
            this._stuckDisplayRef.y = this.ball.pos.y;
            return;
        }
        this._stuckDisplayTimer += dt;
        if (this._stuckDisplayTimer >= 2) {
            // Ball hasn’t moved 60 px in 2 s — latch RESET as available.
            this._stuckDisplay = true;
        }
    }

    /**
     * Anti-stuck rescue: two independent detectors.
     *  1. Velocity-based: ball nearly still for STUCK_TIME seconds.
     *  2. Position-based: ball hasn't moved >40px in 3 seconds
     *     (catches vibrating-trapped balls that still have high instantaneous speed).
     */
    _checkStuck(dt) {
        if (this.ball.state !== Ball.STATE.LIVE) {
            this.stuckTimer = 0;
            this._stuckPosTimer = 0;
            return;
        }

        // ── 1. Velocity-based ───────────────────────────────────────────────
        const sp = Math.hypot(this.ball.vel.x, this.ball.vel.y);
        if (sp < C.STUCK_VEL_THRESHOLD) {
            this.stuckTimer += dt;
            if (this.stuckTimer >= C.STUCK_TIME) {
                this.stuckTimer = 0;
                this._nudgeBall();
            }
        } else {
            this.stuckTimer = 0;
        }

        // ── 2. Position-based (trapped-vibrating) ───────────────────────────
        this._stuckPosTimer += dt;
        if (this._stuckPosTimer >= 3) {
            const dx = this.ball.pos.x - this._stuckPosRef.x;
            const dy = this.ball.pos.y - this._stuckPosRef.y;
            if (Math.hypot(dx, dy) < 40) {
                this._nudgeBall();
            }
            // Reset reference snapshot for the next 3-second window
            this._stuckPosRef.x  = this.ball.pos.x;
            this._stuckPosRef.y  = this.ball.pos.y;
            this._stuckPosTimer  = 0;
        }
    }

    _nudgeBall() {
        const dir = Math.random() < 0.5 ? -1 : 1;
        this.ball.vel.x = dir * C.STUCK_NUDGE_X * (0.6 + Math.random() * 0.6);
        this.ball.vel.y = -C.STUCK_NUDGE_Y * (0.7 + Math.random() * 0.5);
        this.renderer.addShake(0.15);
        this.renderer.spawnHit(this.ball.pos.x, this.ball.pos.y, C.COLOR_PURPLE, 10, 200, 0.4);
    }

    _update(dt) {
        this.elapsed += dt;
        this._checkHudButtons();
        this.hud.update(dt);
        this.updateHintTimer(dt);
        this.togglePauseState();
        this._stateHandlers[this.state].update(dt);
    }

    /** Reads flipper input, syncs board, triggers audio+visual on press edge. */
    _updateFlippers() {
        const flipL = !this.tilted && this.input.left;
        const flipR = !this.tilted && this.input.right;
        this.board.setFlippers(flipL, flipR);
        if (flipL && !this._prevFlipL) { this.audio.sfx('flipper'); this.renderer.triggerFlipFlash(true); }
        if (flipR && !this._prevFlipR) { this.audio.sfx('flipper'); this.renderer.triggerFlipFlash(false); }
        this._prevFlipL = flipL;
        this._prevFlipR = flipR;
    }

    /** Builds the GameState → handler map (State Pattern). */
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

    togglePauseState() {
        if (this.input.consumeEsc()) {
            if (this.state === GameState.PLAY) {
                this.state = GameState.PAUSED;
            } else if (this.state === GameState.PAUSED) {
                this.state = GameState.PLAY;
            }
        }
    }

    updateHintTimer(dt) {
        if (this.hintTimer > 0) this.hintTimer = Math.max(0, this.hintTimer - dt);
    }

    _draw() {
        // Pass drain data to renderer BEFORE draw so overlay renders this frame.
        this.renderer.setDrainEffect(
            this.state === GameState.BALL_DRAIN ? this._drain : null
        );
        this.renderer.draw(this.board, this.ball);
        const zoneTier = this._zoneProvider?.getTier(this.ball.pos.y);
        const data = {
            score: this.score.formatted(),
            multiplier: this.score.multiplier,
            zoneLabel: zoneTier?.label ?? 'BASE',
            zoneColor: zoneTier?.color ?? C.COLOR_DIM,
            zoneMult: zoneTier?.mult ?? 1,
            ballsLeft: this.ballsLeft,
            mission: null,
            ballSaveTimer: this.ballSaveTimer,
            gameState: this.state,
            hintTimer: this.hintTimer,
            ballReady: this.state === GameState.BALL_READY,
            muted: this.audio.muted,
            bgmMuted: this.audio.bgmMuted,
            plungerCharge: this.plungerCharge,
            launchHeld: this.input.launchHeld,
            timePlayed: Math.round(this.timePlayed ?? 0),
            bossesDefeated: this.bossesDefeated ?? 0,
            // HUD action buttons: isStuck lights up RESET, tilted dims TILT.
            isStuck: this._stuckDisplay,
            tilted: this.tilted,
        };
        this.hud.draw(data, this.canvas.width, this.canvas.height);
    }

    // ── Canvas fit ──────────────────────────────────────────────────

    _fitCanvas() {
        const targetAspect = C.VIEW_WIDTH / C.VIEW_HEIGHT;
        const winAspect = globalThis.innerWidth / globalThis.innerHeight;
        let w, h;
        if (winAspect > targetAspect) {
            h = globalThis.innerHeight;
            w = Math.round(h * targetAspect);
        } else {
            w = globalThis.innerWidth;
            h = Math.round(w / targetAspect);
        }
        // Render at the virtual size, scale via CSS for crispness
        this.canvas.width = C.VIEW_WIDTH;
        this.canvas.height = C.VIEW_HEIGHT;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
    }
}

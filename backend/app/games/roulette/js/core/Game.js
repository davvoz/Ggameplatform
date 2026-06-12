import { GameConfig } from '../config/GameConfig.js';
import { StateMachine } from './StateMachine.js';
import { RunContext } from './RunContext.js';
import { DataRegistry } from '../data/DataRegistry.js';
import { SoundManager } from '../audio/SoundManager.js';
import { InputManager } from '../input/InputManager.js';
import { PlatformBridge } from '../platform/PlatformBridge.js';
import { LoadingState } from '../states/LoadingState.js';
import { TableLayout } from '../systems/TableLayout.js';
import { BetResolver } from '../systems/BetResolver.js';
import { SpecialBetExpander } from '../systems/SpecialBetExpander.js';
import { WheelRenderer } from '../rendering/WheelRenderer.js';
import { TableRenderer } from '../rendering/TableRenderer.js';
import { ChipRenderer } from '../rendering/ChipRenderer.js';
import { VFXManager } from '../rendering/VFXManager.js';
import { HUDPainter } from '../ui/HUDPainter.js';

/**
 * Top-level shell. Owns: data, sound, input, platform bridge, run context,
 * state machine. Drives the rAF game loop.
 *
 * Intentionally small — gameplay lives in states and systems.
 */
export class Game {
    constructor(canvas) {
        if (!canvas) throw new Error('Game: canvas required');
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        if (!this.ctx) throw new Error('Game: 2D context unavailable');
        this._setupHiDPI();
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this._bgCache = this._buildBackground();

        this.data     = new DataRegistry();
        this.sound    = new SoundManager();
        this.input    = new InputManager(canvas);
        this.platform = new PlatformBridge();
        this.fsm      = new StateMachine();
        this.run      = null;

        this._running  = false;
        this._lastTime = 0;
        this._paused   = false;
        this._loop     = this._loop.bind(this);
    }

    async init() {
        await this.platform.init();
        await this.data.load('data');
        await this.sound.load('data/sounds.json');
        this.run = new RunContext(this.data.getConfig());

        // View / system singletons (created once data is available).
        this.tableLayout    = new TableLayout(this.data);
        this.betResolver    = new BetResolver(this.data);
        this.specialExpander = new SpecialBetExpander(this.data, this.data.getConfig().specials);
        this.wheelRenderer  = new WheelRenderer(this.data);
        this.tableRenderer  = new TableRenderer(this.tableLayout);
        this.chipRenderer   = new ChipRenderer(this.data);
        this.vfx            = new VFXManager();
        this.hud            = new HUDPainter();

        this.input.attach();
        this.platform.on('pause',  () => { this._paused = true;  this.sound.suspend(); });
        this.platform.on('resume', () => { this._paused = false; this._lastTime = 0; this.sound.resume(); });
        this.fsm.set(new LoadingState(this));
    }

    start() {
        if (this._running) return;
        this._running = true;
        this._lastTime = 0;
        requestAnimationFrame(this._loop);
    }

    stop() { this._running = false; }

    transitionTo(state) { this.fsm.set(state); }

    _loop(ts) {
        if (!this._running) return;
        if (this._lastTime === 0) this._lastTime = ts;
        let dt = (ts - this._lastTime) / 1000;
        this._lastTime = ts;
        if (dt > GameConfig.FRAME_DT_CLAMP) dt = GameConfig.FRAME_DT_CLAMP;

        if (!this._paused) {
            this._processInput();
            this.fsm.update(dt);
        }
        this._render();
        requestAnimationFrame(this._loop);
    }

    _processInput() {
        const events = this.input.drain();
        for (const ev of events) this.fsm.handleInput(ev);
    }

    _render() {
        const ctx = this.ctx;
        ctx.drawImage(this._bgCache, 0, 0, GameConfig.VIEW_WIDTH, GameConfig.VIEW_HEIGHT);
        this.fsm.render(ctx);
    }

    /** Render at devicePixelRatio for crisp text and curves (visual only). */
    _setupHiDPI() {
        const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
        this.canvas.width  = GameConfig.VIEW_WIDTH * dpr;
        this.canvas.height = GameConfig.VIEW_HEIGHT * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** Pre-rendered ambient backdrop: deep radial light + vignette + felt haze. */
    _buildBackground() {
        const W = GameConfig.VIEW_WIDTH;
        const H = GameConfig.VIEW_HEIGHT;
        const off = document.createElement('canvas');
        off.width = W; off.height = H;
        const c = off.getContext('2d');
        c.fillStyle = GameConfig.COLOR.BG;
        c.fillRect(0, 0, W, H);
        // Warm spotlight behind the wheel.
        const spot = c.createRadialGradient(W / 2, 230, 40, W / 2, 230, 360);
        spot.addColorStop(0, 'rgba(212,160,23,0.10)');
        spot.addColorStop(0.5, 'rgba(26,26,46,0.55)');
        spot.addColorStop(1, 'rgba(10,10,15,0)');
        c.fillStyle = spot;
        c.fillRect(0, 0, W, H);
        // Cool ambient wash on the lower table half.
        const wash = c.createLinearGradient(0, H * 0.45, 0, H);
        wash.addColorStop(0, 'rgba(16,30,24,0)');
        wash.addColorStop(1, 'rgba(10,18,14,0.5)');
        c.fillStyle = wash;
        c.fillRect(0, 0, W, H);
        // Edge vignette for depth.
        const vig = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, GameConfig.COLOR.VIGNETTE);
        c.fillStyle = vig;
        c.fillRect(0, 0, W, H);
        return off;
    }

    destroy() {
        this.stop();
        this.input.detach();
    }
}

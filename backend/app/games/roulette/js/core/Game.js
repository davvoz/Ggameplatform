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
        this.ctx.imageSmoothingEnabled = true;

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
        ctx.fillStyle = GameConfig.COLOR.BG;
        ctx.fillRect(0, 0, GameConfig.VIEW_WIDTH, GameConfig.VIEW_HEIGHT);
        this.fsm.render(ctx);
    }

    destroy() {
        this.stop();
        this.input.detach();
    }
}

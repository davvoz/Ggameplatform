import { GameConfig } from '../config/GameConfig.js';
import { StateMachine } from './StateMachine.js';
import { RunContext } from './RunContext.js';
import { DataRegistry } from '../data/DataRegistry.js';
import { AssetManager } from '../assets/AssetManager.js';
import { BitmapFont } from '../assets/BitmapFont.js';
import { InputManager } from '../input/InputManager.js';
import { PlatformBridge } from '../platform/PlatformBridge.js';
import { SoundManager } from '../audio/SoundManager.js';
import { ModeSelectState } from '../states/ModeSelectState.js';
import { setBitmapFont } from '../ui/UIPainter.js';

/**
 * Top-level game shell. Owns: data, state machine, input, platform bridge,
 * and the canvas/ctx. Drives the game loop.
 *
 * It is intentionally small: gameplay lives in states (BattleState etc.).
 */
export class Game {
    constructor(canvas) {
        if (!canvas) throw new Error('Game: canvas required');
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        if (!this.ctx) throw new Error('Game: 2D context unavailable');
        this.ctx.imageSmoothingEnabled = true;

        this.data = new DataRegistry();
        this.assets = new AssetManager();
        this.sound = new SoundManager();
        this.fsm = new StateMachine();
        this.input = new InputManager(canvas);
        this.platform = new PlatformBridge();
        this.run = new RunContext();

        this._running = false;
        this._lastTime = 0;
        this._loop = this._loop.bind(this);
        this._paused = false;
    }

    async init() {
        await this.platform.init();
        await this.data.load('data');
        await this.assets.load('data/sprites.json');
        try {
            const font = await BitmapFont.load('data/font.json');
            setBitmapFont(font);
        } catch (err) {
            console.warn('[minion_clash] bitmap font unavailable, using system fallback', err);
        }
        await this.sound.load('data/sounds.json');
        this.input.attach();
        this.platform.on('pause',  () => { this._paused = true;  this.sound.suspend(); });
        this.platform.on('resume', () => { this._paused = false; this._lastTime = 0; this.sound.resume(); });
        this.fsm.set(new ModeSelectState(this));
    }

    start() {
        if (this._running) return;
        this._running = true;
        this._lastTime = 0;
        requestAnimationFrame(this._loop);
    }

    stop() {
        this._running = false;
    }

    _loop(ts) {
        if (!this._running) return;
        if (this._lastTime === 0) this._lastTime = ts;
        let dt = (ts - this._lastTime) / 1000;
        this._lastTime = ts;
        if (dt > GameConfig.BATTLE.FRAME_DT_CLAMP) dt = GameConfig.BATTLE.FRAME_DT_CLAMP;

        if (!this._paused) {
            this._processInput();
            this.fsm.update(dt);
        }
        this._render();
        requestAnimationFrame(this._loop);
    }

    _processInput() {
        const events = this.input.drain();
        for (const ev of events) {
            this.fsm.handleInput(ev);
        }
    }

    _render() {
        const ctx = this.ctx;
        ctx.fillStyle = GameConfig.COLOR.BG;
        ctx.fillRect(0, 0, GameConfig.VIEW_WIDTH, GameConfig.VIEW_HEIGHT);
        this.fsm.render(ctx);
    }

    transitionTo(state) {
        this.fsm.set(state);
    }

    destroy() {
        this.stop();
        this.input.detach();
    }
}

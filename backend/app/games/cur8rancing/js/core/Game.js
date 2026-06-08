import { GameConfig } from '../config/GameConfig.js';
import { CarCatalog } from '../config/CarCatalog.js';
import { StateMachine } from './StateMachine.js';
import { ServiceContext } from './ServiceContext.js';
import { SceneRenderer } from '../rendering/SceneRenderer.js';
import { InputManager } from '../input/InputManager.js';
import { ModelLoader } from '../assets/ModelLoader.js';
import { CarPhysics } from '../physics/CarPhysics.js';
import { PlatformBridge } from '../platform/PlatformBridge.js';
import { BootState } from '../states/BootState.js';

const MAX_DT = 0.05; // clamp delta to avoid physics blow-ups after tab stalls

/**
 * Composition root and frame driver. Owns the loop, builds every service once,
 * and delegates all gameplay to the active state. Contains no game rules.
 */
export class Game {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {HTMLElement} ui overlay container for DOM views
     * @param {PlatformBridge} bridge platform integration (already constructed)
     */
    constructor(canvas, ui, bridge) {
        this._renderer = new SceneRenderer(canvas, GameConfig);
        this._input = new InputManager();
        this._stateMachine = new StateMachine();
        this._ctx = new ServiceContext({
            config: GameConfig,
            stateMachine: this._stateMachine,
            renderer: this._renderer,
            input: this._input,
            bridge,
            models: new ModelLoader(),
            catalog: new CarCatalog(),
            physics: new CarPhysics(),
            ui,
        });

        this._running = false;
        this._paused = false;
        this._lastTime = 0;
        this._loop = this._loop.bind(this);
    }

    /** Begin the loop and enter the boot state. */
    start() {
        this._input.attach();
        this._stateMachine.change(new BootState(this._ctx));
        this._running = true;
        this._lastTime = performance.now();
        requestAnimationFrame(this._loop);
    }

    /** @param {number} timestamp high-resolution time from rAF */
    _loop(timestamp) {
        if (!this._running) return;
        const dt = Math.min((timestamp - this._lastTime) / 1000, MAX_DT);
        this._lastTime = timestamp;

        if (!this._paused) {
            this._stateMachine.update(dt);
            this._renderer.render(dt);
        }
        requestAnimationFrame(this._loop);
    }

    pause() {
        this._paused = true;
    }

    resume() {
        this._paused = false;
        this._lastTime = performance.now();
    }

    /** Release every resource and stop the loop. Safe to call once. */
    destroy() {
        this._running = false;
        this._stateMachine.dispose();
        this._input.detach();
        this._renderer.dispose();
    }
}

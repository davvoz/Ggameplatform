// ═══════════════════════════════════════════════
//  BgFxParticle — Facade (Strategy registry)
//
//  Drop-in replacement for the old monolithic class.
//  Same public API:
//    new BgFxParticle(canvasWidth, canvasHeight, fxType, config)
//    .update(dt, canvasWidth, canvasHeight, time)
//    .render(ctx, canvasWidth, canvasHeight)
//    .reset(initial)
//
//  Internally delegates to a concrete FxStrategy subclass.
//  To add a new FX type just:
//    1. Create a class extending BaseFxStrategy
//    2. Register it below
// ═══════════════════════════════════════════════

// ── Simple (space) FX ──
import {
    AsteroidsFx, SporesFx, EmbersFx, IceFx, ShimmerFx,
    SparksFx, MinesFx, ScanlinesFx, VortexFx, LightningFx,
    FireFx, BlackholeFx, DefaultFx
} from './fx/SimpleFxStrategies.js';

// ── Terrain FX ──
import { JungleFx }      from './fx/JungleFx.js';
import { VolcanicFx }    from './fx/VolcanicFx.js';
import { FrozenFx }      from './fx/FrozenFx.js';
import { DesertFx }      from './fx/DesertFx.js';
import { MechanicalFx }  from './fx/MechanicalFx.js';
import { ToxicFx }       from './fx/ToxicFx.js';

/**
 * Strategy registry — maps fxType string → Strategy class.
 * Add new entries here to extend the system.
 */
const FX_REGISTRY = {
    // space effects
    asteroids : AsteroidsFx,
    spores    : SporesFx,
    embers    : EmbersFx,
    ice       : IceFx,
    shimmer   : ShimmerFx,
    sparks    : SparksFx,
    mines     : MinesFx,
    scanlines : ScanlinesFx,
    vortex    : VortexFx,
    lightning : LightningFx,
    fire      : FireFx,
    blackhole : BlackholeFx,
    // terrain effects
    jungle     : JungleFx,
    volcanic   : VolcanicFx,
    frozen     : FrozenFx,
    desert     : DesertFx,
    mechanical : MechanicalFx,
    toxic      : ToxicFx
};

/**
 * Facade — drop-in compatible with the old BgFxParticle.
 *
 * Resolves the correct strategy at construction time and
 * forwards every call to it.  Adding a new FX type never
 * touches this class — just add a strategy + a registry entry.
 */
export class BgFxParticle {
    /**
     * @param {number}      canvasWidth
     * @param {number}      canvasHeight
     * @param {string}      fxType   — key in FX_REGISTRY
     * @param {object|null} config   — theme-specific config blob
     */
    constructor(canvasWidth, canvasHeight, fxType, config = null) {
        const StrategyClass = FX_REGISTRY[fxType] || DefaultFx;
        /** @type {import('./fx/BaseFxStrategy.js').BaseFxStrategy} */
        this._strategy = new StrategyClass(canvasWidth, canvasHeight, config);
        this._strategy.reset(true);
    }

    // ── Public API (unchanged from old class) ──

    /** Re-initialise the particle (e.g. when it scrolls off-screen). */
    reset(initial = false) {
        this._strategy.reset(initial);
    }

    /** Frame tick. */
    update(dt, canvasWidth, canvasHeight, time) {
        this._strategy.update(dt, canvasWidth, canvasHeight, time);
    }

    /** Draw. */
    render(ctx, canvasWidth, canvasHeight) {
        this._strategy.render(ctx, canvasWidth, canvasHeight);
    }

    // ── Convenience getters (for external code that reads particle props) ──

    get x()     { return this._strategy.x; }
    get y()     { return this._strategy.y; }
    get size()  { return this._strategy.size; }
    get alpha() { return this._strategy.alpha; }
}

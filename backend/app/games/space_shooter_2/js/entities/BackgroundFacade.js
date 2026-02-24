import { BgFxParticle } from "./BgFxParticle.js";
import { getThemeForLevel } from "./LevelsThemes.js";
import { SpaceWorldRenderer } from "./worlds/SpaceWorldRenderer.js";
import { PlanetWorldRenderer } from "./worlds/PlanetWorldRenderer.js";

// ═════════════════════════════════════════════════════════════
//  BackgroundFacade — thin orchestrator that delegates to WorldRenderers
// ═════════════════════════════════════════════════════════════
//
//  ARCHITECTURE
//  ────────────
//  BackgroundFacade owns:
//    • the worlds[] array  (one WorldRenderer per 30 levels)
//    • the shared fxParticles list
//    • bgColor
//
//  Each WorldRenderer handles its own build / update / render pipeline.
//
//  HOW TO ADD A NEW WORLD (e.g. World 3, levels 61-90):
//    1. Create a new WorldRenderer subclass (e.g. UnderwaterWorldRenderer)
//    2. Add theme entries in LevelsThemes.js for levels 61-90
//    3. Push the instance into this.worlds[] below
//    That's it — BackgroundFacade picks the right world automatically.
// ═════════════════════════════════════════════════════════════

/** Number of levels per world. */
const LEVELS_PER_WORLD = 30;

export class BackgroundFacade {
    constructor(canvasWidth, canvasHeight, quality = 'high') {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.quality = quality;
        this.bgColor = '#0a0a1a';
        this.currentTheme = null;
        this.currentLevel = 1;
        this.fxParticles = [];

        /**
         * Ordered list of world renderers.
         * Index 0 → levels 1-30, index 1 → levels 31-60, etc.
         * Add new worlds here.
         */
        this.worlds = [
            new SpaceWorldRenderer(canvasWidth, canvasHeight, quality),   // World 1 (1-30)
            new PlanetWorldRenderer(canvasWidth, canvasHeight, quality),  // World 2 (31-60)
            // new YourWorldRenderer(canvasWidth, canvasHeight, quality), // World 3 (61-90)
        ];

        /** Currently active world renderer. */
        this._activeWorld = null;

        this._buildForTheme(getThemeForLevel(1));
    }

    // ── public API (unchanged for Game.js) ─────────

    /** Switch to a new level's theme — rebuilds if theme changed. */
    setLevel(level) {
        const theme = getThemeForLevel(level);
        if (theme === this.currentTheme) return;
        this._buildForTheme(theme, level);
    }

    /** Change quality setting and rebuild. */
    setQuality(quality) {
        this.quality = quality;
        for (const w of this.worlds) w.setQuality(quality);
        this._buildForTheme(this.currentTheme, this.currentLevel);
    }

    /** Per-frame update. */
    update(dt) {
        const time = performance.now() * 0.001;
        // Update FX particles
        for (const fx of this.fxParticles) {
            fx.update(dt, this.canvasWidth, this.canvasHeight, time);
        }
        // Delegate to active world
        if (this._activeWorld) {
            this._activeWorld.update(dt);
        }
    }

    /** Full render pass. */
    render(ctx, time) {
        // Background fill
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        if (this._activeWorld) {
            // Deep background (stars, rivers, canyons, etc.)
            this._activeWorld.renderBackground(ctx, time);

            // FX particles (sorted per-world)
            this._activeWorld.renderFx(ctx, this.fxParticles, time);

            // Overlay (vignettes, edges, snow, sandstorm, etc.)
            const t = time !== undefined ? time : performance.now() * 0.001;
            this._activeWorld.renderOverlay(ctx, t);

            // Post-FX (black hole glow, etc.)
            this._activeWorld.renderPostFx(ctx, this.currentTheme);
        } else {
            // Fallback: just render FX unsorted
            for (const fx of this.fxParticles) {
                fx.render(ctx, this.canvasWidth, this.canvasHeight);
            }
        }
    }

    /** Resize canvas dimensions. */
    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        for (const w of this.worlds) w.resize(canvasWidth, canvasHeight);
    }

    // ── internal ───────────────────────────────────

    /**
     * Select the correct world renderer for a level and build it.
     */
    _buildForTheme(theme, level) {
        this.currentTheme = theme;
        this.currentLevel = level || this.currentLevel || 1;
        this.bgColor = theme.bg;
        this.fxParticles = [];

        // Determine which world index this level belongs to
        const lvl = this.currentLevel;
        const worldIdx = Math.floor((lvl - 1) / LEVELS_PER_WORLD);
        this._activeWorld = this.worlds[worldIdx] || this.worlds[0];

        // Build the world
        this._activeWorld.build(theme);

        // FX particles (shared across all worlds)
        if (theme.fx) {
            const cfg = theme.jungleConfig || theme.volcanicConfig
                     || theme.frozenConfig || theme.desertConfig
                     || theme.mechanicalConfig || theme.toxicConfig || null;
            let fxCount;
            if (cfg && cfg.fxN) {
                fxCount = cfg.fxN;
            } else {
                fxCount = this.quality === 'high' ? 18 : 10;
            }
            for (let i = 0; i < fxCount; i++) {
                this.fxParticles.push(
                    new BgFxParticle(this.canvasWidth, this.canvasHeight, theme.fx, cfg)
                );
            }
        }
    }
}

export default BackgroundFacade;

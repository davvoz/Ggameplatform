/**
 * CinematicManager  —  Thin orchestrator that delegates to scene objects.
 *
 * Public API is 100 % backward-compatible with the old monolithic file:
 *   update*  / render*  / begin*  / start*  / skip  / reset
 *   .cinematic  .levelIntro  .levelOutro  ._deathCine  ._worldTransition
 *
 * All visual / timing logic lives in the individual scene classes
 * under  ./cinematics/ .
 */
import OpeningCinematic         from './cinematics/OpeningCinematic.js';
import LevelIntroCinematic      from './cinematics/LevelIntroCinematic.js';
import LevelOutroCinematic      from './cinematics/LevelOutroCinematic.js';
import DeathCinematic           from './cinematics/DeathCinematic.js';

export default class CinematicManager {

    constructor(game) {
        this.game = game;

        this._opening    = new OpeningCinematic(game);
        this._levelIntro = new LevelIntroCinematic(game);
        this._levelOutro = new LevelOutroCinematic(game);
        this._death      = new DeathCinematic(game);
    }

    // ───────────────────────────────────────────────────
    //  Backward-compatible property getters
    //  Game.js checks these for truthiness + reads fields
    // ───────────────────────────────────────────────────

    get cinematic()        { return this._opening.active    ? this._opening    : null; }
    get levelIntro()       { return this._levelIntro.active ? this._levelIntro : null; }

    /**
     * Property: levelOutro
     *   GET  → active scene or null   (Game.js reads .zoom / .pcx / .pcy)
     *   SET  → allows `manager.levelOutro = null` from LevelManager
     */
    get levelOutro()       { return this._levelOutro.active ? this._levelOutro : null; }
    set levelOutro(val)    { if (val === null) this._levelOutro.reset(); }

    get _deathCine()       { return this._death.active    ? this._death    : null; }

    // ───────────────────────────────────────────────────
    //  Opening cinematic
    // ───────────────────────────────────────────────────

    startCinematic(onComplete, worldNum = 1) {
        const g = this.game;
        this._opening.begin({
            worldNum,
            onFinish: () => { if (onComplete) onComplete(); },
            skippable: true,
            skipDelay: 2.0
        });
        g.state = 'cinematic';
        g.uiManager.hideHudButtons();
        g.sound.playCinematicIntro();
    }

    updateCinematic(dt)          { this._opening.update(dt); }
    renderCinematic(ctx, w, h)   { this._opening.render(ctx, w, h); }

    // ───────────────────────────────────────────────────
    //  Level intro
    // ───────────────────────────────────────────────────

    beginLevelIntro() {
        const g = this.game;
        this._levelIntro.begin({
            onFinish: () => {
                g.state = 'playing';
                g.uiManager.showHudButtons();
            }
        });
        g.state = 'levelIntro';
        g.uiManager.hideHudButtons();
        g.sound.playLevelIntro();
    }

    updateLevelIntro(dt)         { this._levelIntro.update(dt); }
    renderLevelIntro(ctx, w, h)  { this._levelIntro.render(ctx, w, h); }

    // ───────────────────────────────────────────────────
    //  Level outro
    // ───────────────────────────────────────────────────

    beginLevelOutro() {
        const g = this.game;
        const entities = g.entityManager;

        this._levelOutro.begin({
            onFinish: () => {
                g.levelManager.finalizeLevelComplete();
            }
        });

        g.state = 'levelOutro';
        g.uiManager.hideHudButtons();
        g.sound.playLevelOutro();

        // Clear enemy bullets
        entities.bullets = entities.bullets.filter(b => b.owner === 'player');
        // Golden flash
        g.postProcessing.flash({ r: 255, g: 215, b: 0 }, 0.4);
    }

    updateLevelOutro(dt)         { this._levelOutro.update(dt); }
    renderLevelOutro(ctx, w, h)  { this._levelOutro.render(ctx, w, h); }

    // ───────────────────────────────────────────────────
    //  Death cinematic
    // ───────────────────────────────────────────────────

    beginDeathCinematic(deathX, deathY) {
        const g = this.game;
        this._death.begin({
            deathX, deathY,
            onFinish: () => {
                g.state = 'gameover';
                g.sound.playGameOver();
                g.uiManager.showGameOverScreen();
            }
        });
        g.state = 'deathCinematic';
    }

    updateDeathCinematic(dt)         { this._death.update(dt); }
    renderDeathCinematic(ctx, w, h)  { this._death.render(ctx, w, h); }

    // ───────────────────────────────────────────────────
    //  World transition
    // ───────────────────────────────────────────────────

    /**
     * @param {Function|null} onComplete  — if non-null, acts as a standalone
     *                                      preview (returns to 'menu' state).
     *                                      Otherwise starts the next level intro.
     * @param {number}        [targetWorld] — world number to present.
     *                                       Defaults to current world from LevelManager.
     */
    beginWorldTransition(onComplete, targetWorld) {
        const g  = this.game;
        const tw = targetWorld || g.levelManager.getCurrentWorld();

        // Use the OpeningCinematic (world-aware) instead of the warp transition
        this._opening.begin({
            worldNum: tw,
            skippable: true,
            skipDelay: 2.0,
            onFinish: () => {
                if (onComplete) {
                    g.state = 'menu';
                    onComplete();
                } else {
                    this.beginLevelIntro();
                }
            }
        });

        g.state = 'cinematic';
        g.uiManager.hideHudButtons();
        g.sound.playCinematicIntro();
    }

    updateWorldTransition(dt)         { this._opening.update(dt); }
    renderWorldTransition(ctx, w, h)  { this._opening.render(ctx, w, h); }

    // ───────────────────────────────────────────────────
    //  Utilities
    // ───────────────────────────────────────────────────

    reset() {
        this._opening.reset();
        this._levelIntro.reset();
        this._levelOutro.reset();
        this._death.reset();
    }
}

/**
 * Game - Main game orchestrator
 * Coordinates all subsystems, owns shared state, exposes API for states.
 */

import { Renderer } from './Renderer.js';
import { GameLoop } from './GameLoop.js';
import { StateMachine } from '../../../shared/StateMachine.js';
import { ParticleSystem } from '../graphics/ParticleSystem.js';
import { TweenManager } from '../graphics/Tween.js';
import { ScreenShake } from '../graphics/ScreenShake.js';
import { SpriteGenerator } from '../graphics/SpriteGenerator.js';
import { InputManager } from '../managers/InputManager.js';
import { SoundManager } from '../managers/SoundManager.js';
import { SaveManager } from '../managers/SaveManager.js';
import { PlatformBridge } from '../PlatformBridge.js';
import { ZONES } from '../config/Constants.js';
import { bitmapFont } from '../graphics/BitmapFont.js';

// States
import { MenuState } from '../states/MenuState.js';
import { PlayingState } from '../states/PlayingState.js';
import { ShopState } from '../states/ShopState.js';
import { GameOverState } from '../states/GameOverState.js';
import { PauseState } from '../states/PauseState.js';
import { LevelCompleteState } from '../states/LevelCompleteState.js';
import { LevelSelectState } from '../states/LevelSelectState.js';
import { PrestigeState } from '../states/PrestigeState.js';
import { TOTAL_LEVELS } from '../config/LevelData.js';

export class Game {
    // Subsystems
    renderer;
    loop;
    fsm;
    particles;
    tweens;
    shake;
    input;
    sound;
    save;
    platform;

    // Game state
    score = 0;
    altitude = 0;
    coins = 0;
    enemiesDefeated = 0;
    maxAltitude = 0;
    sessionCoins = 0;

    // Time-bonus state (set by PlayingState when level completes)
    levelTime = 0;
    timeMedal = 'none';  // 'gold' | 'silver' | 'bronze' | 'none'
    timeBonusScore = 0;
    timeBonusCoins = 0;

    // Flags
    #paused = false;
    #sessionStarted = false;

    // Level tracking
    #currentLevel = 0;
    #pendingLives = null;   // lives carried over from the previous level
    #infiniteMode = false;
    #shopReturnState = 'menu';

    // ── Performance monitor ───────────────────────────────────────
    #perfFrames = 0;
    #perfLastTime = 0;
    #perfFps = 0;

    #perfPeak = 0;       // worst frame time in last second

    constructor(canvas) {
        this.renderer = new Renderer(canvas);
        this.particles = new ParticleSystem();
        this.tweens = new TweenManager();
        this.shake = new ScreenShake();
        this.input = new InputManager(this.renderer);
        this.sound = new SoundManager();
        this.save = new SaveManager();
        this.platform = new PlatformBridge();

        this.loop = new GameLoop(
            (dt) => this.#update(dt),
            () => this.#render()
        );

        this.#registerStates();
    }

    /**
     * Factory method for async initialization
     */
    static async create(canvas) {
        const game = new Game(canvas);
        await game.#init();
        return game;
    }

    async #init() {
        // Generate all sprites
        SpriteGenerator.generateAll();

        // Preload bitmap font sheet
        await bitmapFont.load();

        // Initialize subsystems
        await this.sound.init();
        await this.platform.initialize();

        // Load saved progress from DB
        await this.save.init();

        // Start game loop and transition to menu
        this.resetLevel();
        this.loop.start();
        this.fsm.transition('menu');
    }

    #registerStates() {
        this.fsm = new StateMachine();
        this.fsm.register('menu', new MenuState(this));
        this.fsm.register('playing', new PlayingState(this));
        this.fsm.register('shop', new ShopState(this));
        this.fsm.register('gameOver', new GameOverState(this));
        this.fsm.register('pause', new PauseState(this));
        this.fsm.register('levelComplete', new LevelCompleteState(this));
        this.fsm.register('levelSelect', new LevelSelectState(this));
        this.fsm.register('prestige', new PrestigeState(this));
    }

    #update(dt) {
        // Update input
        this.input.update();

        // Update subsystems
        this.tweens.update(dt);
        this.shake.update(dt);

        // Update current state
        if (!this.#paused) {
            this.fsm.update(dt);
            this.particles.update(dt);
        }
    }

    #render() {
        // ── Perf timing start ─────────────────────────────────────────
        const t0 = performance.now();

        const ctx = this.renderer.ctx;
        this.renderer.clear();

        ctx.save();
        this.shake.apply(ctx);

        // Draw current state
        this.fsm.draw(ctx);

        ctx.restore();

        // ── Performance overlay (bottom-left, always on top) ──────────
        this.#drawPerfOverlay(ctx);

        // ── Perf timing end ───────────────────────────────────────────
        const elapsed = performance.now() - t0;
        if (elapsed > this.#perfPeak) this.#perfPeak = elapsed;
        this.#perfFrames++;
        if (t0 - this.#perfLastTime >= 1000) {
            this.#perfFps = this.#perfFrames;
            this.#perfFrames = 0;
            this.#perfLastTime = t0;
            this.#perfPeak = 0;
        }
    }

    #drawPerfOverlay(ctx) {
        const fps = this.#perfFps;
        // Smooth gradient: 0 FPS = red, 30 = yellow, 60 = green
        const t = Math.min(fps / 60, 1);  // 0..1
        let r, g;
        if (t < 0.5) {
            // red → yellow  (0..30 FPS)
            r = 255;
            g = Math.round(t * 2 * 255);
        } else {
            // yellow → green (30..60 FPS)
            r = Math.round((1 - (t - 0.5) * 2) * 255);
            g = 255;
        }
        const color = `rgb(${r},${g},0)`;

        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.renderer.width - 10, 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    isPlaying() {
        return this.fsm.currentName === 'playing';
    }

    isPaused() {
        return this.#paused || this.fsm.currentName === 'pause';
    }

    pause() {
        if (this.fsm.currentName === 'playing') {
            this.fsm.transition('pause');
        }
    }

    resume() {
        if (this.fsm.currentName === 'pause') {
            this.fsm.transition('playing');
        }
    }

    /**
     * Start a new game session
     */
    startSession() {
        if (this.#sessionStarted) return;
        
        this.#sessionStarted = true;
        this.score = 0;
        this.altitude = 0;
        this.coins = 0;
        this.enemiesDefeated = 0;
        this.sessionCoins = 0;
        // pendingLives is NOT cleared here — it must survive into #initGame().
        // It is cleared by resetLevel() when starting a brand-new run.

        // Notify platform
        this.platform.sendGameStarted();
    }

    /**
     * End game session and report score
     */
    endSession() {
        if (!this.#sessionStarted) return;

        this.#sessionStarted = false;

        // Update max altitude
        if (this.altitude > this.maxAltitude) {
            this.maxAltitude = this.altitude;
        }

        // Apply prestige altitude multiplier to reported stats
        const altMult      = this.save.getPrestigeAltMultiplier();
        const boostedAlt   = this.altitude * altMult;

        // Save stats and coins
        const isNewRecord = this.save.updateStats(
            this.score,
            boostedAlt,
            this.enemiesDefeated,
            this.sessionCoins
        );
        this.save.addCoins(this.sessionCoins);

        // Report to platform
        this.platform.gameOver(this.score, {
            altitude:         Math.floor(boostedAlt),
            coins:            this.sessionCoins,
            enemiesDefeated:  this.enemiesDefeated,
            levelsCompleted:  this.#currentLevel,
            maxAltitude:      Math.floor(this.maxAltitude),
        });

        return isNewRecord;
    }

    /**
     * Add to score
     */
    addScore(amount) {
        const stats = this.save.getPlayerStats();
        this.score += Math.floor(amount * stats.scoreMultiplier);
    }

    /**
     * Add coins (session tracking)
     */
    addCoins(amount, multiplier = 1) {
        const actual = Math.floor(amount * multiplier);
        this.coins += actual;
        this.sessionCoins += actual;
    }

    /**
     * Update altitude
     */
    setAltitude(value) {
        this.altitude = Math.max(this.altitude, value);
    }

    /**
     * Get current zone based on altitude
     */
    getCurrentZone() {
        for (let i = ZONES.length - 1; i >= 0; i--) {
            if (this.altitude >= ZONES[i].minAltitude) {
                return ZONES[i];
            }
        }
        return ZONES[0];
    }

    /**
     * Get player stats from upgrades
     */
    getPlayerStats() {
        return this.save.getPlayerStats();
    }

    /**
     * Show XP banner (platform callback)
     */
    showXPBanner(xpAmount, extraData) {
        // Could show in-game UI
        console.log(`[Altitude] XP earned: ${xpAmount}`);
    }

    /**
     * Show level up notification (platform callback)
     */
    showLevelUpNotification(data) {
        console.log(`[Altitude] Level up:`, data);
    }

    // ═══════════════════════════════════════════════════════════════
    // UPGRADE/SAVE API
    // ═══════════════════════════════════════════════════════════════

    /**
     * Reset session for retry
     */
    resetSession() {
        this.#sessionStarted = false;
        this.score = 0;
        this.altitude = 0;
        this.coins = 0;
        this.enemiesDefeated = 0;
        this.sessionCoins = 0;
        this.levelTime = 0;
        this.timeMedal = 'none';
        this.timeBonusScore = 0;
        this.timeBonusCoins = 0;
    }

    /**
     * Get player's coin balance
     */
    getCoins() {
        return this.save.getCoins();
    }

    /**
     * Spend coins (returns true if successful)
     */
    spendCoins(amount) {
        return this.save.spendCoins(amount);
    }

    /**
     * Get current upgrade level
     */
    getUpgradeLevel(upgradeId) {
        return this.save.getUpgradeLevel(upgradeId);
    }

    /**
     * Increase upgrade level
     */
    upgradeLevel(upgradeId) {
        this.save.upgradeLevel(upgradeId);
    }

    /**
     * Check if score is new high score
     */
    isNewHighScore(score) {
        return score > this.save.getHighScore();
    }

    /**
     * Get high score
     */
    getHighScore() {
        return this.save.getHighScore();
    }

    /**
     * Open the prestige selection screen (from shop).
     */
    openPrestige() {
        this.fsm.transition('prestige');
    }

    /**
     * Return to the shop after prestige (or cancel).
     */
    closePrestige() {
        this.fsm.transition('shop');
    }

    /**
     * True when every upgrade is at max level.
     */
    isAllUpgradesMaxed() {
        return this.save.isAllUpgradesMaxed();
    }

    /**
     * How many times the player has prestiged.
     */
    getPrestigeCount() {
        return this.save.getPrestigeCount();
    }

    /**
     * List of accumulated prestige bonus ids.
     */
    getPrestigeBonuses() {
        return this.save.getPrestigeBonuses();
    }

    /**
     * Apply a prestige: record bonus, reset upgrades, save.
     */
    applyPrestige(bonusId) {
        this.save.applyPrestige(bonusId);
    }

    /**
     * Open the shop and specify where to return afterwards.
     */
    openShop(returnState = 'menu') {
        this.#shopReturnState = returnState;
        this.fsm.transition('shop');
    }

    /**
     * Return from shop to the previously specified state.
     */
    closeShop() {
        const target = this.#shopReturnState;
        this.#shopReturnState = 'menu';
        if (target === 'playing') {
            this.resetSession();
        }
        this.fsm.transition(target);
    }

    /**
     * Save progress to local storage
     */
    saveProgress() {
        this.save.save();
    }

    // ═════════════════════════════════════════════
    // LEVEL API
    // ═════════════════════════════════════════════

    get currentLevel() {
        return this.#currentLevel;
    }

    get pendingLives() { return this.#pendingLives; }
    set pendingLives(v) { this.#pendingLives = v; }

    get infiniteMode() {
        return this.#infiniteMode;
    }

    /**
     * Start a campaign level by index (replaces resetLevel+resetSession flow used in menus).
     * Always starts fresh — no carry-over lives.
     */
    startLevel(levelIndex) {
        this.#currentLevel = levelIndex;
        this.#infiniteMode = false;
        this.#pendingLives = null;
        this.resetSession();
        this.fsm.transition('playing');
    }

    /**
     * Delegates to SaveManager — returns true when levelIndex is unlocked.
     */
    isLevelUnlocked(levelIndex) {
        return this.save.isLevelUnlocked(levelIndex);
    }

    /**
     * Delegates to SaveManager — marks levelIndex as unlocked if not already.
     */
    unlockLevel(levelIndex) {
        if (levelIndex < TOTAL_LEVELS) {
            this.save.unlockLevel(levelIndex);
        }
    }

    /**
     * Advance to the next level, wrapping at the end.
     */
    nextLevel() {
        this.#currentLevel = (this.#currentLevel + 1) % TOTAL_LEVELS;
    }

    /**
     * Reset level progression back to level 0.
     */
    resetLevel() {
        this.#currentLevel = 0;
        this.#infiniteMode = false;
        this.#pendingLives = null;  // fresh run — discard any carry-over
    }

    /**
     * Start Infinite Mode (unlocked after completing all levels).
     */
    startInfinite() {
        this.#infiniteMode = true;
        this.resetSession();
        this.fsm.transition('playing');
    }
}

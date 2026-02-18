import InputManager from './managers/InputManager.js';
import SoundManager from './managers/SoundManager.js';
import AssetManager from './managers/AssetManager.js';
import ParticleSystem from './effects/ParticleSystem.js';
import PostProcessing from './effects/PostProcessing.js';
import StarField from './entities/Star.js';
import { Player } from './entities/Player.js';
import Bullet from './entities/Bullet.js';
import { PerkSystem } from './PerkSystem.js';
import { Enemy } from './entities/Enemy.js';
import Explosion from './entities/Explosion.js';

import { DIFFICULTY_CONFIG } from './DifficultyConfig.js';
import EntityManager from './managers/EntityManager.js';
import ScoreManager from './managers/ScoreManager.js';
import WaveManager from './managers/WaveManager.js';
import LevelManager from './managers/LevelManager.js';
import CollisionManager from './managers/CollisionManager.js';
import CinematicManager from './managers/CinematicManager.js';
import HUDRenderer from './managers/HUDRenderer.js';
import UIManager from './managers/UIManager.js';
import PerkEffectsManager from './managers/PerkEffectsManager.js';

// ── Virtual resolution ──
// All game logic and rendering use a fixed logical width.
// Height adapts to the device's aspect ratio.
// ctx.scale() maps logical → physical pixels each frame.
// Mobile gets a tighter view (bigger sprites relative to screen).
const _isMobileDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const REFERENCE_WIDTH = _isMobileDevice ? 310 : 410;

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Virtual resolution (set in resize())
        this.scale = 1;
        this.logicalWidth = REFERENCE_WIDTH;
        this.logicalHeight = 800;

        // Font compensation: on mobile the lower REFERENCE_WIDTH makes everything
        // bigger, including text. fontScale shrinks fonts back to a readable size.
        this.fontScale = _isMobileDevice ? 0.75 : 1;

        this.input = new InputManager(this);
        this.sound = new SoundManager();
        this.assets = new AssetManager();
        this.particles = new ParticleSystem();
        this.postProcessing = new PostProcessing(canvas);
        this.perkSystem = new PerkSystem();

        this.difficulty = DIFFICULTY_CONFIG.boring;

        this.state = 'menu';
        this.timeScale = 1;
        this.gameTime = 0;
        this.performanceMode = this._loadPerformanceMode();
        this.explosionScale = 1.5;

        this.selectedShipId = null;
        this.selectedUltimateId = null;

        this.starField = null;

        this.fps = 60;
        this.frameCount = 0;
        this.fpsTimer = 0;
        this.lastTime = 0;

        // FPS Monitor — circular buffer (avoids shift() every frame)
        this._fpsRingBuf = new Float32Array(60);
        this._fpsRingIdx = 0;
        this._fpsRingCount = 0;
        this.fpsHistory = []; // kept for compatibility
        this.fpsUpdateTimer = 0;
        this.currentFPS = 60;
        this.avgFPS = 60;
        this.minFPS = 60;
        this.showFPSMonitor = true;

        this.animFrame = null;

        this.entityManager = new EntityManager(this);
        this.scoreManager = new ScoreManager(this);
        this.waveManager = new WaveManager(this);
        this.levelManager = new LevelManager(this);
        this.collisionManager = new CollisionManager(this);
        this.cinematicManager = new CinematicManager(this);
        this.hudRenderer = new HUDRenderer(this);
        this.uiManager = new UIManager(this);
        this.perkEffectsManager = new PerkEffectsManager(this);

        this.init();
    }

    async init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        await this.assets.load();
        this.uiManager.populateShipPreviews();
        await this.sound.init();

        this.starField = new StarField(this.logicalWidth, this.logicalHeight, this.performanceMode);
        this.starField.setLevel(1);

        this.setPerformanceMode(this.performanceMode);

        this._hideLoading();

        this.setupWindowListeners();

        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    _hideLoading() {
        const overlay = document.getElementById('loading-screen');
        if (!overlay) return;
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 600);
    }

    resize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        // Compute virtual-resolution scale
        this.scale = this.canvas.width / REFERENCE_WIDTH;
        this.logicalWidth = REFERENCE_WIDTH;
        this.logicalHeight = this.canvas.height / this.scale;

        this.input.updateLayout(this.canvas.width, this.canvas.height);
        if (this.starField) {
            this.starField.resize(this.logicalWidth, this.logicalHeight);
        }
    }

    gameLoop(timestamp) {
        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.frameCount++;
        this.fpsTimer += deltaTime;
        if (this.fpsTimer >= 1) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTimer = 0;
        }

        this._updateFPSMonitor(deltaTime);

        this.update(deltaTime);
        this.render();

        this.animFrame = requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(deltaTime) {
        this.gameTime += deltaTime;

        if (this.starField) this.starField.update(deltaTime);
        this.postProcessing.update(deltaTime);
        this.particles.update(deltaTime);

        this.hudRenderer.updateBanners(deltaTime);

        if (this.state === 'cinematic') {
            this.cinematicManager.updateCinematic(deltaTime);
        }

        if (this.state === 'levelIntro') {
            this.cinematicManager.updateLevelIntro(deltaTime);
            this.updateEntitiesPassive(deltaTime);
        }

        if (this.state === 'levelOutro') {
            this.cinematicManager.updateLevelOutro(deltaTime);
            this.updateEntitiesPassive(deltaTime);
        }

        if (this.state === 'deathCinematic') {
            this.cinematicManager.updateDeathCinematic(deltaTime);
            this.updateEntitiesPassive(deltaTime);
        }

        if (this.state === 'playing') {
            this.updatePlaying(deltaTime);
        }

        if (this.state === 'playing' && this.input.isPausePressed()) {
            this.input.clearPauseKey();
            this.togglePause();
        } else if (this.state === 'paused' && this.input.isPausePressed()) {
            this.input.clearPauseKey();
            this.togglePause();
        }
    }

    updatePlaying(deltaTime) {
        const em = this.entityManager;

        if (em.player && em.player.active) {
            em.player.update(deltaTime, this);

            this.particles.emitCustom(
                em.player.position.x + em.player.width / 2 + (Math.random() - 0.5) * 8,
                em.player.position.y + em.player.height,
                ParticleSystem.PRESETS.thruster,
                1
            );

            if (em.player.ultimateCharge >= 100 && Math.random() < 0.15) {
                this.particles.emit(
                    em.player.position.x + Math.random() * em.player.width,
                    em.player.position.y + Math.random() * em.player.height,
                    'ultimateCharged', 1
                );
            }
        }

        const enemyDt = deltaTime * this.timeScale;
        for (const enemy of em.enemies) {
            enemy.update(enemyDt, this);
        }

        if (em.boss && em.boss.active) {
            const wasEntering = em.boss.entering;
            em.boss.update(enemyDt, this);
            if (wasEntering && !em.boss.entering) {
                this.postProcessing.shake(8, 0.4);
                this.postProcessing.flash({ r: 255, g: 100, b: 50 }, 0.25);
            }
        }

        if (em.miniBoss && em.miniBoss.active) {
            em.miniBoss.update(enemyDt, this);
        }

        for (const bullet of em.bullets) {
            const bulletDt = bullet.owner === 'enemy' ? enemyDt : deltaTime;
            bullet.update(bulletDt, this);
        }

        em.updateHomingMissiles(deltaTime);

        for (const pu of em.powerUps) {
            pu.update(deltaTime, this);
        }

        for (const exp of em.explosions) {
            exp.update(deltaTime);
        }

        this.collisionManager.checkCollisions();

        em.cleanup();

        this.perkEffectsManager.updatePerkEffects(deltaTime);

        if (this.scoreManager.combo > 0) {
            this.scoreManager.comboTimer -= deltaTime * this.perkSystem.getComboDecayMultiplier();
            if (this.scoreManager.comboTimer <= 0) {
                this.scoreManager.combo = 0;
            }
        }

        this.waveManager.updateWaves(deltaTime);
    }

    /**
     * Aggiorna le entità in modo passivo (solo visuale, niente collisioni/input/wave spawning).
     * Usato durante levelIntro, levelOutro, deathCinematic per mantenere le animazioni vive.
     */
    updateEntitiesPassive(deltaTime) {
        const em = this.entityManager;

        // Player thruster particles (no input, no firing)
        if (em.player && em.player.active) {
            this.particles.emitCustom(
                em.player.position.x + em.player.width / 2 + (Math.random() - 0.5) * 8,
                em.player.position.y + em.player.height,
                ParticleSystem.PRESETS.thruster,
                1
            );
        }

        // Enemies keep drifting / animating
        const enemyDt = deltaTime * this.timeScale;
        for (const enemy of em.enemies) {
            enemy.update(enemyDt, this);
        }

        if (em.boss && em.boss.active) {
            em.boss.update(enemyDt, this);
        }

        if (em.miniBoss && em.miniBoss.active) {
            em.miniBoss.update(enemyDt, this);
        }

        // Bullets keep flying
        for (const bullet of em.bullets) {
            const bulletDt = bullet.owner === 'enemy' ? enemyDt : deltaTime;
            bullet.update(bulletDt, this);
        }

        em.updateHomingMissiles(deltaTime);

        // Power-ups drift
        for (const pu of em.powerUps) {
            pu.update(deltaTime, this);
        }

        // Explosions animate out
        for (const exp of em.explosions) {
            exp.update(deltaTime);
        }

        // Cleanup off-screen entities
        em.cleanup();

        // Keep perk visual effects running (drones, etc.)
        this.perkEffectsManager.updatePerkEffects(deltaTime);
    }

    render() {
        const ctx = this.ctx;
        const w = this.logicalWidth;
        const h = this.logicalHeight;
        const em = this.entityManager;

        // ── Begin logical (virtual) coordinate space ──
        ctx.save();
        ctx.scale(this.scale, this.scale);

        if (this.starField) this.starField.render(ctx, this.gameTime);

        const _outroZoomActive = this.state === 'levelOutro' && this.cinematicManager.levelOutro;
        if (_outroZoomActive) {
            const oz = this.cinematicManager.levelOutro;
            const p = oz.zoomProgress || 0;
            const offsetX = (w / 2 - oz.pcx) * p;
            const offsetY = (h / 2 - oz.pcy) * p;
            const apparentX = oz.pcx + offsetX;
            const apparentY = oz.pcy + offsetY;
            ctx.save();
            ctx.translate(apparentX, apparentY);
            ctx.scale(oz.zoom, oz.zoom);
            ctx.translate(-apparentX, -apparentY);
            ctx.translate(offsetX, offsetY);
        }

        if (this.state === 'playing' || this.state === 'paused' ||
            this.state === 'levelComplete' || this.state === 'gameover' ||
            this.state === 'levelIntro' || this.state === 'levelOutro' ||
            this.state === 'deathCinematic') {

            for (const pu of em.powerUps) pu.render(ctx);

            for (const enemy of em.enemies) enemy.render(ctx, this.assets);

            if (em.boss && em.boss.active) em.boss.render(ctx, this.assets);

            if (em.miniBoss && em.miniBoss.active) em.miniBoss.render(ctx, this.assets);

            if (em.boss && em.boss.entering) {
                this.hudRenderer.renderBossWarningOverlay(ctx, w, h);
            }

            if (this.waveManager.miniBossNotification) {
                this.hudRenderer.renderMiniBossNotification(ctx, w, h);
            }

            // Render all bullets through their own render() (consistent visuals)
            for (const bullet of em.bullets) bullet.render(ctx);

            em.renderHomingMissiles(ctx);

            if (em.player && em.player.active) em.player.render(ctx, this.assets, this.perkSystem);

            this.perkEffectsManager.renderDrones(ctx);

            for (const exp of em.explosions) exp.render(ctx);

            this.particles.render(ctx);

            this.hudRenderer.renderHUD(ctx);
        }

        if (_outroZoomActive) {
            ctx.restore();
        }

        // Cinematics (in logical space)
        if (this.state === 'cinematic' && this.cinematicManager.cinematic) {
            this.cinematicManager.renderCinematic(ctx, w, h);
        }

        if (this.state === 'levelIntro' && this.cinematicManager.levelIntro) {
            this.cinematicManager.renderLevelIntro(ctx, w, h);
        }

        if (this.state === 'levelOutro' && this.cinematicManager.levelOutro) {
            this.cinematicManager.renderLevelOutro(ctx, w, h);
        }

        if (this.state === 'deathCinematic' && this.cinematicManager._deathCine) {
            this.cinematicManager.renderDeathCinematic(ctx, w, h);
        }

        // Banners (in logical space)
        this.hudRenderer.renderBanners(ctx);

        // ── End logical coordinate space ──
        ctx.restore();

        // ── Physical coordinate space below ──

        // Touch controls (physical coords – match finger position)
        if (this.state === 'playing' || this.state === 'paused') {
            this.input.renderTouchControls(ctx);
        }

        // PostProcessing (physical coords – full canvas overlay)
        this.postProcessing.render(ctx);

        // FPS monitor (physical coords – fixed screen position)
        this.hudRenderer.renderFPSMonitor(ctx);
    }

    startGame(shipId, ultimateId, difficultyId) {
        this.selectedShipId = shipId;
        this.selectedUltimateId = ultimateId;
        this.difficulty = DIFFICULTY_CONFIG[difficultyId] || DIFFICULTY_CONFIG.boring;

        this.scoreManager.reset();
        this.levelManager.reset();
        this.waveManager.reset();
        this.cinematicManager.reset();
        this.perkEffectsManager.reset();
        this.hudRenderer.reset();
        this.entityManager.clearAll();

        this.timeScale = 1;

        this.perkSystem.reset();

        this.levelManager.levelStartTime = performance.now();

        this.entityManager.player = new Player(
            this.logicalWidth / 2 - 32,
            this.logicalHeight - 100,
            shipId,
            ultimateId
        );

        if (window.startGameSession) {
            window.startGameSession();
        }

        this.sound.resume();
        if (this.sound.musicBuffers.length > 0) {
            this.sound.playGameMusic();
        }

        if (this.starField) this.starField.setLevel(1);

        this.cinematicManager.beginLevelIntro();
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            const popup = document.getElementById('settings-popup');
            popup?.classList.remove('hidden');
            this.sound.pauseMusic();
            this.uiManager.hideHudButtons();
            window.dispatchEvent(new Event('game-paused'));
        } else if (this.state === 'paused') {
            this.state = 'playing';
            document.getElementById('settings-popup')?.classList.add('hidden');
            document.getElementById('ship-detail-popup')?.classList.add('hidden');
            if (window.audioViz) window.audioViz.stop();
            this.sound.resumeMusic();
            this.uiManager.showHudButtons();
        }
    }

    startCinematic(onComplete) {
        this.cinematicManager.startCinematic(onComplete);
    }

    get currentLevel() {
        return this.levelManager.currentLevel;
    }

    get score() {
        return this.scoreManager.score;
    }

    hideLevelCompleteScreen() {
        this.uiManager.hideLevelCompleteScreen();
    }

    showPerkScreen() {
        this.uiManager.showPerkScreen();
    }

    startNextLevel() {
        this.levelManager.startNextLevel();
    }

    hideShopScreen() {
        this.uiManager.hidePerkScreen();
    }

    clearAllEntities() {
        this.entityManager.clearAll();
        this.cinematicManager.reset();
    }

    showShipDetail() {
        this.uiManager.showShipDetail();
    }

    closeShipDetail() {
        this.uiManager.closeShipDetail();
    }

    _hideHudButtons() {
        this.uiManager.hideHudButtons();
    }

    _showHudButtons() {
        this.uiManager.showHudButtons();
    }

    showXPBanner(xpAmount, extraData = null) {
        const banner = document.createElement('div');
        banner.className = 'game-xp-banner';
        banner.innerHTML = `
            <div class="game-xp-badge">
                <span class="game-xp-icon">⭐</span>
                <span class="game-xp-amount">+${Number(xpAmount).toFixed(2)} XP</span>
            </div>
        `;

        document.body.appendChild(banner);

        setTimeout(() => {
            banner.classList.add('hiding');
            setTimeout(() => banner.remove(), 500);
        }, 3500);
    }

    showStatsBanner(stats) {
        // Stats banner not used in this game (handled by platform)
    }

    showLevelUpNotification(levelUpData) {
        const { old_level, new_level, title, badge, coins_awarded, is_milestone, user_data } = levelUpData;

        const isAnonymous = user_data?.is_anonymous === true;

        // Ensure shared level-up styles are loaded
        if (!document.querySelector('#level-up-styles')) {
            const link = document.createElement('link');
            link.id = 'level-up-styles';
            link.rel = 'stylesheet';
            link.href = '/css/level-widget.css';
            document.head.appendChild(link);
        }

        const modal = document.createElement('div');
        modal.className = 'level-up-modal';
        modal.innerHTML = `
            <div class="level-up-content ${is_milestone ? 'milestone' : ''}">
                <div class="level-up-animation">
                    <div class="level-up-rays"></div>
                    <div class="level-up-badge-container">
                        <span class="level-up-badge">${badge || '🏅'}</span>
                    </div>
                </div>
                <h2 class="level-up-title">🎉 LEVEL UP! 🎉</h2>
                <div class="level-up-levels">
                    <span class="old-level">${old_level ?? '-'}</span>
                    <span class="level-arrow">→</span>
                    <span class="new-level">${new_level ?? '-'}</span>
                </div>
                <div class="level-up-new-title">${title}</div>
                ${is_milestone ? '<div class="level-up-milestone-badge">✨ MILESTONE ✨</div>' : ''}
                ${!isAnonymous && coins_awarded > 0 ? `
                    <div class="level-up-reward">
                        <span class="reward-icon">🪙</span>
                        <span class="reward-amount">+${coins_awarded} Coins</span>
                    </div>
                ` : ''}
                <button class="level-up-close">Continue</button>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => modal.classList.add('show'), 10);

        const closeBtn = modal.querySelector('.level-up-close');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });

        setTimeout(() => {
            if (modal.parentElement) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        }, 6000);
    }

    setupWindowListeners() {
        window.addEventListener('message', (event) => {
            if (!event.data || !event.data.type) return;

            if (event.data.type === 'showXPBanner' && event.data.payload) {
                this.showXPBanner(event.data.payload.xp_earned, event.data.payload);
            }

            if (event.data.type === 'showLevelUpModal' && event.data.payload) {
                this.showLevelUpNotification(event.data.payload);
            }
        });
    }

    // ── Performance Mode ──

    _updateFPSMonitor(deltaTime) {
        if (deltaTime > 0) {
            this.currentFPS = Math.round(1 / deltaTime);
            // Circular buffer — no array shifts, O(1)
            this._fpsRingBuf[this._fpsRingIdx] = this.currentFPS;
            this._fpsRingIdx = (this._fpsRingIdx + 1) % 60;
            if (this._fpsRingCount < 60) this._fpsRingCount++;
        }
        this.fpsUpdateTimer += deltaTime;
        if (this.fpsUpdateTimer >= 0.5) {
            this.fpsUpdateTimer = 0;
            if (this._fpsRingCount > 0) {
                let sum = 0, min = Infinity;
                for (let i = 0; i < this._fpsRingCount; i++) {
                    const v = this._fpsRingBuf[i];
                    sum += v;
                    if (v < min) min = v;
                }
                this.avgFPS = Math.round(sum / this._fpsRingCount);
                this.minFPS = min;
            }
        }
    }

    _loadPerformanceMode() {
        try {
            const saved = localStorage.getItem('spaceShooter2Performance');
            if (saved && ['high', 'medium', 'low'].includes(saved)) return saved;
        } catch (e) { /* ignore */ }
        return 'high';
    }

    _savePerformanceMode(mode) {
        try { localStorage.setItem('spaceShooter2Performance', mode); } catch (e) { /* ignore */ }
    }

    setPerformanceMode(mode) {
        this.performanceMode = mode;
        this._savePerformanceMode(mode);

        // Bullet rendering quality
        Bullet.setPerformanceMode(mode);

        // Enemy glow quality
        Enemy.setPerformanceMode(mode);

        // Explosion detail
        Explosion.setPerformanceMode(mode);

        // PostProcessing
        this.postProcessing.setQuality(mode);

        // ParticleSystem — reduce counts, but never disable glow/trail entirely
        // (shadowBlur glow in ParticleSystem is the main perf cost from particles)
        if (mode === 'high') {
            this.particles.maxParticles = 500;
            this.particles.particleMultiplier = 1;
            this.particles.glowEnabled = true;
            this.particles.trailEnabled = true;
        } else if (mode === 'medium') {
            this.particles.maxParticles = 300;
            this.particles.particleMultiplier = 0.6;
            this.particles.glowEnabled = false;  // skip shadowBlur (biggest perf gain)
            this.particles.trailEnabled = true;
        } else {
            this.particles.maxParticles = 200;
            this.particles.particleMultiplier = 0.4;
            this.particles.glowEnabled = false;
            this.particles.trailEnabled = true;   // keep trails for visual consistency
        }

        // StarField
        if (this.starField) {
            this.starField.setQuality(mode);
        }

        // Explosion scale — keep consistent across modes (no shrinking)
        this.explosionScale = mode === 'high' ? 1.5 : mode === 'medium' ? 1.2 : 1.0;

        // Update UI buttons
        document.querySelectorAll('.perf-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.perf === mode);
        });
    }

    // ── Entity delegates (used by Player.js, Enemy.js, PowerUp.js) ──

    get player() {
        return this.entityManager.player;
    }

    set player(v) {
        this.entityManager.player = v;
    }

    get enemies() {
        return this.entityManager.enemies;
    }

    get boss() {
        return this.entityManager.boss;
    }

    set boss(v) {
        this.entityManager.boss = v;
    }

    get miniBoss() {
        return this.entityManager.miniBoss;
    }

    set miniBoss(v) {
        this.entityManager.miniBoss = v;
    }

    spawnBullet(x, y, vx, vy, owner, damage) {
        return this.entityManager.spawnBullet(x, y, vx, vy, owner, damage);
    }

    spawnHomingMissile(x, y, angle) {
        return this.entityManager.spawnHomingMissile(x, y, angle);
    }

    addScore(points) {
        return this.scoreManager.addScore(points);
    }
}

export { DIFFICULTY_CONFIG };
export default Game;

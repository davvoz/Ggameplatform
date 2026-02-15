import InputManager from './managers/InputManager.js';
import SoundManager from './managers/SoundManager.js';
import AssetManager from './managers/AssetManager.js';
import ParticleSystem from './effects/ParticleSystem.js';
import PostProcessing from './effects/PostProcessing.js';
import StarField from './entities/Star.js';
import { Player } from './entities/Player.js';
import { PerkSystem } from './PerkSystem.js';

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

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

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
        this.performanceMode = 'high';

        this.selectedShipId = null;
        this.selectedUltimateId = null;

        this.starField = null;

        this.fps = 60;
        this.frameCount = 0;
        this.fpsTimer = 0;
        this.lastTime = 0;

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

        this.starField = new StarField(this.canvas.width, this.canvas.height, this.performanceMode);
        this.starField.setLevel(1);

        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    resize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.input.updateLayout(this.canvas.width, this.canvas.height);
        if (this.starField) {
            this.starField.resize(this.canvas.width, this.canvas.height);
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
        }

        if (this.state === 'levelOutro') {
            this.cinematicManager.updateLevelOutro(deltaTime);
        }

        if (this.state === 'deathCinematic') {
            this.cinematicManager.updateDeathCinematic(deltaTime);
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

            if (this.performanceMode !== 'low') {
                this.particles.emitCustom(
                    em.player.position.x + em.player.width / 2 + (Math.random() - 0.5) * 8,
                    em.player.position.y + em.player.height,
                    ParticleSystem.PRESETS.thruster,
                    1
                );
            }

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

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const em = this.entityManager;

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

            for (const bullet of em.bullets) bullet.render(ctx);

            em.renderHomingMissiles(ctx);

            if (em.player && em.player.active) em.player.render(ctx, this.assets, this.perkSystem);

            this.perkEffectsManager.renderDrones(ctx);

            for (const exp of em.explosions) exp.render(ctx);

            this.particles.render(ctx);

            this.hudRenderer.renderHUD(ctx);

            this.input.renderTouchControls(ctx);
        }

        if (_outroZoomActive) {
            ctx.restore();
        }

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

        this.postProcessing.render(ctx);

        this.hudRenderer.renderBanners(ctx);
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
            this.canvas.width / 2 - 32,
            this.canvas.height - 100,
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
        this.hudRenderer.showXPBanner(xpAmount, extraData);
    }

    showStatsBanner(stats) {
        this.hudRenderer.showStatsBanner(stats);
    }

    showLevelUpNotification(levelUpData) {
        this.hudRenderer.showLevelUpNotification(levelUpData);
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

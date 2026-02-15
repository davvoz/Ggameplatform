import InputManager from './managers/InputManager.js';
import SoundManager from './managers/SoundManager.js';
import AssetManager from './managers/AssetManager.js';
import ParticleSystem from './effects/ParticleSystem.js';
import PostProcessing from './effects/PostProcessing.js';
import StarField from './entities/Star.js';
import { Player } from './entities/Player.js';
import Bullet from './entities/Bullet.js';
import Explosion from './entities/Explosion.js';
import PowerUp from './entities/PowerUp.js';
import { EnemyFactory, MultiBoss, MINIBOSS_DEFS, BOSS_DEFS } from './entities/Enemy.js';
import { SHIP_DATA, ULTIMATE_DATA } from './entities/Player.js';
import { getLevelData, getTotalLevels } from './LevelData.js';
import { PerkSystem } from './PerkSystem.js';

/**
 * Difficulty presets
 * Each difficulty multiplies enemy stats and score accordingly.
 */
const DIFFICULTY_CONFIG = {
    boring: {
        id: 'boring',
        label: 'BORING',
        emoji: '😴',
        desc: 'Relaxing ride. Enemies are weak and slow.',
        color: '#66bb6a',
        scoreMultiplier: 0.25,
        enemyHpMult: 1,
        enemySpeedMult: 1,
        enemyFireRateMult: 1,     // lower = shoots more often (divisor on timer)
        enemyBulletSpeedMult: 1,
        bossHpMult: 1,
        bossSpeedMult: 1
    },
    normal: {
        id: 'normal',
        label: 'NORMAL',
        emoji: '⚔️',
        desc: 'Balanced challenge for most pilots.',
        color: '#42a5f5',
        scoreMultiplier: 1,
        enemyHpMult: 1.5,
        enemySpeedMult: 1.25,
        enemyFireRateMult: 0.8,
        enemyBulletSpeedMult: 1.2,
        bossHpMult: 1.4,
        bossSpeedMult: 1.15
    },
    hard: {
        id: 'hard',
        label: 'HARD',
        emoji: '💀',
        desc: 'Punishing. Enemies hit harder and faster.',
        color: '#ef5350',
        scoreMultiplier: 2,
        enemyHpMult: 2,
        enemySpeedMult: 1.5,
        enemyFireRateMult: 0.6,
        enemyBulletSpeedMult: 1.4,
        bossHpMult: 1.8,
        bossSpeedMult: 1.3
    },
    panic: {
        id: 'panic',
        label: 'PANIC',
        emoji: '🔥',
        desc: 'Pure chaos. Only for the brave.',
        color: '#ff6f00',
        scoreMultiplier: 4,
        enemyHpMult: 3,
        enemySpeedMult: 1.8,
        enemyFireRateMult: 0.4,
        enemyBulletSpeedMult: 1.6,
        bossHpMult: 2.5,
        bossSpeedMult: 1.5
    }
};

/**
 * Game - Main game engine for Space Shooter 2
 * 
 * States: menu → shipSelect → cinematic → levelIntro → playing → levelOutro → levelComplete → perkSelect → deathCinematic → gameover → victory
 */
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Core systems
        this.input = new InputManager(this);
        this.sound = new SoundManager();
        this.assets = new AssetManager();
        this.particles = new ParticleSystem();
        this.postProcessing = new PostProcessing(canvas);
        this.perkSystem = new PerkSystem();

        // Difficulty
        this.difficulty = DIFFICULTY_CONFIG.boring;

        // Game state
        this.state = 'menu'; // menu, shipSelect, cinematic, levelIntro, playing, paused, levelOutro, levelComplete, perkSelect, deathCinematic, gameover, victory
        this.timeScale = 1;
        this.gameTime = 0;
        this.performanceMode = 'high';

        // Pre-game cinematic
        this.cinematic = null; // { timer, duration, phase, ... }

        // Level intro animation
        this.levelIntro = null; // { timer, duration, warpStars, levelNum, levelName }

        // Level outro animation
        this.levelOutro = null; // { timer, duration, particles, rings }

        // Death cinematic
        this._deathCine = null; // { timer, duration, rings, debris, cracks, ... }

        // Player & entities
        this.player = null;
        this.selectedShipId = null;
        this.selectedUltimateId = null;
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.powerUps = [];
        this.homingMissiles = [];

        // Level system
        this.currentLevel = 1;
        this.currentWaveIndex = 0;
        this.waveDelay = 0;
        this.waveCleared = true;
        this.bossActive = false;
        this.boss = null;
        this.miniBossActive = false;
        this.miniBoss = null;
        this.miniBossNotification = null; // { text, timer, color }
        this.levelEnemiesKilled = 0;
        this.levelDamageTaken = 0;
        this.levelPointsEarned = 0;
        this.levelStartTime = 0;

        // Scoring
        this.score = 0;
        this.totalPoints = 0; // Cumulative points (currency)
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.totalEnemiesKilled = 0;

        // Background
        this.starField = null;

        // Performance tracking
        this.fps = 60;
        this.frameCount = 0;
        this.fpsTimer = 0;
        this.lastTime = 0;

        // Level complete summary data
        this.summaryData = {};

        // XP Banner queue
        this.xpBanners = [];

        // Animation frame
        this.animFrame = null;

        // Init
        this.init();
    }

    async init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        await this.assets.load();
        this._populateShipPreviews();
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

    // ===== GAME LOOP =====

    gameLoop(timestamp) {
        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        // FPS tracking
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

        // Background always animates
        if (this.starField) this.starField.update(deltaTime);
        this.postProcessing.update(deltaTime);
        this.particles.update(deltaTime);

        // XP banners
        this.updateBanners(deltaTime);

        if (this.state === 'cinematic') {
            this.updateCinematic(deltaTime);
        }

        if (this.state === 'levelIntro') {
            this.updateLevelIntro(deltaTime);
        }

        if (this.state === 'levelOutro') {
            this.updateLevelOutro(deltaTime);
        }

        if (this.state === 'deathCinematic') {
            this._updateGameOverCinematic(deltaTime);
        }

        if (this.state === 'playing') {
            this.updatePlaying(deltaTime);
        }

        // Pause toggle
        if (this.state === 'playing' && this.input.isPausePressed()) {
            this.input.clearPauseKey();
            this.togglePause();
        } else if (this.state === 'paused' && this.input.isPausePressed()) {
            this.input.clearPauseKey();
            this.togglePause();
        }
    }

    updatePlaying(deltaTime) {
        // Player
        if (this.player && this.player.active) {
            this.player.update(deltaTime, this);

            // Thruster particles
            if (this.performanceMode !== 'low') {
                this.particles.emitCustom(
                    this.player.position.x + this.player.width / 2 + (Math.random() - 0.5) * 8,
                    this.player.position.y + this.player.height,
                    ParticleSystem.PRESETS.thruster,
                    1
                );
            }

            // Ultimate charge particles
            if (this.player.ultimateCharge >= 100 && Math.random() < 0.15) {
                this.particles.emit(
                    this.player.position.x + Math.random() * this.player.width,
                    this.player.position.y + Math.random() * this.player.height,
                    'ultimateCharged', 1
                );
            }
        }

        // Enemies (affected by timeScale for time_warp ultimate)
        const enemyDt = deltaTime * this.timeScale;
        for (const enemy of this.enemies) {
            enemy.update(enemyDt, this);
        }

        // Boss
        if (this.boss && this.boss.active) {
            const wasEntering = this.boss.entering;
            this.boss.update(enemyDt, this);
            // Deploy-complete burst when boss finishes entrance
            if (wasEntering && !this.boss.entering) {
                this.postProcessing.shake(8, 0.4);
                this.postProcessing.flash({ r: 255, g: 100, b: 50 }, 0.25);
            }
        }

        // Mini-boss
        if (this.miniBoss && this.miniBoss.active) {
            this.miniBoss.update(enemyDt, this);
        }

        // Bullets
        for (const bullet of this.bullets) {
            // Enemy bullets slowed, player bullets normal
            const bulletDt = bullet.owner === 'enemy' ? enemyDt : deltaTime;
            bullet.update(bulletDt, this);
        }

        // Homing missiles
        this.updateHomingMissiles(deltaTime);

        // Power-ups
        for (const pu of this.powerUps) {
            pu.update(deltaTime, this);
        }

        // Explosions
        for (const exp of this.explosions) {
            exp.update(deltaTime);
        }

        // Collisions
        this.checkCollisions();

        // Cleanup dead entities
        this.cleanup();

        // ── PERK EFFECTS (per-frame) ──
        this.updatePerkEffects(deltaTime);

        // Combo timer (combo_master perk slows decay)
        if (this.combo > 0) {
            this.comboTimer -= deltaTime * this.perkSystem.getComboDecayMultiplier();
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        // Wave management
        this.updateWaves(deltaTime);
    }

    // ===== WAVE SYSTEM =====

    updateWaves(deltaTime) {
        const levelData = getLevelData(this.currentLevel);
        if (!levelData) return;

        // Update mini-boss notification timer
        if (this.miniBossNotification) {
            this.miniBossNotification.timer -= deltaTime;
            if (this.miniBossNotification.timer <= 0) this.miniBossNotification = null;
        }

        // If boss is active, don't spawn more waves
        if (this.bossActive) {
            if (this.boss && !this.boss.active) {
                // Boss killed!
                this.bossActive = false;
                this.boss = null;
                this.onLevelComplete();
            }
            return;
        }

        // If mini-boss is active, wait for it to die
        if (this.miniBossActive) {
            if (this.miniBoss && !this.miniBoss.active) {
                // Mini-boss killed!
                this.onMiniBossKilled();
                this.miniBossActive = false;
                this.miniBoss = null;

                // After mini-boss: spawn boss if boss level, else level complete
                if (levelData.boss) {
                    // Short delay then spawn boss
                    this.waveDelay = 2;
                    this.waveCleared = true;
                    this._pendingBoss = levelData.boss;
                } else {
                    this.onLevelComplete();
                }
            }
            return;
        }

        // Check for pending boss after mini-boss
        if (this._pendingBoss) {
            this.waveDelay -= deltaTime;
            if (this.waveDelay <= 0) {
                this.spawnBoss(this._pendingBoss);
                this._pendingBoss = null;
            }
            return;
        }

        // Check if current wave enemies are all dead
        const enemiesAlive = this.enemies.filter(e => e.active).length;

        if (this.waveCleared) {
            // Wait for delay then spawn next wave
            this.waveDelay -= deltaTime;
            if (this.waveDelay <= 0) {
                if (this.currentWaveIndex < levelData.waves.length) {
                    this.spawnWave(levelData.waves[this.currentWaveIndex], levelData.speedMult);
                    this.currentWaveIndex++;
                    this.waveCleared = false;
                } else if (enemiesAlive === 0) {
                    // All waves done → spawn mini-boss
                    const miniBossType = levelData.miniboss || (((this.currentLevel - 1) % 4) + 1);
                    this.spawnMiniBoss(miniBossType);
                }
            }
        } else {
            if (enemiesAlive === 0) {
                this.waveCleared = true;
                const nextWave = levelData.waves[this.currentWaveIndex];
                this.waveDelay = nextWave ? nextWave.delay : 1;

                if (this.currentWaveIndex >= levelData.waves.length) {
                    // All waves consumed → will spawn mini-boss after delay
                    this.waveDelay = 1.5;
                    this.waveCleared = true;
                    this.currentWaveIndex = levelData.waves.length;
                }
            }
        }
    }

    spawnWave(wave, speedMult) {
        const spawned = EnemyFactory.spawnFormationWave(wave, this.canvas.width, speedMult, this.difficulty, this.currentLevel);
        this.enemies.push(...spawned);
    }

    spawnBoss(bossLevel) {
        this.bossActive = true;
        const x = this.canvas.width / 2 - 95;
        this.boss = EnemyFactory.createBoss(x, -200, bossLevel, this.canvas.width, this.difficulty, this.currentLevel);
        // Epic boss warning
        this.sound.playBossWarning();
        this.postProcessing.shake(3, 2.0);
    }

    spawnMiniBoss(miniBossType) {
        this.miniBossActive = true;
        const x = this.canvas.width / 2 - 55;
        this.miniBoss = EnemyFactory.createMiniBoss(x, -120, miniBossType, this.canvas.width, this.difficulty, this.currentLevel);
        // Simple notification banner (not the epic cinematic)
        this.miniBossNotification = {
            text: `★ ${this.miniBoss.name.toUpperCase()} ★`,
            timer: 2.0,
            color: this.miniBoss.def.color,
            maxTimer: 2.0
        };
        // Light shake + sound cue
        this.postProcessing.shake(3, 0.3);
        this.sound.playExplosionBig();
    }

    onMiniBossKilled() {
        // Moderate shake + flash
        this.postProcessing.shake(6, 0.4);
        this.postProcessing.flash({ r: 255, g: 220, b: 100 }, 0.3);
        // Explosion effects
        const cx = this.miniBoss.position.x + this.miniBoss.width / 2;
        const cy = this.miniBoss.position.y + this.miniBoss.height / 2;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.explosions.push(new Explosion(
                    cx + (Math.random() - 0.5) * 40,
                    cy + (Math.random() - 0.5) * 40,
                    1.5
                ));
                this.particles.emit(cx, cy, 'explosion', 14);
                this.sound.playExplosionBig();
            }, i * 150);
        }
        // Score and drops
        const points = this.miniBoss.score;
        this.addScore(points);
        this.levelEnemiesKilled++;
        this.totalEnemiesKilled++;
        // Drop 1-2 power-ups
        const types = ['health', 'points'];
        for (let i = 0; i < 2; i++) {
            this.powerUps.push(new PowerUp(
                cx + (i - 0.5) * 30 - 17,
                cy - 17,
                types[i]
            ));
        }
    }

    // ===== LEVEL MANAGEMENT =====

    onLevelComplete() {
        // Start outro animation instead of immediately showing level complete
        this._beginLevelOutro();
    }

    _finalizeLevelComplete() {
        this.state = 'levelComplete';
        this._hideHudButtons();
        this.sound.playLevelComplete();
        this.postProcessing.flash({ r: 100, g: 255, b: 100 }, 0.2);

        // Calculate level summary
        const levelTime = (performance.now() - this.levelStartTime) / 1000;
        const accuracy = this.totalEnemiesKilled > 0 ?
            Math.min(100, Math.round((this.levelEnemiesKilled / Math.max(1, this.levelEnemiesKilled + 5)) * 100)) : 0;
        const bonusPoints = Math.floor(this.levelEnemiesKilled * 10 + this.maxCombo * 50);

        this.totalPoints += bonusPoints;
        this.score += bonusPoints;
        this.levelPointsEarned += bonusPoints;

        this.summaryData = {
            level: this.currentLevel,
            levelName: getLevelData(this.currentLevel).name,
            enemiesKilled: this.levelEnemiesKilled,
            damageTaken: this.levelDamageTaken,
            maxCombo: this.maxCombo,
            pointsEarned: this.levelPointsEarned,
            bonusPoints,
            time: levelTime,
            accuracy,
            totalScore: this.score,
            totalPoints: this.totalPoints,
            playerHP: this.player ? this.player.health : 0,
            playerMaxHP: this.player ? this.player.maxHealth : 0
        };

        // Show level complete UI
        this.showLevelCompleteScreen();
    }

    startNextLevel() {
        this.currentLevel++;
        if (this.currentLevel > getTotalLevels()) {
            this.state = 'victory';
            this.showVictoryScreen();
            return;
        }

        // Reset level state
        this.currentWaveIndex = 0;
        this.waveCleared = true;
        this.waveDelay = 2;
        this.bossActive = false;
        this.boss = null;
        this.miniBossActive = false;
        this.miniBoss = null;
        this.miniBossNotification = null;
        this._pendingBoss = null;
        this.levelOutro = null;
        this.levelEnemiesKilled = 0;
        this.levelDamageTaken = 0;
        this.levelPointsEarned = 0;
        this.maxCombo = 0;
        this.combo = 0;
        this.levelStartTime = performance.now();

        // Clear entities
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.powerUps = [];
        this.homingMissiles = [];

        // Apply perk modifiers to player
        if (this.player) {
            this.player.recalculateStats();
            this.applyPerkModifiersToPlayer();
            // Heal to full at start of level
            this.player.health = this.player.maxHealth;
            // Reset position
            this.player.position.x = this.canvas.width / 2 - this.player.width / 2;
            this.player.position.y = this.canvas.height - 100;
        }

        // Switch background theme for level
        if (this.starField) this.starField.setLevel(this.currentLevel);

        this.perkSystem.onLevelStart();

        // Switch back to game music
        this.sound.playGameMusic();

        this._beginLevelIntro();
    }

    // ===== PRE-GAME CINEMATIC =====

    /**
     * Start the pre-game cinematic showcase.
     * @param {Function} onComplete — called when cinematic ends or is skipped
     */
    startCinematic(onComplete) {
        this._cinematicOnComplete = onComplete || null;
        this._beginCinematic();
    }

    _beginCinematic() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Build ship showcase data
        const ships = Object.values(SHIP_DATA);
        const bosses = Object.values(BOSS_DEFS).map((b, i) => ({ ...b, id: i + 1 }));
        const miniBosses = Object.values(MINIBOSS_DEFS).map((mb, i) => ({ ...mb, id: i + 1 }));

        // Build background particles (small stars drifting)
        const bgStars = [];
        for (let i = 0; i < 50; i++) {
            bgStars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                speed: 20 + Math.random() * 60,
                size: 0.5 + Math.random() * 1.5,
                brightness: 0.3 + Math.random() * 0.7
            });
        }

        // Cinematic timing:
        // Phase 0: 0.0 - 4.5   Title reveal (word by word)
        // Phase 1: 4.5 - 19.5  Ships parade (5 ships, 3.0s each)
        // Phase 2: 19.5 - 31.5 Mini-bosses (4, 3.0s each)
        // Phase 3: 31.5 - 49.5 Bosses (6, 3.0s each)
        // Phase 4: 49.5 - 52.0 Perk flash + fade out
        this.cinematic = {
            timer: 0,
            duration: 52.0,
            ships,
            bosses,
            miniBosses,
            bgStars,
            skipReady: false,       // short delay before skip is allowed
            _soundsPlayed: {}       // track which phase sounds have fired
        };

        this.state = 'cinematic';
        this._hideHudButtons();
        this.sound.playCinematicIntro();

        // Skip on tap/click (touch + mouse)
        this._cinematicSkipHandler = () => {
            if (this.cinematic && this.cinematic.skipReady) {
                this.skipCinematic();
            }
        };
        this.canvas.addEventListener('pointerdown', this._cinematicSkipHandler, { once: false });
    }

    skipCinematic() {
        if (!this.cinematic) return;
        this.cinematic = null;
        // Remove skip listener
        if (this._cinematicSkipHandler) {
            this.canvas.removeEventListener('pointerdown', this._cinematicSkipHandler);
            this._cinematicSkipHandler = null;
        }
        // Callback to UI (show difficulty screen)
        if (this._cinematicOnComplete) {
            this._cinematicOnComplete();
            this._cinematicOnComplete = null;
        }
    }

    updateCinematic(dt) {
        if (!this.cinematic) return;
        const c = this.cinematic;
        c.timer += dt;

        // Allow skip after 0.5s
        if (!c.skipReady && c.timer > 0.5) c.skipReady = true;

        // Skip on any key or tap
        if (c.skipReady) {
            // Check any keyboard key (not just movement keys)
            for (const [, pressed] of this.input.keys) {
                if (pressed) {
                    this.input.keys.clear();
                    this.skipCinematic();
                    return;
                }
            }
        }

        // Update background stars
        const h = this.canvas.height;
        for (const s of c.bgStars) {
            s.y += s.speed * dt;
            if (s.y > h) { s.y = 0; s.x = Math.random() * this.canvas.width; }
        }

        // Trigger phase sounds
        const t = c.timer;
        if (t >= 4.5 && !c._soundsPlayed.ships) {
            c._soundsPlayed.ships = true;
            this.sound.playCinematicWhoosh();
        }
        if (t >= 19.5 && !c._soundsPlayed.minibosses) {
            c._soundsPlayed.minibosses = true;
            this.sound.playCinematicBossReveal();
        }
        if (t >= 31.5 && !c._soundsPlayed.bosses) {
            c._soundsPlayed.bosses = true;
            this.sound.playCinematicBossReveal();
        }

        // End cinematic
        if (c.timer >= c.duration) {
            this.skipCinematic();
        }
    }

    _renderCinematic(ctx, w, h) {
        if (!this.cinematic) return;
        const c = this.cinematic;
        const t = c.timer;

        // ── Black background ──
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // ── Background stars ──
        ctx.save();
        for (const s of c.bgStars) {
            ctx.globalAlpha = s.brightness * 0.6;
            ctx.fillStyle = '#aabbdd';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Helper: ease-out cubic
        const easeOut = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
        // Helper: ease-in-out
        const easeInOut = (x) => { const v = Math.min(1, Math.max(0, x)); return v < 0.5 ? 4*v*v*v : 1 - Math.pow(-2*v+2, 3)/2; };

        const cx = w / 2;
        const cy = h / 2;

        // ══════════════════════════════════════
        //  PHASE 0: TITLE (0 - 4.5s) — word by word
        // ══════════════════════════════════════
        if (t < 4.8) {
            const holdEnd = 4.0;
            const holdAlpha = t > holdEnd ? Math.max(0, 1 - (t - holdEnd) / 0.8) : 1;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Auto-scale title to fit screen width with padding
            let titleSize = Math.min(56, w * 0.13);
            let titleFont = `900 ${titleSize}px 'Segoe UI', Arial, sans-serif`;
            ctx.font = titleFont;
            let totalW = ctx.measureText('SPACE SHOOTER 2').width;
            const maxTitleW = w * 0.88; // 88% of screen width
            if (totalW > maxTitleW) {
                titleSize = titleSize * (maxTitleW / totalW);
                titleFont = `900 ${titleSize}px 'Segoe UI', Arial, sans-serif`;
                ctx.font = titleFont;
            }

            // Measure word widths for positioning
            const spaceW = ctx.measureText('SPACE ').width;
            const shooterW = ctx.measureText('SHOOTER ').width;
            const twoW = ctx.measureText('2').width;
            totalW = spaceW + shooterW + twoW;
            const baseX = cx - totalW / 2;

            // ── WORD 1: "SPACE" — drops from top with impact ──
            if (t > 0) {
                const w1t = Math.min(1, t / 0.4);
                const w1enter = easeOut(w1t);
                const w1y = cy - 15 + (1 - w1enter) * (-h * 0.4);
                const w1alpha = w1enter * holdAlpha;

                // Impact shockwave ring when word lands
                if (t > 0.35 && t < 1.0) {
                    const ringT = (t - 0.35) / 0.65;
                    const ringR = ringT * w * 0.35;
                    ctx.globalAlpha = (1 - ringT) * 0.25 * holdAlpha;
                    ctx.strokeStyle = '#4488ff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(baseX + spaceW / 2, cy - 15, ringR, 0, Math.PI * 2);
                    ctx.stroke();
                }

                if (w1alpha > 0.01) {
                    ctx.font = titleFont;
                    ctx.shadowColor = 'rgba(0,150,255,0.9)';
                    ctx.shadowBlur = 35 * w1alpha;
                    ctx.globalAlpha = w1alpha;

                    // Chromatic aberration on entry
                    if (t < 0.6) {
                        const abr = (1 - t / 0.6) * 6;
                        ctx.globalAlpha = w1alpha * 0.3;
                        ctx.fillStyle = '#ff4444';
                        ctx.fillText('SPACE', baseX + spaceW / 2, w1y - abr);
                        ctx.fillStyle = '#4444ff';
                        ctx.fillText('SPACE', baseX + spaceW / 2, w1y + abr);
                    }

                    ctx.globalAlpha = w1alpha;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText('SPACE', baseX + spaceW / 2, w1y);
                }
            }

            // ── WORD 2: "SHOOTER" — slides in from right with glitch ──
            if (t > 0.8) {
                const w2t = Math.min(1, (t - 0.8) / 0.45);
                const w2enter = easeOut(w2t);
                const w2x = baseX + spaceW + shooterW / 2 + (1 - w2enter) * (w * 0.5);
                const w2alpha = w2enter * holdAlpha;

                if (w2alpha > 0.01) {
                    ctx.font = titleFont;
                    ctx.shadowColor = 'rgba(0,150,255,0.9)';
                    ctx.shadowBlur = 35 * w2alpha;

                    // Glitch flicker
                    const glitchActive = (t - 0.8) < 0.35;
                    const gx = glitchActive ? (Math.random() - 0.5) * 6 : 0;
                    const gy = glitchActive ? (Math.random() - 0.5) * 3 : 0;

                    // Chromatic split
                    if ((t - 0.8) < 0.5) {
                        const abr = (1 - (t - 0.8) / 0.5) * 5;
                        ctx.globalAlpha = w2alpha * 0.25;
                        ctx.fillStyle = '#ff4444';
                        ctx.fillText('SHOOTER', w2x + gx - abr, cy - 15 + gy);
                        ctx.fillStyle = '#4444ff';
                        ctx.fillText('SHOOTER', w2x + gx + abr, cy - 15 + gy);
                    }

                    ctx.globalAlpha = w2alpha;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText('SHOOTER', w2x + gx, cy - 15 + gy);
                }
            }

            // ── WORD 3: "2" — scales up huge then settles, with screen flash ──
            if (t > 1.6) {
                const w3t = Math.min(1, (t - 1.6) / 0.5);
                const w3enter = easeOut(w3t);
                const w3scale = 3.0 - (3.0 - 1.0) * w3enter; // start 3x, settle to 1x
                const w3alpha = w3enter * holdAlpha;

                // Screen flash on impact
                if ((t - 1.6) < 0.15) {
                    const flashA = (1 - (t - 1.6) / 0.15) * 0.5;
                    ctx.globalAlpha = flashA;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, w, h);
                }

                // Impact line burst
                if ((t - 1.6) > 0.1 && (t - 1.6) < 0.7) {
                    const burstT = ((t - 1.6) - 0.1) / 0.6;
                    const lineW2 = w * easeOut(burstT);
                    ctx.globalAlpha = (1 - burstT) * 0.6 * holdAlpha;
                    ctx.fillStyle = '#4488ff';
                    ctx.fillRect(cx - lineW2 / 2, cy - 16, lineW2, 3);
                }

                if (w3alpha > 0.01) {
                    const numX = baseX + spaceW + shooterW + twoW / 2;
                    ctx.save();
                    ctx.translate(numX, cy - 15);
                    ctx.scale(w3scale, w3scale);
                    ctx.font = titleFont;
                    ctx.shadowColor = 'rgba(68,136,255,0.9)';
                    ctx.shadowBlur = 40 * w3alpha;
                    ctx.globalAlpha = w3alpha;
                    ctx.fillStyle = '#4488ff';
                    ctx.fillText('2', 0, 0);
                    ctx.restore();
                }
            }

            // ── Subtitle: "TACTICAL EVOLUTION" ──
            if (t > 2.4) {
                const subAlpha = easeOut((t - 2.4) / 0.6) * holdAlpha;
                ctx.globalAlpha = subAlpha * 0.8;
                ctx.shadowColor = 'rgba(68,136,255,0.3)';
                ctx.shadowBlur = 10;
                const subSize = Math.min(16, w * 0.038);
                ctx.font = `400 ${subSize}px 'Segoe UI', Arial, sans-serif`;
                ctx.fillStyle = '#8899bb';
                ctx.letterSpacing = '3px';
                ctx.fillText('TACTICAL EVOLUTION', cx, cy + 35);
                ctx.letterSpacing = '0px';
            }

            ctx.restore();
        }

        // ══════════════════════════════════════
        //  PHASE 1: SHIPS PARADE (4.5 - 19.5s)
        // ══════════════════════════════════════
        if (t >= 4.2 && t < 19.8) {
            const phaseT = t - 4.5;
            const ships = c.ships;
            const phaseDuration = 15.0; // 5 ships × 3.0s

            // Section header — persistent throughout phase
            if (phaseT >= 0 && phaseT < phaseDuration) {
                const hdrEnter = easeOut(Math.min(1, phaseT / 0.4));
                const hdrExit = phaseT > phaseDuration - 0.5 ? easeOut((phaseT - (phaseDuration - 0.5)) / 0.5) : 0;
                const hdrPulse = 0.8 + 0.2 * Math.sin(phaseT * 2);
                ctx.save();
                ctx.globalAlpha = (hdrEnter - hdrExit) * hdrPulse;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const hdrSize = Math.min(18, w * 0.04);
                ctx.font = `bold ${hdrSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.shadowColor = 'rgba(100,180,255,0.6)';
                ctx.shadowBlur = 12;
                ctx.fillStyle = '#aaccee';
                ctx.letterSpacing = '4px';
                ctx.fillText('▸ FLEET ROSTER ◂', cx, h * 0.12);
                ctx.restore();
            }

            // Each ship: 3.0s each, starting at phaseT=0
            for (let i = 0; i < ships.length; i++) {
                const shipStart = i * 3.0;
                const shipT = phaseT - shipStart;
                if (shipT < 0 || shipT > 3.4) continue;

                const ship = ships[i];
                const sprite = this.assets.getSprite(`ship_${ship.id}`);

                // Slide in from left, hold, slide out right
                const enter = easeOut(Math.min(1, shipT / 0.35));
                const exit = shipT > 2.5 ? easeOut((shipT - 2.5) / 0.5) : 0;
                const xPos = cx - 30 + (enter - exit) * 0 + (1 - enter) * (-w * 0.4) + exit * (w * 0.4);
                const yPos = cy - 15;
                const alpha = Math.min(enter, 1 - exit);

                if (alpha > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = alpha;

                    // Ship sprite
                    if (sprite) {
                        const spriteSize = 90;
                        ctx.drawImage(sprite, xPos - spriteSize / 2, yPos - spriteSize / 2, spriteSize, spriteSize);

                        // Glow halo
                        ctx.globalAlpha = alpha * 0.15;
                        const grad = ctx.createRadialGradient(xPos, yPos, 0, xPos, yPos, spriteSize);
                        grad.addColorStop(0, ship.color);
                        grad.addColorStop(1, 'transparent');
                        ctx.fillStyle = grad;
                        ctx.fillRect(xPos - spriteSize, yPos - spriteSize, spriteSize * 2, spriteSize * 2);
                    }

                    // Ship name
                    ctx.globalAlpha = alpha;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const nameSize = Math.min(26, w * 0.058);
                    ctx.font = `bold ${nameSize}px 'Orbitron', 'Segoe UI', monospace`;
                    ctx.shadowColor = ship.color;
                    ctx.shadowBlur = 15;
                    ctx.fillStyle = ship.color;
                    ctx.fillText(ship.name.toUpperCase(), xPos, yPos + 55);

                    // Description
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = alpha * 0.6;
                    const descSize = Math.min(14, w * 0.032);
                    ctx.font = `${descSize}px 'Segoe UI', sans-serif`;
                    ctx.fillStyle = '#99aabb';
                    const desc = ship.description.length > 40 ? ship.description.substring(0, 40) + '...' : ship.description;
                    ctx.fillText(desc, xPos, yPos + 82);

                    // Stat bar preview — all 4 stats
                    const stats = ship.stats;
                    const barW = 70;
                    const barH = 4;
                    const barStartY = yPos + 104;
                    const statKeys = ['hp', 'speed', 'fireRate', 'resist'];
                    const statLabels = ['HP', 'SPD', 'FIRE', 'RES'];
                    ctx.globalAlpha = alpha * 0.5;
                    for (let s = 0; s < statKeys.length; s++) {
                        const val = stats[statKeys[s]] / 10;
                        const by = barStartY + s * 14;
                        // Label
                        ctx.font = `${Math.min(10, w * 0.022)}px monospace`;
                        ctx.textAlign = 'right';
                        ctx.fillStyle = '#556677';
                        ctx.fillText(statLabels[s], xPos - barW / 2 - 5, by + barH);
                        // BG
                        ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        ctx.fillRect(xPos - barW / 2, by, barW, barH);
                        // Fill
                        ctx.fillStyle = ship.color;
                        ctx.fillRect(xPos - barW / 2, by, barW * val, barH);
                    }

                    ctx.restore();
                }
            }
        }

        // ══════════════════════════════════════
        //  PHASE 2: MINI-BOSSES (19.5 - 31.5s)
        // ══════════════════════════════════════
        if (t >= 19.2 && t < 31.8) {
            const phaseT = t - 19.5;
            const phaseDuration = 12.0; // 4 mini-bosses × 3.0s

            // Section header — persistent throughout phase
            if (phaseT >= 0 && phaseT < phaseDuration) {
                const hdrEnter = easeOut(Math.min(1, phaseT / 0.3));
                const hdrExit = phaseT > phaseDuration - 0.5 ? easeOut((phaseT - (phaseDuration - 0.5)) / 0.5) : 0;
                const hdrPulse = 0.8 + 0.2 * Math.sin(phaseT * 2.5);
                ctx.save();
                ctx.globalAlpha = (hdrEnter - hdrExit) * hdrPulse;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const hdrSize = Math.min(18, w * 0.04);
                ctx.font = `bold ${hdrSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.shadowColor = 'rgba(255,200,50,0.6)';
                ctx.shadowBlur = 14;
                ctx.fillStyle = '#ffdd55';
                ctx.fillText('⚠ MINI-BOSSES ⚠', cx, h * 0.12);
                ctx.restore();
            }

            // Each mini-boss: 3.0s each
            for (let i = 0; i < c.miniBosses.length; i++) {
                const mbStart = i * 3.0;
                const mbT = phaseT - mbStart;
                if (mbT < 0 || mbT > 3.4) continue;

                const mb = c.miniBosses[i];
                const sprite = this.assets.getSprite(`mboss${mb.id}_core`);

                const enter = easeOut(Math.min(1, mbT / 0.3));
                const exit = mbT > 2.5 ? easeOut((mbT - 2.5) / 0.5) : 0;
                const alpha = Math.min(enter, 1 - exit);

                // Alternate: even from left, odd from right
                const fromLeft = i % 2 === 0;
                const slideOffset = fromLeft ? (1 - enter) * (-w * 0.5) + exit * (w * 0.5)
                                              : (1 - enter) * (w * 0.5) + exit * (-w * 0.5);
                const xPos = cx + slideOffset;
                const yPos = cy - 10;

                if (alpha > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = alpha;

                    // Warning glow behind
                    const glowR = 70;
                    ctx.globalAlpha = alpha * 0.15;
                    const grd = ctx.createRadialGradient(xPos, yPos, 0, xPos, yPos, glowR);
                    grd.addColorStop(0, mb.color);
                    grd.addColorStop(1, 'transparent');
                    ctx.fillStyle = grd;
                    ctx.fillRect(xPos - glowR, yPos - glowR, glowR * 2, glowR * 2);

                    // Sprite
                    ctx.globalAlpha = alpha;
                    if (sprite) {
                        const sz = 80;
                        ctx.drawImage(sprite, xPos - sz / 2, yPos - sz / 2, sz, sz);
                    }

                    // Name
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const nameSize = Math.min(24, w * 0.052);
                    ctx.font = `bold ${nameSize}px 'Orbitron', 'Segoe UI', monospace`;
                    ctx.shadowColor = mb.color;
                    ctx.shadowBlur = 14;
                    ctx.fillStyle = mb.color;
                    ctx.fillText(mb.name.toUpperCase(), xPos, yPos + 48);

                    // Pattern label
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = alpha * 0.5;
                    const patSize = Math.min(13, w * 0.028);
                    ctx.font = `${patSize}px monospace`;
                    ctx.fillStyle = '#888';
                    ctx.fillText(`pattern: ${mb.movePattern}`, xPos, yPos + 74);

                    ctx.restore();
                }
            }
        }

        // ══════════════════════════════════════
        //  PHASE 3: BOSSES (31.5 - 49.5s)
        // ══════════════════════════════════════
        if (t >= 31.2 && t < 49.8) {
            const phaseT = t - 31.5;
            const phaseDuration = 18.0; // 6 bosses × 3.0s

            // Section header — WARNING style, persistent
            if (phaseT >= 0 && phaseT < phaseDuration) {
                const hdrEnter = easeOut(Math.min(1, phaseT / 0.3));
                const hdrExit = phaseT > phaseDuration - 0.5 ? easeOut((phaseT - (phaseDuration - 0.5)) / 0.5) : 0;
                const flash = Math.sin(phaseT * 4) > 0 ? 1.0 : 0.75;
                ctx.save();
                ctx.globalAlpha = (hdrEnter - hdrExit) * flash;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const hdrSize = Math.min(22, w * 0.05);
                ctx.font = `bold ${hdrSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.shadowColor = '#ff2200';
                ctx.shadowBlur = 25;
                ctx.fillStyle = '#ff3322';
                ctx.fillText('☠ BOSS TARGETS ☠', cx, h * 0.1);
                ctx.restore();
            }

            // Red scan line sweep during boss phase
            if (phaseT > 0) {
                const scanY = (phaseT * 100) % h;
                ctx.save();
                ctx.globalAlpha = 0.06;
                ctx.strokeStyle = '#ff2200';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, scanY);
                ctx.lineTo(w, scanY);
                ctx.stroke();
                ctx.restore();
            }

            // Each boss: 3.0s each
            const bossInterval = 3.0;
            for (let i = 0; i < c.bosses.length; i++) {
                const bStart = i * bossInterval;
                const bT = phaseT - bStart;
                if (bT < 0 || bT > bossInterval + 0.4) continue;

                const boss = c.bosses[i];
                const sprite = this.assets.getSprite(`boss${boss.id}_core`);

                // Scale up entrance, hold, shrink out
                const enter = easeOut(Math.min(1, bT / 0.3));
                const exit = bT > bossInterval - 0.2 ? easeOut((bT - (bossInterval - 0.2)) / 0.4) : 0;
                const alpha = Math.min(enter, 1 - exit);
                const scale = 0.3 + enter * 0.7 - exit * 0.3;

                const yPos = cy - 5;

                if (alpha > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = alpha;

                    // Ominous glow
                    const glowR = 95 * scale;
                    ctx.globalAlpha = alpha * 0.18;
                    const grd = ctx.createRadialGradient(cx, yPos, 0, cx, yPos, glowR);
                    grd.addColorStop(0, boss.color);
                    grd.addColorStop(0.6, boss.color + '44');
                    grd.addColorStop(1, 'transparent');
                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    ctx.arc(cx, yPos, glowR, 0, Math.PI * 2);
                    ctx.fill();

                    // Red corner brackets
                    ctx.globalAlpha = alpha * 0.5;
                    ctx.strokeStyle = '#ff3322';
                    ctx.lineWidth = 2.5;
                    const bw = 65 * scale, bh = 65 * scale;
                    const blx = cx - bw, bly = yPos - bh;
                    const brx = cx + bw, bry = yPos + bh;
                    const cLen = 16;
                    // Top-left
                    ctx.beginPath(); ctx.moveTo(blx, bly + cLen); ctx.lineTo(blx, bly); ctx.lineTo(blx + cLen, bly); ctx.stroke();
                    // Top-right
                    ctx.beginPath(); ctx.moveTo(brx - cLen, bly); ctx.lineTo(brx, bly); ctx.lineTo(brx, bly + cLen); ctx.stroke();
                    // Bottom-left
                    ctx.beginPath(); ctx.moveTo(blx, bry - cLen); ctx.lineTo(blx, bry); ctx.lineTo(blx + cLen, bry); ctx.stroke();
                    // Bottom-right
                    ctx.beginPath(); ctx.moveTo(brx - cLen, bry); ctx.lineTo(brx, bry); ctx.lineTo(brx, bry - cLen); ctx.stroke();

                    // Boss sprite
                    ctx.globalAlpha = alpha;
                    if (sprite) {
                        const sz = 110 * scale;
                        ctx.drawImage(sprite, cx - sz / 2, yPos - sz / 2, sz, sz);
                    }

                    // Boss name
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const nameSize = Math.min(28, w * 0.06) * Math.min(1, scale + 0.2);
                    ctx.font = `bold ${nameSize}px 'Orbitron', 'Segoe UI', monospace`;
                    ctx.shadowColor = boss.color;
                    ctx.shadowBlur = 18;
                    ctx.fillStyle = boss.color;
                    ctx.fillText(boss.name.toUpperCase(), cx, yPos + 64 * scale);

                    // Level label
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = alpha * 0.6;
                    const lvlSize = Math.min(14, w * 0.03);
                    ctx.font = `${lvlSize}px monospace`;
                    ctx.fillStyle = '#cc6655';
                    ctx.fillText(`LEVEL ${boss.id * 5}`, cx, yPos + 88 * scale);

                    ctx.restore();

                    // Sound trigger per boss
                    if (bT > 0 && bT < 0.05 && i > 0) {
                        this.sound.playCinematicWhoosh();
                    }
                }
            }
        }

        // ══════════════════════════════════════
        //  PHASE 4: PERKS FLASH + FADE (49.5 - 52.0s)
        // ══════════════════════════════════════
        if (t >= 49.2 && t < 52.0) {
            const phaseT = t - 49.5;

            if (phaseT >= 0) {
                const fadeOut = phaseT > 1.0 ? Math.max(0, 1 - (phaseT - 1.0) / 0.6) : 1;
                const fadeIn = easeOut(Math.min(1, phaseT / 0.3));
                const alpha = fadeIn * fadeOut;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // "UPGRADE YOUR SHIP" text
                const txtSize = Math.min(26, w * 0.058);
                ctx.font = `bold ${txtSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.shadowColor = 'rgba(100,255,200,0.7)';
                ctx.shadowBlur = 15;
                ctx.fillStyle = '#88ffcc';
                ctx.fillText('UPGRADE YOUR SHIP', cx, cy - 30);

                // Perk icons grid — flash a selection of perk icons
                const perkIcons = ['➤', '✦', '◉', '⚡', '◎', '◌', '✴', '⊛', '★', '❆'];
                const cols = 5;
                const iconSpacing = Math.min(50, w * 0.1);
                const startX = cx - ((cols - 1) * iconSpacing) / 2;
                const startY = cy + 10;
                ctx.shadowBlur = 0;

                for (let i = 0; i < perkIcons.length; i++) {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    const ix = startX + col * iconSpacing;
                    const iy = startY + row * iconSpacing;

                    // Staggered appear
                    const delay = i * 0.04;
                    const iAlpha = easeOut(Math.max(0, (phaseT - delay) / 0.15)) * fadeOut;

                    ctx.globalAlpha = iAlpha * 0.7;
                    const iSize = Math.min(26, w * 0.055);
                    ctx.font = `${iSize}px monospace`;
                    ctx.fillStyle = '#aaddff';
                    ctx.fillText(perkIcons[i], ix, iy);
                }

                // Sub line
                ctx.globalAlpha = alpha * 0.4;
                const subSize = Math.min(14, w * 0.03);
                ctx.font = `${subSize}px 'Segoe UI', sans-serif`;
                ctx.fillStyle = '#667788';
                ctx.fillText('20 tactical perks to discover', cx, cy + 80);

                ctx.restore();
            }
        }

        // ══════════════════════════════════════
        //  GLOBAL OVERLAYS
        // ══════════════════════════════════════

        // Letterbox bars (top & bottom)
        const barH = h * 0.08;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, barH);
        ctx.fillRect(0, h - barH, w, barH);

        // Subtle horizontal lines on letterbox edges
        ctx.strokeStyle = 'rgba(100,180,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, barH); ctx.lineTo(w, barH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, h - barH); ctx.lineTo(w, h - barH); ctx.stroke();

        // "TAP TO SKIP" indicator
        if (c.skipReady) {
            const skipAlpha = 0.55 + 0.25 * Math.sin(t * 3);
            ctx.save();
            ctx.globalAlpha = skipAlpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const skipSize = Math.min(14, w * 0.032);
            ctx.font = `bold ${skipSize}px 'Segoe UI', sans-serif`;
            ctx.fillStyle = '#aabbcc';
            ctx.shadowColor = 'rgba(100,180,255,0.5)';
            ctx.shadowBlur = 6;
            ctx.fillText('▸ TAP TO SKIP ◂', cx, h - barH / 2);
            ctx.restore();
        }

        // Final fade to black at the very end
        if (t > 51.0) {
            const fadeAlpha = Math.min(1, (t - 51.0) / 1.0);
            ctx.fillStyle = `rgba(0,0,0,${fadeAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Vignette (always)
        const vigGrad = ctx.createRadialGradient(cx, cy, w * 0.25, cx, cy, w * 0.75);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, w, h);
    }

    // ===== LEVEL INTRO CINEMATIC =====

    _beginLevelIntro() {
        const levelData = getLevelData(this.currentLevel);
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Build warp-speed stars
        const warpStars = [];
        for (let i = 0; i < 80; i++) {
            warpStars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                z: Math.random() * 1.5 + 0.5,        // parallax depth
                len: Math.random() * 60 + 40,         // streak length
                brightness: Math.random() * 0.6 + 0.4
            });
        }

        // Scanline seed
        const scanLines = [];
        for (let i = 0; i < 4; i++) {
            scanLines.push({
                y: Math.random() * h,
                speed: (Math.random() * 120 + 60) * (Math.random() < 0.5 ? 1 : -1),
                alpha: Math.random() * 0.15 + 0.05,
                width: Math.random() * 2 + 1
            });
        }

        this.levelIntro = {
            timer: 0,
            duration: 3.5,
            warpStars,
            scanLines,
            levelNum: this.currentLevel,
            levelName: levelData ? levelData.name : `Sector ${this.currentLevel}`,
            isBossLevel: [5, 10, 15, 20, 25, 30].includes(this.currentLevel)
        };

        this.state = 'levelIntro';
        this._hideHudButtons();
        this.sound.playLevelIntro();
    }

    updateLevelIntro(dt) {
        if (!this.levelIntro) return;
        this.levelIntro.timer += dt;

        // Update warp stars (always moving)
        const w = this.canvas.width;
        const h = this.canvas.height;
        for (const s of this.levelIntro.warpStars) {
            s.y += s.z * 900 * dt;
            if (s.y > h + s.len) {
                s.y = -s.len;
                s.x = Math.random() * w;
            }
        }

        // Update scan lines
        for (const sl of this.levelIntro.scanLines) {
            sl.y += sl.speed * dt;
            if (sl.y > h) sl.y = -2;
            if (sl.y < -2) sl.y = h;
        }

        // End intro
        if (this.levelIntro.timer >= this.levelIntro.duration) {
            this.levelIntro = null;
            this.state = 'playing';
            this._showHudButtons();
        }
    }

    _renderLevelIntro(ctx, w, h) {
        if (!this.levelIntro) return;
        const intro = this.levelIntro;
        const t = intro.timer;
        const dur = intro.duration;

        // ── Phase timing ──
        // 0.0 - 0.8   : Warp speed (stars streak, brightness ramp)
        // 0.8 - 2.6   : Level title display (text slides in, holds)
        // 2.6 - 3.5   : Fade out (everything dissolves)

        const warpEnd = 0.8;
        const titleStart = 0.6;
        const titleFullAt = 1.1;
        const fadeStart = 2.6;

        // ── 1. Warp star streaks ──
        const warpIntensity = t < warpEnd
            ? Math.min(1, t / 0.3)                         // ramp up
            : Math.max(0, 1 - (t - warpEnd) / 0.6);       // fade out

        if (warpIntensity > 0) {
            ctx.save();
            for (const s of intro.warpStars) {
                const streakLen = s.len * warpIntensity;
                const alpha = s.brightness * warpIntensity * 0.8;
                ctx.strokeStyle = `rgba(180,220,255,${alpha.toFixed(3)})`;
                ctx.lineWidth = s.z * 1.8;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x, s.y - streakLen);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── 2. Vignette overlay ──
        const vigAlpha = t < 0.4 ? t / 0.4 * 0.5
            : t > fadeStart ? Math.max(0, 0.5 * (1 - (t - fadeStart) / (dur - fadeStart)))
            : 0.5;
        if (vigAlpha > 0.01) {
            const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.8);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, `rgba(0,0,0,${vigAlpha.toFixed(3)})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        // ── 3. Scanlines ──
        ctx.save();
        for (const sl of intro.scanLines) {
            const slAlpha = sl.alpha * (t < 0.3 ? t / 0.3 : t > fadeStart ? Math.max(0, 1 - (t - fadeStart) / 0.5) : 1);
            if (slAlpha > 0.005) {
                ctx.strokeStyle = `rgba(100,200,255,${slAlpha.toFixed(3)})`;
                ctx.lineWidth = sl.width;
                ctx.beginPath();
                ctx.moveTo(0, sl.y);
                ctx.lineTo(w, sl.y);
                ctx.stroke();
            }
        }
        ctx.restore();

        // ── 4. Top & Bottom edge glow lines ──
        if (t > 0.2 && t < fadeStart + 0.5) {
            const lineAlpha = t < 0.5 ? (t - 0.2) / 0.3
                : t > fadeStart ? Math.max(0, 1 - (t - fadeStart) / 0.5) : 1;
            ctx.save();
            ctx.strokeStyle = `rgba(0,180,255,${(lineAlpha * 0.6).toFixed(3)})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(0,180,255,0.8)';
            ctx.shadowBlur = 12;

            // Top line
            const lineW = w * 0.7 * Math.min(1, (t - 0.2) / 0.5);
            const cx = w / 2;
            ctx.beginPath();
            ctx.moveTo(cx - lineW / 2, h * 0.28);
            ctx.lineTo(cx + lineW / 2, h * 0.28);
            ctx.stroke();

            // Bottom line
            ctx.beginPath();
            ctx.moveTo(cx - lineW / 2, h * 0.62);
            ctx.lineTo(cx + lineW / 2, h * 0.62);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // ── 5. "LEVEL X" text ──
        if (t > titleStart) {
            const titleProgress = Math.min(1, (t - titleStart) / (titleFullAt - titleStart));
            const titleFade = t > fadeStart ? Math.max(0, 1 - (t - fadeStart) / (dur - fadeStart)) : 1;
            const eased = 1 - Math.pow(1 - titleProgress, 3); // ease-out cubic

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // "LEVEL X" slides in from left
            const levelLabel = `LEVEL ${intro.levelNum}`;
            const slideX = w / 2 + (1 - eased) * (-w * 0.4);
            const mainY = h * 0.38;

            // Glow behind text
            ctx.shadowColor = 'rgba(0,180,255,0.9)';
            ctx.shadowBlur = 25 * titleFade;

            // Level number
            const fontSize = Math.min(42, w * 0.09);
            ctx.font = `bold ${fontSize}px 'Orbitron', 'Segoe UI', monospace`;
            ctx.fillStyle = `rgba(255,255,255,${(titleFade * eased).toFixed(3)})`;
            ctx.fillText(levelLabel, slideX, mainY);

            // ── 6. Level name slides in from right ──
            const nameDelay = 0.2;
            if (t > titleStart + nameDelay) {
                const nameProgress = Math.min(1, (t - titleStart - nameDelay) / 0.5);
                const nameEased = 1 - Math.pow(1 - nameProgress, 3);
                const nameSlideX = w / 2 + (1 - nameEased) * (w * 0.3);
                const nameY = h * 0.46;

                ctx.shadowColor = intro.isBossLevel ? 'rgba(255,60,60,0.8)' : 'rgba(0,255,180,0.6)';
                ctx.shadowBlur = 15 * titleFade;

                const nameFontSize = Math.min(22, w * 0.05);
                ctx.font = `600 ${nameFontSize}px 'Orbitron', 'Segoe UI', monospace`;
                const nameColor = intro.isBossLevel ? `rgba(255,120,100,${(titleFade * nameEased).toFixed(3)})` : `rgba(120,255,200,${(titleFade * nameEased).toFixed(3)})`;
                ctx.fillStyle = nameColor;
                ctx.fillText(`» ${intro.levelName.toUpperCase()} «`, nameSlideX, nameY);
            }

            // ── 7. Boss level warning ──
            if (intro.isBossLevel && t > titleStart + 0.5) {
                const warnProg = Math.min(1, (t - titleStart - 0.5) / 0.4);
                const warnEased = 1 - Math.pow(1 - warnProg, 2);
                const pulse = 0.7 + Math.sin(t * 6) * 0.3;
                const warnY = h * 0.54;

                ctx.shadowColor = 'rgba(255,30,30,0.9)';
                ctx.shadowBlur = 20 * titleFade;

                const warnFontSize = Math.min(16, w * 0.035);
                ctx.font = `bold ${warnFontSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.fillStyle = `rgba(255,80,60,${(titleFade * warnEased * pulse).toFixed(3)})`;
                ctx.fillText('⚠ BOSS SECTOR ⚠', w / 2, warnY);
            }

            // ── 8. Decorative corner brackets ──
            if (eased > 0.5) {
                const bracketAlpha = titleFade * Math.min(1, (eased - 0.5) * 2);
                ctx.strokeStyle = `rgba(0,180,255,${(bracketAlpha * 0.5).toFixed(3)})`;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 0;

                const bSize = 20;
                const pad = w * 0.12;
                const top = h * 0.30;
                const bottom = h * 0.60;

                // Top-left bracket
                ctx.beginPath();
                ctx.moveTo(pad, top + bSize);
                ctx.lineTo(pad, top);
                ctx.lineTo(pad + bSize, top);
                ctx.stroke();

                // Top-right bracket
                ctx.beginPath();
                ctx.moveTo(w - pad, top + bSize);
                ctx.lineTo(w - pad, top);
                ctx.lineTo(w - pad - bSize, top);
                ctx.stroke();

                // Bottom-left bracket
                ctx.beginPath();
                ctx.moveTo(pad, bottom - bSize);
                ctx.lineTo(pad, bottom);
                ctx.lineTo(pad + bSize, bottom);
                ctx.stroke();

                // Bottom-right bracket
                ctx.beginPath();
                ctx.moveTo(w - pad, bottom - bSize);
                ctx.lineTo(w - pad, bottom);
                ctx.lineTo(w - pad - bSize, bottom);
                ctx.stroke();
            }

            ctx.restore();
        }

        // ── 9. Flash at end ──
        if (t > fadeStart) {
            const flashProg = (t - fadeStart) / (dur - fadeStart);
            // Quick bright then fade
            const flashAlpha = flashProg < 0.3 ? flashProg / 0.3 * 0.15 : 0.15 * (1 - (flashProg - 0.3) / 0.7);
            if (flashAlpha > 0.005) {
                ctx.fillStyle = `rgba(180,220,255,${flashAlpha.toFixed(3)})`;
                ctx.fillRect(0, 0, w, h);
            }
        }
    }

    // ===== LEVEL OUTRO CINEMATIC =====

    _beginLevelOutro() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const pcx = this.player ? this.player.position.x + this.player.width / 2 : w / 2;
        const pcy = this.player ? this.player.position.y + this.player.height / 2 : h * 0.8;

        this.levelOutro = {
            timer: 0,
            duration: 3.5,
            pcx, pcy,
            levelNum: this.currentLevel,
            levelName: getLevelData(this.currentLevel)?.name || `Sector ${this.currentLevel}`,
            zoom: 1,
            zoomProgress: 0
        };

        this.state = 'levelOutro';
        this._hideHudButtons();
        this.sound.playLevelOutro();

        // Clear enemy bullets
        this.bullets = this.bullets.filter(b => b.owner === 'player');

        // Golden flash
        this.postProcessing.flash({ r: 255, g: 215, b: 0 }, 0.4);
    }

    updateLevelOutro(dt) {
        if (!this.levelOutro) return;
        const outro = this.levelOutro;
        outro.timer += dt;
        const t = outro.timer;
        const dur = outro.duration;
        const progress = t / dur;

        // Camera zoom on player ship (like SS1)
        if (progress < 0.3) {
            outro.zoom = 1 + (progress / 0.3) * 0.5;
        } else if (progress < 0.7) {
            outro.zoom = 1.5;
        } else {
            outro.zoom = 1.5 - ((progress - 0.7) / 0.3) * 0.5;
        }
        outro.zoomProgress = Math.min(1, progress / 0.3);

        // End outro → proceed to level complete screen
        if (t >= dur) {
            this.levelOutro = null;
            this._finalizeLevelComplete();
        }
    }

    _renderLevelOutro(ctx, w, h) {
        if (!this.levelOutro) return;
        const outro = this.levelOutro;
        const t = outro.timer;
        const dur = outro.duration;
        const progress = t / dur;
        const cx = w / 2;
        const cy = h / 3;

        // ── 1. Semi-transparent darken ──
        const bgAlpha = Math.min(0.4, progress * 1.5);
        ctx.fillStyle = `rgba(0, 0, 0, ${bgAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);

        // ── 2. Golden light rays from center ──
        if (progress > 0.1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const rayCount = 12;
            const rayAlpha = Math.min(1, (progress - 0.1) * 3) *
                (progress > 0.85 ? Math.max(0, (1 - progress) / 0.15) : 1);

            for (let i = 0; i < rayCount; i++) {
                const angle = (i / rayCount) * Math.PI * 2 + this.gameTime * 0.5;
                const rayLength = 250 + Math.sin(this.gameTime * 3 + i) * 40;
                const rayGrad = ctx.createLinearGradient(
                    cx, cy,
                    cx + Math.cos(angle) * rayLength,
                    cy + Math.sin(angle) * rayLength
                );
                rayGrad.addColorStop(0, `rgba(255, 215, 0, ${(0.35 * rayAlpha).toFixed(3)})`);
                rayGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');

                ctx.strokeStyle = rayGrad;
                ctx.lineWidth = 18 + Math.sin(this.gameTime * 5 + i * 2) * 8;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(
                    cx + Math.cos(angle) * rayLength,
                    cy + Math.sin(angle) * rayLength
                );
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
        }

        // ── 3. "LEVEL CLEAR!" text with pop-in scale ──
        if (progress > 0.05) {
            const textProg = Math.min(1, (progress - 0.05) / 0.15);
            const textAlpha = Math.min(1, (progress - 0.05) * 6) *
                (progress > 0.85 ? Math.max(0, (1 - progress) / 0.15) : 1);
            const textScale = textProg < 0.5
                ? 1 + (1 - textProg / 0.5) * 0.5
                : 1;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.translate(cx, cy);
            ctx.scale(textScale, textScale);
            ctx.translate(-cx, -cy);

            const fontSize = Math.min(36, w * 0.085);
            ctx.font = `bold ${fontSize}px 'Orbitron', 'Segoe UI', monospace`;

            // Glow
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 25;

            // Stroke for readability
            ctx.globalAlpha = textAlpha;
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 4;
            ctx.strokeText('LEVEL CLEAR!', cx, cy - 10);

            // Gold fill
            ctx.fillStyle = `rgba(255, 215, 0, ${textAlpha.toFixed(3)})`;
            ctx.fillText('LEVEL CLEAR!', cx, cy - 10);

            // Sub-label: level name
            if (progress > 0.2) {
                const subAlpha = Math.min(1, (progress - 0.2) * 5) *
                    (progress > 0.85 ? Math.max(0, (1 - progress) / 0.15) : 1);
                const subFontSize = Math.min(16, w * 0.04);
                ctx.font = `bold ${subFontSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 15;
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = 3;
                ctx.strokeText(`» ${outro.levelName.toUpperCase()} «`, cx, cy + 22);
                ctx.fillStyle = `rgba(0, 255, 255, ${subAlpha.toFixed(3)})`;
                ctx.fillText(`» ${outro.levelName.toUpperCase()} «`, cx, cy + 22);
            }

            ctx.restore();
        }

        // ── 4. Orbiting star dots ──
        if (progress > 0.15) {
            const starAlpha = Math.min(1, (progress - 0.15) * 4) *
                (progress > 0.85 ? Math.max(0, (1 - progress) / 0.15) : 1);
            ctx.save();
            ctx.shadowBlur = 0;
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2 + this.gameTime * 2;
                const dist = 70 + Math.sin(this.gameTime * 4 + i) * 20;
                const sx = cx + Math.cos(angle) * dist;
                const sy = cy + Math.sin(angle) * dist;
                const sz = 2.5 + Math.sin(this.gameTime * 6 + i * 3) * 1.5;

                ctx.globalAlpha = starAlpha * 0.85;
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(sx, sy, sz, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // ── 5. "GET READY!" blink near the end ──
        if (progress > 0.7 && progress < 0.95) {
            const readyAlpha = Math.sin((progress - 0.7) / 0.25 * Math.PI * 4) * 0.5 + 0.5;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const readyFontSize = Math.min(18, w * 0.045);
            ctx.font = `bold ${readyFontSize}px 'Orbitron', 'Segoe UI', monospace`;
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 20;
            ctx.fillStyle = `rgba(255, 100, 0, ${readyAlpha.toFixed(3)})`;
            ctx.fillText('GET READY!', cx, cy + 60);
            ctx.restore();
        }

        // ── 6. Initial bright flash ──
        if (t < 0.2) {
            const flashAlpha = (1 - t / 0.2) * 0.3;
            ctx.fillStyle = `rgba(255,230,150,${flashAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }
    }

    // ===== GAME OVER DEATH CINEMATIC =====

    _beginGameOverCinematic(deathX, deathY) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Shockwave rings expanding from death point
        const rings = [];
        for (let i = 0; i < 5; i++) {
            rings.push({
                x: deathX, y: deathY,
                radius: 0,
                maxRadius: 180 + i * 100,
                speed: 200 + i * 60,
                alpha: 0.7,
                delay: i * 0.15,
                hue: [0, 20, 350, 30, 10][i]
            });
        }

        // Debris fragments flying away from explosion
        const debris = [];
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 300 + 80;
            debris.push({
                x: deathX, y: deathY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 12,
                size: Math.random() * 6 + 2,
                life: 1,
                maxLife: Math.random() * 2.0 + 1.0,
                hue: Math.floor(Math.random() * 40) // red-orange
            });
        }

        // Radial crack lines from death point
        const cracks = [];
        const crackCount = 12;
        for (let i = 0; i < crackCount; i++) {
            const baseAngle = (i / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
            const segments = [];
            let cx = deathX, cy = deathY;
            const segCount = Math.floor(Math.random() * 4) + 3;
            for (let s = 0; s < segCount; s++) {
                const segLen = Math.random() * 50 + 30;
                const deviation = (Math.random() - 0.5) * 0.6;
                const nx = cx + Math.cos(baseAngle + deviation) * segLen;
                const ny = cy + Math.sin(baseAngle + deviation) * segLen;
                segments.push({ x: nx, y: ny });
                cx = nx;
                cy = ny;
            }
            cracks.push({ segments, maxLen: segments.length, revealSpeed: Math.random() * 2 + 2.5 });
        }

        // Glitch text data
        const glitchChars = '█▓▒░╠╣╚╗┃━▀▄《》';

        // Embers / floating sparks
        const embers = [];
        for (let i = 0; i < 30; i++) {
            embers.push({
                x: Math.random() * w,
                y: h + Math.random() * 40,
                vx: (Math.random() - 0.5) * 30,
                vy: -(Math.random() * 80 + 40),
                size: Math.random() * 3 + 1,
                life: Math.random() * 2 + 1,
                hue: Math.floor(Math.random() * 30 + 10),
                flicker: Math.random() * Math.PI * 2
            });
        }

        this._deathCine = {
            timer: 0,
            duration: 6.5,
            deathX, deathY,
            rings, debris, cracks,
            glitchChars,
            embers,
            textGlitchSeed: Math.random() * 1000,
            slowMotion: 0.15, // time scale for game elements
            cameraPulse: 0
        };

        this.state = 'deathCinematic';
    }

    _updateGameOverCinematic(dt) {
        if (!this._deathCine) return;
        const cine = this._deathCine;
        cine.timer += dt;
        const t = cine.timer;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Update shockwave rings
        for (const ring of cine.rings) {
            if (t < ring.delay) continue;
            ring.radius += ring.speed * dt;
            ring.alpha = Math.max(0, 0.7 * (1 - ring.radius / ring.maxRadius));
        }

        // Update debris
        for (const d of cine.debris) {
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vy += 60 * dt; // gravity
            d.rot += d.rotSpeed * dt;
            d.life -= dt / d.maxLife;
        }
        cine.debris = cine.debris.filter(d => d.life > 0);

        // Update embers (float upward)
        for (const e of cine.embers) {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            e.flicker += dt * 8;
            e.life -= dt * 0.5;
        }
        cine.embers = cine.embers.filter(e => e.life > 0);

        // Spawn new embers during mid-phase
        if (t > 0.8 && t < 5.0 && Math.random() < 0.35) {
            cine.embers.push({
                x: Math.random() * w,
                y: h + 10,
                vx: (Math.random() - 0.5) * 40,
                vy: -(Math.random() * 60 + 30),
                size: Math.random() * 2.5 + 0.5,
                life: Math.random() * 1.5 + 0.5,
                hue: Math.floor(Math.random() * 30 + 10),
                flicker: Math.random() * Math.PI * 2
            });
        }

        // Camera pulse
        if (t < 0.5) {
            cine.cameraPulse = Math.sin(t * 30) * Math.max(0, 1 - t / 0.5) * 3;
        }

        // Additional shake at text slam
        if (t > 1.8 && t < 2.1) {
            this.postProcessing.shake(4, 0.15);
        }

        // End cinematic → show game over screen
        if (t >= cine.duration) {
            this._deathCine = null;
            this.state = 'gameover';
            this.sound.playGameOver();
            this.showGameOverScreen();
        }
    }

    _renderGameOverCinematic(ctx, w, h) {
        if (!this._deathCine) return;
        const cine = this._deathCine;
        const t = cine.timer;
        const dur = cine.duration;
        const dx = cine.deathX;
        const dy = cine.deathY;

        // Phase timing:
        // 0.0 - 0.8   Explosion + shockwaves + debris
        // 0.8 - 1.8   Screen darkens, cracks spread, embers rise
        // 1.8 - 4.5   "GAME OVER" text with glitch effect (long hold)
        // 4.5 - 6.5   Fade to black

        // ── 1. Red vignette darkening ──
        const darkProgress = Math.min(1, t / 2.0);
        const darkAlpha = darkProgress * 0.65;
        if (darkAlpha > 0.01) {
            const grad = ctx.createRadialGradient(dx, dy, 10, dx, dy, w * 0.9);
            grad.addColorStop(0, `rgba(40,0,0,${(darkAlpha * 0.3).toFixed(3)})`);
            grad.addColorStop(0.5, `rgba(20,0,0,${(darkAlpha * 0.6).toFixed(3)})`);
            grad.addColorStop(1, `rgba(0,0,0,${darkAlpha.toFixed(3)})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        // ── 2. Shockwave rings ──
        ctx.save();
        for (const ring of cine.rings) {
            if (ring.alpha <= 0.01 || ring.radius <= 0) continue;

            // Outer glow
            ctx.strokeStyle = `hsla(${ring.hue}, 100%, 50%, ${(ring.alpha * 0.4).toFixed(3)})`;
            ctx.lineWidth = 8;
            ctx.shadowColor = `hsla(${ring.hue}, 100%, 60%, 0.6)`;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(dx, dy, ring.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Main ring
            ctx.strokeStyle = `hsla(${ring.hue}, 90%, 65%, ${ring.alpha.toFixed(3)})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(dx, dy, ring.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // ── 3. Debris particles ──
        ctx.save();
        for (const d of cine.debris) {
            ctx.globalAlpha = Math.max(0, d.life);
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rot);
            ctx.fillStyle = `hsl(${d.hue}, 90%, 55%)`;
            ctx.shadowColor = `hsl(${d.hue}, 100%, 70%)`;
            ctx.shadowBlur = 6;
            // Irregular fragments
            ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size * 0.6);
            ctx.restore();
        }
        ctx.restore();

        // ── 4. Crack lines spreading from death point ──
        if (t > 0.2 && t < 5.2) {
            const crackAlpha = t < 1.0 ? (t - 0.2) / 0.8 : t > 4.5 ? Math.max(0, (5.2 - t) / 0.7) : 1;
            ctx.save();
            ctx.strokeStyle = `rgba(255, 80, 40, ${(crackAlpha * 0.7).toFixed(3)})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(255, 60, 20, 0.8)';
            ctx.shadowBlur = 8;

            for (const crack of cine.cracks) {
                const revealedSegs = Math.min(crack.segments.length,
                    Math.floor((t - 0.2) * crack.revealSpeed));
                if (revealedSegs <= 0) continue;

                ctx.beginPath();
                ctx.moveTo(dx, dy);
                for (let i = 0; i < revealedSegs; i++) {
                    ctx.lineTo(crack.segments[i].x, crack.segments[i].y);
                }
                ctx.stroke();

                // Bright tip at the end of each crack
                if (revealedSegs > 0 && t < 3.5) {
                    const tip = crack.segments[revealedSegs - 1];
                    ctx.fillStyle = `rgba(255, 200, 100, ${(crackAlpha * 0.8).toFixed(3)})`;
                    ctx.beginPath();
                    ctx.arc(tip.x, tip.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        // ── 5. Rising embers ──
        ctx.save();
        for (const e of cine.embers) {
            const flick = 0.5 + 0.5 * Math.sin(e.flicker);
            ctx.globalAlpha = Math.min(e.life, 1) * flick;
            ctx.fillStyle = `hsl(${e.hue}, 100%, 60%)`;
            ctx.shadowColor = `hsl(${e.hue}, 100%, 80%)`;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // ── 6. Static / interference scanlines ──
        if (t > 0.3 && t < 5.8) {
            const staticAlpha = Math.min(0.12, (t - 0.3) * 0.06) *
                (t > 5.0 ? Math.max(0, (5.8 - t) / 0.8) : 1);
            ctx.save();
            ctx.globalAlpha = staticAlpha;
            for (let y = 0; y < h; y += 3) {
                if (Math.random() < 0.35) {
                    const brightness = Math.floor(Math.random() * 80 + 20);
                    ctx.fillStyle = `rgb(${brightness},${Math.floor(brightness * 0.3)},${Math.floor(brightness * 0.3)})`;
                    ctx.fillRect(0, y, w, 1);
                }
            }
            // Occasional horizontal glitch bands
            if (Math.random() < 0.15) {
                const bandY = Math.random() * h;
                const bandH = Math.random() * 8 + 2;
                ctx.globalAlpha = staticAlpha * 2;
                ctx.fillStyle = `rgba(255, 30, 30, 0.15)`;
                ctx.fillRect(0, bandY, w, bandH);
            }
            ctx.restore();
        }

        // ── 7. "GAME OVER" text with glitch reveal ──
        if (t > 1.8) {
            const textBaseStr = 'GAME OVER';
            const textAppear = Math.min(1, (t - 1.8) / 0.5);
            const textFade = t > 5.0 ? Math.max(0, 1 - (t - 5.0) / (dur - 5.0)) : 1;
            const eased = 1 - Math.pow(1 - textAppear, 4); // ease-out quartic

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const titleY = h * 0.42;
            const fontSize = Math.min(52, w * 0.12);

            // Glitch phase: show scrambled chars first, then resolve
            const glitchIntensity = Math.max(0, 1 - (t - 1.8) / 1.0);
            let displayText = '';
            for (let i = 0; i < textBaseStr.length; i++) {
                if (glitchIntensity > 0 && Math.random() < glitchIntensity * 0.7) {
                    displayText += cine.glitchChars[Math.floor(Math.random() * cine.glitchChars.length)];
                } else {
                    displayText += textBaseStr[i];
                }
            }

            // Horizontal glitch offset
            const glitchOffsetX = glitchIntensity > 0.1 ? (Math.random() - 0.5) * 12 * glitchIntensity : 0;
            const glitchOffsetY = glitchIntensity > 0.2 ? (Math.random() - 0.5) * 6 * glitchIntensity : 0;

            // Scale slam effect
            const slamScale = t < 2.1 ? 1.3 + (1 - eased) * 0.8 : 1.0;
            ctx.translate(w / 2 + glitchOffsetX, titleY + glitchOffsetY);
            ctx.scale(slamScale, slamScale);
            ctx.translate(-(w / 2), -titleY);

            ctx.font = `900 ${fontSize}px 'Segoe UI', 'Orbitron', monospace`;

            // Red chromatic aberration split
            if (glitchIntensity > 0.05) {
                const caOffset = glitchIntensity * 4;
                ctx.globalAlpha = eased * textFade * 0.3;
                ctx.fillStyle = '#ff0000';
                ctx.fillText(displayText, w / 2 - caOffset, titleY);
                ctx.fillStyle = '#0066ff';
                ctx.fillText(displayText, w / 2 + caOffset, titleY);
            }

            // Black stroke outline
            ctx.globalAlpha = eased * textFade;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 5;
            ctx.strokeText(displayText, w / 2, titleY);

            // Main red text with glow
            ctx.shadowColor = 'rgba(255, 30, 0, 0.9)';
            ctx.shadowBlur = 30 * textFade;
            ctx.fillStyle = '#ff3333';
            ctx.fillText(displayText, w / 2, titleY);

            // White core highlight
            ctx.shadowBlur = 0;
            ctx.globalAlpha = eased * textFade * 0.3;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(displayText, w / 2, titleY);

            // Decorative underline
            if (eased > 0.5 && t < 5.2) {
                const lineW = w * 0.35 * Math.min(1, (eased - 0.5) * 2);
                const lineAlpha = textFade * (eased - 0.5) * 2;
                ctx.globalAlpha = Math.min(1, lineAlpha) * 0.6;
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 2;
                ctx.shadowColor = 'rgba(255,60,30,0.8)';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(w / 2 - lineW / 2, titleY + fontSize * 0.55);
                ctx.lineTo(w / 2 + lineW / 2, titleY + fontSize * 0.55);
                ctx.stroke();
            }

            ctx.restore();

            // Sub-text: level & score reveal
            if (t > 2.6 && t < 5.2) {
                const subProgress = Math.min(1, (t - 2.6) / 0.5);
                const subFade = t > 4.6 ? Math.max(0, (5.2 - t) / 0.6) : 1;
                const subEased = 1 - Math.pow(1 - subProgress, 3);

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const subY = h * 0.54;
                const subFontSize = Math.min(16, w * 0.038);
                ctx.font = `600 ${subFontSize}px 'Segoe UI', monospace`;
                ctx.globalAlpha = subEased * subFade;
                ctx.fillStyle = '#aa6666';
                ctx.shadowColor = 'rgba(255,50,50,0.4)';
                ctx.shadowBlur = 8;
                const levelData = getLevelData(this.currentLevel);
                ctx.fillText(
                    `LEVEL ${this.currentLevel} — ${levelData?.name?.toUpperCase() || 'SECTOR ' + this.currentLevel}`,
                    w / 2, subY
                );

                // Score
                if (t > 3.0) {
                    const scoreProg = Math.min(1, (t - 3.0) / 0.4);
                    const scoreEased = 1 - Math.pow(1 - scoreProg, 2);
                    ctx.globalAlpha = scoreEased * subFade;
                    ctx.fillStyle = '#888888';
                    ctx.font = `400 ${Math.min(13, w * 0.03)}px 'Segoe UI', monospace`;
                    ctx.fillText(`SCORE: ${this.score.toLocaleString()}`, w / 2, subY + subFontSize * 1.8);
                }

                ctx.restore();
            }
        }

        // ── 8. Pulsing red border frame ──
        if (t > 0.5 && t < 5.5) {
            const frameProg = Math.min(1, (t - 0.5) / 0.5);
            const frameFade = t > 4.8 ? Math.max(0, (5.5 - t) / 0.7) : 1;
            const pulse = 0.5 + 0.5 * Math.sin(t * 4);
            const frameAlpha = frameProg * frameFade * pulse * 0.25;

            ctx.save();
            ctx.strokeStyle = `rgba(255, 30, 0, ${frameAlpha.toFixed(3)})`;
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
            ctx.shadowBlur = 20;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.restore();
        }

        // ── 9. Final fade to black ──
        if (t > 5.0) {
            const blackAlpha = Math.min(1, (t - 5.0) / (dur - 5.0));
            ctx.fillStyle = `rgba(0,0,0,${blackAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }

        // ── 10. Initial bright flash from explosion ──
        if (t < 0.3) {
            const flashAlpha = (1 - t / 0.3) * 0.5;
            ctx.fillStyle = `rgba(255,100,50,${flashAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }
    }

    // ===== ENTITY SPAWNING =====

    spawnBullet(x, y, vx, vy, owner, damage = 1) {
        const bullet = new Bullet(x, y, vx, vy, owner, damage);
        this.bullets.push(bullet);
    }

    spawnHomingMissile(x, y, angle) {
        this.homingMissiles.push({
            x, y,
            vx: Math.cos(angle) * 100,
            vy: Math.sin(angle) * 100,
            speed: 350,
            life: 3,
            active: true,
            target: null,
            damage: 3,
            trail: []
        });
    }

    updateHomingMissiles(dt) {
        for (const m of this.homingMissiles) {
            if (!m.active) continue;
            m.life -= dt;
            if (m.life <= 0) { m.active = false; continue; }

            // Find closest enemy
            let closest = null;
            let closestDist = Infinity;
            for (const enemy of this.enemies) {
                if (!enemy.active) continue;
                const dx = enemy.position.x + enemy.width / 2 - m.x;
                const dy = enemy.position.y + enemy.height / 2 - m.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = enemy;
                }
            }
            // Also check boss (not during entrance)
            if (this.boss && this.boss.active && !this.boss.entering) {
                const dx = this.boss.position.x + this.boss.width / 2 - m.x;
                const dy = this.boss.position.y + this.boss.height / 2 - m.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = this.boss;
                }
            }
            // Also check mini-boss (not during entrance)
            if (this.miniBoss && this.miniBoss.active && !this.miniBoss.entering) {
                const dx = this.miniBoss.position.x + this.miniBoss.width / 2 - m.x;
                const dy = this.miniBoss.position.y + this.miniBoss.height / 2 - m.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = this.miniBoss;
                }
            }

            if (closest) {
                const dx = closest.position.x + closest.width / 2 - m.x;
                const dy = closest.position.y + closest.height / 2 - m.y;
                const angle = Math.atan2(dy, dx);
                m.vx += Math.cos(angle) * m.speed * 3 * dt;
                m.vy += Math.sin(angle) * m.speed * 3 * dt;
                const spd = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
                if (spd > m.speed) {
                    m.vx = m.vx / spd * m.speed;
                    m.vy = m.vy / spd * m.speed;
                }
            }

            m.trail.push({ x: m.x, y: m.y });
            if (m.trail.length > 8) m.trail.shift();

            m.x += m.vx * dt;
            m.y += m.vy * dt;

            // Check collision with enemies
            for (const enemy of this.enemies) {
                if (!enemy.active) continue;
                if (m.x > enemy.position.x && m.x < enemy.position.x + enemy.width &&
                    m.y > enemy.position.y && m.y < enemy.position.y + enemy.height) {
                    const killed = enemy.takeDamage(m.damage, this);
                    if (killed) this.onEnemyKilled(enemy);
                    m.active = false;
                    this.explosions.push(new Explosion(m.x, m.y, 0.5));
                    this.particles.emit(m.x, m.y, 'explosion', 8);
                    break;
                }
            }
            if (this.boss && this.boss.active && !this.boss.entering && m.active) {
                let missileHit = false;
                if (this.boss instanceof MultiBoss) {
                    const hitIdx = this.boss.getHitPart(m.x, m.y);
                    if (hitIdx >= 0) {
                        const res = this.boss.damagepart(hitIdx, m.damage, this);
                        if (res.bossKilled) this.onBossKilled();
                        missileHit = true;
                    }
                } else if (m.x > this.boss.position.x && m.x < this.boss.position.x + this.boss.width &&
                           m.y > this.boss.position.y && m.y < this.boss.position.y + this.boss.height) {
                    const killed = this.boss.takeDamage(m.damage, this);
                    if (killed) this.onBossKilled();
                    missileHit = true;
                }
                if (missileHit) {
                    m.active = false;
                    this.explosions.push(new Explosion(m.x, m.y, 0.5));
                    this.particles.emit(m.x, m.y, 'explosion', 8);
                }
            }
            // Mini-boss missile collision
            if (this.miniBoss && this.miniBoss.active && !this.miniBoss.entering && m.active) {
                const hitIdx = this.miniBoss.getHitPart(m.x, m.y);
                if (hitIdx >= 0) {
                    const res = this.miniBoss.damagepart(hitIdx, m.damage, this);
                    if (res.bossKilled) { /* handled in updateWaves */ }
                    m.active = false;
                    this.explosions.push(new Explosion(m.x, m.y, 0.5));
                    this.particles.emit(m.x, m.y, 'explosion', 8);
                }
            }

            // Off screen
            if (m.x < -50 || m.x > this.canvas.width + 50 || m.y < -50 || m.y > this.canvas.height + 50) {
                m.active = false;
            }
        }

        this.homingMissiles = this.homingMissiles.filter(m => m.active);
    }

    // ===== COLLISIONS =====

    checkCollisions() {
        const perks = this.perkSystem;

        // Player bullets vs enemies
        for (const bullet of this.bullets) {
            if (!bullet.active || bullet.owner !== 'player') continue;

            let pierceLeft = bullet._pierceLeft ?? perks.getPierceCount();

            for (const enemy of this.enemies) {
                if (!enemy.active) continue;
                if (bullet._hitIds && bullet._hitIds.has(enemy)) continue;
                if (bullet.collidesWithCircle(enemy)) {
                    // Crit roll
                    let dmg = bullet.damage * perks.getDamageMultiplier();
                    const isCrit = Math.random() < perks.getCritChance();
                    if (isCrit) dmg = Math.ceil(dmg * perks.getCritMultiplier());

                    const killed = enemy.takeDamage(Math.ceil(dmg), this);
                    if (killed) this.onEnemyKilled(enemy);

                    // Crit visual
                    if (isCrit) {
                        this.particles.emit(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, 'explosion', 6);
                        this.postProcessing.flash({ r: 255, g: 200, b: 50 }, 0.05);
                    }

                    // Explosive rounds AoE
                    if (perks.hasExplosiveRounds()) {
                        this.applyExplosiveAoE(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, 50, Math.ceil(dmg * 0.5));
                    }

                    this.sound.playHit();

                    if (pierceLeft > 0) {
                        pierceLeft--;
                        bullet._pierceLeft = pierceLeft;
                        bullet._hitIds = bullet._hitIds || new Set();
                        bullet._hitIds.add(enemy);
                    } else {
                        bullet.destroy();
                    }
                    if (!bullet.active) break;
                }
            }

            // Player bullets vs boss (per-part damage for MultiBoss)
            if (this.boss && this.boss.active && !this.boss.entering && bullet.active) {
                const bCX = bullet.position.x + bullet.width / 2;
                const bCY = bullet.position.y + bullet.height / 2;
                const hitIdx = (this.boss instanceof MultiBoss) ? this.boss.getHitPart(bCX, bCY) : -1;
                const hitBoss = hitIdx >= 0 || (!(this.boss instanceof MultiBoss) && bullet.collidesWithCircle(this.boss));
                if (hitBoss) {
                    let dmg = bullet.damage * perks.getDamageMultiplier();
                    const isCrit = Math.random() < perks.getCritChance();
                    if (isCrit) dmg = Math.ceil(dmg * perks.getCritMultiplier());

                    let killed = false;
                    if (hitIdx >= 0) {
                        const res = this.boss.damagepart(hitIdx, Math.ceil(dmg), this);
                        killed = res.bossKilled;
                        if (res.partDestroyed) {
                            const part = res.part;
                            const partCX = part.worldX + part.width / 2;
                            const partCY = part.worldY + part.height / 2;
                            this.explosions.push(new Explosion(partCX, partCY, 1));
                            this.particles.emit(partCX, partCY, 'explosion', 12);
                        }
                    } else {
                        killed = this.boss.takeDamage(Math.ceil(dmg), this);
                    }
                    if (killed) this.onBossKilled();

                    const hitPart = hitIdx >= 0 ? this.boss.parts[hitIdx] : null;
                    const px = hitPart && hitPart.active !== false ? hitPart.worldX + hitPart.width / 2 : (this.boss.position.x + this.boss.width / 2);
                    const py = hitPart && hitPart.active !== false ? hitPart.worldY + hitPart.height / 2 : (this.boss.position.y + this.boss.height / 2);
                    if (isCrit) {
                        this.particles.emit(px, py, 'explosion', 6);
                    }
                    if (perks.hasExplosiveRounds()) {
                        this.applyExplosiveAoE(px, py, 50, Math.ceil(dmg * 0.3));
                    }

                    this.sound.playHit();
                    bullet.destroy();
                }
            }

            // Player bullets vs mini-boss (per-part damage)
            if (this.miniBoss && this.miniBoss.active && !this.miniBoss.entering && bullet.active) {
                const bCX = bullet.position.x + bullet.width / 2;
                const bCY = bullet.position.y + bullet.height / 2;
                const hitIdx = this.miniBoss.getHitPart(bCX, bCY);
                if (hitIdx >= 0) {
                    let dmg = bullet.damage * perks.getDamageMultiplier();
                    const isCrit = Math.random() < perks.getCritChance();
                    if (isCrit) dmg = Math.ceil(dmg * perks.getCritMultiplier());

                    const res = this.miniBoss.damagepart(hitIdx, Math.ceil(dmg), this);
                    if (res.partDestroyed) {
                        const part = res.part;
                        const partCX = part.worldX + part.width / 2;
                        const partCY = part.worldY + part.height / 2;
                        this.explosions.push(new Explosion(partCX, partCY, 0.8));
                        this.particles.emit(partCX, partCY, 'explosion', 10);
                    }
                    // bossKilled handled in updateWaves

                    const hitPart = this.miniBoss.parts[hitIdx];
                    const px = hitPart && hitPart.active !== false ? hitPart.worldX + hitPart.width / 2 : (this.miniBoss.position.x + this.miniBoss.width / 2);
                    const py = hitPart && hitPart.active !== false ? hitPart.worldY + hitPart.height / 2 : (this.miniBoss.position.y + this.miniBoss.height / 2);
                    if (isCrit) {
                        this.particles.emit(px, py, 'explosion', 5);
                    }
                    if (perks.hasExplosiveRounds()) {
                        this.applyExplosiveAoE(px, py, 40, Math.ceil(dmg * 0.3));
                    }

                    this.sound.playHit();
                    bullet.destroy();
                }
            }
        }

        // Enemy bullets vs player
        if (this.player && this.player.active) {
            for (const bullet of this.bullets) {
                if (!bullet.active || bullet.owner !== 'enemy') continue;
                if (bullet.collidesWithCircle(this.player)) {
                    // Phase dodge check
                    if (Math.random() < perks.getPhaseChance()) {
                        bullet.destroy();
                        this.particles.emit(this.player.position.x + this.player.width / 2, this.player.position.y + this.player.height / 2, 'shield', 3);
                        continue;
                    }
                    bullet.destroy();
                    const died = this.player.takeDamage(1, this);
                    if (died) {
                        this.onPlayerDeath();
                    } else {
                        this.levelDamageTaken++;
                        // Damage converter perk
                        if (perks.getDamageConverterRate() > 0 && this.player.active) {
                            this.player.ultimateCharge = Math.min(100, this.player.ultimateCharge + 100 * perks.getDamageConverterRate());
                        }
                    }
                }
            }

            // Enemy body collision with player
            for (const enemy of this.enemies) {
                if (!enemy.active) continue;
                if (enemy.collidesWithCircle(this.player)) {
                    // Thorns perk
                    if (perks.hasThorns()) {
                        const thKilled = enemy.takeDamage(3, this);
                        if (thKilled) this.onEnemyKilled(enemy);
                    } else {
                        const killed = enemy.takeDamage(enemy.health, this);
                        if (killed) this.onEnemyKilled(enemy);
                    }
                    // Phase dodge on body collision
                    if (Math.random() < perks.getPhaseChance()) {
                        this.particles.emit(this.player.position.x + this.player.width / 2, this.player.position.y + this.player.height / 2, 'shield', 3);
                    } else {
                        const died = this.player.takeDamage(1, this);
                        if (died) this.onPlayerDeath();
                        else {
                            this.levelDamageTaken++;
                            if (perks.getDamageConverterRate() > 0 && this.player.active) {
                                this.player.ultimateCharge = Math.min(100, this.player.ultimateCharge + 100 * perks.getDamageConverterRate());
                            }
                        }
                    }
                }
            }

            // Boss collision with player (not during entrance)
            if (this.boss && this.boss.active && !this.boss.entering && this.boss.collidesWithCircle(this.player)) {
                if (Math.random() >= perks.getPhaseChance()) {
                    const died = this.player.takeDamage(2, this);
                    if (died) this.onPlayerDeath();
                    else {
                        this.levelDamageTaken += 2;
                        if (perks.getDamageConverterRate() > 0 && this.player.active) {
                            this.player.ultimateCharge = Math.min(100, this.player.ultimateCharge + 200 * perks.getDamageConverterRate());
                        }
                    }
                } else {
                    this.particles.emit(this.player.position.x + this.player.width / 2, this.player.position.y + this.player.height / 2, 'shield', 5);
                }
            }

            // Mini-boss collision with player (not during entrance)
            if (this.miniBoss && this.miniBoss.active && !this.miniBoss.entering && this.miniBoss.collidesWithCircle(this.player)) {
                if (Math.random() >= perks.getPhaseChance()) {
                    const died = this.player.takeDamage(1, this);
                    if (died) this.onPlayerDeath();
                    else {
                        this.levelDamageTaken++;
                        if (perks.getDamageConverterRate() > 0 && this.player.active) {
                            this.player.ultimateCharge = Math.min(100, this.player.ultimateCharge + 100 * perks.getDamageConverterRate());
                        }
                    }
                } else {
                    this.particles.emit(this.player.position.x + this.player.width / 2, this.player.position.y + this.player.height / 2, 'shield', 4);
                }
            }

            // Power-up pickup + magnet field attraction
            const magnetRange = perks.getMagnetRange();
            for (const pu of this.powerUps) {
                if (!pu.active) continue;
                // Magnet attraction
                if (magnetRange > 0) {
                    const dx = (this.player.position.x + this.player.width / 2) - (pu.position.x + pu.width / 2);
                    const dy = (this.player.position.y + this.player.height / 2) - (pu.position.y + pu.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < magnetRange && dist > 5) {
                        const pull = 300 / dist;
                        pu.position.x += (dx / dist) * pull * 0.016;
                        pu.position.y += (dy / dist) * pull * 0.016;
                    }
                }
                if (pu.collidesWithCircle(this.player)) {
                    pu.apply(this.player, this);
                    pu.destroy();
                    this.sound.playPowerUp();
                    this.particles.emit(
                        pu.position.x + pu.width / 2,
                        pu.position.y + pu.height / 2,
                        'powerup', 8
                    );
                }
            }
        }
    }

    onEnemyKilled(enemy) {
        this.levelEnemiesKilled++;
        this.totalEnemiesKilled++;

        const perks = this.perkSystem;

        // Score with combo + perk multipliers
        this.combo++;
        this.comboTimer = 2;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        const comboMultiplier = 1 + Math.min(this.combo * 0.1, 3) + perks.getComboPointsBonus();
        const points = Math.floor(enemy.score * comboMultiplier * perks.getPointMultiplier());
        this.addScore(points);

        // Ultimate charge (with perk multiplier)
        if (this.player) {
            const chargeAmount = 5 * perks.getUltChargeMultiplier();
            this.player.ultimateCharge = Math.min(100, this.player.ultimateCharge + chargeAmount);
        }

        // Vampire rounds healing
        if (perks.hasPerk('vampire_rounds') && this.player && this.player.active) {
            perks.vampireKillCount++;
            if (perks.vampireKillCount >= perks.getVampireKillThreshold()) {
                perks.vampireKillCount = 0;
                if (this.player.health < this.player.maxHealth) {
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
                    this.particles.emit(this.player.position.x + this.player.width / 2, this.player.position.y + this.player.height / 2, 'powerup', 4);
                }
            }
        }

        // Chain lightning
        if (perks.getChainTargets() > 0) {
            this.applyChainLightning(
                enemy.position.x + enemy.width / 2,
                enemy.position.y + enemy.height / 2,
                perks.getChainTargets(),
                Math.ceil(perks.getDamageMultiplier())
            );
        }

        // Explosion
        this.explosions.push(new Explosion(
            enemy.position.x + enemy.width / 2,
            enemy.position.y + enemy.height / 2,
            enemy.width > 52 ? 1.8 : 1.2
        ));
        this.particles.emit(
            enemy.position.x + enemy.width / 2,
            enemy.position.y + enemy.height / 2,
            'explosion', 12
        );
        this.sound.playExplosion();

        // Drop power-up (with lucky drops bonus)
        const dropChance = enemy.dropChance + perks.getDropRateBonus();
        if (Math.random() < dropChance) {
            const types = ['health', 'shield', 'weapon', 'speed', 'rapid', 'points', 'ultimate'];
            const weights = [15, 10, 20, 8, 8, 20, 5];
            const type = this.weightedRandom(types, weights);
            this.powerUps.push(new PowerUp(
                enemy.position.x + enemy.width / 2 - 17,
                enemy.position.y + enemy.height / 2 - 17,
                type
            ));
        }
    }

    onBossKilled() {
        // Extra screen shake + deploy flash for kill
        this.postProcessing.shake(12, 0.6);
        this.postProcessing.flash({ r: 255, g: 200, b: 50 }, 0.5);
        // Big explosion
        const cx = this.boss.position.x + this.boss.width / 2;
        const cy = this.boss.position.y + this.boss.height / 2;
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.explosions.push(new Explosion(
                    cx + (Math.random() - 0.5) * 60,
                    cy + (Math.random() - 0.5) * 60,
                    2
                ));
                this.particles.emit(cx, cy, 'explosion', 20);
                this.sound.playExplosionBig();
                this.postProcessing.shake(8, 0.3);
            }, i * 200);
        }

        const points = this.boss.score;
        this.addScore(points);
        this.levelEnemiesKilled++;
        this.totalEnemiesKilled++;

        // Drop multiple power-ups
        for (let i = 0; i < 3; i++) {
            const types = ['health', 'points', 'ultimate'];
            this.powerUps.push(new PowerUp(
                cx + (i - 1) * 40 - 17,
                cy - 17,
                types[i]
            ));
        }
    }

    // ===== EPIC BOSS WARNING OVERLAY =====

    _renderBossWarningOverlay(ctx, w, h) {
        if (!this.boss) return;
        const phase = this.boss.enterPhase;
        const t = this.boss.enterTime;

        // ── Phase 0: WARNING screen (0-2s) ──
        if (phase === 0) {
            const progress = t / 2.0;

            // Darkened background
            ctx.save();
            ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
            ctx.restore();

            // Red vignette
            ctx.save();
            const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.7);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, `rgba(180, 0, 0, ${0.3 + 0.2 * Math.sin(t * 4)})`);
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();

            // Horizontal scan lines
            ctx.save();
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = '#ff0000';
            for (let y = 0; y < h; y += 4) {
                ctx.fillRect(0, y, w, 1);
            }
            ctx.restore();

            // ⚠ WARNING ⚠ — big flashing text
            const flash = Math.sin(t * 12) > 0 ? 1 : 0.3;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Warning bars (top + bottom)
            const barH = 32;
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(0, h / 2 - 60 - barH / 2, w, barH);
            ctx.fillRect(0, h / 2 + 60 - barH / 2, w, barH);

            // Diagonal hazard stripes on bars
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#000';
            for (let x = -barH; x < w + barH; x += 20) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, h / 2 - 60 - barH / 2);
                ctx.lineTo(x + barH, h / 2 - 60 - barH / 2);
                ctx.lineTo(x + barH - 10, h / 2 - 60 + barH / 2);
                ctx.lineTo(x - 10, h / 2 - 60 + barH / 2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // "WARNING" text
            ctx.globalAlpha = flash;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 20;
            ctx.font = 'bold 36px monospace';
            ctx.fillStyle = '#ff2222';
            ctx.fillText('⚠ WARNING ⚠', w / 2, h / 2 - 60);

            // Boss name (fades in)
            if (progress > 0.4) {
                const nameAlpha = Math.min(1, (progress - 0.4) / 0.3);
                ctx.globalAlpha = nameAlpha;
                ctx.shadowColor = this.boss.def.color;
                ctx.shadowBlur = 15;
                ctx.font = 'bold 22px monospace';
                ctx.fillStyle = this.boss.def.color;
                ctx.fillText(this.boss.name.toUpperCase(), w / 2, h / 2);
            }

            // "APPROACHING" subtitle
            if (progress > 0.6) {
                const subAlpha = Math.min(1, (progress - 0.6) / 0.3);
                ctx.globalAlpha = subAlpha * 0.7;
                ctx.shadowBlur = 0;
                ctx.font = '14px monospace';
                ctx.fillStyle = '#ff8888';
                ctx.fillText('INCOMING THREAT DETECTED', w / 2, h / 2 + 30);
            }

            ctx.restore();
        }

        // ── Phase 1: Descent (2-3.5s) — dimmed edges ──
        if (phase === 1) {
            const fade = 1 - Math.min(1, (t - 2.0) / 1.5);
            ctx.save();
            ctx.globalAlpha = fade * 0.25;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
            ctx.restore();

            // Subtle red vignette fading out
            ctx.save();
            ctx.globalAlpha = fade * 0.15;
            const vig2 = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
            vig2.addColorStop(0, 'rgba(0,0,0,0)');
            vig2.addColorStop(1, 'rgba(200,0,0,1)');
            ctx.fillStyle = vig2;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // ── Phase 2: Deploy (3.5-4.5s) — burst flash at end ──
        if (phase === 2) {
            const deployP = Math.min(1, (t - 3.5) / 1.0);
            // Flash when deploy completes
            if (deployP > 0.8) {
                const flashAlpha = (deployP - 0.8) / 0.2;
                ctx.save();
                ctx.globalAlpha = flashAlpha * 0.2;
                ctx.fillStyle = this.boss.def.color;
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
            }
        }
    }

    // ===== MINI-BOSS NOTIFICATION BANNER =====

    _renderMiniBossNotification(ctx, w, h) {
        const n = this.miniBossNotification;
        if (!n) return;

        const progress = 1 - (n.timer / n.maxTimer);
        // Fade in over first 0.3s, hold, fade out over last 0.3s
        let alpha = 1;
        if (progress < 0.15) alpha = progress / 0.15;
        else if (progress > 0.85) alpha = (1 - progress) / 0.15;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Dark banner stripe across screen
        const bannerH = 36;
        const bannerY = h * 0.22;
        const bannerGrad = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
        bannerGrad.addColorStop(0, 'rgba(0,0,0,0)');
        bannerGrad.addColorStop(0.2, 'rgba(0,0,0,0.7)');
        bannerGrad.addColorStop(0.8, 'rgba(0,0,0,0.7)');
        bannerGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bannerGrad;
        ctx.fillRect(0, bannerY, w, bannerH);

        // Colored edge lines
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, bannerY + 2); ctx.lineTo(w, bannerY + 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, bannerY + bannerH - 2); ctx.lineTo(w, bannerY + bannerH - 2);
        ctx.stroke();

        // Text
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow
        ctx.fillStyle = '#000';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(n.text, w / 2 + 1, bannerY + bannerH / 2 + 1);

        // Main text with color
        ctx.fillStyle = n.color;
        ctx.fillText(n.text, w / 2, bannerY + bannerH / 2);

        ctx.restore();
    }

    onPlayerDeath() {
        const px = this.player.position.x + this.player.width / 2;
        const py = this.player.position.y + this.player.height / 2;

        // Death explosion
        this.explosions.push(new Explosion(px, py, 2, { r: 100, g: 200, b: 255 }));
        this.particles.emit(px, py, 'explosion', 25);
        this.sound.playExplosionBig();
        this.postProcessing.shake(12, 0.6);
        this.postProcessing.flash({ r: 255, g: 60, b: 60 }, 0.5);

        this._hideHudButtons();

        // Send score
        if (window.sendScoreToPlatform) {
            window.sendScoreToPlatform(this.score, {
                level: this.currentLevel,
                enemiesKilled: this.totalEnemiesKilled,
                ship: this.selectedShipId,
                ultimate: this.selectedUltimateId,
                difficulty: this.difficulty.id
            });
        }

        // Begin the death cinematic
        this._beginGameOverCinematic(px, py);
    }

    addScore(points) {
        const adjusted = Math.round(points * this.difficulty.scoreMultiplier);
        this.score += adjusted;
        this.totalPoints += adjusted;
        this.levelPointsEarned += adjusted;
    }

    // ===== CLEANUP =====

    cleanup() {
        this.enemies = this.enemies.filter(e => e.active);
        this.bullets = this.bullets.filter(b => b.active);
        this.explosions = this.explosions.filter(e => e.active);
        this.powerUps = this.powerUps.filter(p => p.active);
    }

    clearAllEntities() {
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.powerUps = [];
        this.homingMissiles = [];
        this.boss = null;
        this.bossActive = false;
        this.miniBoss = null;
        this.miniBossActive = false;
        this.miniBossNotification = null;
        this._deathCine = null;
        this.levelIntro = null;
        this.levelOutro = null;
        this.cinematic = null;
        this.player = null;
    }

    // ===== RENDERING =====

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Star field OUTSIDE zoom transform (always fills full screen)
        if (this.starField) this.starField.render(ctx, this.gameTime);

        // ── Apply camera zoom during level outro (center ship on screen) ──
        const _outroZoomActive = this.state === 'levelOutro' && this.levelOutro;
        if (_outroZoomActive) {
            const oz = this.levelOutro;
            const p = oz.zoomProgress || 0;
            // Smoothly slide the world so the player moves to screen center
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
            // Power-ups
            for (const pu of this.powerUps) pu.render(ctx);

            // Enemies
            for (const enemy of this.enemies) enemy.render(ctx, this.assets);

            // Boss
            if (this.boss && this.boss.active) this.boss.render(ctx, this.assets);

            // Mini-boss
            if (this.miniBoss && this.miniBoss.active) this.miniBoss.render(ctx, this.assets);

            // Boss WARNING overlay (during cinematic entrance)
            if (this.boss && this.boss.entering) {
                this._renderBossWarningOverlay(ctx, w, h);
            }

            // Mini-boss notification banner
            if (this.miniBossNotification) {
                this._renderMiniBossNotification(ctx, w, h);
            }

            // Bullets
            for (const bullet of this.bullets) bullet.render(ctx);

            // Homing missiles
            this.renderHomingMissiles(ctx);

            // Player
            if (this.player && this.player.active) this.player.render(ctx, this.assets, this.perkSystem);

            // Orbital drones
            this.renderDrones(ctx);

            // Explosions
            for (const exp of this.explosions) exp.render(ctx);

            // Particles
            this.particles.render(ctx);

            // HUD
            this.renderHUD(ctx);

            // Touch controls
            this.input.renderTouchControls(ctx);
        }

        // ── End camera zoom transform ──
        if (_outroZoomActive) {
            ctx.restore();
        }

        // Pre-game cinematic overlay
        if (this.state === 'cinematic' && this.cinematic) {
            this._renderCinematic(ctx, w, h);
        }

        // Level intro cinematic overlay
        if (this.state === 'levelIntro' && this.levelIntro) {
            this._renderLevelIntro(ctx, w, h);
        }

        // Level outro cinematic overlay (drawn in screen-space, outside zoom)
        if (this.state === 'levelOutro' && this.levelOutro) {
            this._renderLevelOutro(ctx, w, h);
        }

        // Death cinematic overlay
        if (this.state === 'deathCinematic' && this._deathCine) {
            this._renderGameOverCinematic(ctx, w, h);
        }

        // Post processing
        this.postProcessing.render(ctx);

        // Banners
        this.renderBanners(ctx);
    }

    renderHomingMissiles(ctx) {
        for (const m of this.homingMissiles) {
            if (!m.active) continue;

            // Trail
            ctx.save();
            for (let i = 0; i < m.trail.length - 1; i++) {
                const t = i / m.trail.length;
                ctx.globalAlpha = t * 0.5;
                ctx.strokeStyle = '#ff6644';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(m.trail[i].x, m.trail[i].y);
                ctx.lineTo(m.trail[i + 1].x, m.trail[i + 1].y);
                ctx.stroke();
            }

            // Missile body
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ff4422';
            ctx.shadowColor = '#ff6644';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    renderHUD(ctx) {
        if (!this.player || this.state === 'gameover' || this.state === 'deathCinematic' || this.state === 'levelIntro' || this.state === 'levelOutro') return;

        const w = this.canvas.width;
        ctx.save();

        // Top bar background
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, w, 36);

        // Score
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score.toLocaleString()}`, 10, 24);

        // Level
        ctx.fillStyle = '#88ff88';
        ctx.textAlign = 'center';
        const levelData = getLevelData(this.currentLevel);
        ctx.fillText(`LV.${this.currentLevel} - ${levelData?.name || ''}`, w / 2, 24);

        // HP bar (below HUD buttons row)
        ctx.textAlign = 'right';
        const hpBarW = 80;
        const hpBarH = 10;
        const hpBarX = w - 10 - hpBarW;
        const hpBarY = 50;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
        const hpRatio = this.player.health / this.player.maxHealth;
        ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
        ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 1;
        ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
        ctx.fillStyle = '#fff';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.player.health}/${this.player.maxHealth}`, hpBarX + hpBarW / 2, hpBarY + 9);

        // Weapon level indicator (stars)
        const wpnY = hpBarY + hpBarH + 12;
        ctx.font = '8px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#668899';
        
        for (let i = 0; i < this.player.maxWeaponLevel; i++) {
            const starX = hpBarX + i * 14;
            const filled = i < this.player.weaponLevel;
            ctx.fillStyle = filled ? '#ffaa00' : '#333344';
            ctx.shadowColor = filled ? '#ff8800' : 'transparent';
            ctx.shadowBlur = filled ? 5 : 0;
            ctx.font = '11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('★', starX, wpnY + 2);
        }
        ctx.shadowBlur = 0;

        // Combo
        if (this.combo > 1) {
            ctx.textAlign = 'center';
            ctx.font = `bold ${16 + Math.min(this.combo, 10)}px Arial`;
            ctx.fillStyle = `rgba(255,${Math.max(100, 255 - this.combo * 15)},50,${0.7 + this.comboTimer * 0.15})`;
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 8;
            ctx.fillText(`${this.combo}x COMBO!`, w / 2, 60);
            ctx.shadowBlur = 0;
        }

        // Ultimate charge bar (bottom center)
        if (this.player.ultimateData) {
            const ultBarW = 120;
            const ultBarH = 8;
            const ultBarX = w / 2 - ultBarW / 2;
            const ultBarY = this.canvas.height - 30;
            const charge = this.player.ultimateCharge / 100;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(ultBarX, ultBarY, ultBarW, ultBarH);

            const ultColor = charge >= 1 ? '#ffd700' : '#8866cc';
            ctx.fillStyle = ultColor;
            ctx.fillRect(ultBarX, ultBarY, ultBarW * charge, ultBarH);
            ctx.strokeStyle = '#ffffff33';
            ctx.lineWidth = 1;
            ctx.strokeRect(ultBarX, ultBarY, ultBarW, ultBarH);

            ctx.font = '9px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(
                charge >= 1 ? `${this.player.ultimateData.icon} READY! [Q]` : `${this.player.ultimateData.icon} ${Math.floor(this.player.ultimateCharge)}%`,
                w / 2, ultBarY - 3
            );
        }

        // ── Active perks display (left side) ──
        const activePerks = this.perkSystem.getActivePerks();
        if (activePerks.length > 0) {
            const perkSize = 20;
            const perkGap = 4;
            const perkX = 8;
            let perkY = 42;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            for (const perk of activePerks) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(perkX, perkY, perkSize, perkSize);
                ctx.strokeStyle = perk.rarityData.color;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(perkX, perkY, perkSize, perkSize);
                ctx.fillStyle = perk.rarityData.color;
                ctx.fillText(perk.icon, perkX + perkSize / 2, perkY + 15);
                if (perk.stacks > 1) {
                    ctx.font = 'bold 8px Arial';
                    ctx.fillStyle = '#fff';
                    ctx.fillText(`×${perk.stacks}`, perkX + perkSize - 2, perkY + 8);
                    ctx.font = 'bold 11px Arial';
                }
                perkY += perkSize + perkGap;
            }
        }

        ctx.restore();
    }

    // ===== UI SCREENS =====

    showLevelCompleteScreen() {
        const screen = document.getElementById('level-complete-screen');
        if (!screen) return;

        // Switch to intro music for the popup screens
        this.sound.playIntroMusic();

        document.getElementById('lc-level-name').textContent = `LEVEL ${this.summaryData.level} - ${this.summaryData.levelName}`;
        document.getElementById('lc-enemies-killed').textContent = this.summaryData.enemiesKilled;
        document.getElementById('lc-damage-taken').textContent = this.summaryData.damageTaken;
        document.getElementById('lc-max-combo').textContent = `${this.summaryData.maxCombo}x`;
        document.getElementById('lc-points-earned').textContent = this.summaryData.pointsEarned.toLocaleString();
        document.getElementById('lc-bonus').textContent = `+${this.summaryData.bonusPoints.toLocaleString()}`;
        document.getElementById('lc-time').textContent = `${this.summaryData.time.toFixed(1)}s`;
        document.getElementById('lc-total-score').textContent = this.summaryData.totalScore.toLocaleString();
        document.getElementById('lc-hp-status').textContent = `${this.summaryData.playerHP}/${this.summaryData.playerMaxHP}`;

        // Stars rating
        let stars = 1;
        if (this.summaryData.damageTaken === 0) stars = 3;
        else if (this.summaryData.damageTaken <= 2) stars = 2;

        const starsEl = document.getElementById('lc-stars');
        starsEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.className = i < stars ? 'star filled' : 'star empty';
            star.textContent = '⭐';
            starsEl.appendChild(star);
        }

        screen.classList.remove('hidden');
        if (window.audioViz) window.audioViz.start(screen);
    }

    hideLevelCompleteScreen() {
        const screen = document.getElementById('level-complete-screen');
        if (screen) {
            screen.classList.add('hidden');
            if (window.audioViz && window.audioViz.canvas.parentNode === screen) window.audioViz.stop();
        }
    }

    showShopScreen() {
        // Replaced by perk selection – no-op for backwards compat
    }

    hideShopScreen() {
        const screen = document.getElementById('shop-screen');
        if (screen) screen.classList.add('hidden');
    }

    // ===== PERK SELECTION SCREEN =====

    showPerkScreen() {
        const screen = document.getElementById('perk-select-screen');
        if (!screen) return;

        this.state = 'perkSelect';
        const perks = this.perkSystem.getRandomSelection(3);
        const container = document.getElementById('perk-cards-container');
        if (!container) return;
        container.innerHTML = '';

        for (const perk of perks) {
            const card = document.createElement('div');
            card.className = `perk-card rarity-${perk.rarity}`;
            card.dataset.perkId = perk.id;

            const stackInfo = perk.currentStacks > 0
                ? `<div class="perk-stack">Level ${perk.currentStacks} → ${perk.currentStacks + 1}</div>`
                : '';
            const tradeoffHtml = perk.tradeoff
                ? `<div class="perk-tradeoff">⚠ ${perk.tradeoff}</div>`
                : '';
            const stackDescHtml = perk.stackDesc && perk.currentStacks > 0
                ? `<div class="perk-stack-desc">${perk.stackDesc}</div>`
                : '';

            card.innerHTML = `
                <div class="perk-rarity-label" style="color:${perk.rarityData.color}">${perk.rarityData.label}</div>
                <div class="perk-icon-wrap" style="border-color:${perk.rarityData.border}">
                    <span class="perk-icon">${perk.icon}</span>
                </div>
                <div class="perk-name">${perk.name}</div>
                <div class="perk-category" style="color:${perk.categoryData.color}">${perk.categoryData.icon} ${perk.categoryData.label}</div>
                <div class="perk-desc">${perk.description}</div>
                ${stackDescHtml}
                ${tradeoffHtml}
                ${stackInfo}
            `;

            card.addEventListener('click', () => this.handlePerkChoice(perk.id));
            container.appendChild(card);
        }

        screen.classList.remove('hidden');
        if (window.audioViz) window.audioViz.start(screen);
    }

    hidePerkScreen() {
        const screen = document.getElementById('perk-select-screen');
        if (screen) {
            screen.classList.add('hidden');
            if (window.audioViz && window.audioViz.canvas.parentNode === screen) window.audioViz.stop();
        }
    }

    handlePerkChoice(perkId) {
        const statChanges = this.perkSystem.activatePerk(perkId);

        // Apply stat changes to player
        if (statChanges && this.player) {
            this.player.applyBonusStats(statChanges);
        }

        // Apply perk speed/resist modifiers
        this.applyPerkModifiersToPlayer();

        this.sound.playPowerUp();
        this.postProcessing.flash({ r: 100, g: 255, b: 200 }, 0.15);

        this.hidePerkScreen();
        this.startNextLevel();
    }

    // ===== PERK HELPER METHODS =====

    /** Apply speed & resist modifiers from perks after recalculateStats */
    applyPerkModifiersToPlayer() {
        if (!this.player) return;
        this.player.speed = this.player.baseSpeed * this.perkSystem.getSpeedMultiplier();
        this.player.resistance = Math.max(0, Math.min(0.6,
            this.player.resistance + this.perkSystem.getResistanceModifier()
        ));
    }

    /** Per-frame perk effects: auto-shield, drone, magnet is handled in collision */
    updatePerkEffects(deltaTime) {
        if (!this.player || !this.player.active) return;
        const perks = this.perkSystem;

        // Auto-shield timer
        if (perks.hasPerk('auto_shield')) {
            perks.autoShieldTimer -= deltaTime;
            if (perks.autoShieldTimer <= 0) {
                perks.autoShieldTimer = perks.getAutoShieldCooldown();
                if (!this.player.shieldActive) {
                    this.player.shieldActive = true;
                    this.player.shieldTime = 6;
                    this.particles.emit(
                        this.player.position.x + this.player.width / 2,
                        this.player.position.y + this.player.height / 2,
                        'shield', 12
                    );
                    this.sound.playPowerUp();
                    this.postProcessing.flash({ r: 60, g: 160, b: 255 }, 0.12);
                    this.xpBanners.push({
                        text: '🛡 AUTO SHIELD',
                        subtext: null,
                        life: 2,
                        maxLife: 2,
                        y: this.canvas.height * 0.18,
                        color: '#44aaff'
                    });
                }
            }
        }

        // Thorns rotation (same pattern as drones: only advances during playing)
        if (perks.hasThorns()) {
            perks.thornsAngle += deltaTime * 0.8;  // matches rotSpeed=0.0008 * ~1000
            perks.thornsTime += deltaTime;
        }

        // Orbital drones
        const droneCount = perks.getDroneCount();
        if (droneCount > 0) {
            perks.droneAngle += deltaTime * 2.5;
            const pcx = this.player.position.x + this.player.width / 2;
            const pcy = this.player.position.y + this.player.height / 2;
            const orbitR = 60;

            for (let i = 0; i < droneCount; i++) {
                const angle = perks.droneAngle + (i * Math.PI * 2 / droneCount);
                const dx = pcx + Math.cos(angle) * orbitR;
                const dy = pcy + Math.sin(angle) * orbitR;

                // Drone auto-fire
                if (!perks.droneFireTimers[i]) perks.droneFireTimers[i] = 0;
                perks.droneFireTimers[i] -= deltaTime;
                if (perks.droneFireTimers[i] <= 0) {
                    perks.droneFireTimers[i] = 1.2;
                    // Find nearest enemy
                    let nearest = null;
                    let nearDist = 200;
                    for (const e of this.enemies) {
                        if (!e.active) continue;
                        const ex = e.position.x + e.width / 2;
                        const ey = e.position.y + e.height / 2;
                        const d = Math.sqrt((ex - dx) ** 2 + (ey - dy) ** 2);
                        if (d < nearDist) { nearDist = d; nearest = e; }
                    }
                    if (this.miniBoss && this.miniBoss.active) {
                        const mx = this.miniBoss.position.x + this.miniBoss.width / 2;
                        const my = this.miniBoss.position.y + this.miniBoss.height / 2;
                        const d = Math.sqrt((mx - dx) ** 2 + (my - dy) ** 2);
                        if (d < nearDist) { nearDist = d; nearest = this.miniBoss; }
                    }
                    if (this.boss && this.boss.active) {
                        const bx = this.boss.position.x + this.boss.width / 2;
                        const by = this.boss.position.y + this.boss.height / 2;
                        const d = Math.sqrt((bx - dx) ** 2 + (by - dy) ** 2);
                        if (d < nearDist) { nearDist = d; nearest = this.boss; }
                    }
                    if (nearest) {
                        const tx = nearest.position.x + nearest.width / 2;
                        const ty = nearest.position.y + nearest.height / 2;
                        const a = Math.atan2(ty - dy, tx - dx);
                        const speed = 400;
                        this.spawnBullet(dx, dy, Math.cos(a) * speed, Math.sin(a) * speed, 'player', 1);
                    }
                }
            }
        }

        // Emergency protocol check
        if (perks.hasEmergencyProtocol() && this.player.health <= 1 && !this.player.invincible) {
            perks.emergencyUsedThisLevel = true;
            this.player.invincible = true;
            this.player.invincibleTime = 3;
            this.player.blinkTimer = 0;
            this._emergencySlowTimer = 3;
            this.timeScale = 0.4;
            this.postProcessing.flash({ r: 255, g: 50, b: 50 }, 0.3);
            this.postProcessing.shake(10, 0.5);
            this.particles.emit(
                this.player.position.x + this.player.width / 2,
                this.player.position.y + this.player.height / 2,
                'explosion', 20
            );
        }
        // Emergency slow-mo timer (frame-based to avoid conflicts)
        if (this._emergencySlowTimer > 0) {
            this._emergencySlowTimer -= deltaTime;
            if (this._emergencySlowTimer <= 0) {
                this._emergencySlowTimer = 0;
                if (this.timeScale < 1 && !(this.player.ultimateActive && this.player.ultimateId === 'time_warp')) {
                    this.timeScale = 1;
                }
            }
        }
    }

    /** Chain lightning effect: jumps to nearby enemies */
    applyChainLightning(fromX, fromY, targets, damage) {
        let cx = fromX, cy = fromY;
        const hit = new Set();
        for (let t = 0; t < targets; t++) {
            let nearest = null;
            let nearDist = 120;
            for (const e of this.enemies) {
                if (!e.active || hit.has(e)) continue;
                const ex = e.position.x + e.width / 2;
                const ey = e.position.y + e.height / 2;
                const d = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
                if (d < nearDist) { nearDist = d; nearest = e; }
            }
            if (!nearest) break;
            hit.add(nearest);
            const ex = nearest.position.x + nearest.width / 2;
            const ey = nearest.position.y + nearest.height / 2;

            // Lightning visual: bright line
            this.particles.emitCustom(ex, ey, {
                count: 3, speed: 40, life: 0.3, size: 3,
                color: { r: 100, g: 180, b: 255 },
                gravity: 0, fadeOut: true, shrink: true
            }, 3);

            const killed = nearest.takeDamage(damage, this);
            if (killed) this.onEnemyKilled(nearest);
            cx = ex; cy = ey;
        }
    }

    /** Explosive rounds AoE */
    applyExplosiveAoE(cx, cy, radius, damage) {
        for (const e of this.enemies) {
            if (!e.active) continue;
            const ex = e.position.x + e.width / 2;
            const ey = e.position.y + e.height / 2;
            const d = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
            if (d <= radius) {
                const killed = e.takeDamage(damage, this);
                if (killed) this.onEnemyKilled(e);
            }
        }
        // Boss AoE
        if (this.boss && this.boss.active) {
            const bx = this.boss.position.x + this.boss.width / 2;
            const by = this.boss.position.y + this.boss.height / 2;
            const d = Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2);
            if (d <= radius) {
                const killed = this.boss.takeDamage(damage, this);
                if (killed) this.onBossKilled();
            }
        }
        // Mini-boss AoE
        if (this.miniBoss && this.miniBoss.active) {
            const bx = this.miniBoss.position.x + this.miniBoss.width / 2;
            const by = this.miniBoss.position.y + this.miniBoss.height / 2;
            const d = Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2);
            if (d <= radius) {
                this.miniBoss.takeDamage(damage, this);
            }
        }
        // Visual
        this.explosions.push(new Explosion(cx, cy, 0.8));
        this.particles.emit(cx, cy, 'explosion', 6);
    }

    /** Render orbital drones */
    renderDrones(ctx) {
        const droneCount = this.perkSystem.getDroneCount();
        if (droneCount <= 0 || !this.player || !this.player.active) return;
        const pcx = this.player.position.x + this.player.width / 2;
        const pcy = this.player.position.y + this.player.height / 2;
        const orbitR = 60;

        ctx.save();
        for (let i = 0; i < droneCount; i++) {
            const angle = this.perkSystem.droneAngle + (i * Math.PI * 2 / droneCount);
            const dx = pcx + Math.cos(angle) * orbitR;
            const dy = pcy + Math.sin(angle) * orbitR;

            // Drone body
            ctx.fillStyle = '#88bbff';
            ctx.shadowColor = '#4488ff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(dx, dy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Drone line to ship
            ctx.strokeStyle = 'rgba(100,150,255,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pcx, pcy);
            ctx.lineTo(dx, dy);
            ctx.stroke();

            // Inner dot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(dx, dy, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    showGameOverScreen() {
        const screen = document.getElementById('game-over-screen');
        if (!screen) return;

        // Switch to intro music
        this.sound.playIntroMusic();

        document.getElementById('go-final-score').textContent = this.score.toLocaleString();
        document.getElementById('go-level-reached').textContent = this.currentLevel;
        document.getElementById('go-enemies-killed').textContent = this.totalEnemiesKilled;

        screen.classList.remove('hidden');
        if (window.audioViz) window.audioViz.start(screen);
    }

    showVictoryScreen() {
        const screen = document.getElementById('victory-screen');
        if (!screen) return;

        // Switch to intro music
        this.sound.playIntroMusic();

        document.getElementById('vic-score').textContent = this.score.toLocaleString();
        document.getElementById('vic-enemies').textContent = this.totalEnemiesKilled;

        // Send final score
        if (window.sendScoreToPlatform) {
            window.sendScoreToPlatform(this.score, {
                level: this.currentLevel,
                enemiesKilled: this.totalEnemiesKilled,
                ship: this.selectedShipId,
                ultimate: this.selectedUltimateId,
                victory: true,
                difficulty: this.difficulty.id
            });
        }

        screen.classList.remove('hidden');
        if (window.audioViz) window.audioViz.start(screen);
    }

    // ===== GAME FLOW =====

    startGame(shipId, ultimateId, difficultyId) {
        this.selectedShipId = shipId;
        this.selectedUltimateId = ultimateId;
        this.difficulty = DIFFICULTY_CONFIG[difficultyId] || DIFFICULTY_CONFIG.boring;

        // Reset everything
        this.score = 0;
        this.totalPoints = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.totalEnemiesKilled = 0;
        this.currentLevel = 1;
        this.currentWaveIndex = 0;
        this.waveCleared = true;
        this.waveDelay = 2;
        this.bossActive = false;
        this.boss = null;
        this.miniBossActive = false;
        this.miniBoss = null;
        this.miniBossNotification = null;
        this.timeScale = 1;

        // Clear cinematics
        this._deathCine = null;
        this.levelIntro = null;
        this.levelOutro = null;
        this.cinematic = null;

        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.powerUps = [];
        this.homingMissiles = [];

        this.perkSystem.reset();
        this._emergencySlowTimer = 0;

        // Create player
        this.player = new Player(
            this.canvas.width / 2 - 32,
            this.canvas.height - 100,
            shipId,
            ultimateId
        );

        this.levelEnemiesKilled = 0;
        this.levelDamageTaken = 0;
        this.levelPointsEarned = 0;
        this.levelStartTime = performance.now();

        // Start session
        if (window.startGameSession) {
            window.startGameSession();
        }

        this.sound.resume();
        if (this.sound.musicBuffers.length > 0) {
            this.sound.playGameMusic();
        }

        // Set background theme for level 1
        if (this.starField) this.starField.setLevel(1);

        this._beginLevelIntro();
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            const popup = document.getElementById('settings-popup');
            popup?.classList.remove('hidden');
            this.sound.pauseMusic();
            this._hideHudButtons();
            // Notify UI to sync toggle states
            window.dispatchEvent(new Event('game-paused'));
        } else if (this.state === 'paused') {
            this.state = 'playing';
            document.getElementById('settings-popup')?.classList.add('hidden');
            document.getElementById('ship-detail-popup')?.classList.add('hidden');
            if (window.audioViz) window.audioViz.stop();
            this.sound.resumeMusic();
            this._showHudButtons();
        }
    }

    showShipDetail() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        this.sound.pauseMusic();
        this._hideHudButtons();
        this._populateShipDetail();
        document.getElementById('ship-detail-popup')?.classList.remove('hidden');
    }

    closeShipDetail() {
        this.state = 'playing';
        document.getElementById('ship-detail-popup')?.classList.add('hidden');
        this.sound.resumeMusic();
        this._showHudButtons();
    }

    _showHudButtons() {
        document.getElementById('hud-settings-btn')?.classList.remove('hidden');
        document.getElementById('hud-ship-btn')?.classList.remove('hidden');
    }

    _hideHudButtons() {
        document.getElementById('hud-settings-btn')?.classList.add('hidden');
        document.getElementById('hud-ship-btn')?.classList.add('hidden');
    }

    /** Draw ship sprites into the selection-screen preview canvases */
    _populateShipPreviews() {
        const shipIds = ['vanguard', 'interceptor', 'fortress', 'striker', 'titan'];
        for (const id of shipIds) {
            const container = document.getElementById(`preview-${id}`);
            if (!container) continue;
            const cv = container.querySelector('canvas');
            if (!cv) continue;
            const ctx = cv.getContext('2d');
            ctx.clearRect(0, 0, cv.width, cv.height);
            const sprite = this.assets.getSprite(`ship_${id}`);
            if (sprite) {
                ctx.drawImage(sprite, 0, 0, cv.width, cv.height);
            }
        }
    }

    _populateShipDetail() {
        if (!this.player) return;
        const ship = this.player.shipData;
        const base = ship.stats;
        const bonus = this.player.bonusStats;

        // Ship name & desc
        document.getElementById('detail-ship-name').textContent = ship.name;
        document.getElementById('detail-ship-desc').textContent = ship.description;

        // Ship preview canvas
        const previewCanvas = document.getElementById('ship-detail-preview');
        if (previewCanvas) {
            const pCtx = previewCanvas.getContext('2d');
            pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            const sprite = this.assets.getSprite?.(`ship_${this.player.shipId}`);
            if (sprite) {
                const size = 72;
                const x = (previewCanvas.width - size) / 2;
                const y = (previewCanvas.height - size) / 2;
                pCtx.drawImage(sprite, x, y, size, size);
            } else {
                // Fallback: draw colored circle
                pCtx.fillStyle = ship.color;
                pCtx.beginPath();
                pCtx.arc(previewCanvas.width / 2, previewCanvas.height / 2, 30, 0, Math.PI * 2);
                pCtx.fill();
            }
        }

        // Stat bars helper
        const buildStatBars = (containerId, stats, bonusMap) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            const labels = { hp: 'HP', speed: 'SPD', resist: 'RES', fireRate: 'ROF' };
            const classes = { hp: 'hp', speed: 'spd', resist: 'res', fireRate: 'rof' };
            for (const [key, label] of Object.entries(labels)) {
                const baseVal = stats[key] || 0;
                const bonusVal = bonusMap?.[key] || 0;
                const total = Math.min(baseVal + bonusVal, 10);
                const row = document.createElement('div');
                row.className = 'detail-stat-row';
                row.innerHTML = `
                    <span class="detail-stat-label">${label}</span>
                    <div class="detail-stat-bar-bg">
                        <div class="detail-stat-bar-fill ${classes[key]}" style="width:${total * 10}%"></div>
                    </div>
                    <span class="detail-stat-value">${total}${bonusVal > 0 ? ` <span class="detail-stat-bonus">+${bonusVal}</span>` : ''}</span>
                `;
                container.appendChild(row);
            }
        };

        buildStatBars('detail-base-stats', base, null);
        buildStatBars('detail-effective-stats', base, bonus);

        // Weapon
        const weaponEl = document.getElementById('detail-weapon-info');
        if (weaponEl) {
            const wl = this.player.weaponLevel || 1;
            const weaponNames = ['Single Shot', 'Dual Cannon', 'Triple Spread', 'Quad Barrage', 'Nova Storm'];
            weaponEl.innerHTML = `
                <span class="detail-weapon-icon">🔫</span>
                <div class="detail-weapon-text">
                    <div class="detail-weapon-name">${weaponNames[wl - 1] || 'Unknown'}</div>
                    <div class="detail-weapon-desc">Level ${wl} / 5${this.perkSystem.hasDoubleBarrel() ? ' • Double Barrel active' : ''}</div>
                </div>
            `;
        }

        // Ultimate
        const ultEl = document.getElementById('detail-ultimate-info');
        if (ultEl && this.player.ultimateData) {
            const ud = this.player.ultimateData;
            const charge = Math.floor(this.player.ultimateCharge);
            ultEl.innerHTML = `
                <span class="detail-ult-icon">${ud.icon}</span>
                <div class="detail-ult-text">
                    <div class="detail-ult-name">${ud.name}</div>
                    <div class="detail-ult-desc">${ud.description} • Charge: ${charge}%</div>
                </div>
            `;
        }

        // Active perks
        const perksSection = document.getElementById('detail-perks-section');
        const perksList = document.getElementById('detail-perks-list');
        const activePerks = this.perkSystem.getActivePerks();
        if (activePerks.length > 0 && perksSection && perksList) {
            perksSection.style.display = '';
            perksList.innerHTML = '';
            for (const perk of activePerks) {
                const row = document.createElement('div');
                row.className = 'detail-perk-row';
                row.innerHTML = `
                    <div class="detail-perk-icon-wrap" style="border-color:${perk.rarityData.color}; background:${perk.rarityData.color}15">
                        ${perk.icon}
                    </div>
                    <div class="detail-perk-info">
                        <div class="detail-perk-name" style="color:${perk.rarityData.color}">${perk.name}</div>
                        <div class="detail-perk-desc">${perk.description}</div>
                    </div>
                    ${perk.stacks > 1 ? `<span class="detail-perk-stacks">×${perk.stacks}</span>` : ''}
                `;
                perksList.appendChild(row);
            }
        } else if (perksSection) {
            perksSection.style.display = 'none';
        }
    }

    // ===== UTILITY =====

    weightedRandom(items, weights) {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) return items[i];
        }
        return items[items.length - 1];
    }

    // ===== XP BANNERS =====

    showXPBanner(xpAmount, extraData = null) {
        this.xpBanners.push({
            text: `+${xpAmount} XP`,
            subtext: extraData?.levelUp ? `Level Up! → ${extraData.newLevel}` : null,
            life: 3,
            maxLife: 3,
            y: this.canvas.height * 0.15
        });
    }

    showStatsBanner(stats) {
        // Platform stats banner
    }

    showLevelUpNotification(levelUpData) {
        this.xpBanners.push({
            text: `🎉 Level ${levelUpData.newLevel}!`,
            subtext: levelUpData.message || 'Level Up!',
            life: 4,
            maxLife: 4,
            y: this.canvas.height * 0.2
        });
    }

    updateBanners(dt) {
        for (const banner of this.xpBanners) {
            banner.life -= dt;
            banner.y -= 15 * dt;
        }
        this.xpBanners = this.xpBanners.filter(b => b.life > 0);
    }

    renderBanners(ctx) {
        for (const banner of this.xpBanners) {
            const alpha = Math.min(1, banner.life / (banner.maxLife * 0.3));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = banner.color || '#ffd700';
            ctx.shadowColor = banner.color ? banner.color : '#ff8800';
            ctx.shadowBlur = 10;
            ctx.fillText(banner.text, this.canvas.width / 2, banner.y);
            if (banner.subtext) {
                ctx.font = '14px Arial';
                ctx.fillStyle = '#88ff88';
                ctx.fillText(banner.subtext, this.canvas.width / 2, banner.y + 22);
            }
            ctx.restore();
        }
    }
}

export { DIFFICULTY_CONFIG };
export default Game;

import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';
import { EventEmitter } from './utils.js';
import { Spawner } from './spawner.js';
import { ParticleSystem } from './particles.js';
import { SpatialHash } from './utils.js';
import { Player } from './player.js';
import { CONFIG, WORLDS, WORLD_WEAPONS, WORLD_ORDER, PORTAL_CONFIG, BOSS_DROP_WEAPONS } from './config.js';
import { Vector2 } from './utils.js';
import { MathUtils } from './utils.js';
import { XPOrb , HealthPack , MagnetPickup , BombPickup, DimensionalPortal, BossChest  } from './pickups.js';
import { Drone, Projectile } from './weapons.js';
import { Enemy } from './enemies.js';
import { CharacterManager } from './characters.js';
import { spriteManager } from './sprite-system.js';
/**
 * Survivor Arena - Main Game Class
 * @fileoverview Core game controller handling game loop, state, and platform integration
 */



// Game states
const GAME_STATE = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    LEVEL_UP: 'levelUp',
    GAME_OVER: 'gameOver'
};

class Game {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Managers
        this.ui = new UIManager();
        this.audio = new AudioManager();
        this.events = new EventEmitter();
        this.spawner = null;
        this.particles = new ParticleSystem();

        // Spatial hash for collision optimization
        this.spatialHash = new SpatialHash(128);

        // Character system
        this.characterManager = new CharacterManager();

        // Game objects
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.pickups = [];
        this.drones = [];
        this.bosses = []; // Multiple bosses support
        this.miniBoss = null;

        // Game state
        this.state = GAME_STATE.LOADING;
        this.gameTime = 0;
        this.score = 0;
        this.kills = 0;
        this.lastFrameTime = 0;
        this.animationFrameId = null;

        // Camera (with zoom for field of view control)
        this.camera = { x: 0, y: 0, zoom: 0.75 }; // 0.75 = zoomed out, see more of the arena

        // Background scroll position (continuous, never wraps - for smooth scrolling)
        this.bgScrollX = 0;
        this.bgScrollY = 0;
        this.lastPlayerX = 0;
        this.lastPlayerY = 0;

        // Input
        this.input = {
            movement: new Vector2(0, 0),
            joystickActive: false
        };

        // Platform SDK
        this.platformReady = false;
        this.gameStartSent = false;

        // World system
        this.currentWorld = null; // null = home world
        this.portal = null; // Active DimensionalPortal
        this.worldsVisited = []; // Track visited worlds
        this.portalChoiceActive = false; // Whether portal choice modal is open

        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    /**
     * Initialize game
     */
    async init() {
        console.log('[Game] Initializing Survivor Arena...');

        // Initialize character manager (async)
        await this.characterManager.init();

        // Setup canvas
        this.handleResize();
        window.addEventListener('resize', this.handleResize);

        // Setup fullscreen change listeners
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());

        // Setup input
        this.setupInput();

        // Setup event listeners
        this.setupEvents();

        // Setup UI callbacks
        this.setupUICallbacks();

        // Simulate loading
        await this.simulateLoading();

        // Show menu
        this.showMenu();

        console.log('[Game] Initialization complete');
    }

    /**
     * Simulate loading progress
     */
    async simulateLoading() {
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            this.ui.setLoadingProgress((i / steps) * 100);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Show main menu
     */
    showMenu() {
        this.state = GAME_STATE.MENU;
        this.ui.showScreen('start');
        this.updateCharacterDisplay();
        this.startIntroAnimation();
    }

    /**
     * Animated intro canvas background for start screen
     */
    startIntroAnimation() {
        const canvas = document.getElementById('introCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId = null;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Particles
        const particles = [];
        const floatingIcons = [];

        // Create particles
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -0.3 - Math.random() * 0.8,
                size: 1 + Math.random() * 3,
                alpha: 0.2 + Math.random() * 0.5,
                color: ['#ffd700', '#ff6b00', '#ff4444', '#ff8800', '#ffaa00'][Math.floor(Math.random() * 5)],
                pulse: Math.random() * Math.PI * 2
            });
        }

        // Create floating orbs (geometric shapes instead of icons)
        for (let i = 0; i < 8; i++) {
            floatingIcons.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 4 + Math.random() * 8,
                alpha: 0.1 + Math.random() * 0.15,
                speed: 0.15 + Math.random() * 0.3,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.005 + Math.random() * 0.01,
                color: ['#ffd700', '#ff6b00', '#ff4444', '#9c27b0', '#00bcd4'][Math.floor(Math.random() * 5)]
            });
        }

        // World-themed effects
        const worldFx = [];
        let fxTimer = 0;
        const worldTypes = ['lightning', 'fire', 'void', 'shadow'];

        const spawnWorldEffect = (w, h) => {
            const type = worldTypes[Math.floor(Math.random() * worldTypes.length)];
            const base = { type, life: 1.0, x: Math.random() * w, y: Math.random() * h };

            if (type === 'lightning') {
                // Neon lightning bolt
                const segments = [];
                let lx = base.x, ly = base.y;
                const endY = ly + 60 + Math.random() * 100;
                while (ly < endY) {
                    const nx = lx + (Math.random() - 0.5) * 40;
                    const ny = ly + 10 + Math.random() * 15;
                    segments.push({ x1: lx, y1: ly, x2: nx, y2: ny });
                    lx = nx; ly = ny;
                }
                base.segments = segments;
                // Branch
                if (segments.length > 2) {
                    const branchIdx = Math.floor(Math.random() * (segments.length - 1)) + 1;
                    const bs = segments[branchIdx];
                    const bx2 = bs.x1 + (Math.random() - 0.5) * 50;
                    const by2 = bs.y1 + 20 + Math.random() * 30;
                    base.branch = [{ x1: bs.x1, y1: bs.y1, x2: bx2, y2: by2 }];
                }
            } else if (type === 'fire') {
                // Inferno fireball trail
                base.vy = -1.5 - Math.random();
                base.vx = (Math.random() - 0.5) * 0.8;
                base.size = 6 + Math.random() * 8;
                base.y = h + 20;
            } else if (type === 'void') {
                // Void swirl — varied sizes
                base.size = 15 + Math.random() * 50;
                base.rotSpeed = 0.015 + Math.random() * 0.04;
                base.rotation = 0;
            } else if (type === 'shadow') {
                // Shadow eye blink
                base.size = 12 + Math.random() * 14;
                base.blinkPhase = 0;
            }
            worldFx.push(base);
        };

        const render = () => {
            const w = canvas.width, h = canvas.height;
            const t = Date.now();

            // Dark background with vignette
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, w, h);

            // Radial vignette
            const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.9);
            vignette.addColorStop(0, 'rgba(20, 10, 40, 0)');
            vignette.addColorStop(0.5, 'rgba(10, 5, 25, 0.3)');
            vignette.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, w, h);

            // Slow moving fog/nebula layers
            for (let i = 0; i < 3; i++) {
                const fogX = w / 2 + Math.sin(t / 4000 + i * 2) * w * 0.3;
                const fogY = h / 2 + Math.cos(t / 5000 + i * 3) * h * 0.2;
                const fogR = h * (0.3 + i * 0.15);
                const fog = ctx.createRadialGradient(fogX, fogY, 0, fogX, fogY, fogR);
                const colors = [
                    ['rgba(80, 20, 100, 0.06)', 'rgba(40, 0, 60, 0)'],
                    ['rgba(100, 40, 0, 0.05)', 'rgba(60, 10, 0, 0)'],
                    ['rgba(0, 40, 80, 0.04)', 'rgba(0, 10, 40, 0)']
                ];
                fog.addColorStop(0, colors[i][0]);
                fog.addColorStop(1, colors[i][1]);
                ctx.fillStyle = fog;
                ctx.fillRect(0, 0, w, h);
            }

            // Spawn world-themed effects more frequently
            fxTimer++;
            if (fxTimer > 30 + Math.random() * 40) {
                fxTimer = 0;
                spawnWorldEffect(w, h);
            }

            // Render world effects
            for (let i = worldFx.length - 1; i >= 0; i--) {
                const fx = worldFx[i];
                fx.life -= fx.type === 'fire' ? 0.008 : 0.012;
                if (fx.life <= 0) { worldFx.splice(i, 1); continue; }

                ctx.save();

                if (fx.type === 'lightning') {
                    // Neon lightning bolt
                    const a = fx.life * 0.7;
                    ctx.shadowColor = 'rgba(0, 200, 255, 0.6)';
                    ctx.shadowBlur = 12 * fx.life;
                    ctx.strokeStyle = `rgba(100, 220, 255, ${a})`;
                    ctx.lineWidth = 2.5 * fx.life;
                    ctx.beginPath();
                    for (const seg of fx.segments) {
                        ctx.moveTo(seg.x1, seg.y1);
                        ctx.lineTo(seg.x2, seg.y2);
                    }
                    ctx.stroke();
                    // Branch
                    if (fx.branch) {
                        ctx.strokeStyle = `rgba(150, 230, 255, ${a * 0.6})`;
                        ctx.lineWidth = 1.5 * fx.life;
                        ctx.beginPath();
                        for (const seg of fx.branch) {
                            ctx.moveTo(seg.x1, seg.y1);
                            ctx.lineTo(seg.x2, seg.y2);
                        }
                        ctx.stroke();
                    }
                    // Flash glow at origin
                    if (fx.life > 0.8) {
                        const flashGrad = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, 30);
                        flashGrad.addColorStop(0, `rgba(200, 240, 255, ${(fx.life - 0.8) * 2})`);
                        flashGrad.addColorStop(1, 'rgba(0, 150, 255, 0)');
                        ctx.fillStyle = flashGrad;
                        ctx.beginPath();
                        ctx.arc(fx.x, fx.y, 30, 0, Math.PI * 2);
                        ctx.fill();
                    }

                } else if (fx.type === 'fire') {
                    // Rising fireball with trail
                    fx.y += fx.vy;
                    fx.x += fx.vx;
                    const a = Math.min(fx.life, 0.5) * 1.4;
                    const sz = fx.size * fx.life;
                    // Trail glow
                    for (let tr = 0; tr < 4; tr++) {
                        const ty = fx.y + tr * 8;
                        const ta = a * (1 - tr * 0.25);
                        const trGrad = ctx.createRadialGradient(fx.x, ty, 0, fx.x, ty, sz * (1 - tr * 0.15));
                        trGrad.addColorStop(0, `rgba(255, 180, 0, ${ta})`);
                        trGrad.addColorStop(0.5, `rgba(255, 80, 0, ${ta * 0.5})`);
                        trGrad.addColorStop(1, 'rgba(200, 0, 0, 0)');
                        ctx.fillStyle = trGrad;
                        ctx.beginPath();
                        ctx.arc(fx.x, ty, sz * (1 - tr * 0.15), 0, Math.PI * 2);
                        ctx.fill();
                    }

                } else if (fx.type === 'void') {
                    // Void swirl / portal
                    fx.rotation += fx.rotSpeed;
                    const a = fx.life * 0.2;
                    const sz = fx.size * (0.5 + fx.life * 0.5);
                    ctx.translate(fx.x, fx.y);
                    ctx.rotate(fx.rotation);
                    // Spiral arms
                    for (let arm = 0; arm < 3; arm++) {
                        const armAngle = (arm / 3) * Math.PI * 2;
                        ctx.strokeStyle = `rgba(120, 0, 200, ${a})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        for (let s = 0; s < 20; s++) {
                            const spiralR = (s / 20) * sz;
                            const spiralA = armAngle + (s / 20) * Math.PI * 1.5;
                            const sx = Math.cos(spiralA) * spiralR;
                            const sy = Math.sin(spiralA) * spiralR;
                            if (s === 0) ctx.moveTo(sx, sy);
                            else ctx.lineTo(sx, sy);
                        }
                        ctx.stroke();
                    }
                    // Center glow
                    const voidGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, sz * 0.4);
                    voidGrad.addColorStop(0, `rgba(180, 50, 255, ${a * 1.5})`);
                    voidGrad.addColorStop(1, 'rgba(80, 0, 150, 0)');
                    ctx.fillStyle = voidGrad;
                    ctx.beginPath();
                    ctx.arc(0, 0, sz * 0.4, 0, Math.PI * 2);
                    ctx.fill();

                } else if (fx.type === 'shadow') {
                    // Shadow eye
                    fx.blinkPhase += 0.03;
                    const blink = Math.sin(fx.blinkPhase);
                    const eyeOpen = Math.max(0, blink) * fx.life;
                    const a = eyeOpen * 0.4;
                    const sz = fx.size;
                    if (eyeOpen > 0.05) {
                        // Eye shape
                        ctx.fillStyle = `rgba(180, 0, 0, ${a * 0.3})`;
                        ctx.beginPath();
                        ctx.ellipse(fx.x, fx.y, sz, sz * 0.4 * eyeOpen, 0, 0, Math.PI * 2);
                        ctx.fill();
                        // Iris
                        ctx.fillStyle = `rgba(255, 0, 0, ${a * 0.8})`;
                        ctx.beginPath();
                        ctx.arc(fx.x, fx.y, sz * 0.25 * eyeOpen, 0, Math.PI * 2);
                        ctx.fill();
                        // Pupil
                        ctx.fillStyle = `rgba(0, 0, 0, ${a})`;
                        ctx.beginPath();
                        ctx.arc(fx.x, fx.y, sz * 0.1 * eyeOpen, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                ctx.shadowBlur = 0;
                ctx.restore();
            }

            // Floating orbs
            for (const icon of floatingIcons) {
                icon.y -= icon.speed;
                icon.wobble += icon.wobbleSpeed;
                icon.x += Math.sin(icon.wobble) * 0.5;
                if (icon.y < -30) {
                    icon.y = h + 30;
                    icon.x = Math.random() * w;
                }
                ctx.globalAlpha = icon.alpha;
                const orbGrad = ctx.createRadialGradient(icon.x, icon.y, 0, icon.x, icon.y, icon.size);
                orbGrad.addColorStop(0, icon.color);
                orbGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = orbGrad;
                ctx.beginPath();
                ctx.arc(icon.x, icon.y, icon.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Draw particles
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.pulse += 0.03;
                if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;

                const a = p.alpha * (0.6 + Math.sin(p.pulse) * 0.4);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = a;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Center glow behind title
            const centerGlow = ctx.createRadialGradient(w / 2, h * 0.32, 0, w / 2, h * 0.32, h * 0.35);
            centerGlow.addColorStop(0, `rgba(255, 100, 0, ${0.08 + Math.sin(t / 1500) * 0.03})`);
            centerGlow.addColorStop(0.5, `rgba(150, 30, 0, ${0.04 + Math.sin(t / 2000) * 0.02})`);
            centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = centerGlow;
            ctx.fillRect(0, 0, w, h);

            animId = requestAnimationFrame(render);
        };

        // Store cleanup reference
        this._introAnimCleanup = () => {
            if (animId) cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };

        render();
    }

    /**
     * Stop intro animation
     */
    stopIntroAnimation() {
        if (this._introAnimCleanup) {
            this._introAnimCleanup();
            this._introAnimCleanup = null;
        }
    }

    /**
     * Start new game
     */
    startGame() {
        console.log('[Game] Starting new game...');

        // Stop intro animation
        this.stopIntroAnimation();

        // Initialize and start audio
        this.audio.init();

        // Start background music after a short delay
        setTimeout(() => {
            this.audio.playBackgroundMusic();
        }, 500);

        // Reset state
        this.gameTime = 0;
        this.score = 0;
        this.kills = 0;
        this.enemies = [];
        this.projectiles = [];
        this.pickups = [];
        this.drones = [];
        this.bosses = [];
        this.miniBoss = null;
        this.portal = null;
        this.currentWorld = null;
        this.worldsVisited = [];
        this.portalChoiceActive = false;
        this.tempBossWeapon = null; // Active temporary boss drop weapon
        this.particles.clear();

        // Create player at center
        const centerX = CONFIG.ARENA.WIDTH / 2;
        const centerY = CONFIG.ARENA.HEIGHT / 2;

        // Apply selected character to sprite system
        const selectedChar = this.characterManager.getSelected();
        spriteManager.playerColors = {
            bodyColor: selectedChar.bodyColor,
            armorColor: selectedChar.armorColor,
            accentColor: selectedChar.accentColor,
            headColor: selectedChar.headColor
        };
        spriteManager.playerSpriteType = selectedChar.spriteType || 'player';
        this.player = new Player(centerX, centerY);
        this.player.color = selectedChar.accentColor;

        // Apply all character stats
        const cs = selectedChar.stats;
        if (cs) {
            this.player.stats.maxHealth = Math.round(this.player.stats.maxHealth * cs.health);
            this.player.health = this.player.stats.maxHealth;
            this.player.maxHealth = this.player.stats.maxHealth;
            this.player.stats.speed = Math.round(this.player.stats.speed * cs.speed);
            this.player.speed = this.player.stats.speed;
            this.player.baseSpeed = this.player.stats.speed;
            this.player.stats.damageMultiplier *= cs.damage;
            this.player.stats.armor = cs.armor;
            this.player.stats.healthRegen *= cs.healthRegen;
            this.player.stats.critChance = cs.critChance;
            this.player.stats.xpMultiplier *= cs.xpMultiplier;
            this.player.stats.pickupRadius = Math.round(this.player.stats.pickupRadius * cs.pickupRadius);
        }

        // Reset background scroll (starts at player position)
        this.bgScrollX = centerX;
        this.bgScrollY = centerY;

        // Add starting weapon
        this.player.addWeapon('pistol');

        // Center camera on player
        this.updateCamera();

        // Create spawner
        this.spawner = new Spawner(this);

        // Get selected starting world from dropdown
        const worldSelect = document.getElementById('worldSelect');
        const startWorldId = worldSelect ? worldSelect.value : 'voidAbyss';

        // Set starting world
        this.currentWorld = startWorldId;
        this.worldsVisited.push(startWorldId);
        this.spawner.setWorld(startWorldId);

        // Update UI
        this.state = GAME_STATE.PAUSED;
        this.ui.showScreen('game');
        this.ui.updateHealth(this.player.health, this.player.maxHealth);
        this.ui.updateXP(this.player.xp, this.player.xpToNextLevel, this.player.level);
        this.ui.updateWeapons(this.player.weapons);
        this.ui.updateScore(0);
        this.ui.updateKills(0);
        this.ui.updateTimer(0);

        // Show world entry animation for starting world
        const startWorld = WORLDS[startWorldId];
        this.ui.showWorldEntryAnimation(startWorld, () => {
            this.state = GAME_STATE.PLAYING;
        });
        this.ui.updateWorldIndicator(startWorld.name);

        // Notify platform
        this.sendGameStarted();

        // Start game loop
        this.lastFrameTime = performance.now();
        this.gameLoop();

        console.log('[Game] Game started!');
    }

    /**
     * Main game loop
     */
    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
        this.lastFrameTime = currentTime;

        if (this.state === GAME_STATE.PLAYING) {
            this.update(deltaTime);
        }

        this.render();

        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }

    /**
     * Update game state
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        // Update game time
        this.gameTime += deltaTime;

        // Set player movement from input
        this.player.setMoveDirection(this.input.movement.x, this.input.movement.y);

        // Store position before update for background scroll calculation
        const prevX = this.player.x;
        const prevY = this.player.y;

        // Update player
        this.player.update(deltaTime, { width: CONFIG.ARENA.WIDTH, height: CONFIG.ARENA.HEIGHT });

        // Calculate movement delta BEFORE wrapping (to track continuous movement)
        let moveDeltaX = this.player.x - prevX;
        let moveDeltaY = this.player.y - prevY;

        // Wrap player position (seamless toroidal world)
        this.player.x = this.wrapCoordinate(this.player.x, CONFIG.ARENA.WIDTH);
        this.player.y = this.wrapCoordinate(this.player.y, CONFIG.ARENA.HEIGHT);

        // Update continuous background scroll (doesn't wrap - for smooth scrolling)
        this.bgScrollX += moveDeltaX;
        this.bgScrollY += moveDeltaY;

        // Update camera
        this.updateCamera();

        // Update spawner
        this.spawner.update(deltaTime, this.gameTime);

        // Fire weapons
        this.fireWeapons(deltaTime);

        // Update projectiles
        this.updateProjectiles(deltaTime);

        // Update enemies
        this.updateEnemies(deltaTime);

        // Update pickups
        this.updatePickups(deltaTime);

        // Update portal
        this.updatePortal(deltaTime);

        // Update boss drop temporary weapon
        this.updateTempBossWeapon(deltaTime);

        // Update drones
        this.updateDrones(deltaTime);

        // Update particles
        this.particles.update(deltaTime);

        // Check collisions
        this.checkCollisions();

        // Check player level up
        if (this.player.checkLevelUp()) {
            this.handleLevelUp();
        }

        // Check game over
        if (this.player.isDead()) {
            this.gameOver();
        }

        // Update UI
        this.updateUI();
    }

    /**
     * Render game
     */
    render() {
        const ctx = this.ctx;

        // Clear canvas
        let bgColor = '#1a0a2e';
        if (this.currentWorld && WORLDS[this.currentWorld] && WORLDS[this.currentWorld].background) {
            bgColor = WORLDS[this.currentWorld].background.color || bgColor;
        }
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Get screen shake from UI system
        const shake = this.ui.updateScreenShake(1 / 60);

        // Apply zoom and shake
        ctx.save();
        ctx.translate(shake.x, shake.y);
        ctx.scale(this.camera.zoom, this.camera.zoom);

        // Draw arena background (seamless tiling around player)
        this.drawArenaBackground(ctx);

        // No visible bounds in seamless world

        // Draw all entities using worldToScreen for seamless toroidal rendering

        // Draw pickups
        for (const pickup of this.pickups) {
            this.renderSeamless(ctx, pickup);
        }

        // Draw portal
        if (this.portal && this.portal.active) {
            this.renderSeamless(ctx, this.portal);
        }

        // Draw projectiles
        for (const proj of this.projectiles) {
            this.renderSeamless(ctx, proj);
        }

        // Draw enemies
        for (const enemy of this.enemies) {
            this.renderSeamless(ctx, enemy);
            // Fire trails (Flame Imp) — rendered here for correct world positioning
            if (enemy.type === 'flameImp' && enemy.fireTrails) {
                for (const trail of enemy.fireTrails) {
                    const screen = this.worldToScreen(trail.x, trail.y);
                    if (!screen.visible) continue;
                    const alpha = 1 - (trail.timer / trail.lifetime);
                    const flicker = 0.7 + Math.sin(Date.now() / 80 + trail.x) * 0.3;
                    ctx.fillStyle = `rgba(255, ${Math.floor(100 * alpha)}, 0, ${alpha * 0.5 * flicker})`;
                    ctx.beginPath();
                    ctx.arc(screen.x, screen.y, trail.radius * (0.5 + alpha * 0.5) * this.camera.zoom, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            // Draw enemy projectiles (ranged enemies)
            if (enemy.projectiles) {
                for (const proj of enemy.projectiles) {
                    if (proj.active) {
                        this.renderSeamless(ctx, proj);
                    }
                }
            }
        }

        // Draw mini-boss
        if (this.miniBoss && !this.miniBoss.isDead()) {
            this.renderSeamless(ctx, this.miniBoss);
            // Draw AOE if charging or active
            if ((this.miniBoss.aoeCharging || this.miniBoss.aoeActive) && this.miniBoss.aoeData) {
                this.renderAOE(ctx, this.miniBoss.aoeData, this.miniBoss);
            }
        }

        // Draw all bosses
        for (const boss of this.bosses) {
            if (boss && !boss.isDead()) {
                this.renderSeamless(ctx, boss);
                // Draw AOE if charging or active
                if ((boss.aoeCharging || boss.aoeActive) && boss.aoeData) {
                    this.renderAOE(ctx, boss.aoeData, boss, boss.bossShape);
                }
                // Freeze zone (Cryomancer) â€” rendered here for correct world positioning
                if (boss.freezeZoneActive && boss.freezeZoneData) {
                    this.renderFreezeZone(ctx, boss.freezeZoneData);
                }
                // Eruption zones + magma trails (Pyroclasm)
                if (boss.eruptionZones) {
                    this.renderEruptionZones(ctx, boss.eruptionZones);
                }
                if (boss.magmaTrails) {
                    this.renderMagmaTrails(ctx, boss.magmaTrails);
                }
            }
        }

        // Draw drones
        for (const drone of this.drones) {
            this.renderSeamless(ctx, drone);
            // Also render drone projectiles
            for (const proj of drone.projectilePool) {
                if (proj.active) {
                    this.renderSeamless(ctx, proj);
                }
            }
        }

        // Draw player (always at center of screen)
        if (this.player && !this.player.isDead()) {
            this.renderSeamless(ctx, this.player);
        }

        // Draw special weapons (laser, forcefield)
        this.renderSpecialWeapons(ctx);

        // Draw temporary boss weapon effects
        this.renderTempBossWeapon(ctx);

        // Draw particles (with seamless rendering)
        this.renderParticlesSeamless(ctx);

        // Draw AoE explosion shockwave rings
        this.renderExplosionRings(ctx);

        // Full-screen red flash when player takes damage
        if (this.player && this.player.damageFlash > 0) {
            const flashAlpha = Math.min(this.player.damageFlash / 150, 1) * 0.12;
            const vw = this.canvas.width / this.camera.zoom;
            const vh = this.canvas.height / this.camera.zoom;
            ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
            ctx.fillRect(-vw, -vh, vw * 3, vh * 3);
        }

        // Restore context
        ctx.restore();
    }

    /**
     * Render an entity using seamless toroidal projection
     * Entity appears at the wrapped shortest-path position from player
     * @param {CanvasRenderingContext2D} ctx
     * @param {Entity} entity
     */
    renderSeamless(ctx, entity) {
        if (!entity || !entity.active) return;

        // Get screen position using toroidal wrapping
        const screen = this.worldToScreen(entity.x, entity.y);

        if (!screen.visible) return;

        // Temporarily move entity to screen position for rendering
        const origX = entity.x;
        const origY = entity.y;

        // For rendering, we need to set position relative to a "virtual camera at 0,0"
        // Since we're not using ctx.translate anymore
        entity.x = screen.x;
        entity.y = screen.y;

        // Create a fake camera at 0,0 since entity.render expects camera offset
        entity.render(ctx, { x: 0, y: 0 });

        // Restore original position
        entity.x = origX;
        entity.y = origY;
    }

    /**
     * Render particles with seamless wrapping
     * @param {CanvasRenderingContext2D} ctx
     */
    renderParticlesSeamless(ctx) {
        // Particles need to be rendered relative to player too
        // Pass 1: normal particles
        for (const particle of this.particles.particles) {
            if (!particle.active || particle.glow) continue;

            const screen = this.worldToScreen(particle.x, particle.y);
            if (!screen.visible) continue;

            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        // Pass 2: glow particles with additive blending
        ctx.globalCompositeOperation = 'lighter';
        for (const particle of this.particles.particles) {
            if (!particle.active || !particle.glow) continue;

            const screen = this.worldToScreen(particle.x, particle.y);
            if (!screen.visible) continue;

            ctx.globalAlpha = particle.alpha * 0.8;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }

    /**
     * Render expanding shockwave rings for AoE weapon explosions
     * @param {CanvasRenderingContext2D} ctx
     */
    renderExplosionRings(ctx) {
        if (!this._activeExplosions || this._activeExplosions.length === 0) return;

        const now = Date.now();
        const duration = 700;

        for (let i = this._activeExplosions.length - 1; i >= 0; i--) {
            const exp = this._activeExplosions[i];
            const elapsed = now - exp.time;

            if (elapsed > duration) {
                this._activeExplosions.splice(i, 1);
                continue;
            }

            const progress = elapsed / duration;
            const alpha = 1 - progress;
            const z = this.camera.zoom;
            const wt = exp.weaponType;

            const screen = this.worldToScreen(exp.x, exp.y);
            if (!screen.visible) continue;

            // Phase 1: bright flash at center (first 30%)
            if (progress < 0.3) {
                const flashAlpha = (1 - progress / 0.3);
                const flashScale = wt === 'meteorStaff' ? 0.5 : 0.4;
                const flashRadius = exp.radius * flashScale * z;
                const flashGrad = ctx.createRadialGradient(
                    screen.x, screen.y, 0,
                    screen.x, screen.y, flashRadius
                );

                if (wt === 'plasmaCannon') {
                    flashGrad.addColorStop(0, '#ffffff');
                    flashGrad.addColorStop(0.2, '#aaffee');
                    flashGrad.addColorStop(0.5, exp.color);
                    flashGrad.addColorStop(1, exp.color + '00');
                } else if (wt === 'meteorStaff') {
                    flashGrad.addColorStop(0, '#ffffff');
                    flashGrad.addColorStop(0.15, '#ffee88');
                    flashGrad.addColorStop(0.4, exp.color);
                    flashGrad.addColorStop(1, exp.color + '00');
                } else {
                    flashGrad.addColorStop(0, '#ffffff');
                    flashGrad.addColorStop(0.3, exp.color);
                    flashGrad.addColorStop(1, exp.color + '00');
                }

                ctx.globalAlpha = flashAlpha * 0.9;
                ctx.fillStyle = flashGrad;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, flashRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Phase 2: expanding shockwave ring
            const ringProgress = Math.min(progress * 1.5, 1);
            const currentRadius = exp.radius * ringProgress * z;

            // Thick outer ring
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, currentRadius, 0, Math.PI * 2);
            ctx.strokeStyle = exp.color;
            ctx.lineWidth = Math.max(1, (4 - 3 * progress) * z);
            ctx.globalAlpha = alpha * 0.85;
            ctx.stroke();

            // Secondary thinner ring (slightly behind)
            if (progress > 0.1) {
                const innerRingR = exp.radius * Math.min((progress - 0.1) * 1.5, 1) * z;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, innerRingR, 0, Math.PI * 2);
                ctx.strokeStyle = wt === 'plasmaCannon' ? '#aaffee' : '#ffffff';
                ctx.lineWidth = Math.max(1, (2 - 1.5 * progress) * z);
                ctx.globalAlpha = alpha * 0.4;
                ctx.stroke();
            }

            // Inner glow fill
            const grad = ctx.createRadialGradient(
                screen.x, screen.y, 0,
                screen.x, screen.y, currentRadius
            );
            grad.addColorStop(0, exp.color + '50');
            grad.addColorStop(0.5, exp.color + '20');
            grad.addColorStop(1, exp.color + '00');
            ctx.fillStyle = grad;
            ctx.globalAlpha = alpha * 0.6;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // Weapon-specific extra visuals
            if (wt === 'meteorStaff') {
                // More (12) thicker crack lines + radial glow
                if (progress < 0.6) {
                    const crackAlpha = (1 - progress / 0.6) * 0.8;
                    ctx.globalAlpha = crackAlpha;
                    ctx.strokeStyle = '#ff8833';
                    ctx.lineWidth = Math.max(1, 3 * z);
                    const crackCount = 12;
                    for (let c = 0; c < crackCount; c++) {
                        const angle = (Math.PI * 2 / crackCount) * c + (exp.time % 100) * 0.01;
                        const len = exp.radius * (0.35 + progress * 0.65) * z;
                        ctx.beginPath();
                        ctx.moveTo(
                            screen.x + Math.cos(angle) * 6 * z,
                            screen.y + Math.sin(angle) * 6 * z
                        );
                        ctx.lineTo(
                            screen.x + Math.cos(angle) * len,
                            screen.y + Math.sin(angle) * len
                        );
                        ctx.stroke();
                    }
                }

                // Smoky haze circle
                if (progress > 0.15 && progress < 0.8) {
                    const hazeAlpha = Math.min((progress - 0.15) * 3, 1) * (1 - (progress - 0.15) / 0.65) * 0.25;
                    const hazeR = exp.radius * 0.7 * z;
                    const hazeGrad = ctx.createRadialGradient(
                        screen.x, screen.y, 0,
                        screen.x, screen.y, hazeR
                    );
                    hazeGrad.addColorStop(0, '#44444040');
                    hazeGrad.addColorStop(0.6, '#33333330');
                    hazeGrad.addColorStop(1, '#33333300');
                    ctx.globalAlpha = hazeAlpha;
                    ctx.fillStyle = hazeGrad;
                    ctx.beginPath();
                    ctx.arc(screen.x, screen.y, hazeR, 0, Math.PI * 2);
                    ctx.fill();
                }

            } else if (wt === 'plasmaCannon') {
                // Electric arc segments between ring points
                if (progress < 0.5) {
                    const arcAlpha = (1 - progress / 0.5) * 0.7;
                    ctx.globalAlpha = arcAlpha;
                    ctx.strokeStyle = '#66ffee';
                    ctx.lineWidth = Math.max(1, 1.5 * z);
                    const arcCount = 6;
                    for (let c = 0; c < arcCount; c++) {
                        const a1 = (Math.PI * 2 / arcCount) * c;
                        const a2 = a1 + (Math.PI * 2 / arcCount);
                        const r = currentRadius * 0.85;
                        // Jagged arc: 3 segments with random offsets
                        ctx.beginPath();
                        const sx = screen.x + Math.cos(a1) * r;
                        const sy = screen.y + Math.sin(a1) * r;
                        ctx.moveTo(sx, sy);
                        const mid1a = a1 + (a2 - a1) * 0.33;
                        const mid2a = a1 + (a2 - a1) * 0.66;
                        const jitter = 12 * z;
                        ctx.lineTo(
                            screen.x + Math.cos(mid1a) * (r + (Math.sin(elapsed * 0.05 + c) * jitter)),
                            screen.y + Math.sin(mid1a) * (r + (Math.cos(elapsed * 0.07 + c) * jitter))
                        );
                        ctx.lineTo(
                            screen.x + Math.cos(mid2a) * (r - (Math.sin(elapsed * 0.06 + c * 2) * jitter)),
                            screen.y + Math.sin(mid2a) * (r - (Math.cos(elapsed * 0.04 + c * 2) * jitter))
                        );
                        ctx.lineTo(
                            screen.x + Math.cos(a2) * r,
                            screen.y + Math.sin(a2) * r
                        );
                        ctx.stroke();
                    }
                }

                // Pulsing inner energy ring
                if (progress > 0.05 && progress < 0.45) {
                    const pulseR = currentRadius * (0.4 + Math.sin(elapsed * 0.015) * 0.1);
                    ctx.globalAlpha = alpha * 0.35;
                    ctx.beginPath();
                    ctx.arc(screen.x, screen.y, pulseR, 0, Math.PI * 2);
                    ctx.strokeStyle = '#00ffcc';
                    ctx.lineWidth = Math.max(1, 2 * z);
                    ctx.stroke();
                }

            } else if (wt === 'iceGrenade') {
                // Frost ring expanding + ice crystal pattern
                if (progress < 0.7) {
                    const frostAlpha = (1 - progress / 0.7) * 0.5;
                    ctx.globalAlpha = frostAlpha;
                    const frostGrad = ctx.createRadialGradient(
                        screen.x, screen.y, 0,
                        screen.x, screen.y, currentRadius
                    );
                    frostGrad.addColorStop(0, 'rgba(150, 220, 255, 0.3)');
                    frostGrad.addColorStop(0.6, 'rgba(100, 200, 255, 0.15)');
                    frostGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
                    ctx.fillStyle = frostGrad;
                    ctx.beginPath();
                    ctx.arc(screen.x, screen.y, currentRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#aaeeff';
                    ctx.lineWidth = Math.max(1, 1.5 * z);
                    for (let c = 0; c < 6; c++) {
                        const angle = (Math.PI * 2 / 6) * c;
                        const len = currentRadius * 0.8;
                        ctx.beginPath();
                        ctx.moveTo(screen.x, screen.y);
                        ctx.lineTo(
                            screen.x + Math.cos(angle) * len,
                            screen.y + Math.sin(angle) * len
                        );
                        ctx.stroke();
                    }
                }

            } else {
                // Rocket: fiery debris + crack lines + heat haze
                if (progress < 0.6) {
                    const crackAlpha = (1 - progress / 0.6) * 0.7;
                    ctx.globalAlpha = crackAlpha;
                    ctx.strokeStyle = exp.color;
                    ctx.lineWidth = Math.max(1, 2.5 * z);
                    const crackCount = 10;
                    for (let c = 0; c < crackCount; c++) {
                        const angle = (Math.PI * 2 / crackCount) * c + (exp.time % 200) * 0.005;
                        const len = exp.radius * (0.3 + progress * 0.7) * z;
                        ctx.beginPath();
                        ctx.moveTo(
                            screen.x + Math.cos(angle) * 5 * z,
                            screen.y + Math.sin(angle) * 5 * z
                        );
                        // Jagged mid-point for more realistic crack
                        const midLen = len * 0.5;
                        const midJitter = 8 * z;
                        ctx.lineTo(
                            screen.x + Math.cos(angle) * midLen + Math.sin(angle + c) * midJitter,
                            screen.y + Math.sin(angle) * midLen - Math.cos(angle + c) * midJitter
                        );
                        ctx.lineTo(
                            screen.x + Math.cos(angle) * len,
                            screen.y + Math.sin(angle) * len
                        );
                        ctx.stroke();
                    }
                }
                // Flying debris particles
                if (progress < 0.5) {
                    const debrisAlpha = (1 - progress / 0.5) * 0.6;
                    ctx.globalAlpha = debrisAlpha;
                    for (let d = 0; d < 8; d++) {
                        const da = (Math.PI * 2 / 8) * d + (exp.time % 300) * 0.008;
                        const dd = exp.radius * (0.3 + progress * 1.2) * z;
                        const dx = screen.x + Math.cos(da) * dd;
                        const dy = screen.y + Math.sin(da) * dd - (1 - progress * 2) * 15 * z;
                        ctx.fillStyle = d % 2 === 0 ? '#ff8800' : '#ffcc44';
                        ctx.beginPath();
                        ctx.arc(dx, dy, Math.max(1, (3 - progress * 5) * z), 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                // Smoky haze
                if (progress > 0.2 && progress < 0.75) {
                    const hazeAlpha = Math.min((progress - 0.2) * 3, 1) * (1 - (progress - 0.2) / 0.55) * 0.2;
                    const hazeR = exp.radius * 0.6 * z;
                    const hazeGrad = ctx.createRadialGradient(
                        screen.x, screen.y, 0,
                        screen.x, screen.y, hazeR
                    );
                    hazeGrad.addColorStop(0, '#55555050');
                    hazeGrad.addColorStop(0.6, '#44444030');
                    hazeGrad.addColorStop(1, '#33333300');
                    ctx.globalAlpha = hazeAlpha;
                    ctx.fillStyle = hazeGrad;
                    ctx.beginPath();
                    ctx.arc(screen.x, screen.y, hazeR, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Draw arena background with grid (scrolls smoothly without jumps)
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawArenaBackground(ctx) {
        const viewWidth = this.canvas.width / this.camera.zoom;
        const viewHeight = this.canvas.height / this.camera.zoom;
        const t = Date.now();

        let theme = 'void';
        let bg = null;
        if (this.currentWorld && WORLDS[this.currentWorld]) {
            bg = WORLDS[this.currentWorld].background;
            if (bg) theme = bg.theme || 'void';
        }

        const scrollX = this.bgScrollX || 0;
        const scrollY = this.bgScrollY || 0;

        if (theme === 'void') {
            this._drawVoidBackground(ctx, viewWidth, viewHeight, t, scrollX, scrollY, bg);
        } else if (theme === 'inferno') {
            this._drawInfernoBackground(ctx, viewWidth, viewHeight, t, scrollX, scrollY, bg);
        } else if (theme === 'frozen') {
            this._drawFrozenBackground(ctx, viewWidth, viewHeight, t, scrollX, scrollY, bg);
        } else if (theme === 'neon') {
            this._drawNeonBackground(ctx, viewWidth, viewHeight, t, scrollX, scrollY, bg);
        } else if (theme === 'shadow') {
            this._drawShadowBackground(ctx, viewWidth, viewHeight, t, scrollX, scrollY, bg);
        }
    }

    _drawVoidBackground(ctx, vw, vh, t, sx, sy, bg) {
        const gridSize = 64;
        const offsetX = (((-sx % gridSize) + gridSize) % gridSize);
        const offsetY = (((-sy % gridSize) + gridSize) % gridSize);

        // Nebula clouds
        for (let i = 0; i < 4; i++) {
            const nx = ((-sx * 0.15 + i * 400) % (vw + 400)) - 200;
            const ny = ((-sy * 0.15 + i * 300) % (vh + 400)) - 200;
            const nebGrad = ctx.createRadialGradient(nx + 120, ny + 120, 0, nx + 120, ny + 120, 180);
            nebGrad.addColorStop(0, 'rgba(120, 40, 200, 0.06)');
            nebGrad.addColorStop(0.5, 'rgba(80, 20, 140, 0.03)');
            nebGrad.addColorStop(1, 'rgba(40, 10, 80, 0)');
            ctx.fillStyle = nebGrad;
            ctx.fillRect(nx, ny, 240, 240);
        }

        // Grid
        ctx.strokeStyle = bg ? bg.gridColor : 'rgba(100, 50, 150, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = offsetX - gridSize; x <= vw + gridSize; x += gridSize) {
            ctx.moveTo(x, 0); ctx.lineTo(x, vh);
        }
        for (let y = offsetY - gridSize; y <= vh + gridSize; y += gridSize) {
            ctx.moveTo(0, y); ctx.lineTo(vw, y);
        }
        ctx.stroke();

        // Stars
        const dotColor = bg ? bg.dotColor : 'rgba(180, 120, 255, 0.5)';
        ctx.fillStyle = dotColor;
        const dotSpacing = 128;
        const dotOX = (((-sx % dotSpacing) + dotSpacing) % dotSpacing);
        const dotOY = (((-sy % dotSpacing) + dotSpacing) % dotSpacing);
        for (let x = dotOX; x <= vw + dotSpacing; x += dotSpacing) {
            for (let y = dotOY; y <= vh + dotSpacing; y += dotSpacing) {
                ctx.beginPath();
                ctx.arc(x, y, 2 + Math.sin(t / 800 + x * 0.01 + y * 0.01) * 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Floating void particles
        if (bg && bg.particles) {
            const pCount = bg.particles.count || 20;
            for (let i = 0; i < pCount; i++) {
                const seed = i * 97.3;
                const speed = 0.3 + (i % 5) * 0.15;
                const px = (seed * 53 + t * speed / 60) % (vw + 40) - 20;
                const py = (seed * 31 + t * speed / 80 + Math.sin(t / 1000 + i) * 20) % (vh + 40) - 20;
                const size = 1.5 + (i % 4) * 0.5;
                const alpha = 0.2 + Math.sin(t / 600 + i * 0.8) * 0.15;
                const c = i % 2 === 0 ? bg.particles.color1 : bg.particles.color2;
                const r = Number.parseInt(c.slice(1, 3), 16);
                const g = Number.parseInt(c.slice(3, 5), 16);
                const b = Number.parseInt(c.slice(5, 7), 16);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _drawInfernoBackground(ctx, vw, vh, t, sx, sy, bg) {
        // Flat sandy desert ground
        ctx.fillStyle = '#9B7D3C';
        ctx.fillRect(0, 0, vw, vh);

        // Soft color noise - large radial patches (no hard edges)
        const lz = 240;
        const lx0 = Math.floor(sx / lz) - 1, lx1 = Math.ceil((sx + vw) / lz) + 1;
        const ly0 = Math.floor(sy / lz) - 1, ly1 = Math.ceil((sy + vh) / lz) + 1;
        for (let ly = ly0; ly <= ly1; ly++) {
            const rowOff = (((ly % 2) + 2) % 2) * lz * 0.5;
            for (let lx = lx0; lx <= lx1; lx++) {
                const x = lx * lz + rowOff - sx, y = ly * lz - sy;
                const sd = Math.abs(lx * 4517 + ly * 7331) % 100;
                const r = 140 + (sd % 30), g = 110 + (sd % 25), b = 45 + (sd % 20);
                const cx = x + lz * 0.5, cy = y + lz * 0.5;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, lz * 0.65);
                grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
                grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(x - 20, y - 20, lz + 40, lz + 40);
            }
        }
        // Medium patches
        const mz = 120;
        const mx0 = Math.floor(sx / mz) - 1, mx1 = Math.ceil((sx + vw) / mz) + 1;
        const my0 = Math.floor(sy / mz) - 1, my1 = Math.ceil((sy + vh) / mz) + 1;
        for (let my = my0; my <= my1; my++) {
            const rowOff = (((my % 3) + 3) % 3) * mz * 0.33;
            for (let mx = mx0; mx <= mx1; mx++) {
                const sd = Math.abs(mx * 8219 + my * 3671) % 100;
                if (sd % 2 !== 0) continue;
                const x = mx * mz + rowOff - sx, y = my * mz - sy;
                const r = 120 + (sd % 40), g = 90 + (sd % 30), b = 35 + (sd % 20);
                const cx = x + mz * 0.5, cy = y + mz * 0.5;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, mz * 0.55);
                grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
                grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(x - 10, y - 10, mz + 20, mz + 20);
            }
        }

        // === CRACKS TYPE 1: Long winding cracks ===
        const crSp1 = 100;
        const cr1x = (((-sx % crSp1) + crSp1) % crSp1), cr1y = (((-sy % crSp1) + crSp1) % crSp1);
        for (let gx = cr1x - crSp1; gx <= vw + crSp1; gx += crSp1) {
            for (let gy = cr1y - crSp1; gy <= vh + crSp1; gy += crSp1) {
                const seed = Math.abs(Math.floor((gx + sx) * 5.7 + (gy + sy) * 11.3)) % 100;
                if (seed % 3 !== 0) continue;
                const jx = ((seed * 29 + 3) % crSp1) - crSp1 * 0.4;
                const jy = ((seed * 43 + 17) % crSp1) - crSp1 * 0.4;
                const cx = gx + jx, cy = gy + jy;
                ctx.strokeStyle = `rgba(55, 35, 12, ${0.22 + (seed % 10) * 0.015})`;
                ctx.lineWidth = 0.8 + (seed % 3) * 0.3;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                let px = cx, py = cy;
                const segs = 4 + seed % 5;
                let prevAngle = ((seed * 19) % 100) / 100 * Math.PI * 2;
                for (let s = 0; s < segs; s++) {
                    prevAngle += ((seed * (s + 7) * 13) % 60 - 30) / 100 * Math.PI;
                    const len = 10 + ((seed * (s + 3)) % 20);
                    px += Math.cos(prevAngle) * len;
                    py += Math.sin(prevAngle) * len;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
        }

        // === CRACKS TYPE 2: Y-fork cracks ===
        const crSp2 = 160;
        const cr2x = (((-sx % crSp2) + crSp2) % crSp2), cr2y = (((-sy % crSp2) + crSp2) % crSp2);
        for (let gx = cr2x - crSp2; gx <= vw + crSp2; gx += crSp2) {
            for (let gy = cr2y - crSp2; gy <= vh + crSp2; gy += crSp2) {
                const seed = Math.abs(Math.floor((gx + sx) * 8.3 + (gy + sy) * 3.7)) % 100;
                if (seed % 4 !== 0) continue;
                const jx = ((seed * 37 + 11) % crSp2) - crSp2 * 0.4;
                const jy = ((seed * 53 + 23) % crSp2) - crSp2 * 0.4;
                const cx = gx + jx, cy = gy + jy;
                const baseAngle = ((seed * 17) % 100) / 100 * Math.PI * 2;
                const stemLen = 18 + seed % 15;
                ctx.strokeStyle = `rgba(50, 32, 10, ${0.2 + (seed % 8) * 0.015})`;
                ctx.lineWidth = 1;
                const ex = cx + Math.cos(baseAngle) * stemLen;
                const ey = cy + Math.sin(baseAngle) * stemLen;
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
                const forkLen = 12 + seed % 10;
                ctx.beginPath(); ctx.moveTo(ex, ey);
                ctx.lineTo(ex + Math.cos(baseAngle - 0.5) * forkLen, ey + Math.sin(baseAngle - 0.5) * forkLen);
                ctx.stroke();
                ctx.beginPath(); ctx.moveTo(ex, ey);
                ctx.lineTo(ex + Math.cos(baseAngle + 0.4) * forkLen, ey + Math.sin(baseAngle + 0.4) * forkLen);
                ctx.stroke();
            }
        }

        // === CRACKS TYPE 3: Short jagged micro-cracks ===
        const crSp3 = 80;
        const cr3x = (((-sx % crSp3) + crSp3) % crSp3), cr3y = (((-sy % crSp3) + crSp3) % crSp3);
        for (let gx = cr3x - crSp3; gx <= vw + crSp3; gx += crSp3) {
            for (let gy = cr3y - crSp3; gy <= vh + crSp3; gy += crSp3) {
                const seed = Math.abs(Math.floor((gx + sx) * 12.1 + (gy + sy) * 6.7)) % 100;
                if (seed % 5 !== 0) continue;
                const jx = ((seed * 41 + 7) % crSp3) - crSp3 * 0.4;
                const jy = ((seed * 59 + 13) % crSp3) - crSp3 * 0.4;
                const cx = gx + jx, cy = gy + jy;
                ctx.strokeStyle = `rgba(60, 38, 15, ${0.15 + (seed % 8) * 0.01})`;
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                let px = cx, py = cy;
                const dir = ((seed * 23) % 100) / 100 * Math.PI * 2;
                for (let s = 0; s < 3 + seed % 3; s++) {
                    const zigAngle = dir + (s % 2 === 0 ? 0.6 : -0.6);
                    const len = 5 + seed % 6;
                    px += Math.cos(zigAngle) * len;
                    py += Math.sin(zigAngle) * len;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
        }

        // === CRACKS TYPE 4: Branching network ===
        const crSp4 = 200;
        const cr4x = (((-sx % crSp4) + crSp4) % crSp4), cr4y = (((-sy % crSp4) + crSp4) % crSp4);
        for (let gx = cr4x - crSp4; gx <= vw + crSp4; gx += crSp4) {
            for (let gy = cr4y - crSp4; gy <= vh + crSp4; gy += crSp4) {
                const seed = Math.abs(Math.floor((gx + sx) * 4.1 + (gy + sy) * 9.3)) % 100;
                if (seed % 5 !== 0) continue;
                const jx = ((seed * 31 + 19) % crSp4) - crSp4 * 0.4;
                const jy = ((seed * 47 + 29) % crSp4) - crSp4 * 0.4;
                const cx = gx + jx, cy = gy + jy;
                ctx.strokeStyle = `rgba(50, 30, 10, ${0.18 + (seed % 6) * 0.012})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(cx, cy);
                let px = cx, py = cy;
                const mainDir = ((seed * 13) % 100) / 100 * Math.PI * 2;
                const pts = [];
                pts.push({x: px, y: py});
                for (let s = 0; s < 5 + seed % 3; s++) {
                    const a = mainDir + ((seed * (s + 5) * 7) % 40 - 20) / 100;
                    const len = 8 + ((seed * (s + 2)) % 14);
                    px += Math.cos(a) * len; py += Math.sin(a) * len;
                    ctx.lineTo(px, py);
                    pts.push({x: px, y: py});
                }
                ctx.stroke();
                ctx.lineWidth = 0.7;
                for (let i = 1; i < pts.length; i += 2) {
                    const bp = pts[i];
                    const brAngle = mainDir + (i % 2 === 0 ? 1.2 : -1.2);
                    const brLen = 8 + (seed * i) % 12;
                    ctx.beginPath(); ctx.moveTo(bp.x, bp.y);
                    ctx.lineTo(bp.x + Math.cos(brAngle) * brLen, bp.y + Math.sin(brAngle) * brLen);
                    ctx.stroke();
                }
            }
        }

        // DECORATION: Large desert boulders
        const rockSp = 300;
        const rx0 = (((-sx % rockSp) + rockSp) % rockSp), ry0 = (((-sy % rockSp) + rockSp) % rockSp);
        for (let gx = rx0 - rockSp; gx <= vw + rockSp; gx += rockSp) {
            for (let gy = ry0 - rockSp; gy <= vh + rockSp; gy += rockSp) {
                const rs = Math.abs(Math.floor((gx + sx) * 11.3 + (gy + sy) * 7.1)) % 100;
                if (rs % 3 !== 0) continue;
                const jx = ((rs * 37 + 13) % rockSp) - rockSp * 0.5;
                const jy = ((rs * 53 + 7) % rockSp) - rockSp * 0.5;
                const bx = gx + jx * 0.65, by = gy + jy * 0.65;
                const rz = 16 + rs % 16;
                const pts = 6 + rs % 3;
                ctx.fillStyle = 'rgba(30, 18, 5, 0.3)';
                ctx.beginPath();
                for (let i = 0; i < pts; i++) {
                    const a = (Math.PI * 2 / pts) * i + rs * 0.1;
                    const r = rz * (0.6 + ((rs * (i + 1) * 17) % 35) / 100);
                    if (i === 0) ctx.moveTo(bx + 4 + Math.cos(a) * r, by + 4 + Math.sin(a) * r);
                    else ctx.lineTo(bx + 4 + Math.cos(a) * r, by + 4 + Math.sin(a) * r);
                }
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = `rgb(${80 + rs % 25}, ${55 + rs % 20}, ${30 + rs % 15})`;
                ctx.beginPath();
                for (let i = 0; i < pts; i++) {
                    const a = (Math.PI * 2 / pts) * i + rs * 0.1;
                    const r = rz * (0.6 + ((rs * (i + 1) * 17) % 35) / 100);
                    if (i === 0) ctx.moveTo(bx + Math.cos(a) * r, by + Math.sin(a) * r);
                    else ctx.lineTo(bx + Math.cos(a) * r, by + Math.sin(a) * r);
                }
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(180, 140, 80, 0.2)';
                ctx.beginPath();
                ctx.moveTo(bx - rz * 0.3, by - rz * 0.45);
                ctx.lineTo(bx + rz * 0.25, by - rz * 0.15);
                ctx.lineTo(bx - rz * 0.05, by + rz * 0.1);
                ctx.closePath(); ctx.fill();
            }
        }

        // DECORATION: Dead bushes
        const bushSp = 380;
        const bx0 = (((-sx % bushSp) + bushSp) % bushSp), by0 = (((-sy % bushSp) + bushSp) % bushSp);
        for (let gx = bx0 - bushSp; gx <= vw + bushSp; gx += bushSp) {
            for (let gy = by0 - bushSp; gy <= vh + bushSp; gy += bushSp) {
                const bs = Math.abs(Math.floor((gx + sx) * 7.7 + (gy + sy) * 4.3)) % 100;
                if (bs % 4 !== 0) continue;
                const jx = ((bs * 41 + 19) % bushSp) - bushSp * 0.5;
                const jy = ((bs * 59 + 3) % bushSp) - bushSp * 0.5;
                const bx = gx + jx * 0.6, by = gy + jy * 0.6;
                const bsz = 16 + bs % 12;
                ctx.strokeStyle = `rgb(${60 + bs % 20}, ${40 + bs % 15}, ${18 + bs % 10})`;
                ctx.lineWidth = 2;
                const branches = 5 + bs % 3;
                for (let b = 0; b < branches; b++) {
                    const angle = (Math.PI * 2 / branches) * b + bs * 0.15;
                    const len = bsz * (0.5 + ((bs * (b + 2) * 11) % 50) / 100);
                    ctx.beginPath(); ctx.moveTo(bx, by);
                    const midX = bx + Math.cos(angle) * len * 0.5 + ((bs * b) % 6 - 3);
                    const midY = by + Math.sin(angle) * len * 0.5 + ((bs * (b + 1)) % 6 - 3);
                    ctx.quadraticCurveTo(midX, midY, bx + Math.cos(angle) * len, by + Math.sin(angle) * len);
                    ctx.stroke();
                    if (b % 2 === 0) {
                        const ex = bx + Math.cos(angle) * len, ey = by + Math.sin(angle) * len;
                        ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(ex, ey);
                        ctx.lineTo(ex + Math.cos(angle + 0.5) * bsz * 0.3, ey + Math.sin(angle + 0.5) * bsz * 0.3);
                        ctx.stroke(); ctx.lineWidth = 2;
                    }
                }
            }
        }
    }

    _drawFrozenBackground(ctx, vw, vh, t, sx, sy, bg) {
        // Icy blue base
        ctx.fillStyle = '#7A9DBD';
        ctx.fillRect(0, 0, vw, vh);

        // Soft color zones using RADIAL GRADIENTS (no edges)
        const lz = 200;
        const lx0 = Math.floor(sx / lz) - 1, lx1 = Math.ceil((sx + vw) / lz) + 1;
        const ly0 = Math.floor(sy / lz) - 1, ly1 = Math.ceil((sy + vh) / lz) + 1;
        for (let ly = ly0; ly <= ly1; ly++) {
            const rowOff = (((ly % 2) + 2) % 2) * lz * 0.5;
            for (let lx = lx0; lx <= lx1; lx++) {
                const x = lx * lz + rowOff - sx, y = ly * lz - sy;
                const sd = Math.abs(lx * 5431 + ly * 8293) % 100;
                const r = 105 + (sd % 35), g = 140 + (sd % 30), b = 170 + (sd % 25);
                const cx = x + lz * 0.5, cy = y + lz * 0.5;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, lz * 0.62);
                grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.45)`);
                grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(x - 20, y - 20, lz + 40, lz + 40);
            }
        }
        // Smaller detail patches
        const mz = 100;
        const mx0 = Math.floor(sx / mz) - 1, mx1 = Math.ceil((sx + vw) / mz) + 1;
        const myy0 = Math.floor(sy / mz) - 1, myy1 = Math.ceil((sy + vh) / mz) + 1;
        for (let my = myy0; my <= myy1; my++) {
            const rowOff = (((my % 3) + 3) % 3) * mz * 0.33;
            for (let mx = mx0; mx <= mx1; mx++) {
                const sd = Math.abs(mx * 6173 + my * 4391) % 100;
                if (sd % 3 !== 0) continue;
                const x = mx * mz + rowOff - sx, y = my * mz - sy;
                const r = 115 + (sd % 30), g = 150 + (sd % 25), b = 185 + (sd % 18);
                const cx = x + mz * 0.5, cy = y + mz * 0.5;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, mz * 0.5);
                grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
                grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(x - 8, y - 8, mz + 16, mz + 16);
            }
        }

        // Frost scratches
        const frostSp = 90;
        const f0 = (((-sx % frostSp) + frostSp) % frostSp), f1 = (((-sy % frostSp) + frostSp) % frostSp);
        for (let gx = f0 - frostSp; gx <= vw + frostSp; gx += frostSp) {
            for (let gy = f1 - frostSp; gy <= vh + frostSp; gy += frostSp) {
                const seed = Math.abs(Math.floor((gx + sx) * 6.7 + (gy + sy) * 12.1)) % 100;
                if (seed % 3 !== 0) continue;
                const jx = ((seed * 37 + 5) % frostSp) - frostSp * 0.4;
                const jy = ((seed * 53 + 19) % frostSp) - frostSp * 0.4;
                const cx = gx + jx, cy = gy + jy;
                ctx.strokeStyle = `rgba(200, 225, 245, ${0.18 + (seed % 8) * 0.012})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(cx, cy);
                let px = cx, py = cy;
                for (let s = 0; s < 2 + seed % 3; s++) {
                    const angle = ((seed * 11 + s * 37) % 100) / 100 * Math.PI * 2;
                    const len = 8 + ((seed * (s + 2)) % 15);
                    px += Math.cos(angle) * len; py += Math.sin(angle) * len;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
        }

        // DECORATION: Icicle clusters - TRULY VARIED sizes and spike counts
        const icSp = 220;
        const icx = (((-sx % icSp) + icSp) % icSp), icy = (((-sy % icSp) + icSp) % icSp);
        for (let gx = icx - icSp; gx <= vw + icSp; gx += icSp) {
            for (let gy = icy - icSp; gy <= vh + icSp; gy += icSp) {
                const cs = Math.abs(Math.floor((gx + sx) * 6.3 + (gy + sy) * 8.7)) % 100;
                if (cs % 3 !== 0) continue;
                const jx = ((cs * 31 + 23) % icSp) - icSp * 0.5;
                const jy = ((cs * 67 + 11) % icSp) - icSp * 0.5;
                const bx = gx + jx * 0.6, by = gy + jy * 0.6;
                const shm = Math.sin(t / 2000 + cs * 0.3) * 0.04;
                // Truly varied: use full seed range for size
                const sizeVal = cs % 10; // 0-9
                let baseH, baseW, spikes;
                if (sizeVal < 2) { baseH = 18 + cs % 8; baseW = 10; spikes = 1; }        // tiny single spike
                else if (sizeVal < 4) { baseH = 28 + cs % 10; baseW = 16; spikes = 2; }  // small pair
                else if (sizeVal < 6) { baseH = 42 + cs % 12; baseW = 24; spikes = 3; }  // medium trio
                else if (sizeVal < 8) { baseH = 55 + cs % 15; baseW = 30; spikes = 4 + cs % 2; }  // large cluster
                else { baseH = 68 + cs % 18; baseW = 38; spikes = 5 + cs % 2; }            // huge formation
                // Ice mound base
                ctx.fillStyle = 'rgba(80, 140, 185, 0.3)';
                ctx.beginPath();
                ctx.ellipse(bx, by + 2, baseW, 4 + spikes, 0, 0, Math.PI * 2);
                ctx.fill();
                // Icicle spikes - each with individual varied height
                for (let i = 0; i < spikes; i++) {
                    const spX = bx + (i - (spikes - 1) / 2) * (5 + cs % 4 + baseW / spikes * 0.6);
                    // Each spike gets its own height variation
                    const heightVar = ((cs * (i * 17 + 7) + i * 31) % 30) / 30;
                    const spH = baseH * (0.5 + heightVar * 0.6);
                    const spW = 2.5 + (cs % 3) + baseW / spikes * 0.3;
                    // Dark face
                    ctx.fillStyle = `rgba(55, 120, 185, ${0.7 + shm})`;
                    ctx.beginPath();
                    ctx.moveTo(spX, by - spH); ctx.lineTo(spX - spW, by); ctx.lineTo(spX, by);
                    ctx.closePath(); ctx.fill();
                    // Light face
                    ctx.fillStyle = `rgba(120, 190, 235, ${0.65 + shm})`;
                    ctx.beginPath();
                    ctx.moveTo(spX, by - spH); ctx.lineTo(spX + spW, by); ctx.lineTo(spX, by);
                    ctx.closePath(); ctx.fill();
                    // Bright edge line
                    ctx.strokeStyle = `rgba(190, 230, 250, ${0.45 + shm})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(spX, by - spH); ctx.lineTo(spX, by - spH * 0.3); ctx.stroke();
                    // Tip glow
                    ctx.fillStyle = `rgba(220, 240, 255, ${0.6 + shm})`;
                    ctx.beginPath(); ctx.arc(spX, by - spH + 2, 1.5 + spikes * 0.15, 0, Math.PI * 2); ctx.fill();
                }
            }
        }

        // DECORATION: Frozen trees - snow follows branch angle, NOT all trees have snow
        const trSp = 350;
        const ftx = (((-sx % trSp) + trSp) % trSp), fty = (((-sy % trSp) + trSp) % trSp);
        for (let gx = ftx - trSp; gx <= vw + trSp; gx += trSp) {
            for (let gy = fty - trSp; gy <= vh + trSp; gy += trSp) {
                const ts = Math.abs(Math.floor((gx + sx) * 11.3 + (gy + sy) * 5.9)) % 100;
                if (ts % 4 !== 0) continue;
                const jx = ((ts * 37 + 29) % trSp) - trSp * 0.5;
                const jy = ((ts * 51 + 13) % trSp) - trSp * 0.5;
                const bx = gx + jx * 0.55, by = gy + jy * 0.55;
                const th = 48 + ts % 18;
                const tw = 5 + ts % 3;
                const trunkColor = `rgb(${60 + ts % 15}, ${70 + ts % 12}, ${90 + ts % 12})`;
                const hasSnow = (ts % 3 !== 2); // ~2/3 have snow, 1/3 bare

                // Trunk
                ctx.fillStyle = trunkColor;
                ctx.fillRect(bx - tw / 2, by - th, tw, th);

                // Branch endpoints & angles
                ctx.strokeStyle = trunkColor;
                ctx.lineWidth = 3;
                // Branch 1: left
                const br1sx = bx, br1sy = by - th * 0.5;
                const br1ex = bx - 20 - ts % 8, br1ey = by - th * 0.78;
                const br1angle = Math.atan2(br1ey - br1sy, br1ex - br1sx);
                ctx.beginPath(); ctx.moveTo(br1sx, br1sy); ctx.lineTo(br1ex, br1ey); ctx.stroke();
                // Branch 2: right
                const br2sx = bx, br2sy = by - th * 0.35;
                const br2ex = bx + 17 + ts % 10, br2ey = by - th * 0.62;
                const br2angle = Math.atan2(br2ey - br2sy, br2ex - br2sx);
                ctx.beginPath(); ctx.moveTo(br2sx, br2sy); ctx.lineTo(br2ex, br2ey); ctx.stroke();
                // Branch 3: upper left
                const br3sx = bx, br3sy = by - th * 0.72;
                const br3ex = bx - 12 - ts % 5, br3ey = by - th * 0.92;
                const br3angle = Math.atan2(br3ey - br3sy, br3ex - br3sx);
                ctx.beginPath(); ctx.moveTo(br3sx, br3sy); ctx.lineTo(br3ex, br3ey); ctx.stroke();

                // Sub-branches
                ctx.lineWidth = 1.5;
                const sub1ex = br1ex - 6 - ts % 4, sub1ey = br1ey - th * 0.12;
                ctx.beginPath(); ctx.moveTo(br1ex, br1ey); ctx.lineTo(sub1ex, sub1ey); ctx.stroke();
                const sub2ex = br2ex + 7 + ts % 5, sub2ey = br2ey - th * 0.14;
                ctx.beginPath(); ctx.moveTo(br2ex, br2ey); ctx.lineTo(sub2ex, sub2ey); ctx.stroke();

                if (hasSnow) {
                    ctx.fillStyle = 'rgba(215, 235, 250, 0.75)';

                    // Snow on branch 1 - rotated to follow branch angle
                    ctx.save(); ctx.translate((br1sx + br1ex) * 0.5, (br1sy + br1ey) * 0.5);
                    ctx.rotate(br1angle);
                    ctx.beginPath(); ctx.ellipse(0, -2.5, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                    // Snow at branch1 tip
                    ctx.save(); ctx.translate(br1ex, br1ey);
                    ctx.rotate(br1angle);
                    ctx.beginPath(); ctx.ellipse(0, -2, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();

                    // Snow on branch 2 - rotated
                    ctx.save(); ctx.translate((br2sx + br2ex) * 0.5, (br2sy + br2ey) * 0.5);
                    ctx.rotate(br2angle);
                    ctx.beginPath(); ctx.ellipse(0, -2.5, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                    // Snow at branch2 tip
                    ctx.save(); ctx.translate(br2ex, br2ey);
                    ctx.rotate(br2angle);
                    ctx.beginPath(); ctx.ellipse(0, -2, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();

                    // Snow on branch 3 - rotated
                    ctx.save(); ctx.translate(br3ex + 3, br3ey);
                    ctx.rotate(br3angle);
                    ctx.beginPath(); ctx.ellipse(0, -2, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();

                    // Snow at base
                    ctx.fillStyle = 'rgba(200, 225, 245, 0.25)';
                    ctx.beginPath();
                    ctx.ellipse(bx, by + 1, 12, 4, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // DECORATION: Snow mounds
        const mndSp = 280;
        const mnx = (((-sx % mndSp) + mndSp) % mndSp), mny = (((-sy % mndSp) + mndSp) % mndSp);
        for (let gx = mnx - mndSp; gx <= vw + mndSp; gx += mndSp) {
            for (let gy = mny - mndSp; gy <= vh + mndSp; gy += mndSp) {
                const ms = Math.abs(Math.floor((gx + sx) * 9.1 + (gy + sy) * 3.7)) % 100;
                if (ms % 4 !== 0) continue;
                const jx = ((ms * 41 + 17) % mndSp) - mndSp * 0.5;
                const jy = ((ms * 59 + 7) % mndSp) - mndSp * 0.5;
                const bx = gx + jx * 0.6, by = gy + jy * 0.6;
                const mw = 22 + ms % 16;
                const mh = 5 + ms % 3;
                ctx.fillStyle = 'rgba(195, 220, 240, 0.2)';
                ctx.beginPath();
                ctx.moveTo(bx - mw, by);
                ctx.quadraticCurveTo(bx - mw * 0.4, by - mh * 1.3, bx, by - mh);
                ctx.quadraticCurveTo(bx + mw * 0.4, by - mh * 1.3, bx + mw, by);
                ctx.closePath(); ctx.fill();
            }
        }
    }

    _drawNeonBackground(ctx, vw, vh, t, sx, sy, bg) {
        // Dark base (gaps between panels)
        ctx.fillStyle = '#060c08';
        ctx.fillRect(0, 0, vw, vh);

        // Uniform tech floor panels - clean aligned grid, same size, NO overlap
        const pw = 64, ph = 64, gap = 3;
        const c0 = Math.floor(sx / pw) - 1, c1 = Math.ceil((sx + vw) / pw) + 1;
        const r0 = Math.floor(sy / ph) - 1, r1 = Math.ceil((sy + vh) / ph) + 1;
        for (let row = r0; row <= r1; row++) {
            for (let col = c0; col <= c1; col++) {
                const x = col * pw - sx, y = row * ph - sy;
                const sd = Math.abs(col * 4219 + row * 8731) % 1000;
                const shade = 14 + (sd % 8);
                ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 2})`;
                ctx.fillRect(x + gap, y + gap, pw - gap * 2, ph - gap * 2);
                // Thin neon panel border
                ctx.strokeStyle = `rgba(0, 200, 100, ${0.05 + (sd % 4) * 0.008})`;
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x + gap, y + gap, pw - gap * 2, ph - gap * 2);
            }
        }

        // Longer neon accent lines across floor
        const lineSp = 200;
        const lg0 = (((-sx % lineSp) + lineSp) % lineSp), lg1 = (((-sy % lineSp) + lineSp) % lineSp);
        for (let gx = lg0 - lineSp; gx <= vw + lineSp; gx += lineSp) {
            for (let gy = lg1 - lineSp; gy <= vh + lineSp; gy += lineSp) {
                const seed = Math.abs(Math.floor((gx + sx) * 4.3 + (gy + sy) * 8.9)) % 100;
                if (seed % 4 !== 0) continue;
                const jx = ((seed * 29 + 7) % lineSp) - lineSp * 0.4;
                const jy = ((seed * 41 + 13) % lineSp) - lineSp * 0.4;
                const cx = gx + jx, cy = gy + jy;
                const len = 40 + seed % 80;
                const horiz = seed % 2 === 0;
                // Glow
                ctx.strokeStyle = `rgba(0, 255, 136, 0.05)`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                if (horiz) { ctx.moveTo(cx, cy); ctx.lineTo(cx + len, cy); }
                else { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + len); }
                ctx.stroke();
                // Line
                ctx.strokeStyle = `rgba(0, 255, 136, ${0.12 + (seed % 6) * 0.015})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // Circuit L-shapes
        const trSp = 180;
        const ttx = (((-sx % trSp) + trSp) % trSp), tty = (((-sy % trSp) + trSp) % trSp);
        for (let gx = ttx - trSp; gx <= vw + trSp; gx += trSp) {
            for (let gy = tty - trSp; gy <= vh + trSp; gy += trSp) {
                const cs = Math.abs(Math.floor((gx + sx) * 2.1 + (gy + sy) * 7.9)) % 100;
                if (cs % 4 !== 0) continue;
                const jx = ((cs * 37 + 5) % trSp) - trSp * 0.4;
                const jy = ((cs * 51 + 17) % trSp) - trSp * 0.4;
                const cx = gx + jx, cy = gy + jy;
                const hLen = 25 + cs % 18, vLen = 20 + cs % 15;
                ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + hLen, cy);
                ctx.lineTo(cx + hLen, cy + vLen);
                ctx.stroke();
                // Pulsing node
                ctx.fillStyle = `rgba(0, 255, 136, ${0.2 + Math.sin(t / 1200 + cs) * 0.1})`;
                ctx.beginPath();
                ctx.arc(cx + hLen, cy, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // DECORATION: Server racks (big, recognizable)
        const rkSp = 300;
        const rkx = (((-sx % rkSp) + rkSp) % rkSp), rky = (((-sy % rkSp) + rkSp) % rkSp);
        for (let gx = rkx - rkSp; gx <= vw + rkSp; gx += rkSp) {
            for (let gy = rky - rkSp; gy <= vh + rkSp; gy += rkSp) {
                const rs = Math.abs(Math.floor((gx + sx) * 9.3 + (gy + sy) * 4.1)) % 100;
                if (rs % 3 !== 0) continue;
                const jx = ((rs * 39 + 7) % rkSp) - rkSp * 0.5;
                const jy = ((rs * 57 + 19) % rkSp) - rkSp * 0.5;
                const bx = gx + jx * 0.6, by = gy + jy * 0.6;
                const rw = 24 + rs % 12;
                const rh = 44 + rs % 20;
                // Shadow
                ctx.fillStyle = 'rgba(0, 20, 10, 0.3)';
                ctx.fillRect(bx - rw / 2 + 4, by - rh + 4, rw, rh);
                // Rack body
                ctx.fillStyle = `rgb(${8 + rs % 4}, ${12 + rs % 4}, ${10 + rs % 4})`;
                ctx.fillRect(bx - rw / 2, by - rh, rw, rh);
                // Border
                ctx.strokeStyle = 'rgba(0, 255, 136, 0.25)';
                ctx.lineWidth = 1;
                ctx.strokeRect(bx - rw / 2, by - rh, rw, rh);
                // Bay dividers + LEDs
                const bays = 4 + rs % 3;
                const bayH = rh / bays;
                for (let b = 0; b < bays; b++) {
                    const yy = by - rh + b * bayH;
                    if (b > 0) {
                        ctx.strokeStyle = 'rgba(0, 255, 136, 0.08)';
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(bx - rw / 2 + 3, yy);
                        ctx.lineTo(bx + rw / 2 - 3, yy);
                        ctx.stroke();
                    }
                    // LED indicators (2 per bay)
                    const on1 = Math.sin(t / 500 + rs + b * 2.5) > 0;
                    ctx.fillStyle = on1 ? 'rgba(0, 255, 100, 0.75)' : 'rgba(0, 60, 25, 0.2)';
                    ctx.fillRect(bx - rw / 2 + 3, yy + bayH * 0.35, 3, 3);
                    const on2 = Math.sin(t / 700 + rs + b * 1.8) > 0.2;
                    ctx.fillStyle = on2 ? 'rgba(255, 180, 0, 0.6)' : 'rgba(60, 40, 0, 0.15)';
                    ctx.fillRect(bx - rw / 2 + 8, yy + bayH * 0.35, 3, 3);
                    // Drive slots
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.fillRect(bx - rw / 2 + 14, yy + bayH * 0.25, rw - 20, bayH * 0.5);
                }
            }
        }

        // DECORATION: Antenna towers (tall, recognizable)
        const anSp = 480;
        const anx = (((-sx % anSp) + anSp) % anSp), any = (((-sy % anSp) + anSp) % anSp);
        for (let gx = anx - anSp; gx <= vw + anSp; gx += anSp) {
            for (let gy = any - anSp; gy <= vh + anSp; gy += anSp) {
                const as = Math.abs(Math.floor((gx + sx) * 5.7 + (gy + sy) * 12.3)) % 100;
                if (as % 5 !== 0) continue;
                const jx = ((as * 47 + 31) % anSp) - anSp * 0.5;
                const jy = ((as * 29 + 41) % anSp) - anSp * 0.5;
                const bx = gx + jx * 0.55, by = gy + jy * 0.55;
                const ah = 52 + as % 20;
                // Pole
                ctx.strokeStyle = `rgb(${30 + as % 8}, ${40 + as % 8}, ${35 + as % 8})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(bx, by); ctx.lineTo(bx, by - ah);
                ctx.stroke();
                // Cross bars
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(bx - 12, by - ah * 0.6); ctx.lineTo(bx + 12, by - ah * 0.6); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(bx - 8, by - ah * 0.8); ctx.lineTo(bx + 8, by - ah * 0.8); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(bx - 5, by - ah * 0.92); ctx.lineTo(bx + 5, by - ah * 0.92); ctx.stroke();
                // Top blinker
                const blink = Math.sin(t / 600 + as) > 0.2;
                ctx.fillStyle = blink ? 'rgba(255, 40, 40, 0.85)' : 'rgba(80, 10, 10, 0.3)';
                ctx.beginPath();
                ctx.arc(bx, by - ah, 3, 0, Math.PI * 2);
                ctx.fill();
                // Base plate
                ctx.fillStyle = `rgb(${18 + as % 4}, ${24 + as % 4}, ${20 + as % 4})`;
                ctx.fillRect(bx - 8, by - 3, 16, 4);
            }
        }
    }

    _drawShadowBackground(ctx, vw, vh, t, sx, sy, bg) {
        // Dark base (slightly brighter so things are more visible)
        ctx.fillStyle = '#120A1E';
        ctx.fillRect(0, 0, vw, vh);

        // Dark earth color variation - radial gradient patches (NO TILES)
        const lz = 220;
        const lx0 = Math.floor(sx / lz) - 1, lx1 = Math.ceil((sx + vw) / lz) + 1;
        const ly0 = Math.floor(sy / lz) - 1, ly1 = Math.ceil((sy + vh) / lz) + 1;
        for (let ly = ly0; ly <= ly1; ly++) {
            const rowOff = (((ly % 2) + 2) % 2) * lz * 0.5;
            for (let lx = lx0; lx <= lx1; lx++) {
                const x = lx * lz + rowOff - sx, y = ly * lz - sy;
                const sd = Math.abs(lx * 5731 + ly * 9173) % 100;
                const r = 18 + (sd % 14);
                const g = 10 + (sd % 10);
                const b = 24 + (sd % 16);
                const cx = x + lz * 0.5, cy = y + lz * 0.5;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, lz * 0.6);
                grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
                grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(x - 20, y - 20, lz + 40, lz + 40);
            }
        }
        // Medium detail patches
        const mz = 110;
        const mx0 = Math.floor(sx / mz) - 1, mx1 = Math.ceil((sx + vw) / mz) + 1;
        const myy0 = Math.floor(sy / mz) - 1, myy1 = Math.ceil((sy + vh) / mz) + 1;
        for (let my = myy0; my <= myy1; my++) {
            const rowOff = (((my % 3) + 3) % 3) * mz * 0.33;
            for (let mx = mx0; mx <= mx1; mx++) {
                const sd = Math.abs(mx * 7219 + my * 3491) % 100;
                if (sd % 3 !== 0) continue;
                const x = mx * mz + rowOff - sx, y = my * mz - sy;
                const r = 20 + (sd % 12), g = 12 + (sd % 9), b = 28 + (sd % 14);
                const cx = x + mz * 0.5, cy = y + mz * 0.5;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, mz * 0.5);
                grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
                grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(x - 8, y - 8, mz + 16, mz + 16);
            }
        }

        // Eerie purple glow spots
        const glowSp = 300;
        const gx0 = (((-sx % glowSp) + glowSp) % glowSp), gy0 = (((-sy % glowSp) + glowSp) % glowSp);
        for (let gx = gx0 - glowSp; gx <= vw + glowSp; gx += glowSp) {
            for (let gy = gy0 - glowSp; gy <= vh + glowSp; gy += glowSp) {
                const gs = Math.abs(Math.floor((gx + sx) * 4.3 + (gy + sy) * 9.1)) % 100;
                if (gs % 3 !== 0) continue;
                const jx = ((gs * 37 + 11) % glowSp) - glowSp * 0.5;
                const jy = ((gs * 53 + 19) % glowSp) - glowSp * 0.5;
                const cx = gx + jx * 0.5, cy = gy + jy * 0.5;
                const gr = 30 + gs % 25;
                const pulse = Math.sin(t / 2500 + gs * 0.5) * 0.03;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
                grad.addColorStop(0, `rgba(110, 10, 190, ${0.14 + pulse})`);
                grad.addColorStop(0.6, `rgba(70, 5, 130, ${0.06 + pulse})`);
                grad.addColorStop(1, 'rgba(40, 0, 80, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
            }
        }

        // Dark cracks/veins in the ground
        const crSp = 120;
        const ckx = (((-sx % crSp) + crSp) % crSp), cky = (((-sy % crSp) + crSp) % crSp);
        for (let gx = ckx - crSp; gx <= vw + crSp; gx += crSp) {
            for (let gy = cky - crSp; gy <= vh + crSp; gy += crSp) {
                const seed = Math.abs(Math.floor((gx + sx) * 5.3 + (gy + sy) * 10.7)) % 100;
                if (seed % 3 !== 0) continue;
                const jx = ((seed * 29 + 3) % crSp) - crSp * 0.4;
                const jy = ((seed * 47 + 17) % crSp) - crSp * 0.4;
                const cx = gx + jx, cy = gy + jy;
                ctx.strokeStyle = 'rgba(90, 10, 150, 0.1)';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(cx, cy);
                let px = cx, py = cy;
                for (let s = 0; s < 3 + seed % 3; s++) {
                    const angle = ((seed * 9 + s * 43) % 100) / 100 * Math.PI * 2;
                    const len = 12 + ((seed * (s + 2)) % 20);
                    px += Math.cos(angle) * len; py += Math.sin(angle) * len;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
                ctx.strokeStyle = `rgba(${90 + seed % 30}, 10, ${140 + seed % 40}, 0.18)`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }

        // DECORATION: Tombstones (BIGGER)
        const grSp = 300;
        const gvx = (((-sx % grSp) + grSp) % grSp), gvy = (((-sy % grSp) + grSp) % grSp);
        for (let gx = gvx - grSp; gx <= vw + grSp; gx += grSp) {
            for (let gy = gvy - grSp; gy <= vh + grSp; gy += grSp) {
                const gs = Math.abs(Math.floor((gx + sx) * 8.1 + (gy + sy) * 5.3)) % 100;
                if (gs % 3 !== 0) continue;
                const jx = ((gs * 43 + 11) % grSp) - grSp * 0.5;
                const jy = ((gs * 59 + 17) % grSp) - grSp * 0.5;
                const bx = gx + jx * 0.6, by = gy + jy * 0.6;
                const gw = 22 + gs % 12;
                const gh = 38 + gs % 18;
                // Shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fillRect(bx - gw / 2 + 4, by - 4, gw, 8);
                // Tombstone body (rounded top rectangle)
                ctx.fillStyle = `rgb(${48 + gs % 15}, ${38 + gs % 10}, ${55 + gs % 15})`;
                ctx.beginPath();
                ctx.moveTo(bx - gw / 2, by);
                ctx.lineTo(bx - gw / 2, by - gh + gw / 2);
                ctx.arc(bx, by - gh + gw / 2, gw / 2, Math.PI, 0);
                ctx.lineTo(bx + gw / 2, by);
                ctx.closePath(); ctx.fill();
                // Outline
                ctx.strokeStyle = 'rgba(80, 60, 100, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(bx - gw / 2, by);
                ctx.lineTo(bx - gw / 2, by - gh + gw / 2);
                ctx.arc(bx, by - gh + gw / 2, gw / 2, Math.PI, 0);
                ctx.lineTo(bx + gw / 2, by);
                ctx.stroke();
                // Cross marking
                ctx.strokeStyle = 'rgba(80, 55, 100, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(bx, by - gh * 0.72); ctx.lineTo(bx, by - gh * 0.2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(bx - gw * 0.28, by - gh * 0.52); ctx.lineTo(bx + gw * 0.28, by - gh * 0.52); ctx.stroke();
            }
        }

        // DECORATION: Dead twisted trees (BIGGER)
        const dtSp = 400;
        const dtx = (((-sx % dtSp) + dtSp) % dtSp), dty = (((-sy % dtSp) + dtSp) % dtSp);
        for (let gx = dtx - dtSp; gx <= vw + dtSp; gx += dtSp) {
            for (let gy = dty - dtSp; gy <= vh + dtSp; gy += dtSp) {
                const ds = Math.abs(Math.floor((gx + sx) * 4.9 + (gy + sy) * 10.7)) % 100;
                if (ds % 4 !== 0) continue;
                const jx = ((ds * 37 + 29) % dtSp) - dtSp * 0.5;
                const jy = ((ds * 53 + 7) % dtSp) - dtSp * 0.5;
                const bx = gx + jx * 0.55, by = gy + jy * 0.55;
                const dh = 65 + ds % 25;
                const dw = 5 + ds % 3;
                const treeColor = `rgb(${28 + ds % 12}, ${18 + ds % 8}, ${32 + ds % 12})`;
                ctx.strokeStyle = treeColor;
                // Trunk (curved)
                ctx.lineWidth = dw;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.quadraticCurveTo(bx + Math.sin(ds * 0.3) * 10, by - dh * 0.5, bx + Math.sin(ds * 0.7) * 5, by - dh);
                ctx.stroke();
                // Branches
                ctx.lineWidth = dw * 0.7;
                ctx.beginPath(); ctx.moveTo(bx + Math.sin(ds * 0.5) * 6, by - dh * 0.5);
                ctx.quadraticCurveTo(bx - 18, by - dh * 0.65, bx - 28 - ds % 10, by - dh * 0.82); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(bx + Math.sin(ds * 0.5) * 6, by - dh * 0.65);
                ctx.quadraticCurveTo(bx + 16, by - dh * 0.75, bx + 26 + ds % 12, by - dh * 0.9); ctx.stroke();
                // Sub-branches
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(bx - 28 - ds % 10, by - dh * 0.82);
                ctx.lineTo(bx - 36 - ds % 6, by - dh * 0.94); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(bx + 26 + ds % 12, by - dh * 0.9);
                ctx.lineTo(bx + 36 + ds % 6, by - dh); ctx.stroke();
                // Extra branch
                ctx.lineWidth = dw * 0.5;
                ctx.beginPath(); ctx.moveTo(bx + Math.sin(ds * 0.5) * 5, by - dh * 0.38);
                ctx.quadraticCurveTo(bx + 12, by - dh * 0.5, bx + 18 + ds % 6, by - dh * 0.55); ctx.stroke();
                // Roots
                ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.moveTo(bx - 3, by);
                ctx.quadraticCurveTo(bx - 14, by + 6, bx - 18, by + 3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(bx + 3, by);
                ctx.quadraticCurveTo(bx + 11, by + 7, bx + 16, by + 2); ctx.stroke();
            }
        }

        // DECORATION: Skull piles (BIGGER)
        const skSp = 450;
        const skx = (((-sx % skSp) + skSp) % skSp), sky = (((-sy % skSp) + skSp) % skSp);
        for (let gx = skx - skSp; gx <= vw + skSp; gx += skSp) {
            for (let gy = sky - skSp; gy <= vh + skSp; gy += skSp) {
                const ss = Math.abs(Math.floor((gx + sx) * 12.7 + (gy + sy) * 6.1)) % 100;
                if (ss % 5 !== 0) continue;
                const jx = ((ss * 41 + 13) % skSp) - skSp * 0.5;
                const jy = ((ss * 67 + 23) % skSp) - skSp * 0.5;
                const bx = gx + jx * 0.55, by = gy + jy * 0.55;
                const sz = 12 + ss % 6;
                // Skull head
                ctx.fillStyle = `rgba(${55 + ss % 18}, ${45 + ss % 12}, ${60 + ss % 18}, 0.75)`;
                ctx.beginPath();
                ctx.arc(bx, by - sz * 0.3, sz, 0, Math.PI * 2);
                ctx.fill();
                // Jaw
                ctx.beginPath();
                ctx.moveTo(bx - sz * 0.7, by + sz * 0.3);
                ctx.lineTo(bx - sz * 0.5, by + sz * 0.85);
                ctx.lineTo(bx + sz * 0.5, by + sz * 0.85);
                ctx.lineTo(bx + sz * 0.7, by + sz * 0.3);
                ctx.closePath(); ctx.fill();
                // Eye sockets
                ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                ctx.beginPath(); ctx.arc(bx - sz * 0.35, by - sz * 0.4, sz * 0.25, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(bx + sz * 0.35, by - sz * 0.4, sz * 0.25, 0, Math.PI * 2); ctx.fill();
                // Nose
                ctx.beginPath();
                ctx.moveTo(bx, by - sz * 0.05);
                ctx.lineTo(bx - sz * 0.14, by + sz * 0.18);
                ctx.lineTo(bx + sz * 0.14, by + sz * 0.18);
                ctx.closePath(); ctx.fill();
            }
        }

        // DECORATION: Glowing runes on ground (BIGGER)
        const rnSp = 350;
        const rnx = (((-sx % rnSp) + rnSp) % rnSp), rny = (((-sy % rnSp) + rnSp) % rnSp);
        for (let gx = rnx - rnSp; gx <= vw + rnSp; gx += rnSp) {
            for (let gy = rny - rnSp; gy <= vh + rnSp; gy += rnSp) {
                const rs = Math.abs(Math.floor((gx + sx) * 3.7 + (gy + sy) * 8.9)) % 100;
                if (rs % 5 !== 0) continue;
                const jx = ((rs * 47 + 31) % rnSp) - rnSp * 0.5;
                const jy = ((rs * 29 + 41) % rnSp) - rnSp * 0.5;
                const bx = gx + jx * 0.5, by = gy + jy * 0.5;
                const rsz = 14 + rs % 10;
                const pulse = Math.sin(t / 2000 + rs * 0.7) * 0.08;
                // Outer glow
                const grd = ctx.createRadialGradient(bx, by, rsz * 0.8, bx, by, rsz * 1.5);
                grd.addColorStop(0, `rgba(120, 0, 200, ${0.06 + pulse})`);
                grd.addColorStop(1, 'rgba(80, 0, 160, 0)');
                ctx.fillStyle = grd;
                ctx.fillRect(bx - rsz * 1.5, by - rsz * 1.5, rsz * 3, rsz * 3);
                // Rune circle
                ctx.strokeStyle = `rgba(140, 10, 210, ${0.18 + pulse})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(bx, by, rsz, 0, Math.PI * 2); ctx.stroke();
                // Inner symbol
                ctx.strokeStyle = `rgba(170, 40, 250, ${0.24 + pulse})`;
                ctx.lineWidth = 1.2;
                const sym = rs % 4;
                if (sym === 0) {
                    ctx.beginPath(); ctx.moveTo(bx, by - rsz * 0.6); ctx.lineTo(bx, by + rsz * 0.6); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(bx - rsz * 0.6, by); ctx.lineTo(bx + rsz * 0.6, by); ctx.stroke();
                } else if (sym === 1) {
                    ctx.beginPath();
                    ctx.moveTo(bx, by - rsz * 0.6);
                    ctx.lineTo(bx - rsz * 0.5, by + rsz * 0.4);
                    ctx.lineTo(bx + rsz * 0.5, by + rsz * 0.4);
                    ctx.closePath(); ctx.stroke();
                } else if (sym === 2) {
                    ctx.beginPath();
                    ctx.moveTo(bx, by - rsz * 0.6); ctx.lineTo(bx + rsz * 0.5, by);
                    ctx.lineTo(bx, by + rsz * 0.6); ctx.lineTo(bx - rsz * 0.5, by);
                    ctx.closePath(); ctx.stroke();
                } else {
                    for (let i = 0; i < 5; i++) {
                        const a1 = (Math.PI * 2 / 5) * i - Math.PI / 2;
                        const a2 = (Math.PI * 2 / 5) * ((i + 2) % 5) - Math.PI / 2;
                        ctx.beginPath();
                        ctx.moveTo(bx + Math.cos(a1) * rsz * 0.55, by + Math.sin(a1) * rsz * 0.55);
                        ctx.lineTo(bx + Math.cos(a2) * rsz * 0.55, by + Math.sin(a2) * rsz * 0.55);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    drawArenaBounds(ctx) {
        // No visible bounds in seamless toroidal world
    }

    /**
     * Draw minimap (player-centered, toroidal world with wrapped distances)
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawMinimap(ctx) {
        const size = 120;
        const margin = 10;
        const x = this.canvas.width - size - margin;
        const y = margin;
        const viewRadius = 400; // How far to show on minimap
        const scale = size / (viewRadius * 2);
        const centerX = x + size / 2;
        const centerY = y + size / 2;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
        ctx.stroke();

        // Clip to circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2 - 2, 0, Math.PI * 2);
        ctx.clip();

        // Enemies (red dots) - using wrapped distance for toroidal world
        ctx.fillStyle = '#ff4444';
        for (const enemy of this.enemies) {
            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y);
            if (wrapped.distance < viewRadius) {
                const ex = centerX - wrapped.dx * scale; // Negative because wrapped.dx is player->enemy
                const ey = centerY - wrapped.dy * scale;
                ctx.beginPath();
                ctx.arc(ex, ey, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Boss (large orange dot) - using wrapped distance
        for (const boss of this.bosses) {
            if (boss && !boss.isDead()) {
                const wrapped = this.getWrappedDistance(this.player.x, this.player.y, boss.x, boss.y);
                ctx.fillStyle = '#ff8800';
                const bx = centerX - wrapped.dx * scale;
                const by = centerY - wrapped.dy * scale;
                ctx.beginPath();
                ctx.arc(bx, by, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Mini-boss (orange dot) - using wrapped distance
        if (this.miniBoss && !this.miniBoss.isDead()) {
            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, this.miniBoss.x, this.miniBoss.y);
            ctx.fillStyle = '#ff6600';
            const mx = centerX - wrapped.dx * scale;
            const my = centerY - wrapped.dy * scale;
            ctx.beginPath();
            ctx.arc(mx, my, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Pickups (small colored dots) - using wrapped distance
        for (const pickup of this.pickups) {
            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, pickup.x, pickup.y);
            if (wrapped.distance < viewRadius) {
                ctx.fillStyle = pickup.type === 'xp' ? '#00ff00' : '#ffff00';
                const px = centerX - wrapped.dx * scale;
                const py = centerY - wrapped.dy * scale;
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Portal (pulsing purple dot) - using wrapped distance
        if (this.portal && this.portal.active) {
            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, this.portal.x, this.portal.y);
            const portalPulse = 0.6 + Math.sin(Date.now() / 300) * 0.4;
            ctx.fillStyle = `rgba(180, 100, 255, ${portalPulse})`;
            const ppx = centerX - wrapped.dx * scale;
            const ppy = centerY - wrapped.dy * scale;
            ctx.beginPath();
            ctx.arc(ppx, ppy, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Player (cyan dot) - always at center
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + this.player.facingDirection.x * 10,
            centerY + this.player.facingDirection.y * 10
        );
        ctx.stroke();
    }

    /**
     * Update camera to follow player (seamless toroidal - no teleport)
     */
    updateCamera() {
        if (!this.player) return;

        const W = CONFIG.ARENA.WIDTH;
        const H = CONFIG.ARENA.HEIGHT;

        // Effective viewport size based on zoom
        const viewWidth = this.canvas.width / this.camera.zoom;
        const viewHeight = this.canvas.height / this.camera.zoom;

        // Camera tracks player directly - no smoothing to avoid wrap issues
        // The camera position is simply centered on player
        this.camera.x = this.player.x - viewWidth / 2;
        this.camera.y = this.player.y - viewHeight / 2;
    }

    /**
     * Convert world position to screen position (handles toroidal wrapping)
     * @param {number} worldX 
     * @param {number} worldY 
     * @returns {{x: number, y: number, visible: boolean}}
     */
    worldToScreen(worldX, worldY) {
        const W = CONFIG.ARENA.WIDTH;
        const H = CONFIG.ARENA.HEIGHT;

        // Effective viewport size based on zoom
        const viewWidth = this.canvas.width / this.camera.zoom;
        const viewHeight = this.canvas.height / this.camera.zoom;

        // Get player position as reference
        const playerX = this.player.x;
        const playerY = this.player.y;

        // Calculate wrapped difference from player
        let dx = worldX - playerX;
        let dy = worldY - playerY;

        // Wrap to shortest path
        if (dx > W / 2) dx -= W;
        if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H;
        if (dy < -H / 2) dy += H;

        // Screen position relative to center (in zoomed coordinates)
        const screenX = viewWidth / 2 + dx;
        const screenY = viewHeight / 2 + dy;

        // Check if visible on screen (with margin) - use zoomed viewport
        const margin = 100;
        const visible = screenX > -margin && screenX < viewWidth + margin &&
            screenY > -margin && screenY < viewHeight + margin;

        return { x: screenX, y: screenY, visible };
    }

    /**
     * Wrap coordinate for infinite toroidal world
     * @param {number} value - Current coordinate
     * @param {number} max - Maximum value (arena size)
     * @returns {number} Wrapped coordinate
     */
    wrapCoordinate(value, max) {
        if (value < 0) return value + max;
        if (value >= max) return value - max;
        return value;
    }

    /**
     * Get wrapped distance between two points (shortest path in toroidal world)
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @returns {Object} {dx, dy, distance}
     */
    getWrappedDistance(x1, y1, x2, y2) {
        let dx = x2 - x1;
        let dy = y2 - y1;

        // Wrap horizontally
        if (Math.abs(dx) > CONFIG.ARENA.WIDTH / 2) {
            dx = dx > 0 ? dx - CONFIG.ARENA.WIDTH : dx + CONFIG.ARENA.WIDTH;
        }

        // Wrap vertically
        if (Math.abs(dy) > CONFIG.ARENA.HEIGHT / 2) {
            dy = dy > 0 ? dy - CONFIG.ARENA.HEIGHT : dy + CONFIG.ARENA.HEIGHT;
        }

        return {
            dx,
            dy,
            distance: Math.hypot(dx, dy)
        };
    }

    /**
     * Fire player weapons
     * @param {number} deltaTime 
     */
    fireWeapons(deltaTime) {
        // Weapons disabled check (emPulser EMP effect)
        if (this.player._weaponsDisabled) return;

        // Find nearest enemy using wrapped distance (toroidal world)
        let nearestEnemy = null;
        let nearestDist = Infinity;

        for (const enemy of this.enemies) {
            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y);
            if (wrapped.distance < nearestDist) {
                nearestDist = wrapped.distance;
                nearestEnemy = enemy;
            }
        }

        // Also check mini-boss and boss
        if (this.miniBoss && !this.miniBoss.isDead()) {
            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, this.miniBoss.x, this.miniBoss.y);
            if (wrapped.distance < nearestDist) {
                nearestDist = wrapped.distance;
                nearestEnemy = this.miniBoss;
            }
        }

        // Check all bosses
        for (const boss of this.bosses) {
            if (boss && !boss.isDead()) {
                const wrapped = this.getWrappedDistance(this.player.x, this.player.y, boss.x, boss.y);
                if (wrapped.distance < nearestDist) {
                    nearestDist = wrapped.distance;
                    nearestEnemy = boss;
                }
            }
        }

        // Fire weapons toward nearest enemy
        for (const weapon of this.player.weapons) {
            if (!weapon) continue;

            // Check if nearest enemy is within weapon range
            let targetEnemy = null;
            if (nearestEnemy && nearestDist <= weapon.range) {
                targetEnemy = nearestEnemy;
            }

            // Only fire if there's an enemy in range
            const projectiles = weapon.fire(deltaTime, this.player, targetEnemy, this);
            if (projectiles) {
                this.projectiles.push(...projectiles);
                // Sound removed - too frequent
            }

            // Update continuous weapons
            weapon.update(deltaTime, this.player);
        }

        // Apply laser and forcefield damage
        this.updateSpecialWeaponsDamage(deltaTime);
    }

    /**
     * Update special weapons damage (laser, forcefield)
     * @param {number} deltaTime
     */
    updateSpecialWeaponsDamage(deltaTime) {
        for (const weapon of this.player.weapons) {
            if (!weapon) continue;

            // Laser beam - powerful burst with cooldown
            if (weapon.type === 'laser') {
                // Initialize laser state if needed
                if (weapon.laserCooldown === undefined) {
                    weapon.laserCooldown = 0;
                    weapon.laserFiring = false;
                    weapon.laserTimer = 0;
                    weapon.laserAngle = 0;
                    weapon.laserTarget = null;
                }

                // Update cooldown (sync with weapon.cooldown for UI)
                if (weapon.laserCooldown > 0) {
                    weapon.laserCooldown -= deltaTime * 1000;
                    weapon.cooldown = weapon.laserCooldown; // Sync for UI display
                } else {
                    weapon.cooldown = 0;
                }

                // Update firing animation
                if (weapon.laserFiring) {
                    weapon.laserTimer -= deltaTime * 1000;
                    if (weapon.laserTimer <= 0) {
                        weapon.laserFiring = false;
                    }
                }

                // Fire when ready
                if (weapon.laserCooldown <= 0 && !weapon.laserFiring) {
                    // Find nearest enemy using wrapped distance
                    let nearest = null;
                    let nearestDist = weapon.range;

                    for (const enemy of this.enemies) {
                        const wrapped = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y);
                        if (wrapped.distance < nearestDist) {
                            nearestDist = wrapped.distance;
                            nearest = enemy;
                        }
                    }

                    // Check miniboss
                    if (this.miniBoss && !this.miniBoss.isDead()) {
                        const wrapped = this.getWrappedDistance(this.player.x, this.player.y, this.miniBoss.x, this.miniBoss.y);
                        if (wrapped.distance < nearestDist) {
                            nearestDist = wrapped.distance;
                            nearest = this.miniBoss;
                        }
                    }

                    // Check boss
                    for (const boss of this.bosses) {
                        if (boss && !boss.isDead()) {
                            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, boss.x, boss.y);
                            if (wrapped.distance < nearestDist) {
                                nearestDist = wrapped.distance;
                                nearest = boss;
                            }
                        }
                    }

                    if (nearest) {
                        // Calculate angle to target
                        const wrapped = this.getWrappedDistance(this.player.x, this.player.y, nearest.x, nearest.y);
                        weapon.laserAngle = Math.atan2(wrapped.dy, wrapped.dx);
                        weapon.laserFiring = true;
                        weapon.laserTimer = CONFIG.WEAPONS.laser.beamDuration;
                        weapon.laserCooldown = weapon.fireRate;

                        // Damage ALL enemies in the beam path (piercing)
                        const beamLength = weapon.range;
                        const beamWidth = weapon.width * 2;

                        // Check all enemies for beam collision
                        const allTargets = [...this.enemies];
                        if (this.miniBoss && !this.miniBoss.isDead()) allTargets.push(this.miniBoss);
                        for (const boss of this.bosses) {
                            if (boss && !boss.isDead()) allTargets.push(boss);
                        }

                        for (const enemy of allTargets) {
                            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y);
                            if (wrapped.distance > beamLength) continue;

                            // Check if enemy is within beam width (using perpendicular distance)
                            const enemyAngle = Math.atan2(wrapped.dy, wrapped.dx);
                            let angleDiff = Math.abs(enemyAngle - weapon.laserAngle);
                            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                            // Skip enemies behind the beam
                            if (angleDiff > Math.PI / 2) continue;
                            const perpDist = Math.sin(angleDiff) * wrapped.distance;

                            if (Math.abs(perpDist) < beamWidth + enemy.radius) {
                                const hit = this.calcPlayerDamage(weapon.damage);
                                enemy.takeDamage(hit.damage);
                                if (hit.isCrit) this.particles.createDamageNumber(enemy.x, enemy.y, Math.round(hit.damage), true);
                                this.particles.createHitEffect(enemy.x, enemy.y, '#00ffff');

                                if (enemy.isDead()) {
                                    this.handleEnemyDeath(enemy);
                                }
                            }
                        }

                        // Screen shake and sound
                        this.ui.triggerScreenShake(8, 200);
                        // Sound removed - too frequent
                    }
                }
            }

            // Forcefield - damages all enemies inside radius
            if (weapon.type === 'forcefield') {
                const ffDmg = weapon.damage * this.player.stats.damageMultiplier * deltaTime * 10;
                // Check all enemies
                for (const enemy of this.enemies) {
                    const wrapped = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y);
                    if (wrapped.distance < weapon.radius) {
                        enemy.takeDamage(ffDmg);

                        if (enemy.isDead()) {
                            this.handleEnemyDeath(enemy);
                        }
                    }
                }

                // Check miniboss
                if (this.miniBoss && !this.miniBoss.isDead()) {
                    const wrapped = this.getWrappedDistance(this.player.x, this.player.y, this.miniBoss.x, this.miniBoss.y);
                    if (wrapped.distance < weapon.radius) {
                        this.miniBoss.takeDamage(ffDmg);
                    }
                }

                // Check all bosses
                for (const boss of this.bosses) {
                    if (boss && !boss.isDead()) {
                        const wrapped = this.getWrappedDistance(this.player.x, this.player.y, boss.x, boss.y);
                        if (wrapped.distance < weapon.radius) {
                            boss.takeDamage(ffDmg);
                        }
                    }
                }
            }

            // Tesla Coil â€” chain lightning to nearest + chained targets
            if (weapon.type === 'teslaCoil') {
                if (weapon._teslaCooldown === undefined) weapon._teslaCooldown = 0;
                if (weapon._teslaChain === undefined) weapon._teslaChain = null;

                weapon._teslaCooldown -= deltaTime * 1000;

                if (weapon._teslaCooldown <= 0) {
                    // Find nearest enemy
                    let nearest = null;
                    let nearestDist = weapon.range;
                    const allTargets = [...this.enemies];
                    if (this.miniBoss && !this.miniBoss.isDead()) allTargets.push(this.miniBoss);
                    for (const boss of this.bosses) {
                        if (boss && !boss.isDead()) allTargets.push(boss);
                    }

                    for (const enemy of allTargets) {
                        const d = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y).distance;
                        if (d < nearestDist) {
                            nearestDist = d;
                            nearest = enemy;
                        }
                    }

                    if (nearest) {
                        weapon._teslaCooldown = weapon.fireRate;
                        const chainTargets = weapon.chainTargets || 3;
                        const chainRange = weapon.chainRange || 120;
                        const chain = [nearest];
                        const hit = new Set([nearest]);

                        // Damage primary
                        const teslaHit = this.calcPlayerDamage(weapon.damage);
                        nearest.takeDamage(teslaHit.damage);
                        if (teslaHit.isCrit) this.particles.createDamageNumber(nearest.x, nearest.y, Math.round(teslaHit.damage), true);
                        if (nearest.isDead()) this.handleEnemyDeath(nearest);

                        // Chain to nearby enemies
                        let current = nearest;
                        for (let c = 0; c < chainTargets; c++) {
                            let nextTarget = null;
                            let nextDist = chainRange;
                            for (const enemy of allTargets) {
                                if (hit.has(enemy) || enemy.isDead()) continue;
                                const d = this.getWrappedDistance(current.x, current.y, enemy.x, enemy.y).distance;
                                if (d < nextDist) {
                                    nextDist = d;
                                    nextTarget = enemy;
                                }
                            }
                            if (!nextTarget) break;
                            hit.add(nextTarget);
                            chain.push(nextTarget);
                            const chainHit = this.calcPlayerDamage(weapon.damage * (0.7 - c * 0.1));
                            nextTarget.takeDamage(chainHit.damage);
                            if (chainHit.isCrit) this.particles.createDamageNumber(nextTarget.x, nextTarget.y, Math.round(chainHit.damage), true);
                            if (nextTarget.isDead()) this.handleEnemyDeath(nextTarget);
                            current = nextTarget;
                        }

                        // Store chain for rendering
                        weapon._teslaChain = chain.map(e => ({ x: e.x, y: e.y }));
                        weapon._teslaChainTime = 200; // ms to display
                    }
                }

                // Decay chain display
                if (weapon._teslaChainTime > 0) {
                    weapon._teslaChainTime -= deltaTime * 1000;
                    if (weapon._teslaChainTime <= 0) weapon._teslaChain = null;
                }
            }

            // Soul Drain â€” beam to nearest, lifeSteal
            if (weapon.type === 'soulDrain') {
                let nearest = null;
                let nearestDist = weapon.range;
                const allTargets = [...this.enemies];
                if (this.miniBoss && !this.miniBoss.isDead()) allTargets.push(this.miniBoss);
                for (const boss of this.bosses) {
                    if (boss && !boss.isDead()) allTargets.push(boss);
                }

                for (const enemy of allTargets) {
                    const d = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y).distance;
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearest = enemy;
                    }
                }

                weapon._soulTarget = nearest;
                if (nearest) {
                    const dmg = weapon.damage * this.player.stats.damageMultiplier * deltaTime * 10;
                    nearest.takeDamage(dmg);
                    // Life steal
                    const heal = dmg * (weapon.lifeSteal || 0.15);
                    this.player.heal(heal);
                    if (nearest.isDead()) this.handleEnemyDeath(nearest);
                }
            }
        }
    }

    /**
     * Render special weapons (laser, forcefield)
     * @param {CanvasRenderingContext2D} ctx
     */
    renderSpecialWeapons(ctx) {
        // Use zoomed viewport center (since ctx is already scaled)
        const viewWidth = this.canvas.width / this.camera.zoom;
        const viewHeight = this.canvas.height / this.camera.zoom;
        const playerScreenX = viewWidth / 2;
        const playerScreenY = viewHeight / 2;

        for (const weapon of this.player.weapons) {
            if (!weapon) continue;

            // Draw laser beam - powerful burst animation
            if (weapon.type === 'laser' && weapon.laserFiring) {
                const beamLength = weapon.range;
                const endX = playerScreenX + Math.cos(weapon.laserAngle) * beamLength;
                const endY = playerScreenY + Math.sin(weapon.laserAngle) * beamLength;

                // Calculate beam intensity based on timer
                const progress = weapon.laserTimer / CONFIG.WEAPONS.laser.beamDuration;
                const intensity = Math.sin(progress * Math.PI); // Fade in and out
                const beamWidth = weapon.width * (1 + (1 - progress) * 0.5); // Slight expand as it fades

                ctx.save();

                // Outer glow
                ctx.strokeStyle = `rgba(0, 255, 255, ${0.15 * intensity})`;
                ctx.lineWidth = beamWidth * 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(playerScreenX, playerScreenY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Middle glow
                ctx.strokeStyle = `rgba(100, 255, 255, ${0.3 * intensity})`;
                ctx.lineWidth = beamWidth * 2;
                ctx.beginPath();
                ctx.moveTo(playerScreenX, playerScreenY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Core beam (bright white-cyan)
                const gradient = ctx.createLinearGradient(
                    playerScreenX, playerScreenY, endX, endY
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
                gradient.addColorStop(0.5, `rgba(0, 255, 255, ${intensity})`);
                gradient.addColorStop(1, `rgba(255, 255, 255, ${0.5 * intensity})`);

                ctx.strokeStyle = gradient;
                ctx.lineWidth = beamWidth;
                ctx.beginPath();
                ctx.moveTo(playerScreenX, playerScreenY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Inner core (pure white)
                ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
                ctx.lineWidth = beamWidth * 0.4;
                ctx.beginPath();
                ctx.moveTo(playerScreenX, playerScreenY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Impact flash at end (smaller)
                const impactSize = 15 + Math.random() * 10;
                const impactGradient = ctx.createRadialGradient(endX, endY, 0, endX, endY, impactSize * intensity);
                impactGradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
                impactGradient.addColorStop(0.4, `rgba(0, 255, 255, ${0.6 * intensity})`);
                impactGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

                ctx.fillStyle = impactGradient;
                ctx.beginPath();
                ctx.arc(endX, endY, impactSize * intensity, 0, Math.PI * 2);
                ctx.fill();

                // Small muzzle flash
                const muzzleGradient = ctx.createRadialGradient(playerScreenX, playerScreenY, 0, playerScreenX, playerScreenY, 20 * intensity);
                muzzleGradient.addColorStop(0, `rgba(255, 255, 255, ${0.6 * intensity})`);
                muzzleGradient.addColorStop(0.5, `rgba(0, 255, 255, ${0.3 * intensity})`);
                muzzleGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

                ctx.fillStyle = muzzleGradient;
                ctx.beginPath();
                ctx.arc(playerScreenX, playerScreenY, 20 * intensity, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }

            // Draw forcefield
            if (weapon.type === 'forcefield') {
                ctx.save();
                ctx.translate(playerScreenX, playerScreenY);
                ctx.rotate(weapon.rotation);

                // Outer ring
                ctx.strokeStyle = 'rgba(0, 191, 255, 0.6)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, weapon.radius, 0, Math.PI * 2);
                ctx.stroke();

                // Inner glow
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, weapon.radius);
                gradient.addColorStop(0, 'rgba(0, 191, 255, 0)');
                gradient.addColorStop(0.6, 'rgba(0, 191, 255, 0.05)');
                gradient.addColorStop(0.9, 'rgba(0, 191, 255, 0.15)');
                gradient.addColorStop(1, 'rgba(0, 191, 255, 0.3)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, weapon.radius, 0, Math.PI * 2);
                ctx.fill();

                // Rotating segments
                ctx.strokeStyle = '#00bfff';
                ctx.lineWidth = 3;
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    ctx.beginPath();
                    ctx.arc(0, 0, weapon.radius - 5, angle, angle + Math.PI / 6);
                    ctx.stroke();
                }

                ctx.restore();
            }

            // Draw Tesla Coil chain lightning
            if (weapon.type === 'teslaCoil' && weapon._teslaChain && weapon._teslaChainTime > 0) {
                ctx.save();
                const alpha = Math.min(1, weapon._teslaChainTime / 100);
                const screenChain = weapon._teslaChain.map(p => this.worldToScreen(p.x, p.y));

                // Draw chain from player to first, then between targets
                let prevX = playerScreenX;
                let prevY = playerScreenY;

                for (let i = 0; i < screenChain.length; i++) {
                    const p = screenChain[i];
                    // Jagged lightning segments
                    ctx.strokeStyle = `rgba(0, 255, 136, ${0.8 * alpha})`;
                    ctx.lineWidth = 4 - i * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(prevX, prevY);
                    // 2 intermediate jagged points
                    const mx1 = (prevX + p.x) / 2 + (Math.random() - 0.5) * 30;
                    const my1 = (prevY + p.y) / 2 + (Math.random() - 0.5) * 30;
                    ctx.lineTo(mx1, my1);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();

                    // Glow
                    ctx.strokeStyle = `rgba(0, 255, 136, ${0.2 * alpha})`;
                    ctx.lineWidth = 12 - i * 2;
                    ctx.beginPath();
                    ctx.moveTo(prevX, prevY);
                    ctx.lineTo(mx1, my1);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();

                    // Impact spark
                    ctx.fillStyle = `rgba(200, 255, 220, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 6 - i, 0, Math.PI * 2);
                    ctx.fill();

                    prevX = p.x;
                    prevY = p.y;
                }

                ctx.restore();
            }

            // Draw Soul Drain beam
            if (weapon.type === 'soulDrain' && weapon._soulTarget) {
                const target = weapon._soulTarget;
                const targetScreen = this.worldToScreen(target.x, target.y);

                ctx.save();
                const t = Date.now();
                const pulse = 0.6 + Math.sin(t / 100) * 0.2;

                // Outer glow
                ctx.strokeStyle = `rgba(170, 0, 255, ${0.15 * pulse})`;
                ctx.lineWidth = (weapon.width || 6) * 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(playerScreenX, playerScreenY);
                ctx.lineTo(targetScreen.x, targetScreen.y);
                ctx.stroke();

                // Main beam
                const beamGrad = ctx.createLinearGradient(
                    playerScreenX, playerScreenY, targetScreen.x, targetScreen.y
                );
                beamGrad.addColorStop(0, `rgba(200, 50, 255, ${pulse})`);
                beamGrad.addColorStop(0.5, `rgba(150, 0, 200, ${pulse})`);
                beamGrad.addColorStop(1, `rgba(100, 0, 150, ${pulse * 0.6})`);
                ctx.strokeStyle = beamGrad;
                ctx.lineWidth = weapon.width || 6;
                ctx.beginPath();
                ctx.moveTo(playerScreenX, playerScreenY);
                ctx.lineTo(targetScreen.x, targetScreen.y);
                ctx.stroke();

                // Core
                ctx.strokeStyle = `rgba(255, 200, 255, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(playerScreenX, playerScreenY);
                ctx.lineTo(targetScreen.x, targetScreen.y);
                ctx.stroke();

                // Soul particles flowing from target to player
                for (let i = 0; i < 5; i++) {
                    const prog = ((t / 300 + i * 0.2) % 1);
                    const px = targetScreen.x + (playerScreenX - targetScreen.x) * prog;
                    const py = targetScreen.y + (playerScreenY - targetScreen.y) * prog;
                    const wobble = Math.sin(t / 80 + i * 2) * 8;
                    ctx.fillStyle = `rgba(200, 100, 255, ${0.6 * (1 - prog)})`;
                    ctx.beginPath();
                    ctx.arc(px + wobble, py + wobble, 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Heal indicator at player
                ctx.fillStyle = `rgba(100, 255, 100, ${pulse * 0.4})`;
                ctx.beginPath();
                ctx.arc(playerScreenX, playerScreenY, 15, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }
    }

    /**
     * Render AOE attack effect (charging or active)
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} aoeData - {x, y, radius, damage, startTime, charging}
     * @param {Object} enemy - The enemy performing the AOE (for charging effect)
     */
    renderAOE(ctx, aoeData, enemy = null, bossShape = null) {
        const screen = this.worldToScreen(aoeData.x, aoeData.y);
        if (!screen.visible) return;

        ctx.save();

        // Determine theme based on boss type
        const isVoid = bossShape === 'crown';
        const isCrystal = bossShape === 'crystal';
        const isMech = bossShape === 'mech';
        const isLava = bossShape === 'lava';
        const isEye = bossShape === 'eye';

        // CHARGING PHASE - Warning before attack
        if (aoeData.charging && enemy) {
            const chargeElapsed = Date.now() - enemy.aoeChargingStart;
            const chargeProgress = Math.min(chargeElapsed / enemy.aoeChargingDuration, 1);
            const pulse = Math.sin(chargeElapsed / 100 * (5 + chargeProgress * 10)) * 0.3 + 0.7;
            const warningRadius = aoeData.radius * chargeProgress;
            const now = Date.now();

            if (isVoid) {
                // === VOID OVERLORD CHARGING ===
                // Dark void rift opening
                const voidGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, warningRadius);
                voidGrad.addColorStop(0, `rgba(20, 0, 40, ${0.5 * pulse})`);
                voidGrad.addColorStop(0.5, `rgba(80, 0, 160, ${0.3 * pulse})`);
                voidGrad.addColorStop(1, 'rgba(120, 0, 255, 0)');
                ctx.fillStyle = voidGrad;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, warningRadius, 0, Math.PI * 2);
                ctx.fill();

                // Purple lightning cracks converging
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i + now * 0.001;
                    const startDist = aoeData.radius * 1.2;
                    const endDist = warningRadius * (1 - chargeProgress * 0.8);
                    ctx.strokeStyle = `rgba(180, 80, 255, ${0.7 * pulse})`;
                    ctx.lineWidth = 2 + chargeProgress * 2;
                    ctx.beginPath();
                    let px = screen.x + Math.cos(angle) * startDist;
                    let py = screen.y + Math.sin(angle) * startDist;
                    ctx.moveTo(px, py);
                    // Jagged lightning path
                    const segments = 5;
                    for (let s = 1; s <= segments; s++) {
                        const t = s / segments;
                        const dist = startDist - (startDist - endDist) * t;
                        const jitter = (Math.random() - 0.5) * 20 * (1 - t);
                        px = screen.x + Math.cos(angle + jitter * 0.02) * dist + jitter;
                        py = screen.y + Math.sin(angle + jitter * 0.02) * dist + jitter;
                        ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                }

                // Converging dark wisps (spiral inward)
                for (let i = 0; i < 16; i++) {
                    const angle = (Math.PI * 2 / 16) * i + now * 0.003 * (i % 2 === 0 ? 1 : -1);
                    const dist = aoeData.radius * (1 - chargeProgress * 0.6) * (0.5 + Math.sin(now * 0.005 + i) * 0.3);
                    const wx = screen.x + Math.cos(angle) * dist;
                    const wy = screen.y + Math.sin(angle) * dist;
                    const size = 3 + chargeProgress * 5;
                    ctx.fillStyle = `rgba(100, 0, 200, ${0.6 * pulse})`;
                    ctx.beginPath();
                    ctx.arc(wx, wy, size, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Pulsing void ring
                ctx.strokeStyle = `rgba(150, 50, 255, ${0.8 * pulse})`;
                ctx.lineWidth = 3 + chargeProgress * 3;
                ctx.setLineDash([10, 8]);
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, warningRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

            } else if (isCrystal) {
                // === CRYOMANCER CHARGING ===
                // Ice crystals forming ring
                const iceGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, warningRadius);
                iceGrad.addColorStop(0, `rgba(200, 240, 255, ${0.3 * pulse})`);
                iceGrad.addColorStop(0.6, `rgba(100, 180, 255, ${0.2 * pulse})`);
                iceGrad.addColorStop(1, 'rgba(50, 100, 200, 0)');
                ctx.fillStyle = iceGrad;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, warningRadius, 0, Math.PI * 2);
                ctx.fill();

                // Frost crystals converging
                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI * 2 / 12) * i + now * 0.002;
                    const dist = aoeData.radius * (1 - chargeProgress * 0.5);
                    const cx = screen.x + Math.cos(angle) * dist;
                    const cy = screen.y + Math.sin(angle) * dist;
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(angle + now * 0.003);
                    ctx.fillStyle = `rgba(180, 220, 255, ${0.7 * pulse})`;
                    // Diamond crystal shape
                    ctx.beginPath();
                    const cs = 4 + chargeProgress * 6;
                    ctx.moveTo(0, -cs);
                    ctx.lineTo(cs * 0.5, 0);
                    ctx.lineTo(0, cs);
                    ctx.lineTo(-cs * 0.5, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }

                ctx.strokeStyle = `rgba(150, 200, 255, ${0.7 * pulse})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([12, 8]);
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, warningRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

            } else if (isLava) {
                // === PYROCLASM CHARGING ===
                const lavaGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, warningRadius);
                lavaGrad.addColorStop(0, `rgba(255, 80, 0, ${0.4 * pulse})`);
                lavaGrad.addColorStop(0.5, `rgba(255, 40, 0, ${0.3 * pulse})`);
                lavaGrad.addColorStop(1, 'rgba(200, 0, 0, 0)');
                ctx.fillStyle = lavaGrad;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, warningRadius, 0, Math.PI * 2);
                ctx.fill();

                // Rising ember particles
                for (let i = 0; i < 14; i++) {
                    const angle = (Math.PI * 2 / 14) * i + now * 0.002;
                    const dist = warningRadius * (0.3 + Math.sin(now * 0.004 + i * 0.7) * 0.4);
                    const ex = screen.x + Math.cos(angle) * dist;
                    const ey = screen.y + Math.sin(angle) * dist - Math.sin(now * 0.006 + i) * 10 * chargeProgress;
                    ctx.fillStyle = `rgba(255, ${150 + Math.sin(now * 0.01 + i) * 100}, 0, ${0.8 * pulse})`;
                    ctx.beginPath();
                    ctx.arc(ex, ey, 3 + chargeProgress * 4, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.strokeStyle = `rgba(255, 100, 0, ${0.8 * pulse})`;
                ctx.lineWidth = 4 + chargeProgress * 3;
                ctx.setLineDash([15, 8]);
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, warningRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

            } else if (isMech) {
                // === OVERLOAD PRIME CHARGING ===
                const mechGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, warningRadius);
                mechGrad.addColorStop(0, `rgba(0, 255, 255, ${0.3 * pulse})`);
                mechGrad.addColorStop(0.5, `rgba(0, 150, 255, ${0.2 * pulse})`);
                mechGrad.addColorStop(1, 'rgba(0, 80, 200, 0)');
                ctx.fillStyle = mechGrad;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, warningRadius, 0, Math.PI * 2);
                ctx.fill();

                // Scanning grid lines
                ctx.strokeStyle = `rgba(0, 255, 200, ${0.4 * pulse})`;
                ctx.lineWidth = 1;
                const gridSize = 30;
                const gridOffset = (now * 0.05) % gridSize;
                ctx.beginPath();
                for (let gx = -warningRadius; gx <= warningRadius; gx += gridSize) {
                    ctx.moveTo(screen.x + gx + gridOffset, screen.y - warningRadius);
                    ctx.lineTo(screen.x + gx + gridOffset, screen.y + warningRadius);
                }
                for (let gy = -warningRadius; gy <= warningRadius; gy += gridSize) {
                    ctx.moveTo(screen.x - warningRadius, screen.y + gy + gridOffset);
                    ctx.lineTo(screen.x + warningRadius, screen.y + gy + gridOffset);
                }
                ctx.stroke();

                // Rotating hex ring
                ctx.strokeStyle = `rgba(0, 200, 255, ${0.7 * pulse})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI * 2 / 6) * i + now * 0.002;
                    const hx = screen.x + Math.cos(a) * warningRadius;
                    const hy = screen.y + Math.sin(a) * warningRadius;
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.stroke();

            } else if (isEye) {
                // === DEVOURER CHARGING ===
                const eyeGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, warningRadius);
                eyeGrad.addColorStop(0, `rgba(0, 0, 0, ${0.6 * pulse})`);
                eyeGrad.addColorStop(0.4, `rgba(40, 0, 60, ${0.4 * pulse})`);
                eyeGrad.addColorStop(1, 'rgba(80, 0, 100, 0)');
                ctx.fillStyle = eyeGrad;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, warningRadius, 0, Math.PI * 2);
                ctx.fill();

                // Inward-spiraling shadow tendrils
                for (let i = 0; i < 10; i++) {
                    const angle = (Math.PI * 2 / 10) * i - now * 0.004;
                    const dist = warningRadius * (1 - chargeProgress * 0.3);
                    ctx.strokeStyle = `rgba(60, 0, 80, ${0.6 * pulse})`;
                    ctx.lineWidth = 3 + chargeProgress * 3;
                    ctx.beginPath();
                    const sx = screen.x + Math.cos(angle) * dist;
                    const sy = screen.y + Math.sin(angle) * dist;
                    ctx.moveTo(sx, sy);
                    const ex = screen.x + Math.cos(angle + 0.5) * dist * 0.3;
                    const ey = screen.y + Math.sin(angle + 0.5) * dist * 0.3;
                    ctx.quadraticCurveTo(
                        screen.x + Math.cos(angle + 0.25) * dist * 0.7,
                        screen.y + Math.sin(angle + 0.25) * dist * 0.7,
                        ex, ey
                    );
                    ctx.stroke();
                }

                ctx.strokeStyle = `rgba(100, 0, 150, ${0.8 * pulse})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 6]);
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, warningRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

            } else {
                // === GENERIC / MINIBOSS CHARGING ===
                ctx.strokeStyle = `rgba(255, 200, 0, ${0.6 * pulse})`;
                ctx.lineWidth = 4 + chargeProgress * 4;
                ctx.setLineDash([15, 10]);
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, warningRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                const innerGradient = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, warningRadius);
                innerGradient.addColorStop(0, `rgba(255, 150, 0, ${0.2 * pulse})`);
                innerGradient.addColorStop(0.7, `rgba(255, 100, 0, ${0.1 * pulse})`);
                innerGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
                ctx.fillStyle = innerGradient;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, warningRadius, 0, Math.PI * 2);
                ctx.fill();

                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI * 2 / 12) * i + now * 0.002;
                    const particleDist = aoeData.radius * (1 - chargeProgress * 0.7);
                    const particleX = screen.x + Math.cos(angle) * particleDist;
                    const particleY = screen.y + Math.sin(angle) * particleDist;
                    ctx.fillStyle = `rgba(255, 200, 50, ${0.8 * pulse})`;
                    ctx.beginPath();
                    ctx.arc(particleX, particleY, 4 + chargeProgress * 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
            return;
        }

        // ACTIVE PHASE - Actual damage
        if (!aoeData.startTime) {
            ctx.restore();
            return;
        }

        const elapsed = Date.now() - aoeData.startTime;
        const progress = Math.min(elapsed / 800, 1);
        const pulseIntensity = Math.sin(progress * Math.PI);
        const now = Date.now();

        if (isVoid) {
            // === VOID OVERLORD ACTIVE ===
            // Dark portal center
            const voidCore = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, aoeData.radius);
            voidCore.addColorStop(0, `rgba(0, 0, 0, ${0.7 * pulseIntensity})`);
            voidCore.addColorStop(0.3, `rgba(40, 0, 80, ${0.5 * pulseIntensity})`);
            voidCore.addColorStop(0.7, `rgba(80, 0, 160, ${0.3 * pulseIntensity})`);
            voidCore.addColorStop(1, 'rgba(120, 0, 255, 0)');
            ctx.fillStyle = voidCore;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, aoeData.radius, 0, Math.PI * 2);
            ctx.fill();

            // Void tentacle wisps spiraling outward
            for (let i = 0; i < 6; i++) {
                const baseAngle = (Math.PI * 2 / 6) * i + now * 0.003;
                ctx.strokeStyle = `rgba(150, 50, 255, ${0.6 * pulseIntensity})`;
                ctx.lineWidth = 4 + Math.sin(now * 0.005 + i) * 2;
                ctx.beginPath();
                for (let t = 0; t < 20; t++) {
                    const frac = t / 20;
                    const spiralAngle = baseAngle + frac * Math.PI * 1.5;
                    const dist = frac * aoeData.radius * 0.9;
                    const wobble = Math.sin(now * 0.008 + t * 0.5 + i) * 8;
                    const tx = screen.x + Math.cos(spiralAngle) * dist + wobble;
                    const ty = screen.y + Math.sin(spiralAngle) * dist + wobble;
                    if (t === 0) ctx.moveTo(tx, ty);
                    else ctx.lineTo(tx, ty);
                }
                ctx.stroke();
            }

            // Pulsing void ring
            ctx.strokeStyle = `rgba(180, 80, 255, ${0.9 * pulseIntensity})`;
            ctx.lineWidth = 5 + Math.sin(now * 0.01) * 2;
            ctx.shadowColor = 'rgba(150, 0, 255, 0.5)';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, aoeData.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

        } else if (isCrystal) {
            // === CRYOMANCER ACTIVE ===
            const iceGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, aoeData.radius);
            iceGrad.addColorStop(0, `rgba(200, 240, 255, ${0.4 * pulseIntensity})`);
            iceGrad.addColorStop(0.5, `rgba(100, 180, 255, ${0.3 * pulseIntensity})`);
            iceGrad.addColorStop(1, `rgba(50, 100, 200, ${0.5 * pulseIntensity})`);
            ctx.fillStyle = iceGrad;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, aoeData.radius, 0, Math.PI * 2);
            ctx.fill();

            // Frost shards radiating
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i + now * 0.002;
                ctx.save();
                ctx.translate(screen.x, screen.y);
                ctx.rotate(angle);
                ctx.fillStyle = `rgba(180, 230, 255, ${0.7 * pulseIntensity})`;
                ctx.beginPath();
                ctx.moveTo(0, -8);
                ctx.lineTo(aoeData.radius * 0.8, 0);
                ctx.lineTo(0, 8);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            ctx.strokeStyle = `rgba(150, 220, 255, ${0.8 * pulseIntensity})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, aoeData.radius, 0, Math.PI * 2);
            ctx.stroke();

        } else if (isLava) {
            // === PYROCLASM ACTIVE ===
            const lavaGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, aoeData.radius);
            lavaGrad.addColorStop(0, `rgba(255, 200, 50, ${0.5 * pulseIntensity})`);
            lavaGrad.addColorStop(0.4, `rgba(255, 80, 0, ${0.4 * pulseIntensity})`);
            lavaGrad.addColorStop(1, `rgba(200, 0, 0, ${0.5 * pulseIntensity})`);
            ctx.fillStyle = lavaGrad;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, aoeData.radius, 0, Math.PI * 2);
            ctx.fill();

            // Fire eruption pillars
            for (let i = 0; i < 10; i++) {
                const angle = (Math.PI * 2 / 10) * i + now * 0.001;
                const dist = aoeData.radius * (0.3 + Math.random() * 0.5);
                const fx = screen.x + Math.cos(angle) * dist;
                const fy = screen.y + Math.sin(angle) * dist;
                const flameH = 10 + Math.sin(now * 0.008 + i * 1.3) * 8;
                ctx.fillStyle = `rgba(255, ${150 + Math.sin(now * 0.01 + i) * 100}, 0, ${0.7 * pulseIntensity})`;
                ctx.beginPath();
                ctx.moveTo(fx - 4, fy);
                ctx.lineTo(fx, fy - flameH);
                ctx.lineTo(fx + 4, fy);
                ctx.closePath();
                ctx.fill();
            }

            ctx.strokeStyle = `rgba(255, 50, 0, ${0.8 * pulseIntensity})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, aoeData.radius, 0, Math.PI * 2);
            ctx.stroke();

        } else if (isMech) {
            // === OVERLOAD PRIME ACTIVE ===
            const empGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, aoeData.radius);
            empGrad.addColorStop(0, `rgba(0, 255, 255, ${0.3 * pulseIntensity})`);
            empGrad.addColorStop(0.5, `rgba(0, 100, 255, ${0.2 * pulseIntensity})`);
            empGrad.addColorStop(1, `rgba(0, 50, 200, ${0.4 * pulseIntensity})`);
            ctx.fillStyle = empGrad;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, aoeData.radius, 0, Math.PI * 2);
            ctx.fill();

            // Electric arcs
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 / 6) * i + now * 0.004;
                ctx.strokeStyle = `rgba(0, 255, ${200 + Math.sin(now * 0.01 + i) * 55}, ${0.8 * pulseIntensity})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(screen.x, screen.y);
                const segments = 8;
                for (let s = 1; s <= segments; s++) {
                    const frac = s / segments;
                    const dist = frac * aoeData.radius * 0.9;
                    const jitter = (Math.sin(now * 0.02 + s * 3 + i * 7) * 15);
                    ctx.lineTo(
                        screen.x + Math.cos(angle) * dist + jitter,
                        screen.y + Math.sin(angle) * dist + jitter
                    );
                }
                ctx.stroke();
            }

            // Hexagonal boundary
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.8 * pulseIntensity})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i + now * 0.001;
                const hx = screen.x + Math.cos(a) * aoeData.radius;
                const hy = screen.y + Math.sin(a) * aoeData.radius;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();

        } else if (isEye) {
            // === DEVOURER ACTIVE ===
            const devourGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, aoeData.radius);
            devourGrad.addColorStop(0, `rgba(0, 0, 0, ${0.8 * pulseIntensity})`);
            devourGrad.addColorStop(0.4, `rgba(30, 0, 50, ${0.5 * pulseIntensity})`);
            devourGrad.addColorStop(1, `rgba(60, 0, 80, ${0.3 * pulseIntensity})`);
            ctx.fillStyle = devourGrad;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, aoeData.radius, 0, Math.PI * 2);
            ctx.fill();

            // Shadow tendrils reaching outward
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i - now * 0.002;
                ctx.strokeStyle = `rgba(80, 0, 120, ${0.7 * pulseIntensity})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(screen.x, screen.y);
                for (let t = 0; t < 15; t++) {
                    const frac = t / 15;
                    const wobble = Math.sin(now * 0.006 + t * 0.8 + i * 2) * 12 * frac;
                    ctx.lineTo(
                        screen.x + Math.cos(angle + wobble * 0.01) * frac * aoeData.radius * 0.85 + wobble,
                        screen.y + Math.sin(angle + wobble * 0.01) * frac * aoeData.radius * 0.85
                    );
                }
                ctx.stroke();
            }

            ctx.strokeStyle = `rgba(100, 0, 150, ${0.8 * pulseIntensity})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, aoeData.radius, 0, Math.PI * 2);
            ctx.stroke();

        } else {
            // === GENERIC / MINIBOSS ACTIVE ===
            const outerRadius = aoeData.radius * (0.5 + progress * 0.5);
            ctx.strokeStyle = `rgba(255, 100, 0, ${pulseIntensity * 0.4})`;
            ctx.lineWidth = 8;
            ctx.setLineDash([20, 10]);
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, outerRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            const gradient = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, aoeData.radius);
            gradient.addColorStop(0, `rgba(255, 50, 0, ${0.3 * pulseIntensity})`);
            gradient.addColorStop(0.5, `rgba(255, 100, 0, ${0.2 * pulseIntensity})`);
            gradient.addColorStop(1, `rgba(255, 150, 0, ${0.4 * pulseIntensity})`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, aoeData.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = `rgba(255, 0, 0, ${0.8 * pulseIntensity})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, aoeData.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Rotating energy particles
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i + elapsed * 0.005;
                const px = screen.x + Math.cos(angle) * (aoeData.radius * 0.7);
                const py = screen.y + Math.sin(angle) * (aoeData.radius * 0.7);
                ctx.fillStyle = `rgba(255, 200, 50, ${pulseIntensity})`;
                ctx.beginPath();
                ctx.arc(px, py, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    /**
     * Render the Cryomancer's freeze zone at its world position
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} fz - freezeZoneData with x, y, radius, warning, warningTimer, warningTime
     */
    renderFreezeZone(ctx, fz) {
        const screen = this.worldToScreen(fz.x, fz.y);
        if (!screen.visible) return;

        const t = Date.now();
        const z = this.camera.zoom;
        const r = fz.radius * z;

        ctx.save();

        if (fz.warning) {
            // WARNING PHASE â€” pulsing ring showing where freeze will appear
            const warnPulse = Math.sin(t / 80) * 0.3 + 0.5;

            // Pulsing fill
            ctx.fillStyle = `rgba(100, 220, 255, ${0.05 + warnPulse * 0.08})`;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();

            // Bold pulsing border
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.5 + warnPulse * 0.4})`;
            ctx.lineWidth = (3 + warnPulse * 2) * z;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Warning icon â€” pulsing ice crystal at center
            const iconSize = (8 + warnPulse * 4) * z;
            ctx.strokeStyle = `rgba(150, 230, 255, ${0.4 + warnPulse * 0.4})`;
            ctx.lineWidth = 2 * z;
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI;
                ctx.beginPath();
                ctx.moveTo(screen.x - Math.cos(a) * iconSize, screen.y - Math.sin(a) * iconSize);
                ctx.lineTo(screen.x + Math.cos(a) * iconSize, screen.y + Math.sin(a) * iconSize);
                ctx.stroke();
            }

            // Shrinking ring converging inward
            const convergePct = fz.warningTimer / fz.warningTime;
            const convergeR = r * (2 - convergePct);
            ctx.strokeStyle = `rgba(0, 180, 255, ${0.3 * (1 - convergePct)})`;
            ctx.lineWidth = 2 * z;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, convergeR, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // ACTIVE PHASE â€” full damage zone
            const fzGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, r);
            fzGrad.addColorStop(0, 'rgba(100, 220, 255, 0.3)');
            fzGrad.addColorStop(0.7, 'rgba(60, 180, 255, 0.15)');
            fzGrad.addColorStop(1, 'rgba(40, 140, 220, 0)');
            ctx.fillStyle = fzGrad;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();

            // Solid visible border
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.6 + Math.sin(t / 150) * 0.2})`;
            ctx.lineWidth = 3 * z;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.stroke();

            // Floating ice particles in the zone
            for (let i = 0; i < 8; i++) {
                const a = (t / 800) + (i * Math.PI / 4);
                const d = r * 0.3 + Math.sin(t / 200 + i * 3) * r * 0.4;
                const px = screen.x + Math.cos(a) * d;
                const py = screen.y + Math.sin(a) * d;
                ctx.fillStyle = `rgba(200, 240, 255, ${0.3 + Math.sin(t / 100 + i) * 0.2})`;
                ctx.beginPath();
                ctx.arc(px, py, 3 * z, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    renderEruptionZones(ctx, zones) {
        const t = Date.now();
        const z = this.camera.zoom;

        for (const zone of zones) {
            const screen = this.worldToScreen(zone.x, zone.y);
            if (!screen.visible) continue;
            const r = zone.radius * z;

            if (zone.active) {
                // EXPLOSION with shockwave
                // Outer shockwave ring
                ctx.strokeStyle = `rgba(255, 200, 0, ${0.6 + Math.sin(t / 40) * 0.3})`;
                ctx.lineWidth = 5 * z;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, r * 1.2, 0, Math.PI * 2);
                ctx.stroke();
                // Explosion gradient
                const expGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, r);
                expGrad.addColorStop(0, `rgba(255, 255, 200, ${0.6 + Math.sin(t / 40) * 0.2})`);
                expGrad.addColorStop(0.3, `rgba(255, 150, 0, ${0.5 + Math.sin(t / 50) * 0.2})`);
                expGrad.addColorStop(0.7, `rgba(255, 60, 0, ${0.35 + Math.sin(t / 60) * 0.15})`);
                expGrad.addColorStop(1, 'rgba(200, 30, 0, 0)');
                ctx.fillStyle = expGrad;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
                ctx.fill();
                // Flying debris chunks
                for (let d = 0; d < 6; d++) {
                    const da = (d / 6) * Math.PI * 2 + t * 0.003;
                    const dd = r * 0.5 + Math.sin(t / 40 + d * 2) * r * 0.3;
                    const dx = screen.x + Math.cos(da) * dd;
                    const dy = screen.y + Math.sin(da) * dd;
                    ctx.fillStyle = `rgba(200, ${Math.floor(80 + Math.sin(t / 30 + d) * 40)}, 0, 0.7)`;
                    ctx.beginPath();
                    ctx.arc(dx, dy, (3 + Math.sin(t / 50 + d) * 2) * z, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // WARNING: Falling missile/meteor approaching from above
                const progress = zone.timer / zone.warningTime;
                // Warning circle on ground
                ctx.strokeStyle = `rgba(255, 100, 0, ${0.3 + progress * 0.5})`;
                ctx.lineWidth = (2 + progress * 3) * z;
                ctx.setLineDash([8, 8]);
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                // Fill warning (grows more red)
                ctx.fillStyle = `rgba(255, ${Math.floor(80 - progress * 60)}, 0, ${progress * 0.2})`;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
                ctx.fill();
                // Crosshair in center
                ctx.strokeStyle = `rgba(255, 200, 0, ${0.4 + progress * 0.4})`;
                ctx.lineWidth = 2 * z;
                ctx.setLineDash([]);
                const ch = r * 0.4;
                ctx.beginPath();
                ctx.moveTo(screen.x - ch, screen.y);
                ctx.lineTo(screen.x + ch, screen.y);
                ctx.moveTo(screen.x, screen.y - ch);
                ctx.lineTo(screen.x, screen.y + ch);
                ctx.stroke();

                // FALLING MISSILE from above
                const missileY = screen.y - (1 - progress) * 250 * z;
                const missileH = 20 * z;
                const missileW = 6 * z;
                // Missile trail (fire exhaust)
                const trailGrad = ctx.createLinearGradient(screen.x, missileY - missileH, screen.x, missileY - missileH - 40 * z);
                trailGrad.addColorStop(0, `rgba(255, 150, 0, ${0.6 * progress})`);
                trailGrad.addColorStop(0.5, `rgba(255, 80, 0, ${0.3 * progress})`);
                trailGrad.addColorStop(1, 'rgba(255, 40, 0, 0)');
                ctx.fillStyle = trailGrad;
                ctx.beginPath();
                ctx.moveTo(screen.x - missileW * 0.8, missileY - missileH);
                ctx.lineTo(screen.x, missileY - missileH - 40 * z);
                ctx.lineTo(screen.x + missileW * 0.8, missileY - missileH);
                ctx.closePath();
                ctx.fill();
                // Missile body
                ctx.fillStyle = '#442200';
                ctx.beginPath();
                ctx.rect(screen.x - missileW / 2, missileY - missileH, missileW, missileH);
                ctx.fill();
                // Missile nose (pointed)
                ctx.fillStyle = '#ff3300';
                ctx.beginPath();
                ctx.moveTo(screen.x - missileW / 2, missileY);
                ctx.lineTo(screen.x, missileY + missileH * 0.5);
                ctx.lineTo(screen.x + missileW / 2, missileY);
                ctx.closePath();
                ctx.fill();
                // Missile fins
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.moveTo(screen.x - missileW, missileY - missileH);
                ctx.lineTo(screen.x - missileW * 1.5, missileY - missileH * 1.3);
                ctx.lineTo(screen.x - missileW * 0.5, missileY - missileH);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(screen.x + missileW, missileY - missileH);
                ctx.lineTo(screen.x + missileW * 1.5, missileY - missileH * 1.3);
                ctx.lineTo(screen.x + missileW * 0.5, missileY - missileH);
                ctx.closePath();
                ctx.fill();
                // Glow around missile
                ctx.fillStyle = `rgba(255, 100, 0, ${0.15 * progress})`;
                ctx.beginPath();
                ctx.arc(screen.x, missileY - missileH * 0.5, missileH * 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderMagmaTrails(ctx, trails) {
        const t = Date.now();
        const z = this.camera.zoom;

        for (const trail of trails) {
            const screen = this.worldToScreen(trail.x, trail.y);
            if (!screen.visible) continue;
            const alpha = 1 - (trail.timer / trail.lifetime);
            const flicker = 0.6 + Math.sin(t / 80 + trail.x * 0.1) * 0.4;
            const r = trail.radius * (0.6 + alpha * 0.4) * z;
            // Lava pool gradient
            const poolGrad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, r);
            poolGrad.addColorStop(0, `rgba(255, 200, 50, ${alpha * 0.55 * flicker})`);
            poolGrad.addColorStop(0.4, `rgba(255, 100, 0, ${alpha * 0.4 * flicker})`);
            poolGrad.addColorStop(0.8, `rgba(200, 40, 0, ${alpha * 0.25 * flicker})`);
            poolGrad.addColorStop(1, `rgba(100, 10, 0, 0)`);
            ctx.fillStyle = poolGrad;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
            ctx.fill();
            // Glowing edge ring
            ctx.strokeStyle = `rgba(255, 120, 0, ${alpha * 0.5 * flicker})`;
            ctx.lineWidth = 2 * z;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, r * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            // Small flame tongues rising from pool
            if (alpha > 0.3) {
                for (let f = 0; f < 3; f++) {
                    const fa = trail.x * 0.5 + f * 2.1 + t / 100;
                    const fx = screen.x + Math.cos(fa) * r * 0.4;
                    const fy = screen.y + Math.sin(fa) * r * 0.3;
                    const fh = (6 + Math.sin(t / 40 + f + trail.x) * 4) * z * alpha;
                    const flameGrad = ctx.createLinearGradient(fx, fy, fx, fy - fh);
                    flameGrad.addColorStop(0, `rgba(255, 150, 0, ${alpha * 0.5})`);
                    flameGrad.addColorStop(0.6, `rgba(255, 80, 0, ${alpha * 0.3})`);
                    flameGrad.addColorStop(1, 'rgba(255, 40, 0, 0)');
                    ctx.fillStyle = flameGrad;
                    ctx.beginPath();
                    ctx.moveTo(fx - 3 * z, fy);
                    ctx.quadraticCurveTo(fx - 1 * z, fy - fh * 0.7, fx, fy - fh);
                    ctx.quadraticCurveTo(fx + 1 * z, fy - fh * 0.7, fx + 3 * z, fy);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }
    }

    /**
     * Update projectiles
     * @param {number} deltaTime 
     */
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update(deltaTime);

            // Wrap projectile position (seamless toroidal world)
            proj.x = this.wrapCoordinate(proj.x, CONFIG.ARENA.WIDTH);
            proj.y = this.wrapCoordinate(proj.y, CONFIG.ARENA.HEIGHT);

            // Remove if expired or marked for removal
            if (proj.shouldRemove || !proj.active) {
                // AoE projectiles explode even without hitting a target
                if (proj.explosionRadius > 0 && !proj._alreadyExploded) {
                    proj._alreadyExploded = true;
                    this.triggerAoEExplosionOnExpiry(proj);
                }
                this.projectiles.splice(i, 1);
            }
        }
    }

    /**
     * Update enemies
     * @param {number} deltaTime 
     */
    updateEnemies(deltaTime) {
        const arena = { width: CONFIG.ARENA.WIDTH, height: CONFIG.ARENA.HEIGHT };

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Set target if not set
            if (!enemy.target) {
                enemy.setTarget(this.player);
            }

            enemy.update(deltaTime, arena);

            // Check enemy projectiles hitting player (ranged enemies)
            if (enemy.projectiles) {
                for (let j = enemy.projectiles.length - 1; j >= 0; j--) {
                    const proj = enemy.projectiles[j];
                    if (!proj.active) {
                        enemy.projectiles.splice(j, 1);
                        continue;
                    }

                    // Wrap projectile position
                    proj.x = this.wrapCoordinate(proj.x, CONFIG.ARENA.WIDTH);
                    proj.y = this.wrapCoordinate(proj.y, CONFIG.ARENA.HEIGHT);

                    // Check collision with player
                    const dist = this.getWrappedDistance(this.player.x, this.player.y, proj.x, proj.y).distance;
                    if (dist < this.player.size + proj.size) {
                        this.player.takeDamage(proj.damage);

                        enemy.projectiles.splice(j, 1);
                    }
                }
            }

            // Handle exploder-type explosion (base + world exploders)
            if (enemy.hasExploded && enemy.explosionRadius) {
                // Damage player if in range
                const dist = MathUtils.distance(this.player.x, this.player.y, enemy.x, enemy.y);
                if (dist < enemy.explosionRadius) {
                    this.player.takeDamage(enemy.damage * 2);

                    
                    // iceDetonator: freeze player on explosion
                    if (enemy.type === 'iceDetonator') {
                        this.applyPlayerSlow(0.3, 2000);
                    }
                    
                    // emPulser: disable weapons temporarily
                    if (enemy.type === 'emPulser') {
                        this.disablePlayerWeapons(2500);
                    }
                    
                    // voidMine: pull player toward explosion center
                    if (enemy.type === 'voidMine') {
                        const pullDx = enemy.x - this.player.x;
                        const pullDy = enemy.y - this.player.y;
                        const pullLen = Math.hypot(pullDx, pullDy) || 1;
                        this.player.x += (pullDx / pullLen) * 60;
                        this.player.y += (pullDy / pullLen) * 60;
                    }
                }

                // World-specific explosion colors
                const explosionColors = {
                    'exploder': '#ff4400', 'pyroBlob': '#ff6600',
                    'iceDetonator': '#00ccff', 'emPulser': '#00ff88', 'voidMine': '#8800cc'
                };
                this.particles.createExplosion(enemy.x, enemy.y, {
                    color: explosionColors[enemy.type] || '#ff4400', count: 30
                });
                this.enemies.splice(i, 1);
                continue;
            }

            // Flame Imp fire trail damage to player
            if (enemy.type === 'flameImp' && enemy.fireTrails) {
                for (const trail of enemy.fireTrails) {
                    const d = this.getWrappedDistance(this.player.x, this.player.y, trail.x, trail.y).distance;
                    if (d < trail.radius + this.player.size) {
                        this.player.takeDamage(trail.damage * deltaTime * 3);

                    }
                }
            }

            // Frost Giant freeze zone damage + slow
            if (enemy.type === 'frostGiant' && enemy.freezeActive) {
                const d = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y).distance;
                if (d < enemy.freezeRadius) {
                    this.player.takeDamage(enemy.damage * 0.5 * deltaTime * 3);

                    this.applyPlayerSlow(0.5, 600);
                }
            }

            // Void Devourer gravity pull
            if (enemy.type === 'voidDevourer' && enemy.pullRadius) {
                const wrapped = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y);
                if (wrapped.distance < enemy.pullRadius && wrapped.distance > enemy.size) {
                    const pullStr = (enemy.pullForce || 80) * deltaTime;
                    const len = wrapped.distance || 1;
                    this.player.x -= (wrapped.dx / len) * pullStr;
                    this.player.y -= (wrapped.dy / len) * pullStr;
                }
            }

            // Remove dead enemies
            if (enemy.isDead()) {
                this.handleEnemyDeath(enemy);
                this.enemies.splice(i, 1);
            }
        }

        // Update mini-boss
        if (this.miniBoss) {
            if (!this.miniBoss.isDead()) {
                // Set target if not set
                if (!this.miniBoss.target) {
                    this.miniBoss.setTarget(this.player);
                }

                this.miniBoss.update(deltaTime, arena);

                // Handle abilities
                if (this.miniBoss.summonEnemies) {
                    this.miniBoss.summonEnemies = false;
                    this.spawner.spawnSummonedEnemies(this.miniBoss.x, this.miniBoss.y, 3);
                }

                // Handle AOE attack
                if (this.miniBoss.aoeActive && this.miniBoss.aoeData) {
                    const aoe = this.miniBoss.aoeData;
                    const dist = this.getWrappedDistance(this.player.x, this.player.y, aoe.x, aoe.y).distance;
                    if (dist < aoe.radius) {
                        this.player.takeDamage(aoe.damage * deltaTime * 5);

                    }
                }
            }

            // Check if miniboss died (separate check so it always runs)
            if (this.miniBoss.isDead()) {
                this.handleMiniBossDeath(this.miniBoss);
            }
        }

        // Update all bosses
        for (let i = this.bosses.length - 1; i >= 0; i--) {
            const boss = this.bosses[i];
            if (!boss || boss.isDead()) {
                // Remove dead boss
                if (boss && boss.isDead()) {
                    this.handleBossDeath(boss);
                }
                this.bosses.splice(i, 1);
                continue;
            }

            // Set target if not set
            if (!boss.target) {
                boss.setTarget(this.player);
            }

            boss.update(deltaTime, arena);

            // Handle boss abilities
            if (boss.summonEnemies) {
                boss.summonEnemies = false;
                this.spawner.spawnSummonedEnemies(boss.x, boss.y, 5);
            }

            // Shadow clone spawn (The Devourer) â€” spawns weaker shadow copies
            if (boss.shadowCloneSpawn) {
                boss.shadowCloneSpawn = false;
                this.spawner.spawnSummonedEnemies(boss.x, boss.y, 3);
            }

            if (boss.shootProjectiles) {
                boss.shootProjectiles = false;
                this.spawnBossProjectiles(boss);
            }

            // Drone barrage burst (Overload Prime) â€” 8-direction projectile bursts
            if (boss.droneBarrageShoot) {
                boss.droneBarrageShoot = false;
                const numDirs = 8;
                const offset = boss.droneBarrageBursts * 0.4; // Rotate each burst
                for (let i = 0; i < numDirs; i++) {
                    const angle = (i / numDirs) * Math.PI * 2 + offset;
                    const proj = new Projectile(
                        boss.x, boss.y, angle,
                        {
                            damage: boss.damage * 0.2,
                            projectileSpeed: 250,
                            projectileSize: 8,
                            projectileColor: '#00ff88',
                            range: 400,
                            pierce: 1
                        }
                    );
                    proj.isEnemy = true;
                    this.projectiles.push(proj);
                }
            }

            // Handle AOE attack
            if (boss.aoeActive && boss.aoeData) {
                const aoe = boss.aoeData;
                const dist = this.getWrappedDistance(this.player.x, this.player.y, aoe.x, aoe.y).distance;
                if (dist < aoe.radius) {
                    this.player.takeDamage(aoe.damage * deltaTime * 5);

                }
            }

            // WorldBoss: fire ring â€” damages player inside ring
            if (boss.fireRingActive) {
                const maxRadius = boss.size * 2.5;
                const elapsed = Date.now() - (boss.fireRingStart || Date.now());
                const expandProgress = Math.min(elapsed / 600, 1.0);
                const ringRadius = maxRadius * expandProgress;
                const dist = this.getWrappedDistance(this.player.x, this.player.y, boss.x, boss.y).distance;
                if (dist < ringRadius) {
                    this.player.takeDamage(boss.damage * 0.3 * deltaTime * 5);

                }
            }

            // Pyroclasm: eruption zones â€” ground eruptions near player
            if (boss.eruptionZones && boss.eruptionZones.length > 0) {
                for (const zone of boss.eruptionZones) {
                    if (zone.active) {
                        const dist = this.getWrappedDistance(this.player.x, this.player.y, zone.x, zone.y).distance;
                        if (dist < zone.radius) {
                            this.player.takeDamage(zone.damage * deltaTime * 5);

                        }
                    }
                }
            }

            // Pyroclasm: magma trail damage
            if (boss.magmaTrails && boss.magmaTrails.length > 0) {
                for (const trail of boss.magmaTrails) {
                    const dist = this.getWrappedDistance(this.player.x, this.player.y, trail.x, trail.y).distance;
                    if (dist < trail.radius) {
                        this.player.takeDamage(trail.damage * deltaTime * 5);

                    }
                }
            }

            // WorldBoss: ice storm â€” damages and slows player nearby
            if (boss.iceStormActive) {
                const stormRadius = boss.size * 2.5;
                const dist = this.getWrappedDistance(this.player.x, this.player.y, boss.x, boss.y).distance;
                if (dist < stormRadius) {
                    this.player.takeDamage(boss.damage * 0.4 * deltaTime * 5);

                    this.applyPlayerSlow(0.5, 500);
                }
            }

            // Cryomancer: freeze zone â€” persistent frozen area, damages and slows
            if (boss.freezeZoneActive && boss.freezeZoneData) {
                const fz = boss.freezeZoneData;
                // Advance warning timer
                if (fz.warning) {
                    fz.warningTimer += deltaTime * 1000;
                    if (fz.warningTimer >= fz.warningTime) {
                        fz.warning = false; // Warning phase over, zone is now active
                    }
                }
                // Only deal damage after warning phase
                if (!fz.warning) {
                    const dist = this.getWrappedDistance(this.player.x, this.player.y, fz.x, fz.y).distance;
                    if (dist < fz.radius) {
                        this.player.takeDamage(fz.damage * deltaTime * 5);

                        this.applyPlayerSlow(fz.slowMult, fz.slowDuration);
                    }
                }
            }

            // WorldBoss: laser sweep â€” damages player in the beam line
            if (boss.laserSweepActive) {
                const sweepLen = 300;
                const dist = this.getWrappedDistance(this.player.x, this.player.y, boss.x, boss.y).distance;
                if (dist < sweepLen) {
                    const wrapped = this.getWrappedDistance(boss.x, boss.y, this.player.x, this.player.y);
                    const playerAngle = Math.atan2(wrapped.dy, wrapped.dx);
                    let angleDiff = Math.abs(playerAngle - boss.laserSweepAngle);
                    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                    if (angleDiff < 0.25) {
                        this.player.takeDamage(boss.damage * 0.5 * deltaTime * 5);

                    }
                }
            }

            // WorldBoss: void pull â€” pulls player toward boss + damage
            if (boss.voidPullActive) {
                const pullRadius = 300;
                const wrapped = this.getWrappedDistance(this.player.x, this.player.y, boss.x, boss.y);
                if (wrapped.distance < pullRadius && wrapped.distance > boss.size) {
                    const pullStrength = 180 * deltaTime;
                    const len = wrapped.distance || 1;
                    this.player.x -= (wrapped.dx / len) * pullStrength;
                    this.player.y -= (wrapped.dy / len) * pullStrength;
                    this.player.takeDamage(boss.damage * 0.5 * deltaTime * 5);

                }
            }
        }
    }

    /**
     * Spawn boss projectiles in pattern
     * @param {Boss} boss - The boss spawning projectiles
     */
    spawnBossProjectiles(boss) {
        // Spiral burst pattern — projectiles spawn in a rotating spiral
        const numProjectiles = 24;
        const angleStep = (Math.PI * 2) / numProjectiles;
        const spiralOffset = (Date.now() / 500) % (Math.PI * 2);
        const bossColor = boss.color || '#ff0000';

        for (let i = 0; i < numProjectiles; i++) {
            const angle = angleStep * i + spiralOffset;
            const proj = new Projectile(
                boss.x,
                boss.y,
                angle,
                {
                    damage: boss.damage * 0.3,
                    projectileSpeed: 250 + Math.sin(i * 0.5) * 80,
                    projectileSize: 12,
                    projectileColor: bossColor,
                    range: 500,
                    pierce: 1
                }
            );
            proj.isEnemy = true;
            this.projectiles.push(proj);
        }
    }

    /**
     * Update pickups
     * @param {number} deltaTime 
     */
    updatePickups(deltaTime) {
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pickup = this.pickups[i];

            // Remove inactive pickups (lifetime expired)
            if (!pickup.active) {
                this.pickups.splice(i, 1);
                continue;
            }

            pickup.update(deltaTime, this.player);

            // Check again after update (destroy may have been called)
            if (!pickup.active) {
                this.pickups.splice(i, 1);
                continue;
            }

            // Wrap pickup position (seamless toroidal world)
            pickup.x = this.wrapCoordinate(pickup.x, CONFIG.ARENA.WIDTH);
            pickup.y = this.wrapCoordinate(pickup.y, CONFIG.ARENA.HEIGHT);

            // Check collection - only when actually touching
            const dist = this.getWrappedDistance(this.player.x, this.player.y, pickup.x, pickup.y).distance;
            const collectionDist = this.player.size + pickup.size + 5;
            if (dist < collectionDist) {
                this.collectPickup(pickup);
                this.pickups.splice(i, 1);
            }
        }
    }

    /**
     * Update drones
     * @param {number} deltaTime 
     */
    updateDrones(deltaTime) {
        for (const drone of this.drones) {
            // Pass enemies array to drone update
            drone.update(deltaTime, this.enemies);

            // Drone handles its own firing and projectiles internally
            // Check for hits from drone projectiles (using wrapped distance)
            for (const proj of drone.projectilePool) {
                if (!proj.active) continue;

                for (const enemy of this.enemies) {
                    if (!enemy.active) continue;

                    const dist = this.getWrappedDistance(proj.x, proj.y, enemy.x, enemy.y).distance;
                    if (dist < proj.radius + enemy.radius) {
                        const hit = this.calcPlayerDamage(proj.damage);
                        enemy.takeDamage(hit.damage);
                        if (hit.isCrit) this.particles.createDamageNumber(enemy.x, enemy.y, Math.round(hit.damage), true);
                        proj.onHitEnemy(enemy);

                        if (enemy.isDead()) {
                            this.handleEnemyDeath(enemy);
                        }
                    }
                }
            }
        }
    }

    /**
     * Check all collisions (using wrapped distances for seamless toroidal world)
     */
    checkCollisions() {
        // Projectile vs Enemy
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            // Enemy projectiles hit player
            if (proj.isEnemy) {
                const dist = this.getWrappedDistance(this.player.x, this.player.y, proj.x, proj.y).distance;
                if (dist < this.player.radius + proj.radius) {
                    this.player.takeDamage(proj.damage);

                    this.projectiles.splice(i, 1);
                    continue;
                }
            }

            // Player projectiles hit enemies
            if (!proj.isEnemy) {
                let hitSomething = false;
                let hitEntity = null;

                // Check regular enemies
                for (const enemy of this.enemies) {
                    const dist = this.getWrappedDistance(proj.x, proj.y, enemy.x, enemy.y).distance;
                    if (dist < enemy.radius + proj.radius) {
                        // Skip if this projectile already hit this enemy (boomerang/pierce tracking)
                        if (proj.hitEnemies && proj.hitEnemies.has(enemy)) continue;

                        const hit = this.calcPlayerDamage(proj.damage);
                        enemy.takeDamage(hit.damage);
                        if (hit.isCrit) this.particles.createDamageNumber(enemy.x, enemy.y, Math.round(hit.damage), true);
                        this.particles.createHitEffect(proj.x, proj.y, '#ffffff');
                        hitSomething = true;
                        hitEntity = enemy;

                        // Ice shard slow effect
                        if (proj.weaponType === 'iceShard') {
                            this.applyEnemySlow(enemy, 0.35, 1200);
                        }

                        if (!proj.onHitEnemy(enemy)) {
                            proj.shouldRemove = true;
                        }
                        break;
                    }
                }

                // Check mini-boss (only if projectile can still pierce)
                if (!proj.shouldRemove && this.miniBoss && !this.miniBoss.isDead()) {
                    const dist = this.getWrappedDistance(proj.x, proj.y, this.miniBoss.x, this.miniBoss.y).distance;
                    if (dist < this.miniBoss.radius + proj.radius) {
                        if (!(proj.hitEnemies && proj.hitEnemies.has(this.miniBoss))) {
                        const hit = this.calcPlayerDamage(proj.damage);
                        this.miniBoss.takeDamage(hit.damage);
                        if (hit.isCrit) this.particles.createDamageNumber(this.miniBoss.x, this.miniBoss.y, Math.round(hit.damage), true);
                        this.particles.createHitEffect(proj.x, proj.y, '#ff8800');
                        hitSomething = true;
                        hitEntity = this.miniBoss;

                        if (!proj.onHitEnemy(this.miniBoss)) {
                            proj.shouldRemove = true;
                        }
                        }
                    }
                }

                // Check all bosses (only if projectile can still pierce)
                if (!proj.shouldRemove) {
                for (const boss of this.bosses) {
                    if (boss && !boss.isDead()) {
                        const dist = this.getWrappedDistance(proj.x, proj.y, boss.x, boss.y).distance;
                        if (dist < boss.radius + proj.radius) {
                            if (proj.hitEnemies && proj.hitEnemies.has(boss)) break;

                            const hit = this.calcPlayerDamage(proj.damage);
                            boss.takeDamage(hit.damage);
                            if (hit.isCrit) this.particles.createDamageNumber(boss.x, boss.y, Math.round(hit.damage), true);
                            this.particles.createHitEffect(proj.x, proj.y, '#ff0000');
                            hitSomething = true;
                            hitEntity = boss;

                            if (!proj.onHitEnemy(boss)) {
                                proj.shouldRemove = true;
                            }
                            break;
                        }
                    }
                }
                }

                // AoE explosion - splash damage + knockback
                if (hitSomething && proj.explosionRadius > 0) {
                    const aoeDmg = proj.damage * this.player.stats.damageMultiplier * 0.4;
                    // AoE uses base multiplier, no crit (already applied on direct hit)
                    const isKnockbackWeapon = proj.weaponType === 'plasmaCannon' || proj.weaponType === 'meteorStaff';
                    const isIceGrenade = proj.weaponType === 'iceGrenade';
                    const knockbackForce = isKnockbackWeapon
                        ? (proj.weaponType === 'meteorStaff' ? 650 : 500)
                        : isIceGrenade ? 150 : 300;

                    // Damage + knockback nearby enemies (skip the directly-hit one)
                    for (const enemy of this.enemies) {
                        if (enemy === hitEntity) continue;
                        const wrapped = this.getWrappedDistance(proj.x, proj.y, enemy.x, enemy.y);
                        if (wrapped.distance < proj.explosionRadius) {
                            enemy.takeDamage(aoeDmg);
                            if (isIceGrenade) {
                                this.applyEnemyFreeze(enemy, proj.freezeDuration || 2500);
                            }
                            if (wrapped.distance > 0) {
                                const falloff = 1 - (wrapped.distance / proj.explosionRadius);
                                enemy.knockbackVelocity.set(
                                    wrapped.dx / wrapped.distance * knockbackForce * falloff,
                                    wrapped.dy / wrapped.distance * knockbackForce * falloff
                                );
                            }
                        }
                    }
                    // Freeze the directly-hit enemy too
                    if (isIceGrenade && hitEntity && hitEntity.active) {
                        this.applyEnemyFreeze(hitEntity, proj.freezeDuration || 2500);
                    }
                    // Knockback the directly-hit enemy too
                    if (hitEntity && hitEntity.knockbackVelocity) {
                        const hitW = this.getWrappedDistance(proj.x, proj.y, hitEntity.x, hitEntity.y);
                        if (hitW.distance > 0) {
                            hitEntity.knockbackVelocity.set(
                                hitW.dx / hitW.distance * knockbackForce,
                                hitW.dy / hitW.distance * knockbackForce
                            );
                        } else {
                            const toEnemy = this.getWrappedDistance(this.player.x, this.player.y, hitEntity.x, hitEntity.y);
                            if (toEnemy.distance > 0) {
                                hitEntity.knockbackVelocity.set(
                                    toEnemy.dx / toEnemy.distance * knockbackForce,
                                    toEnemy.dy / toEnemy.distance * knockbackForce
                                );
                            }
                        }
                    }
                    // Damage mini-boss if in range
                    if (this.miniBoss && !this.miniBoss.isDead() && this.miniBoss !== hitEntity) {
                        const wrapped = this.getWrappedDistance(proj.x, proj.y, this.miniBoss.x, this.miniBoss.y);
                        if (wrapped.distance < proj.explosionRadius) {
                            this.miniBoss.takeDamage(aoeDmg);
                            if (wrapped.distance > 0) {
                                this.miniBoss.knockbackVelocity.set(
                                    wrapped.dx / wrapped.distance * knockbackForce * 0.4,
                                    wrapped.dy / wrapped.distance * knockbackForce * 0.4
                                );
                            }
                        }
                    }
                    // Damage bosses if in range
                    for (const boss of this.bosses) {
                        if (boss && !boss.isDead() && boss !== hitEntity) {
                            const wrapped = this.getWrappedDistance(proj.x, proj.y, boss.x, boss.y);
                            if (wrapped.distance < proj.explosionRadius) {
                                boss.takeDamage(aoeDmg);
                                if (boss.knockbackVelocity && wrapped.distance > 0) {
                                    boss.knockbackVelocity.set(
                                        wrapped.dx / wrapped.distance * knockbackForce * 0.2,
                                        wrapped.dy / wrapped.distance * knockbackForce * 0.2
                                    );
                                }
                            }
                        }
                    }
                    // Explosion visual + particle effect
                    const expColors = {
                        rocket: '#ff4400', meteorStaff: '#ff6600', plasmaCannon: '#00ffcc', iceGrenade: '#88ddff'
                    };
                    const expColor = expColors[proj.weaponType] || '#ff8800';
                    this.particles.createAoEImpact(proj.x, proj.y, proj.weaponType, proj.explosionRadius);
                    proj._alreadyExploded = true;
                    // Store explosion for rendering shockwave ring + flash
                    if (!this._activeExplosions) this._activeExplosions = [];
                    this._activeExplosions.push({
                        x: proj.x, y: proj.y,
                        radius: proj.explosionRadius,
                        time: Date.now(),
                        color: expColor,
                        hasKnockback: true,
                        weaponType: proj.weaponType
                    });
                }
            }
        }

        // Enemy vs Player (contact damage)
        for (const enemy of this.enemies) {
            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y);
            if (wrapped.distance < this.player.radius + enemy.radius) {
                this.player.takeDamage(enemy.damage);


                // Ice Wraith slows on contact
                if (enemy.slowOnHit) {
                    this.applyPlayerSlow(enemy.slowOnHit, enemy.slowDuration || 1500);
                }

                // Push enemy back
                const len = wrapped.distance || 1;
                enemy.x += (wrapped.dx / len) * 30;
                enemy.y += (wrapped.dy / len) * 30;

                // Wrap enemy position
                enemy.x = this.wrapCoordinate(enemy.x, CONFIG.ARENA.WIDTH);
                enemy.y = this.wrapCoordinate(enemy.y, CONFIG.ARENA.HEIGHT);
            }
        }

        // Mini-boss vs Player
        if (this.miniBoss && !this.miniBoss.isDead()) {
            const dist = this.getWrappedDistance(this.player.x, this.player.y, this.miniBoss.x, this.miniBoss.y).distance;
            if (dist < this.player.radius + this.miniBoss.radius) {
                this.player.takeDamage(this.miniBoss.damage * 0.5);

            }
        }

        // Boss vs Player (check all bosses)
        for (const boss of this.bosses) {
            if (boss && !boss.isDead()) {
                const dist = this.getWrappedDistance(this.player.x, this.player.y, boss.x, boss.y).distance;
                if (dist < this.player.radius + boss.radius) {
                    this.player.takeDamage(boss.damage * 0.5);

                }
            }
        }
    }

    /**
     * Collect a pickup
     * @param {Pickup} pickup 
     */
    collectPickup(pickup) {
        switch (pickup.type) {
            case 'xp':
            case 'xpOrb':
                this.player.addXP(pickup.value);
                this.particles.createXPPickupEffect(pickup.x, pickup.y);
                break;
            case 'health':
            case 'healthOrb':
            case 'healthPack':
                this.player.heal(pickup.healAmount || pickup.value || 25);
                this.particles.createHealEffect(this.player.x, this.player.y);
                break;
            case 'magnet':
                this.activateMagnet();
                break;
            case 'bomb':
                this.activateBomb(pickup.x, pickup.y);
                break;
            case 'bossChest':
                this.activateTempBossWeapon(pickup.worldId);
                break;
        }
    }

    /**
     * Activate magnet pickup - attract all XP with increased speed
     */
    activateMagnet() {
        for (const pickup of this.pickups) {
            if (pickup.type === 'xp' || pickup.type === 'xpOrb') {
                pickup.magnetized = true;
                pickup.isAttracted = true;
                pickup.attractSpeed = 800; // Faster attraction when magnet activated
            }
        }
    }

    /**
     * Trigger AoE explosion at projectile position (when it expires without hitting)
     */
    triggerAoEExplosionOnExpiry(proj) {
        const aoeDmg = proj.damage * this.player.stats.damageMultiplier * 0.4;
        const knockbackForces = { meteorStaff: 650, plasmaCannon: 500, rocket: 300, iceGrenade: 0 };
        const knockbackForce = knockbackForces[proj.weaponType] || 300;
        for (const enemy of this.enemies) {
            const wrapped = this.getWrappedDistance(proj.x, proj.y, enemy.x, enemy.y);
            if (wrapped.distance < proj.explosionRadius) {
                enemy.takeDamage(aoeDmg);
                if (proj.weaponType === 'iceGrenade') {
                    this.applyEnemyFreeze(enemy, proj.freezeDuration || 2500);
                }
                if (knockbackForce > 0 && wrapped.distance > 0) {
                    enemy.x += (wrapped.dx / wrapped.distance) * knockbackForce * 0.15;
                    enemy.y += (wrapped.dy / wrapped.distance) * knockbackForce * 0.15;
                }
            }
        }
        // Also damage bosses in range
        for (const boss of this.bosses) {
            if (boss && !boss.isDead()) {
                const wrapped = this.getWrappedDistance(proj.x, proj.y, boss.x, boss.y);
                if (wrapped.distance < proj.explosionRadius) {
                    boss.takeDamage(aoeDmg);
                }
            }
        }
        const expColors = { rocket: '#ff4400', meteorStaff: '#ff6600', plasmaCannon: '#00ffcc', iceGrenade: '#88ddff' };
        const expColor = expColors[proj.weaponType] || '#ff8800';
        this.particles.createAoEImpact(proj.x, proj.y, proj.weaponType, proj.explosionRadius);
        if (!this._activeExplosions) this._activeExplosions = [];
        this._activeExplosions.push({
            x: proj.x, y: proj.y,
            radius: proj.explosionRadius,
            time: Date.now(),
            color: expColor,
            hasKnockback: knockbackForce > 0,
            weaponType: proj.weaponType
        });
    }

    /**
     * Freeze an enemy completely (speed = 0) for a duration
     */
    applyEnemyFreeze(enemy, duration) {
        if (!enemy || !enemy.active) return;
        if (enemy._frozen) {
            clearTimeout(enemy._freezeTimeout);
        } else {
            enemy._frozen = true;
            enemy._frozenOrigSpeed = enemy.speed;
            enemy.speed = 0;
        }
        enemy._freezeTimeout = setTimeout(() => {
            if (enemy.active && enemy._frozen) {
                enemy.speed = enemy._frozenOrigSpeed || enemy.baseSpeed;
                enemy._frozen = false;
            }
        }, duration);
    }

    /**
     * Calculate player damage with damageMultiplier and critChance
     * @returns {{ damage: number, isCrit: boolean }}
     */
    calcPlayerDamage(baseDmg) {
        const dmg = baseDmg * this.player.stats.damageMultiplier;
        const isCrit = Math.random() < this.player.stats.critChance;
        return { damage: isCrit ? dmg * 2 : dmg, isCrit };
    }

    /**
     * Apply a slow effect to an enemy
     */
    applyEnemySlow(enemy, multiplier, duration) {
        if (!enemy || !enemy.active) return;
        if (enemy._iceSlowed) {
            clearTimeout(enemy._iceSlowTimeout);
        } else {
            enemy._iceSlowed = true;
            enemy._iceOrigSpeed = enemy.speed;
            enemy.speed = enemy.baseSpeed * multiplier;
        }
        enemy._iceSlowTimeout = setTimeout(() => {
            if (enemy.active && enemy._iceSlowed) {
                enemy.speed = enemy._iceOrigSpeed || enemy.baseSpeed;
                enemy._iceSlowed = false;
            }
        }, duration);
    }

    /**
     * Apply a slow effect to the player (unified, non-stacking)
     * @param {number} multiplier - Speed multiplier (e.g. 0.5 = 50% speed)
     * @param {number} duration - Duration in ms
     */
    applyPlayerSlow(multiplier, duration) {
        if (!this.player) return;
        if (this.player._slowActive) {
            // Already slowed â€” just extend the timer, don't re-apply
            clearTimeout(this.player._slowTimeout);
            this.player._slowTimeout = setTimeout(() => {
                this.player.stats.speed = this.player._slowOrigSpeed;
                this.player._slowActive = false;
            }, duration);
            return;
        }
        this.player._slowActive = true;
        this.player._slowOrigSpeed = this.player.stats.speed;
        this.player.stats.speed *= multiplier;
        this.player._slowTimeout = setTimeout(() => {
            if (this.player._slowActive) {
                this.player.stats.speed = this.player._slowOrigSpeed;
                this.player._slowActive = false;
            }
        }, duration);
    }

    /**
     * Temporarily disable player weapons (EMP effect)
     * @param {number} duration - Duration in ms
     */
    disablePlayerWeapons(duration) {
        if (!this.player) return;
        if (this.player._weaponsDisabled) {
            clearTimeout(this.player._weaponsDisabledTimeout);
        }
        this.player._weaponsDisabled = true;
        this.player._weaponsDisabledTimeout = setTimeout(() => {
            this.player._weaponsDisabled = false;
        }, duration);
    }

    /**
     * Activate bomb pickup - kill nearby enemies
     * @param {number} x 
     * @param {number} y 
     */
    activateBomb(x, y) {
        const radius = 200;

        // Damage enemies (using wrapped distance)
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const dist = this.getWrappedDistance(x, y, enemy.x, enemy.y).distance;
            if (dist < radius) {
                enemy.takeDamage(1000);
            }
        }

        // Visual effect
        this.particles.createExplosion(x, y, { color: '#ffff00', count: 50 });
        this.ui.triggerScreenShake(10, 300);
        // Sound removed - too frequent
    }

    /**
     * Handle enemy death
     * @param {Enemy} enemy 
     */
    handleEnemyDeath(enemy) {
        if (enemy._deathHandled) return;
        enemy._deathHandled = true;

        this.kills++;
        this.addScore(CONFIG.SCORING.POINTS_PER_KILL[enemy.type] || enemy.scoreValue || 10);

        // Update combo
        this.player.registerKill();
        if (this.player.combo >= 10) {
            this.addScore(50); // Combo bonus
        }

        // Magma Golem splits on death
        if (enemy.splitsOnDeath && enemy.splitCount > 0) {
            for (let s = 0; s < enemy.splitCount; s++) {
                const angle = (Math.PI * 2 / enemy.splitCount) * s;
                const sx = enemy.x + Math.cos(angle) * 30;
                const sy = enemy.y + Math.sin(angle) * 30;
                const split = new Enemy(sx, sy, 'flameImp');
                split.setTarget(this.player);
                this.enemies.push(split);
            }
        }

        // Drop XP
        const xpValue = CONFIG.LEVELING.XP_FROM_ENEMY[enemy.type] || 1;
        const numOrbs = Math.max(1, Math.floor(xpValue / 2) + 1);

        for (let i = 0; i < numOrbs; i++) {
            const offsetX = MathUtils.randomRange(-20, 20);
            const offsetY = MathUtils.randomRange(-20, 20);
            this.pickups.push(new XPOrb(enemy.x + offsetX, enemy.y + offsetY, Math.ceil(xpValue / numOrbs)));
        }

        // Random drops
        if (Math.random() < CONFIG.PICKUPS.healthPack.spawnChance) {
            this.pickups.push(new HealthPack(enemy.x, enemy.y));
        }
        if (Math.random() < CONFIG.PICKUPS.magnet.spawnChance) {
            this.pickups.push(new MagnetPickup(enemy.x, enemy.y));
        }
        if (Math.random() < CONFIG.PICKUPS.bomb.spawnChance) {
            this.pickups.push(new BombPickup(enemy.x, enemy.y));
        }

        // Particles
        this.particles.createDeathEffect(enemy.x, enemy.y, enemy.color);
        // Sound removed - too frequent
    }

    /**
     * Handle mini-boss death
     * @param {MiniBoss} miniBoss 
     */
    handleMiniBossDeath(miniBoss) {
        this.kills++;
        this.addScore(500);

        // Guaranteed health drop
        this.pickups.push(new HealthPack(miniBoss.x, miniBoss.y));

        this.particles.createExplosion(miniBoss.x, miniBoss.y, { color: '#ff6600', count: 40 });
        this.ui.triggerScreenShake(8, 300);

        this.miniBoss = null;

        // Spawn portal after miniboss death
        if (!this.portal || !this.portal.active) {
            this.spawnPortal(miniBoss.x, miniBoss.y);
        }
    }

    /**
     * Handle boss death
     * @param {Boss} boss 
     */
    handleBossDeath(boss) {
        this.kills++;
        this.addScore(CONFIG.SCORING.BOSS_KILL);

        // Drop massive XP
        for (let i = 0; i < 20; i++) {
            const offsetX = MathUtils.randomRange(-80, 80);
            const offsetY = MathUtils.randomRange(-80, 80);
            this.pickups.push(new XPOrb(boss.x + offsetX, boss.y + offsetY, 30));
        }

        // Guaranteed drops
        this.pickups.push(new HealthPack(boss.x - 30, boss.y));
        this.pickups.push(new HealthPack(boss.x + 30, boss.y));

        this.particles.createBossDeathEffect(boss.x, boss.y);
        this.ui.triggerScreenShake(15, 500);
        this.ui.hideBossWarning();

        // Drop boss weapon chest pickup
        const chestWorldId = this.currentWorld || 'voidAbyss';
        const weaponCfg = BOSS_DROP_WEAPONS[chestWorldId];
        if (weaponCfg) {
            const chest = new BossChest(boss.x, boss.y, chestWorldId, weaponCfg);
            this.pickups.push(chest);
        }
    }

    /**
     * Activate a temporary boss drop weapon based on current world
     */
    activateTempBossWeapon(worldId) {
        worldId = worldId || this.currentWorld || 'voidAbyss';
        const config = BOSS_DROP_WEAPONS[worldId];
        if (!config) return;

        this.tempBossWeapon = {
            config: config,
            timer: config.duration,
            duration: config.duration,
            // Internal state
            cooldown: 0,
            rotation: 0,
            pulseTimer: 0,
            hitCooldowns: new Map() // enemy -> last hit time for orbit weapons
        };

        // Show HUD notification
        this.ui.showTempWeaponHUD(config);
    }

    /**
     * Update the temporary boss weapon
     */
    updateTempBossWeapon(deltaTime) {
        if (!this.tempBossWeapon) return;

        const tw = this.tempBossWeapon;
        const cfg = tw.config;
        const dt = deltaTime * 1000; // ms

        tw.timer -= dt;
        if (tw.timer <= 0) {
            this.tempBossWeapon = null;
            this.ui.hideTempWeaponHUD();
            return;
        }

        // Update HUD timer
        this.ui.updateTempWeaponTimer(tw.timer, tw.duration);

        // Gather all targets
        const allTargets = [...this.enemies];
        if (this.miniBoss && !this.miniBoss.isDead()) allTargets.push(this.miniBoss);
        for (const boss of this.bosses) {
            if (boss && !boss.isDead()) allTargets.push(boss);
        }

        const px = this.player.x;
        const py = this.player.y;

        switch (cfg.type) {
            case 'voidLightning':
                this._updateVoidLightningWeapon(tw, cfg, allTargets, px, py, deltaTime);
                break;
            case 'fireNova':
                this._updateFireNovaWeapon(tw, cfg, allTargets, px, py, deltaTime);
                break;
            case 'iceStorm':
                this._updateIceStormWeapon(tw, cfg, allTargets, px, py, deltaTime);
                break;
            case 'laserGrid':
                this._updateLaserGridWeapon(tw, cfg, allTargets, px, py, deltaTime);
                break;
            case 'soulBurst':
                this._updateSoulBurstWeapon(tw, cfg, allTargets, px, py, deltaTime);
                break;
        }
    }

    // --- Void Lightning: Direct bolts from player to enemies ---
    _updateVoidLightningWeapon(tw, cfg, targets, px, py, deltaTime) {
        if (!tw._arcs) tw._arcs = [];
        if (!tw._arcCooldown) tw._arcCooldown = 0;
        tw._arcCooldown -= deltaTime * 1000;

        // Decay existing arcs
        for (let i = tw._arcs.length - 1; i >= 0; i--) {
            tw._arcs[i].lifetime -= deltaTime * 1000;
            if (tw._arcs[i].lifetime <= 0) {
                tw._arcs.splice(i, 1);
            }
        }

        // Fire new bolt volley
        if (tw._arcCooldown <= 0 && targets.length > 0) {
            tw._arcCooldown = cfg.arcInterval;

            // Find enemies in range, sorted by distance
            const inRange = [];
            for (const enemy of targets) {
                const wrapped = this.getWrappedDistance(px, py, enemy.x, enemy.y);
                if (wrapped.distance < cfg.radius) {
                    inRange.push({ enemy, dist: wrapped.distance });
                }
            }
            inRange.sort((a, b) => a.dist - b.dist);

            // Fire direct bolts to up to maxArcs enemies
            const boltCount = Math.min(cfg.maxArcs, inRange.length);

            for (let a = 0; a < boltCount; a++) {
                const target = inRange[a].enemy;

                // Direct bolt: player -> enemy
                const chain = [{ x: px, y: py }, { x: target.x, y: target.y }];

                // Damage target
                const hit = this.calcPlayerDamage(cfg.damage);
                target.takeDamage(hit.damage);
                if (hit.isCrit) this.particles.createDamageNumber(target.x, target.y, Math.round(hit.damage), true);
                this.particles.createHitEffect(target.x, target.y, '#aa44ff');
                if (target.isDead()) this.handleEnemyDeath(target);

                // Randomize jagged offsets for visual
                const segJags = [];
                for (let j = 0; j < 4; j++) {
                    segJags.push({
                        perpOff: (Math.random() - 0.5) * 30,
                        frac: (j + 1) / 5
                    });
                }

                tw._arcs.push({
                    chain: chain,
                    jags: [segJags],
                    lifetime: cfg.arcLifetime,
                    maxLifetime: cfg.arcLifetime
                });
            }

            // Screen shake on volley
            if (boltCount > 0) {
                this.ui.triggerScreenShake(4 + boltCount * 0.5, 150);
            }
        }
    }

    // --- Inferno Storm: Fire Nova waves + flame ring ---
    _updateFireNovaWeapon(tw, cfg, targets, px, py, deltaTime) {
        if (!tw._novas) tw._novas = [];
        if (!tw._novaCooldown) tw._novaCooldown = 0;
        if (!tw._ringCooldown) tw._ringCooldown = 0;
        tw.rotation = (tw.rotation || 0) + deltaTime * 3;
        tw._novaCooldown -= deltaTime * 1000;
        tw._ringCooldown -= deltaTime * 1000;

        // Fire nova wave
        if (tw._novaCooldown <= 0) {
            tw._novaCooldown = cfg.novaInterval;
            tw._novaFlash = 1.0;
            this.ui.triggerScreenShake(8, 300);
            tw._novas.push({
                radius: 30,
                maxRadius: cfg.radius,
                speed: cfg.novaSpeed,
                alpha: 1,
                hitEnemies: new Set()
            });
        }

        // Update novas
        for (let i = tw._novas.length - 1; i >= 0; i--) {
            const nova = tw._novas[i];
            nova.radius += nova.speed * deltaTime;
            nova.alpha = Math.max(0, 1 - nova.radius / nova.maxRadius);

            // Damage enemies at the wave front
            for (const enemy of targets) {
                if (nova.hitEnemies.has(enemy)) continue;
                const wrapped = this.getWrappedDistance(px, py, enemy.x, enemy.y);
                if (Math.abs(wrapped.distance - nova.radius) < 30 + enemy.size) {
                    nova.hitEnemies.add(enemy);
                    const hit = this.calcPlayerDamage(cfg.damage);
                    enemy.takeDamage(hit.damage);
                    if (hit.isCrit) this.particles.createDamageNumber(enemy.x, enemy.y, Math.round(hit.damage), true);
                    this.particles.createHitEffect(enemy.x, enemy.y, '#ff6600');
                    if (enemy.isDead()) this.handleEnemyDeath(enemy);
                }
            }

            if (nova.radius >= nova.maxRadius) {
                tw._novas.splice(i, 1);
            }
        }

        // Persistent flame ring damage
        if (tw._ringCooldown <= 0) {
            tw._ringCooldown = cfg.ringTickRate;
            for (const enemy of targets) {
                const wrapped = this.getWrappedDistance(px, py, enemy.x, enemy.y);
                if (Math.abs(wrapped.distance - cfg.ringRadius) < 35) {
                    const hit = this.calcPlayerDamage(cfg.ringDamage);
                    enemy.takeDamage(hit.damage);
                    this.particles.createHitEffect(enemy.x, enemy.y, '#ff4400');
                    this.applyEnemySlow(enemy, 0.6, 500);
                    if (enemy.isDead()) this.handleEnemyDeath(enemy);
                }
            }
        }

        if (tw._novaFlash > 0) tw._novaFlash -= deltaTime * 3;
    }

    // --- Absolute Zero: Ice Storm (stalactites + blizzard) ---
    _updateIceStormWeapon(tw, cfg, targets, px, py, deltaTime) {
        if (!tw._stalactites) tw._stalactites = [];
        if (!tw._stalCooldown) tw._stalCooldown = 0;
        tw._stalCooldown -= deltaTime * 1000;
        tw.rotation += deltaTime * 2;

        // Blizzard field: continuous slow
        for (const enemy of targets) {
            const wrapped = this.getWrappedDistance(px, py, enemy.x, enemy.y);
            if (wrapped.distance < cfg.blizzardRadius) {
                this.applyEnemySlow(enemy, 0.35, 500);
            }
        }

        // Spawn stalactites
        if (tw._stalCooldown <= 0) {
            tw._stalCooldown = cfg.stalactiteRate;
            // Target near enemies
            let sx, sy;
            if (targets.length > 0) {
                const target = targets[Math.floor(Math.random() * targets.length)];
                const wrapped = this.getWrappedDistance(px, py, target.x, target.y);
                if (wrapped.distance < cfg.stalactiteRadius) {
                    sx = target.x + MathUtils.randomRange(-25, 25);
                    sy = target.y + MathUtils.randomRange(-25, 25);
                } else {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = MathUtils.randomRange(30, cfg.stalactiteRadius);
                    sx = px + Math.cos(angle) * dist;
                    sy = py + Math.sin(angle) * dist;
                }
            } else {
                const angle = Math.random() * Math.PI * 2;
                const dist = MathUtils.randomRange(30, cfg.stalactiteRadius);
                sx = px + Math.cos(angle) * dist;
                sy = py + Math.sin(angle) * dist;
            }
            tw._stalactites.push({
                x: sx, y: sy,
                fallTimer: 0,
                fallDuration: 400,
                impactTimer: 0,
                impactDuration: 500,
                phase: 0, // 0=falling, 1=impact, 2=done
                size: MathUtils.randomRange(0.8, 1.3)
            });
        }

        // Update stalactites
        for (let i = tw._stalactites.length - 1; i >= 0; i--) {
            const s = tw._stalactites[i];
            if (s.phase === 0) {
                s.fallTimer += deltaTime * 1000;
                if (s.fallTimer >= s.fallDuration) {
                    s.phase = 1;
                    // Impact damage
                    for (const enemy of targets) {
                        const wrapped = this.getWrappedDistance(s.x, s.y, enemy.x, enemy.y);
                        if (wrapped.distance < cfg.impactRadius) {
                            const hit = this.calcPlayerDamage(cfg.damage);
                            enemy.takeDamage(hit.damage);
                            if (hit.isCrit) this.particles.createDamageNumber(enemy.x, enemy.y, Math.round(hit.damage), true);
                            this.particles.createHitEffect(enemy.x, enemy.y, '#88ddff');
                            // Chance to freeze
                            if (Math.random() < cfg.freezeChance) {
                                if (typeof this.applyEnemyFreeze === 'function') {
                                    this.applyEnemyFreeze(enemy, cfg.freezeDuration);
                                } else {
                                    this.applyEnemySlow(enemy, 0.1, cfg.freezeDuration);
                                }
                            }
                            if (enemy.isDead()) this.handleEnemyDeath(enemy);
                        }
                    }
                    this.ui.triggerScreenShake(3, 100);
                }
            } else if (s.phase === 1) {
                s.impactTimer += deltaTime * 1000;
                if (s.impactTimer >= s.impactDuration) {
                    s.phase = 2;
                }
            }
            if (s.phase === 2) {
                tw._stalactites.splice(i, 1);
            }
        }
    }

    // --- Laser Grid: Rotating laser beams ---
    _updateLaserGridWeapon(tw, cfg, targets, px, py, deltaTime) {
        tw.rotation += cfg.rotationSpeed * deltaTime;
        tw.cooldown -= deltaTime * 1000;
        const now = performance.now();

        if (tw.cooldown <= 0) {
            tw.cooldown = cfg.tickRate;

            for (let i = 0; i < cfg.beamCount; i++) {
                const beamAngle = tw.rotation + (Math.PI * 2 / cfg.beamCount) * i;
                const bx = Math.cos(beamAngle);
                const by = Math.sin(beamAngle);

                for (const enemy of targets) {
                    const wrapped = this.getWrappedDistance(px, py, enemy.x, enemy.y);
                    if (wrapped.distance > cfg.beamLength || wrapped.distance < 15) continue;

                    // Per-enemy cooldown
                    const key = enemy.id || enemy;
                    const lastHit = tw.hitCooldowns.get(key) || 0;
                    if (now - lastHit < cfg.hitCooldown) continue;

                    // Check if enemy is near the beam line
                    const dot = wrapped.dx * bx + wrapped.dy * by;
                    if (dot < 0) continue; // Behind the beam origin
                    const perpDist = Math.abs(wrapped.dx * by - wrapped.dy * bx);

                    if (perpDist < enemy.size + cfg.beamWidth * 0.5) {
                        tw.hitCooldowns.set(key, now);
                        const hit = this.calcPlayerDamage(cfg.damage);
                        enemy.takeDamage(hit.damage);
                        if (hit.isCrit) this.particles.createDamageNumber(enemy.x, enemy.y, Math.round(hit.damage), true);
                        this.particles.createHitEffect(enemy.x, enemy.y, '#00ff88');
                        if (enemy.isDead()) this.handleEnemyDeath(enemy);
                    }
                }
            }
        }
    }

    // --- Death's Harvest: Soul Burst ---
    _updateSoulBurstWeapon(tw, cfg, targets, px, py, deltaTime) {
        if (!tw._souls) tw._souls = [];
        if (!tw._burstCooldown) tw._burstCooldown = 0;
        tw._burstCooldown -= deltaTime * 1000;
        tw.rotation += deltaTime * 2;

        // Burst: release souls in all directions
        if (tw._burstCooldown <= 0) {
            tw._burstCooldown = cfg.burstInterval;
            tw._burstFlash = 1.0;
            this.ui.triggerScreenShake(5, 200);

            for (let i = 0; i < cfg.soulCount; i++) {
                const angle = (Math.PI * 2 / cfg.soulCount) * i + tw.rotation;
                tw._souls.push({
                    x: px, y: py,
                    angle: angle,
                    dist: 0,
                    maxDist: cfg.burstRadius,
                    speed: cfg.soulSpeed + MathUtils.randomRange(-50, 50),
                    phase: 0, // 0=outward, 1=return
                    hitOut: new Set(),
                    hitReturn: new Set(),
                    trail: [],
                    size: MathUtils.randomRange(8, 14)
                });
            }
        }

        // Update souls
        for (let i = tw._souls.length - 1; i >= 0; i--) {
            const soul = tw._souls[i];
            const dt = deltaTime;

            if (soul.phase === 0) {
                // Moving outward
                soul.dist += soul.speed * dt;
                soul.x = px + Math.cos(soul.angle) * soul.dist;
                soul.y = py + Math.sin(soul.angle) * soul.dist;

                // Trail
                soul.trail.push({ x: soul.x, y: soul.y, alpha: 1 });
                if (soul.trail.length > 8) soul.trail.shift();

                // Hit enemies outward
                for (const enemy of targets) {
                    if (soul.hitOut.has(enemy)) continue;
                    const wrapped = this.getWrappedDistance(soul.x, soul.y, enemy.x, enemy.y);
                    if (wrapped.distance < enemy.size + soul.size) {
                        soul.hitOut.add(enemy);
                        const hit = this.calcPlayerDamage(cfg.damage);
                        enemy.takeDamage(hit.damage);
                        if (hit.isCrit) this.particles.createDamageNumber(enemy.x, enemy.y, Math.round(hit.damage), true);
                        this.particles.createHitEffect(enemy.x, enemy.y, '#cc00ff');
                        if (enemy.isDead()) this.handleEnemyDeath(enemy);
                    }
                }

                if (soul.dist >= soul.maxDist) {
                    soul.phase = 1;
                    soul.dist = soul.maxDist;
                }
            } else {
                // Returning
                soul.dist -= soul.speed * 1.3 * dt;
                soul.x = px + Math.cos(soul.angle) * soul.dist;
                soul.y = py + Math.sin(soul.angle) * soul.dist;

                soul.trail.push({ x: soul.x, y: soul.y, alpha: 1 });
                if (soul.trail.length > 8) soul.trail.shift();

                // Hit enemies on return
                for (const enemy of targets) {
                    if (soul.hitReturn.has(enemy)) continue;
                    const wrapped = this.getWrappedDistance(soul.x, soul.y, enemy.x, enemy.y);
                    if (wrapped.distance < enemy.size + soul.size) {
                        soul.hitReturn.add(enemy);
                        const hit = this.calcPlayerDamage(cfg.returnDamage);
                        enemy.takeDamage(hit.damage);
                        this.particles.createHitEffect(enemy.x, enemy.y, '#ff44ff');
                        if (enemy.isDead()) this.handleEnemyDeath(enemy);
                    }
                }

                if (soul.dist <= 0) {
                    tw._souls.splice(i, 1);
                }
            }

            // Decay trail
            for (const t of soul.trail) {
                t.alpha -= deltaTime * 4;
            }
        }

        if (tw._burstFlash > 0) tw._burstFlash -= deltaTime * 3;
    }

    /**
     * Render temporary boss weapon visual effects
     */
    renderTempBossWeapon(ctx) {
        if (!this.tempBossWeapon) return;

        const tw = this.tempBossWeapon;
        const cfg = tw.config;
        const viewWidth = this.canvas.width / this.camera.zoom;
        const viewHeight = this.canvas.height / this.camera.zoom;
        const pcx = viewWidth / 2;
        const pcy = viewHeight / 2;

        ctx.save();

        switch (cfg.type) {
            case 'voidLightning':
                this._renderVoidLightning(ctx, tw, cfg, pcx, pcy);
                break;
            case 'fireNova':
                this._renderFireNova(ctx, tw, cfg, pcx, pcy);
                break;
            case 'iceStorm':
                this._renderIceStorm(ctx, tw, cfg, pcx, pcy);
                break;
            case 'laserGrid':
                this._renderLaserGrid(ctx, tw, cfg, pcx, pcy);
                break;
            case 'soulBurst':
                this._renderSoulBurst(ctx, tw, cfg, pcx, pcy);
                break;
        }

        ctx.restore();
    }

    _renderVoidLightning(ctx, tw, cfg, cx, cy) {
        const t = performance.now() / 1000;
        const px = this.player.x;
        const py = this.player.y;

        // Crackling energy aura around player — visible power indicator
        const auraR = 40 + Math.sin(t * 4) * 8;
        const auraGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, auraR);
        auraGrad.addColorStop(0, 'rgba(170, 68, 255, 0)');
        auraGrad.addColorStop(0.5, `rgba(170, 100, 255, ${0.08 + Math.sin(t * 6) * 0.04})`);
        auraGrad.addColorStop(1, 'rgba(140, 40, 255, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.fill();

        // Electric crackle around player body — constant mini-arcs
        for (let i = 0; i < 8; i++) {
            const baseA = t * 5 + i * Math.PI / 4;
            const r1 = 14 + Math.sin(t * 8 + i * 3) * 4;
            const r2 = 28 + Math.sin(t * 6 + i * 2) * 8;
            const x1 = cx + Math.cos(baseA) * r1;
            const y1 = cy + Math.sin(baseA) * r1;
            const mid1X = cx + Math.cos(baseA + 0.2) * ((r1 + r2) / 2) + Math.sin(t * 15 + i) * 6;
            const mid1Y = cy + Math.sin(baseA + 0.2) * ((r1 + r2) / 2) + Math.cos(t * 13 + i) * 6;
            const x2 = cx + Math.cos(baseA + 0.1) * r2;
            const y2 = cy + Math.sin(baseA + 0.1) * r2;

            const flickerAlpha = 0.3 + Math.sin(t * 20 + i * 7) * 0.25;
            if (flickerAlpha > 0.15) {
                ctx.strokeStyle = `rgba(200, 150, 255, ${flickerAlpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(mid1X, mid1Y);
                ctx.lineTo(x2, y2);
                ctx.stroke();

                // White core on same path
                ctx.strokeStyle = `rgba(255, 255, 255, ${flickerAlpha * 0.5})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(mid1X, mid1Y);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        // Orbiting energy orbs
        for (let i = 0; i < 4; i++) {
            const orbA = t * 3 + i * Math.PI / 2;
            const orbR = 20 + Math.sin(t * 2 + i) * 4;
            const ox = cx + Math.cos(orbA) * orbR;
            const oy = cy + Math.sin(orbA) * orbR;
            const orbGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, 5);
            orbGrad.addColorStop(0, `rgba(220, 180, 255, ${0.7 + Math.sin(t * 8 + i) * 0.2})`);
            orbGrad.addColorStop(1, 'rgba(150, 50, 255, 0)');
            ctx.fillStyle = orbGrad;
            ctx.beginPath();
            ctx.arc(ox, oy, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Render active lightning arcs with enhanced visuals
        for (const arc of tw._arcs) {
            const alpha = Math.max(0, arc.lifetime / arc.maxLifetime);

            for (let s = 0; s < arc.chain.length - 1; s++) {
                const p1 = arc.chain[s];
                const p2 = arc.chain[s + 1];
                const x1 = (s === 0) ? cx : cx + (p1.x - px);
                const y1 = (s === 0) ? cy : cy + (p1.y - py);
                const x2 = cx + (p2.x - px);
                const y2 = cy + (p2.y - py);

                const segJags = arc.jags[s];
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.hypot(dx, dy);
                if (len < 1) continue;
                const nx = -dy / len;
                const ny = dx / len;

                // Build jagged path with time-varying jitter
                const points = [{ x: x1, y: y1 }];
                for (const jag of segJags) {
                    const jitter = 0.7 + Math.sin(t * 25 + s * 3 + jag.frac * 10) * 0.5;
                    points.push({
                        x: x1 + dx * jag.frac + nx * jag.perpOff * jitter,
                        y: y1 + dy * jag.frac + ny * jag.perpOff * jitter
                    });
                }
                points.push({ x: x2, y: y2 });

                // Draw 4 layers: wide glow → mid → core → white
                const layers = [
                    { w: 12, r: 120, g: 50, b: 255, a: alpha * 0.15 },
                    { w: 6, r: 160, g: 100, b: 255, a: alpha * 0.4 },
                    { w: 3, r: 210, g: 180, b: 255, a: alpha * 0.75 },
                    { w: 1.2, r: 255, g: 255, b: 255, a: alpha * 0.6 }
                ];
                for (const l of layers) {
                    ctx.strokeStyle = `rgba(${l.r}, ${l.g}, ${l.b}, ${l.a})`;
                    ctx.lineWidth = l.w;
                    ctx.beginPath();
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let j = 1; j < points.length; j++) ctx.lineTo(points[j].x, points[j].y);
                    ctx.stroke();
                }

                // Branch arcs — small forks off main bolt
                if (s === 0 && points.length > 2) {
                    const branchPt = points[2];
                    const bAngle = Math.atan2(dy, dx) + (Math.sin(t * 10 + s) > 0 ? 0.6 : -0.6);
                    const bLen = 25 + Math.sin(t * 8) * 10;
                    const bEnd = { x: branchPt.x + Math.cos(bAngle) * bLen, y: branchPt.y + Math.sin(bAngle) * bLen };
                    const bMid = {
                        x: (branchPt.x + bEnd.x) / 2 + Math.sin(t * 18) * 8,
                        y: (branchPt.y + bEnd.y) / 2 + Math.cos(t * 16) * 8
                    };
                    ctx.strokeStyle = `rgba(180, 130, 255, ${alpha * 0.3})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(branchPt.x, branchPt.y);
                    ctx.lineTo(bMid.x, bMid.y);
                    ctx.lineTo(bEnd.x, bEnd.y);
                    ctx.stroke();
                    ctx.strokeStyle = `rgba(230, 210, 255, ${alpha * 0.2})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }

                // Impact flash at each hit point
                const impactR = 18 + Math.sin(t * 12 + s) * 4;
                const impGrad = ctx.createRadialGradient(x2, y2, 0, x2, y2, impactR);
                impGrad.addColorStop(0, `rgba(220, 180, 255, ${alpha * 0.5})`);
                impGrad.addColorStop(0.5, `rgba(150, 80, 255, ${alpha * 0.2})`);
                impGrad.addColorStop(1, 'rgba(100, 30, 200, 0)');
                ctx.fillStyle = impGrad;
                ctx.beginPath();
                ctx.arc(x2, y2, impactR, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Subtle range indicator
        ctx.strokeStyle = `rgba(150, 80, 255, ${0.05 + Math.sin(t * 2) * 0.02})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.arc(cx, cy, cfg.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    _renderFireNova(ctx, tw, cfg, cx, cy) {
        const t = performance.now() / 1000;

        // Intense fiery aura around player
        const auraR = 50 + Math.sin(t * 4) * 8;
        const auraGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, auraR);
        auraGrad.addColorStop(0, 'rgba(255, 200, 50, 0.15)');
        auraGrad.addColorStop(0.4, `rgba(255, 100, 0, ${0.12 + Math.sin(t * 5) * 0.05})`);
        auraGrad.addColorStop(1, 'rgba(255, 30, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.fill();

        // Flickering flame particles around player body
        for (let i = 0; i < 10; i++) {
            const fAngle = t * 3 + i * Math.PI / 5;
            const fR = 16 + Math.sin(t * 6 + i * 2.3) * 6;
            const fx = cx + Math.cos(fAngle) * fR;
            const fy = cy + Math.sin(fAngle) * fR - Math.abs(Math.sin(t * 8 + i * 1.7)) * 10;
            const fSize = 3 + Math.sin(t * 10 + i * 3) * 1.5;
            const fAlpha = 0.5 + Math.sin(t * 12 + i * 4) * 0.3;
            ctx.fillStyle = `rgba(255, ${150 + Math.floor(Math.sin(t * 7 + i) * 60)}, 0, ${fAlpha})`;
            ctx.beginPath();
            ctx.arc(fx, fy, fSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Persistent flame ring
        const ringR = cfg.ringRadius;
        // Multiple concentric flame circles
        for (let r = 0; r < 3; r++) {
            const rOffset = r * 6;
            const thisR = ringR - rOffset;
            ctx.strokeStyle = `rgba(255, ${80 + r * 40}, 0, ${0.35 - r * 0.08 + Math.sin(t * 4 + r) * 0.08})`;
            ctx.lineWidth = 4 - r;
            ctx.beginPath();
            for (let i = 0; i <= 48; i++) {
                const a = (i / 48) * Math.PI * 2;
                const wobble = Math.sin(a * 8 + t * (6 - r) + r * 2) * (5 + r * 2);
                const rx = cx + Math.cos(a) * (thisR + wobble);
                const ry = cy + Math.sin(a) * (thisR + wobble);
                i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Flame tongues rising from ring
        for (let i = 0; i < 16; i++) {
            const a = tw.rotation + i * Math.PI / 8;
            const baseX = cx + Math.cos(a) * ringR;
            const baseY = cy + Math.sin(a) * ringR;
            const flameH = 12 + Math.sin(t * 7 + i * 2.1) * 8;
            const outAngle = a; // point outward
            const tipX = baseX + Math.cos(outAngle) * flameH;
            const tipY = baseY + Math.sin(outAngle) * flameH;

            // Flame shape (triangle pointing outward)
            const perpX = Math.cos(a + Math.PI / 2) * 4;
            const perpY = Math.sin(a + Math.PI / 2) * 4;

            ctx.fillStyle = `rgba(255, ${100 + Math.floor(Math.sin(t * 9 + i) * 50)}, 0, ${0.5 + Math.sin(t * 11 + i * 3) * 0.2})`;
            ctx.beginPath();
            ctx.moveTo(baseX - perpX, baseY - perpY);
            ctx.lineTo(tipX, tipY);
            ctx.lineTo(baseX + perpX, baseY + perpY);
            ctx.closePath();
            ctx.fill();
        }

        // Ring inner glow fill
        const ringGlow = ctx.createRadialGradient(cx, cy, ringR * 0.6, cx, cy, ringR);
        ringGlow.addColorStop(0, 'rgba(255, 80, 0, 0)');
        ringGlow.addColorStop(0.8, `rgba(255, 60, 0, ${0.06 + Math.sin(t * 3) * 0.02})`);
        ringGlow.addColorStop(1, 'rgba(255, 40, 0, 0)');
        ctx.fillStyle = ringGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.fill();

        // Expanding nova waves
        for (const nova of (tw._novas || [])) {
            const novaAlpha = nova.alpha;
            if (novaAlpha <= 0) continue;

            // Thick fire wave front
            const waveGrad = ctx.createRadialGradient(cx, cy, Math.max(0, nova.radius - 25), cx, cy, nova.radius + 15);
            waveGrad.addColorStop(0, 'rgba(255, 50, 0, 0)');
            waveGrad.addColorStop(0.3, `rgba(255, 100, 0, ${novaAlpha * 0.4})`);
            waveGrad.addColorStop(0.5, `rgba(255, 200, 50, ${novaAlpha * 0.6})`);
            waveGrad.addColorStop(0.7, `rgba(255, 120, 0, ${novaAlpha * 0.35})`);
            waveGrad.addColorStop(1, 'rgba(255, 30, 0, 0)');
            ctx.fillStyle = waveGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, nova.radius + 15, 0, Math.PI * 2);
            ctx.fill();

            // Bright edge ring
            ctx.strokeStyle = `rgba(255, 220, 100, ${novaAlpha * 0.7})`;
            ctx.lineWidth = 4 * novaAlpha;
            ctx.beginPath();
            ctx.arc(cx, cy, nova.radius, 0, Math.PI * 2);
            ctx.stroke();

            // White-hot inner ring
            ctx.strokeStyle = `rgba(255, 255, 200, ${novaAlpha * 0.5})`;
            ctx.lineWidth = 2 * novaAlpha;
            ctx.beginPath();
            ctx.arc(cx, cy, nova.radius - 5, 0, Math.PI * 2);
            ctx.stroke();

            // Fire sparks along the wave
            for (let i = 0; i < 12; i++) {
                const sparkA = i * Math.PI / 6 + nova.radius * 0.02;
                const sparkX = cx + Math.cos(sparkA) * nova.radius;
                const sparkY = cy + Math.sin(sparkA) * nova.radius;
                const sparkSz = 3 + Math.sin(t * 10 + i * 2) * 1.5;
                ctx.fillStyle = `rgba(255, ${200 + Math.floor(Math.sin(t * 8 + i) * 55)}, 50, ${novaAlpha * 0.7})`;
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, sparkSz * novaAlpha, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Nova flash
        if (tw._novaFlash > 0) {
            const flashR = 60 * (1 - tw._novaFlash * 0.3);
            const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
            flashGrad.addColorStop(0, `rgba(255, 255, 200, ${tw._novaFlash * 0.5})`);
            flashGrad.addColorStop(0.5, `rgba(255, 150, 0, ${tw._novaFlash * 0.25})`);
            flashGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = flashGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ambient embers floating around
        for (let i = 0; i < 12; i++) {
            const seed = i * 137.508;
            const eAngle = (t * 0.7 + seed) % (Math.PI * 2);
            const eDist = 30 + ((seed * 0.31 + t * 40) % (cfg.radius * 0.7));
            const ex = cx + Math.cos(eAngle) * eDist;
            const ey = cy + Math.sin(eAngle) * eDist - Math.sin(t * 3 + seed) * 8;
            const eSize = 1.5 + Math.sin(t * 5 + seed) * 0.8;
            ctx.fillStyle = `rgba(255, ${120 + Math.floor(Math.sin(seed) * 60)}, 0, ${0.3 + Math.sin(t * 4 + seed) * 0.15})`;
            ctx.beginPath();
            ctx.arc(ex, ey, eSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _renderIceStorm(ctx, tw, cfg, cx, cy) {
        const t = performance.now() / 1000;
        const radius = cfg.blizzardRadius;
        const px = this.player.x;
        const py = this.player.y;

        // Blizzard field
        const blizGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        blizGrad.addColorStop(0, 'rgba(180, 230, 255, 0.04)');
        blizGrad.addColorStop(0.5, 'rgba(100, 200, 255, 0.1)');
        blizGrad.addColorStop(0.8, 'rgba(50, 150, 255, 0.15)');
        blizGrad.addColorStop(1, 'rgba(30, 100, 200, 0.08)');
        ctx.fillStyle = blizGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Blizzard edge ring
        ctx.strokeStyle = `rgba(150, 220, 255, ${0.3 + Math.sin(t * 2) * 0.1})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Wind streaks (diagonal lines showing blizzard wind)
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
            const seed = i * 97.3;
            const startX = cx - radius + ((seed * 3.7 + t * 200) % (radius * 2));
            const startY = cy - radius + ((seed * 2.3 + t * 80) % (radius * 2));
            const len = 20 + Math.sin(seed) * 10;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX + len, startY + len * 0.3);
            ctx.stroke();
        }

        // Swirling snowflakes in blizzard
        for (let i = 0; i < 20; i++) {
            const seed = i * 137.508;
            const angle = (t * 1.2 + seed) % (Math.PI * 2);
            const dist = ((seed * 0.27 + t * 50) % radius);
            const sx = cx + Math.cos(angle) * dist;
            const sy = cy + Math.sin(angle) * dist + Math.sin(t * 3 + seed) * 5;
            const alpha = 0.3 + Math.sin(t * 4 + seed) * 0.15;
            const sz = 1.5 + Math.sin(t * 2 + seed) * 0.8;
            ctx.fillStyle = `rgba(220, 245, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, sz, 0, Math.PI * 2);
            ctx.fill();
        }

        // Render each stalactite
        for (const st of tw._stalactites) {
            const screenX = cx + (st.x - px);
            const screenY = cy + (st.y - py);

            if (st.phase === 0) {
                // FALLING — ice spike descending with shadow below
                const fallProgress = Math.min(1, st.fallTimer / st.fallDuration);

                // Shadow on ground growing
                ctx.fillStyle = `rgba(0, 50, 100, ${fallProgress * 0.3})`;
                ctx.beginPath();
                ctx.ellipse(screenX, screenY + 5, 8 + fallProgress * 10, 3 + fallProgress * 4, 0, 0, Math.PI * 2);
                ctx.fill();

                // Ice spike above (falling from sky)
                const spikeY = screenY - 150 + fallProgress * 150;
                const spikeH = 30;

                // Spike body
                ctx.fillStyle = `rgba(150, 220, 255, ${0.7 + fallProgress * 0.2})`;
                ctx.beginPath();
                ctx.moveTo(screenX, spikeY - spikeH);
                ctx.lineTo(screenX - 6, spikeY);
                ctx.lineTo(screenX + 6, spikeY);
                ctx.closePath();
                ctx.fill();

                // Bright core
                ctx.fillStyle = 'rgba(220, 245, 255, 0.6)';
                ctx.beginPath();
                ctx.moveTo(screenX, spikeY - spikeH + 5);
                ctx.lineTo(screenX - 2, spikeY - 3);
                ctx.lineTo(screenX + 2, spikeY - 3);
                ctx.closePath();
                ctx.fill();

                // Motion trail
                ctx.strokeStyle = `rgba(180, 230, 255, ${0.3 * (1 - fallProgress)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(screenX, spikeY - spikeH - 20);
                ctx.lineTo(screenX, spikeY - spikeH);
                ctx.stroke();

            } else if (st.phase === 1) {
                // IMPACT — ice shatter explosion
                const impactProgress = Math.min(1, st.impactTimer / st.impactDuration);

                // Impact flash
                const impGrad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, cfg.impactRadius);
                impGrad.addColorStop(0, `rgba(200, 240, 255, ${(1 - impactProgress) * 0.4})`);
                impGrad.addColorStop(0.5, `rgba(100, 200, 255, ${(1 - impactProgress) * 0.2})`);
                impGrad.addColorStop(1, 'rgba(50, 150, 255, 0)');
                ctx.fillStyle = impGrad;
                ctx.beginPath();
                ctx.arc(screenX, screenY, cfg.impactRadius * (0.3 + impactProgress * 0.7), 0, Math.PI * 2);
                ctx.fill();

                // Shatter ring
                ctx.strokeStyle = `rgba(180, 240, 255, ${(1 - impactProgress) * 0.7})`;
                ctx.lineWidth = 3 * (1 - impactProgress);
                ctx.beginPath();
                ctx.arc(screenX, screenY, impactProgress * cfg.impactRadius, 0, Math.PI * 2);
                ctx.stroke();

                // Ice shards flying outward
                for (let i = 0; i < 8; i++) {
                    const shardA = i * Math.PI / 4 + st.x * 0.1;
                    const shardDist = impactProgress * cfg.impactRadius * 0.8;
                    const shardX = screenX + Math.cos(shardA) * shardDist;
                    const shardY = screenY + Math.sin(shardA) * shardDist;
                    const sz = 3 * (1 - impactProgress);
                    ctx.fillStyle = `rgba(180, 235, 255, ${(1 - impactProgress) * 0.7})`;
                    ctx.save();
                    ctx.translate(shardX, shardY);
                    ctx.rotate(shardA + impactProgress * 3);
                    ctx.fillRect(-sz, -sz * 0.4, sz * 2, sz * 0.8);
                    ctx.restore();
                }

                // Ground frost patch
                ctx.fillStyle = `rgba(180, 230, 255, ${(1 - impactProgress) * 0.15})`;
                ctx.beginPath();
                ctx.arc(screenX, screenY, 20 + impactProgress * 15, 0, Math.PI * 2);
                ctx.fill();

            } else {
                // FADING — frost residue
                const fadeAlpha = 0.5;
                ctx.fillStyle = `rgba(150, 220, 255, ${fadeAlpha * 0.1})`;
                ctx.beginPath();
                ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _renderLaserGrid(ctx, tw, cfg, cx, cy) {
        const t = performance.now() / 1000;
        const bc = cfg.beamCount;

        // Spinning energy vortex around player
        ctx.save();
        ctx.translate(cx, cy);
        for (let ring = 0; ring < 3; ring++) {
            const rr = 18 + ring * 10;
            const segments = 20;
            ctx.rotate(t * (3 - ring) * (ring % 2 === 0 ? 1 : -1));
            ctx.strokeStyle = `rgba(0, 255, ${180 + ring * 30}, ${0.15 - ring * 0.03 + Math.sin(t * 6 + ring) * 0.05})`;
            ctx.lineWidth = 2 - ring * 0.4;
            ctx.beginPath();
            for (let s = 0; s <= segments; s++) {
                const sa = (s / segments) * Math.PI * 2;
                const wobble = Math.sin(sa * 5 + t * 8 + ring * 2) * (3 + ring);
                const sx = Math.cos(sa) * (rr + wobble);
                const sy = Math.sin(sa) * (rr + wobble);
                s === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
            }
            ctx.stroke();
        }
        ctx.restore();

        // Core energy orb (pulsing)
        const coreR = 8 + Math.sin(t * 8) * 3;
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 + Math.sin(t * 12) * 0.1})`);
        coreGrad.addColorStop(0.4, `rgba(0, 255, 220, ${0.7 + Math.sin(t * 10) * 0.15})`);
        coreGrad.addColorStop(1, 'rgba(0, 200, 255, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();

        // Calculate beam data
        const beams = [];
        for (let i = 0; i < bc; i++) {
            const beamAngle = tw.rotation + (Math.PI * 2 / bc) * i;
            beams.push({
                angle: beamAngle,
                endX: cx + Math.cos(beamAngle) * cfg.beamLength,
                endY: cy + Math.sin(beamAngle) * cfg.beamLength
            });
        }

        // Render each beam as a flowing, electric, animated laser
        for (let i = 0; i < bc; i++) {
            const beam = beams[i];
            const pulse = 0.8 + Math.sin(t * 14 + i * 2.1) * 0.2;
            const dx = beam.endX - cx;
            const dy = beam.endY - cy;
            const len = cfg.beamLength;

            // --- Beam rendered as animated zigzag lightning segments ---
            const segCount = 12;
            const perpX = -dy / len;
            const perpY = dx / len;

            // Generate animated control points along the beam
            const points = [{ x: cx, y: cy }];
            for (let s = 1; s < segCount; s++) {
                const frac = s / segCount;
                const baseX = cx + dx * frac;
                const baseY = cy + dy * frac;
                // Animate the zigzag offset per segment
                const wave1 = Math.sin(t * 10 + s * 1.8 + i * 3.7) * (8 + s * 0.5);
                const wave2 = Math.cos(t * 13 + s * 2.3 + i * 1.9) * 4;
                const offset = wave1 + wave2;
                points.push({
                    x: baseX + perpX * offset,
                    y: baseY + perpY * offset
                });
            }
            points.push({ x: beam.endX, y: beam.endY });

            // Draw multiple layers of the zigzag beam
            const layers = [
                { width: cfg.beamWidth * 4, color: `rgba(0, 180, 255, ${0.06 * pulse})` },
                { width: cfg.beamWidth * 2.5, color: `rgba(0, 255, 200, ${0.12 * pulse})` },
                { width: cfg.beamWidth * 1.2, color: `rgba(0, 255, 230, ${0.4 * pulse})` },
                { width: cfg.beamWidth * 0.5, color: `rgba(180, 255, 250, ${0.85 * pulse})` },
                { width: 2, color: `rgba(255, 255, 255, ${0.8 * pulse})` }
            ];

            for (const layer of layers) {
                ctx.strokeStyle = layer.color;
                ctx.lineWidth = layer.width;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let p = 1; p < points.length; p++) {
                    ctx.lineTo(points[p].x, points[p].y);
                }
                ctx.stroke();
            }

            // Bright energy nodes at zigzag joints
            for (let s = 1; s < points.length - 1; s++) {
                const nodeAlpha = 0.3 + Math.sin(t * 15 + s * 2 + i) * 0.2;
                const nodeR = 2.5 + Math.sin(t * 12 + s * 3 + i * 1.5) * 1;
                ctx.fillStyle = `rgba(200, 255, 250, ${nodeAlpha * pulse})`;
                ctx.beginPath();
                ctx.arc(points[s].x, points[s].y, nodeR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Traveling energy orb along zigzag path
            const orbFrac = ((t * 3 + i * 0.5) % 1);
            const orbIdx = orbFrac * (points.length - 1);
            const orbI = Math.floor(orbIdx);
            const orbT = orbIdx - orbI;
            if (orbI < points.length - 1) {
                const orbX = points[orbI].x + (points[orbI + 1].x - points[orbI].x) * orbT;
                const orbY = points[orbI].y + (points[orbI + 1].y - points[orbI].y) * orbT;
                const orbR = 7 + Math.sin(t * 10) * 2;
                const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR);
                orbGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * pulse})`);
                orbGrad.addColorStop(0.4, `rgba(0, 255, 220, ${0.5 * pulse})`);
                orbGrad.addColorStop(1, 'rgba(0, 200, 255, 0)');
                ctx.fillStyle = orbGrad;
                ctx.beginPath();
                ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Second orb traveling in reverse
            const orb2Frac = ((t * 2.3 + i * 0.7 + 0.5) % 1);
            const orb2Idx = (1 - orb2Frac) * (points.length - 1);
            const orb2I = Math.floor(orb2Idx);
            const orb2T = orb2Idx - orb2I;
            if (orb2I < points.length - 1) {
                const o2x = points[orb2I].x + (points[orb2I + 1].x - points[orb2I].x) * orb2T;
                const o2y = points[orb2I].y + (points[orb2I + 1].y - points[orb2I].y) * orb2T;
                ctx.fillStyle = `rgba(0, 255, 200, ${0.5 * pulse})`;
                ctx.beginPath();
                ctx.arc(o2x, o2y, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Endpoint: electric explosion with forking mini-arcs
            const epx = beam.endX;
            const epy = beam.endY;

            // Glowing endpoint orb
            const epR = 14 + Math.sin(t * 9 + i * 2.5) * 5;
            const epGrad = ctx.createRadialGradient(epx, epy, 0, epx, epy, epR);
            epGrad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * pulse})`);
            epGrad.addColorStop(0.25, `rgba(0, 255, 220, ${0.5 * pulse})`);
            epGrad.addColorStop(0.6, `rgba(0, 200, 255, ${0.15 * pulse})`);
            epGrad.addColorStop(1, 'rgba(0, 120, 255, 0)');
            ctx.fillStyle = epGrad;
            ctx.beginPath();
            ctx.arc(epx, epy, epR, 0, Math.PI * 2);
            ctx.fill();

            // Forking mini lightning arcs from endpoint
            for (let f = 0; f < 5; f++) {
                const forkAngle = t * 7 + f * Math.PI * 2 / 5 + i * 1.3;
                const forkLen = 15 + Math.sin(t * 11 + f * 3 + i) * 8;
                const midForkX = epx + Math.cos(forkAngle) * forkLen * 0.5 + Math.sin(t * 16 + f) * 4;
                const midForkY = epy + Math.sin(forkAngle) * forkLen * 0.5 + Math.cos(t * 14 + f) * 4;
                const tipX = epx + Math.cos(forkAngle) * forkLen;
                const tipY = epy + Math.sin(forkAngle) * forkLen;
                const forkAlpha = 0.4 + Math.sin(t * 18 + f * 2 + i) * 0.25;

                // Fork glow
                ctx.strokeStyle = `rgba(0, 255, 220, ${forkAlpha * 0.4 * pulse})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(epx, epy);
                ctx.lineTo(midForkX, midForkY);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
                // Fork core
                ctx.strokeStyle = `rgba(200, 255, 250, ${forkAlpha * pulse})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(epx, epy);
                ctx.lineTo(midForkX, midForkY);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
            }
        }

        // Electric arcs connecting adjacent beam endpoints
        for (let i = 0; i < bc; i++) {
            const next = (i + 1) % bc;
            const e1 = beams[i];
            const e2 = beams[next];
            // Animated arc with zigzag
            const arcSegs = 6;
            ctx.strokeStyle = `rgba(0, 255, 220, ${0.1 + Math.sin(t * 4 + i) * 0.04})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(e1.endX, e1.endY);
            for (let s = 1; s < arcSegs; s++) {
                const frac = s / arcSegs;
                const mx = e1.endX + (e2.endX - e1.endX) * frac;
                const my = e1.endY + (e2.endY - e1.endY) * frac;
                // Push outward from center + zigzag
                const adx = mx - cx;
                const ady = my - cy;
                const adist = Math.hypot(adx, ady) || 1;
                const push = Math.sin(t * 6 + s * 2 + i) * 20;
                const zigzag = Math.sin(t * 14 + s * 4 + i * 3) * 8;
                const apx = -(e2.endY - e1.endY) / (Math.hypot(e2.endX - e1.endX, e2.endY - e1.endY) || 1);
                const apy = (e2.endX - e1.endX) / (Math.hypot(e2.endX - e1.endX, e2.endY - e1.endY) || 1);
                ctx.lineTo(
                    mx + (adx / adist) * push + apx * zigzag,
                    my + (ady / adist) * push + apy * zigzag
                );
            }
            ctx.lineTo(e2.endX, e2.endY);
            ctx.stroke();
        }

        // Ambient electric particles floating around
        for (let i = 0; i < 20; i++) {
            const seed = i * 61.7;
            const pa = (t * 0.6 + seed * 0.1) % (Math.PI * 2);
            const pd = 30 + ((seed * 0.37 + t * 30) % (cfg.beamLength * 0.85));
            const ppx = cx + Math.cos(pa) * pd;
            const ppy = cy + Math.sin(pa) * pd;
            const pSize = 1 + Math.sin(t * 6 + seed) * 0.5;
            // Flickering particles
            const flicker = Math.sin(t * 20 + seed * 3) > 0.3 ? 1 : 0.2;
            ctx.fillStyle = `rgba(0, 255, 220, ${(0.25 + Math.sin(t * 5 + seed) * 0.1) * flicker})`;
            ctx.beginPath();
            ctx.arc(ppx, ppy, pSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _renderSoulBurst(ctx, tw, cfg, cx, cy) {
        const t = performance.now() / 1000;

        // Dark vortex swirl around player
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * -1.5);
        for (let i = 0; i < 5; i++) {
            const spiralA = i * Math.PI * 2 / 5;
            const spiralR = 20 + Math.sin(t * 3 + i * 1.7) * 8;
            ctx.strokeStyle = `rgba(80, 0, 120, ${0.15 + Math.sin(t * 4 + i) * 0.06})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, spiralR, spiralA, spiralA + Math.PI * 0.6);
            ctx.stroke();
        }
        ctx.restore();

        // Spectral aura with dark inner void
        const auraR = 55 + Math.sin(t * 4) * 8;
        const auraGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, auraR);
        auraGrad.addColorStop(0, `rgba(40, 0, 60, ${0.12 + Math.sin(t * 3) * 0.04})`);
        auraGrad.addColorStop(0.3, `rgba(120, 0, 200, ${0.15 + Math.sin(t * 5) * 0.05})`);
        auraGrad.addColorStop(0.7, `rgba(180, 50, 255, ${0.08 + Math.sin(t * 4) * 0.03})`);
        auraGrad.addColorStop(1, 'rgba(100, 0, 180, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting rune symbols (small rotating glyphs)
        for (let i = 0; i < 4; i++) {
            const runeA = t * 2 + i * Math.PI / 2;
            const runeR = 28 + Math.sin(t * 3 + i * 2) * 4;
            const rx = cx + Math.cos(runeA) * runeR;
            const ry = cy + Math.sin(runeA) * runeR;
            ctx.save();
            ctx.translate(rx, ry);
            ctx.rotate(t * 4 + i);
            ctx.strokeStyle = `rgba(200, 100, 255, ${0.4 + Math.sin(t * 6 + i * 2) * 0.2})`;
            ctx.lineWidth = 1.5;
            // Diamond glyph
            const gs = 4;
            ctx.beginPath();
            ctx.moveTo(0, -gs); ctx.lineTo(gs, 0); ctx.lineTo(0, gs); ctx.lineTo(-gs, 0);
            ctx.closePath();
            ctx.stroke();
            // Cross inside
            ctx.beginPath();
            ctx.moveTo(0, -gs * 0.5); ctx.lineTo(0, gs * 0.5);
            ctx.moveTo(-gs * 0.5, 0); ctx.lineTo(gs * 0.5, 0);
            ctx.stroke();
            ctx.restore();
        }

        // Pulsing death ring
        const deathRingR = 45 + Math.sin(t * 5) * 5;
        ctx.strokeStyle = `rgba(180, 0, 255, ${0.2 + Math.sin(t * 6) * 0.1})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, deathRingR, 0, Math.PI * 2);
        ctx.stroke();
        // Inner death ring
        ctx.strokeStyle = `rgba(220, 100, 255, ${0.12 + Math.sin(t * 7) * 0.06})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, deathRingR - 6, 0, Math.PI * 2);
        ctx.stroke();

        // Burst flash (dramatic expanding ring)
        if (tw._burstFlash > 0) {
            const bf = tw._burstFlash;
            const flashR = 100 * (1 - bf * 0.4);

            // Outer shockwave ring
            ctx.strokeStyle = `rgba(200, 100, 255, ${bf * 0.5})`;
            ctx.lineWidth = 5 * bf;
            ctx.beginPath();
            ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
            ctx.stroke();

            // Inner bright flash
            const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR * 0.7);
            flashGrad.addColorStop(0, `rgba(255, 200, 255, ${bf * 0.4})`);
            flashGrad.addColorStop(0.4, `rgba(200, 50, 255, ${bf * 0.2})`);
            flashGrad.addColorStop(1, 'rgba(120, 0, 200, 0)');
            ctx.fillStyle = flashGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, flashR * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // Spectral lines radiating outward during burst
            for (let i = 0; i < 12; i++) {
                const lineA = i * Math.PI / 6 + bf * 3;
                const lineEnd = flashR * (0.5 + bf * 0.5);
                ctx.strokeStyle = `rgba(220, 150, 255, ${bf * 0.35})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(lineA) * 20, cy + Math.sin(lineA) * 20);
                ctx.lineTo(cx + Math.cos(lineA) * lineEnd, cy + Math.sin(lineA) * lineEnd);
                ctx.stroke();
            }
        }

        // Render each soul
        for (const soul of tw._souls) {
            const screenX = cx + (soul.x - this.player.x);
            const screenY = cy + (soul.y - this.player.y);
            const returning = soul.phase === 1;

            // Long flowing trail with gradient
            for (let i = 0; i < soul.trail.length; i++) {
                const tr = soul.trail[i];
                if (tr.alpha <= 0) continue;
                const trX = cx + (tr.x - this.player.x);
                const trY = cy + (tr.y - this.player.y);
                const trFrac = i / soul.trail.length;
                const trSize = soul.size * trFrac * 1.2;
                const trAlpha = tr.alpha * 0.6;

                // Trail glow
                if (trSize > 1) {
                    const trGrad = ctx.createRadialGradient(trX, trY, 0, trX, trY, trSize * 2.5);
                    if (returning) {
                        trGrad.addColorStop(0, `rgba(255, 80, 255, ${trAlpha * 0.5})`);
                        trGrad.addColorStop(1, 'rgba(200, 0, 200, 0)');
                    } else {
                        trGrad.addColorStop(0, `rgba(180, 80, 255, ${trAlpha * 0.5})`);
                        trGrad.addColorStop(1, 'rgba(100, 0, 200, 0)');
                    }
                    ctx.fillStyle = trGrad;
                    ctx.beginPath();
                    ctx.arc(trX, trY, trSize * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Trail core dots
                ctx.fillStyle = returning
                    ? `rgba(255, 150, 255, ${trAlpha})`
                    : `rgba(200, 120, 255, ${trAlpha})`;
                ctx.beginPath();
                ctx.arc(trX, trY, trSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // Soul outer glow (large)
            const glowR = soul.size * 4;
            const glowGrad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowR);
            if (returning) {
                glowGrad.addColorStop(0, 'rgba(255, 120, 255, 0.45)');
                glowGrad.addColorStop(0.4, 'rgba(255, 50, 200, 0.15)');
                glowGrad.addColorStop(1, 'rgba(200, 0, 150, 0)');
            } else {
                glowGrad.addColorStop(0, 'rgba(200, 120, 255, 0.45)');
                glowGrad.addColorStop(0.4, 'rgba(150, 50, 255, 0.15)');
                glowGrad.addColorStop(1, 'rgba(100, 0, 200, 0)');
            }
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(screenX, screenY, glowR, 0, Math.PI * 2);
            ctx.fill();

            // Ghost face shape on soul
            ctx.save();
            ctx.translate(screenX, screenY);
            const faceScale = soul.size * 0.6;
            // Ghost body (rounded top, wavy bottom)
            ctx.fillStyle = returning ? 'rgba(255, 200, 255, 0.7)' : 'rgba(220, 180, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(0, -faceScale * 0.3, faceScale, Math.PI, 0); // rounded top
            // Wavy bottom
            const waveY = faceScale * 0.7;
            ctx.lineTo(faceScale, waveY);
            for (let w = 0; w < 3; w++) {
                const wx1 = faceScale - (w * 2 + 1) * faceScale / 3;
                const wx2 = faceScale - (w * 2 + 2) * faceScale / 3;
                ctx.quadraticCurveTo(wx1, waveY + faceScale * 0.3 * Math.sin(t * 8 + w), wx2, waveY);
            }
            ctx.closePath();
            ctx.fill();

            // Eyes (dark hollow)
            ctx.fillStyle = returning ? 'rgba(100, 0, 100, 0.8)' : 'rgba(60, 0, 80, 0.8)';
            const eyeY = -faceScale * 0.2;
            const eyeSpacing = faceScale * 0.35;
            ctx.beginPath();
            ctx.ellipse(-eyeSpacing, eyeY, faceScale * 0.15, faceScale * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(eyeSpacing, eyeY, faceScale * 0.15, faceScale * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Eye glow
            ctx.fillStyle = returning ? `rgba(255, 100, 255, ${0.5 + Math.sin(t * 10) * 0.3})` : `rgba(180, 80, 255, ${0.5 + Math.sin(t * 10) * 0.3})`;
            ctx.beginPath();
            ctx.arc(-eyeSpacing, eyeY, faceScale * 0.07, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eyeSpacing, eyeY, faceScale * 0.07, 0, Math.PI * 2);
            ctx.fill();

            // Mouth (open oval)
            ctx.fillStyle = returning ? 'rgba(80, 0, 80, 0.6)' : 'rgba(40, 0, 60, 0.6)';
            ctx.beginPath();
            ctx.ellipse(0, faceScale * 0.15, faceScale * 0.15, faceScale * 0.1 + Math.sin(t * 6) * faceScale * 0.05, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Spectral wisps / tendrils streaming off soul
            for (let w = 0; w < 5; w++) {
                const wa = t * 5 + w * Math.PI * 2 / 5 + soul.angle;
                const wd = soul.size * (2 + Math.sin(t * 7 + w * 1.3) * 1);
                const wx = screenX + Math.cos(wa) * wd;
                const wy = screenY + Math.sin(wa) * wd;
                // Wisp line
                ctx.strokeStyle = returning
                    ? `rgba(255, 150, 255, ${0.25 + Math.sin(t * 9 + w) * 0.1})`
                    : `rgba(180, 120, 255, ${0.25 + Math.sin(t * 9 + w) * 0.1})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                const ctrlX = (screenX + wx) / 2 + Math.sin(t * 6 + w * 2) * 8;
                const ctrlY = (screenY + wy) / 2 + Math.cos(t * 6 + w * 2) * 8;
                ctx.quadraticCurveTo(ctrlX, ctrlY, wx, wy);
                ctx.stroke();
                // Wisp tip
                ctx.fillStyle = returning
                    ? `rgba(255, 180, 255, ${0.3 + Math.sin(t * 8 + w) * 0.15})`
                    : `rgba(200, 150, 255, ${0.3 + Math.sin(t * 8 + w) * 0.15})`;
                ctx.beginPath();
                ctx.arc(wx, wy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Floating spectral particles in wider area
        for (let i = 0; i < 16; i++) {
            const seed = i * 73.41;
            const a = (t * 1.2 + seed * 0.1) % (Math.PI * 2);
            const dist = 25 + ((seed * 0.23 + t * 20) % (cfg.burstRadius * 0.5));
            const px = cx + Math.cos(a) * dist;
            const py = cy + Math.sin(a) * dist - Math.sin(t * 4 + seed) * 5;
            const pSize = 1.5 + Math.sin(t * 5 + seed) * 0.7;
            // Some particles are darker (shadow), some brighter (spectral)
            if (i % 3 === 0) {
                ctx.fillStyle = `rgba(60, 0, 80, ${0.2 + Math.sin(t * 3 + seed) * 0.08})`;
            } else {
                ctx.fillStyle = `rgba(180, 100, 255, ${0.2 + Math.sin(t * 3 + seed) * 0.08})`;
            }
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Shadow tendrils reaching out from player
        for (let i = 0; i < 6; i++) {
            const ta = t * 0.8 + i * Math.PI / 3;
            const tLen = 35 + Math.sin(t * 2.5 + i * 1.8) * 15;
            const tx = cx + Math.cos(ta) * tLen;
            const ty = cy + Math.sin(ta) * tLen;
            ctx.strokeStyle = `rgba(100, 0, 150, ${0.12 + Math.sin(t * 3 + i * 2) * 0.05})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            const ctrlX = (cx + tx) / 2 + Math.sin(t * 4 + i) * 12;
            const ctrlY = (cy + ty) / 2 + Math.cos(t * 4 + i) * 12;
            ctx.quadraticCurveTo(ctrlX, ctrlY, tx, ty);
            ctx.stroke();
        }
    }

    /**
     * Spawn a dimensional portal at the boss death location
     */
    spawnPortal(x, y) {
        const availableWorlds = WORLD_ORDER.filter(id => id !== this.currentWorld);
        if (availableWorlds.length === 0) return;

        // Pick a fixed random destination for this portal
        const destWorldId = availableWorlds[Math.floor(Math.random() * availableWorlds.length)];
        this.portal = new DimensionalPortal(x, y, destWorldId);
        this.ui.showPortalNotification();
    }

    /**
     * Update portal state
     */
    updatePortal(deltaTime) {
        if (!this.portal || !this.portal.active) return;

        this.portal.update(deltaTime);

        // Check if player is in range
        const inRange = this.portal.isPlayerInRange(this.player.x, this.player.y, this.getWrappedDistance.bind(this));
        if (!this.portalChoiceActive && !this._portalDeclined && inRange) {
            this.showPortalChoice();
        }
        // Reset declined flag when player leaves portal range
        if (this._portalDeclined && !inRange) {
            this._portalDeclined = false;
        }

        // Remove expired portal
        if (!this.portal.active) {
            this.portal = null;
            this.ui.hidePortalNotification();
        }
    }

    /**
     * Show portal choice modal - sacrifice a weapon or enter as-is
     */
    showPortalChoice() {
        this.portalChoiceActive = true;
        this.state = GAME_STATE.PAUSED;

        // Use the portal's fixed destination
        const randomWorldId = this.portal.destinationWorldId;
        const destWorld = WORLDS[randomWorldId];

        const weaponList = this.player.weapons.map((w, i) => ({
            index: i,
            type: w.type,
            name: (CONFIG.WEAPONS[w.type] || WORLD_WEAPONS[w.type])?.name || w.type,
            icon: (CONFIG.WEAPONS[w.type] || WORLD_WEAPONS[w.type])?.icon || '?',
            level: w.level
        }));

        this.ui.showPortalChoiceModal(randomWorldId, destWorld, weaponList, (choice) => {
            this.portalChoiceActive = false;

            if (choice.action === 'ignore') {
                this._portalDeclined = true;
                this.state = GAME_STATE.PLAYING;
                return;
            }

            if (choice.sacrificeIndex !== undefined && choice.sacrificeIndex !== null) {
                this.player.removeWeapon(choice.sacrificeIndex);
            }
            this.transitionToWorld(randomWorldId);
        });
    }

    /**
     * Transition to a new world with teleport animation
     */
    transitionToWorld(worldId) {
        const world = WORLDS[worldId];
        if (!world) {
            this.state = GAME_STATE.PLAYING;
            return;
        }

        // Keep game paused during transition
        this.state = GAME_STATE.PAUSED;

        this.currentWorld = worldId;
        this.worldsVisited.push(worldId);

        // Remove portal
        this.portal = null;
        this.ui.hidePortalNotification();

        // Show teleport animation (phase 1: suck in)
        this.ui.showTeleportAnimation(world, () => {
            // Phase 2: while screen is white/covered, do the actual transition
            this.enemies = [];
            this.projectiles = [];
            this.pickups = [];
            this.bosses = [];
            this.drones = [];
            this.miniBoss = null;

            // Recreate drones based on player's drone weapon level
            const droneWeapon = this.player.weapons.find(w => w && w.type === 'drone');
            if (droneWeapon) {
                for (let i = 0; i < droneWeapon.level; i++) {
                    this.addDrone();
                }
            }

            // Update spawner
            this.spawner.setWorld(worldId);

            // Update world indicator
            this.ui.updateWorldIndicator(world.name);
        }, () => {
            // Phase 3: animation done, resume
            this.state = GAME_STATE.PLAYING;
        });
    }

    /**
     * Handle player level up
     */
    handleLevelUp() {
        this.state = GAME_STATE.LEVEL_UP;
        this.audio.play('levelUp');
        this.particles.createLevelUpEffect(this.player.x, this.player.y);

        // Generate upgrade options
        const options = this.generateUpgradeOptions();

        this.ui.showUpgradeModal(this.player.level, options, (selected) => {
            this.applyUpgrade(selected);
            this.state = GAME_STATE.PLAYING;
        });
    }

    /**
     * Generate upgrade options
     * @returns {Array}
     */
    generateUpgradeOptions() {
        const options = [];
        const playerWeaponTypes = this.player.weapons.map(w => w?.type);

        // Available weapons: ONLY the current world's weapon list
        let allAvailable = [];
        if (this.currentWorld && WORLDS[this.currentWorld]) {
            const worldWeaponList = WORLDS[this.currentWorld].weapons || [];
            allAvailable = worldWeaponList.filter(wType => {
                const cfg = CONFIG.WEAPONS[wType] || WORLD_WEAPONS[wType];
                if (!cfg) return false;
                if (cfg.requiresLevel && this.player.level < cfg.requiresLevel) return false;
                return true;
            });
        } else {
            // Home world (voidAbyss): base weapons only
            allAvailable = Object.keys(CONFIG.WEAPONS).filter(type => {
                const config = CONFIG.WEAPONS[type];
                return !config.requiresLevel || this.player.level >= config.requiresLevel;
            });
        }

        // Can get new weapon?
        if (this.player.weapons.length < 4) {
            const newWeaponOptions = allAvailable.filter(type => !playerWeaponTypes.includes(type));

            if (newWeaponOptions.length > 0) {
                let type = newWeaponOptions[Math.floor(Math.random() * newWeaponOptions.length)];

                const config = CONFIG.WEAPONS[type] || WORLD_WEAPONS[type];
                options.push({
                    type: 'newWeapon',
                    weaponType: type,
                    icon: config.icon,
                    name: `New: ${config.name}`,
                    description: config.description || `Acquire ${config.name}`,
                    rarity: config.rarity || 'common'
                });

                // Offer a second new weapon option if available
                if (newWeaponOptions.length > 1) {
                    const remaining = newWeaponOptions.filter(t => t !== type);
                    if (remaining.length > 0) {
                        const type2 = remaining[Math.floor(Math.random() * remaining.length)];
                        const config2 = CONFIG.WEAPONS[type2] || WORLD_WEAPONS[type2];
                        options.push({
                            type: 'newWeapon',
                            weaponType: type2,
                            icon: config2.icon,
                            name: `New: ${config2.name}`,
                            description: config2.description || `Acquire ${config2.name}`,
                            rarity: config2.rarity || 'common'
                        });
                    }
                }
            }
        }

        // Weapon upgrades
        for (const weapon of this.player.weapons) {
            if (weapon && weapon.level < 5 && options.length < 4) {
                const config = CONFIG.WEAPONS[weapon.type] || WORLD_WEAPONS[weapon.type];
                if (!config) continue;
                options.push({
                    type: 'upgradeWeapon',
                    weaponType: weapon.type,
                    icon: config.icon,
                    name: `${config.name} Lv.${weapon.level + 1}`,
                    description: `Upgrade damage and effects`,
                    rarity: weapon.level >= 4 ? 'legendary' : weapon.level >= 2 ? 'rare' : 'common'
                });
            }
        }

        // Passive upgrades
        const passives = [
            { type: 'maxHealth', icon: '❤️', name: 'Max Health', description: '+20 Max Health', rarity: 'common' },
            { type: 'moveSpeed', icon: '👟', name: 'Speed Boost', description: '+10% Movement Speed', rarity: 'common' },
            { type: 'damage', icon: '⚔️', name: 'Power Up', description: '+15% Damage', rarity: 'rare' },
            { type: 'critChance', icon: '💥', name: 'Critical Eye', description: '+5% Crit Chance', rarity: 'rare' },
            { type: 'xpBonus', icon: '⭐', name: 'XP Boost', description: '+20% XP Gain', rarity: 'common' },
            { type: 'pickupRadius', icon: '🧲', name: 'Magnetism', description: '+30% Pickup Range', rarity: 'common' }
        ];

        // Shuffle and add passives
        const shuffled = passives.sort(() => Math.random() - 0.5);
        while (options.length < 3 && shuffled.length > 0) {
            options.push(shuffled.pop());
        }

        return options.slice(0, 3);
    }

    /**
     * Apply selected upgrade
     * @param {Object} upgrade 
     */
    applyUpgrade(upgrade) {
        switch (upgrade.type) {
            case 'newWeapon':
                this.player.addWeapon(upgrade.weaponType);
                if (upgrade.weaponType === 'drone') {
                    this.addDrone();
                }
                break;

            case 'upgradeWeapon':
                for (const weapon of this.player.weapons) {
                    if (weapon && weapon.type === upgrade.weaponType) {
                        weapon.upgrade();
                        if (upgrade.weaponType === 'drone') {
                            this.addDrone();
                        }
                        break;
                    }
                }
                break;

            case 'maxHealth':
                this.player.maxHealth += 20;
                this.player.health = Math.min(this.player.health + 20, this.player.maxHealth);
                break;

            case 'moveSpeed':
                this.player.stats.speed *= 1.1;
                break;

            case 'damage':
                this.player.stats.damageMultiplier *= 1.15;
                break;

            case 'critChance':
                this.player.stats.critChance = Math.min(this.player.stats.critChance + 0.05, 0.5);
                break;

            case 'xpBonus':
                this.player.stats.xpMultiplier *= 1.2;
                break;

            case 'pickupRadius':
                this.player.stats.pickupRadius *= 1.3;
                break;
        }

        this.ui.updateWeapons(this.player.weapons);
    }

    /**
     * Add a drone
     */
    addDrone() {
        const droneCount = this.drones.length;
        this.drones.push(new Drone(this.player, droneCount));
    }

    /**
     * Add to score
     * @param {number} points 
     */
    addScore(points) {
        this.score += points;
    }

    /**
     * Update UI elements
     */
    updateUI() {
        this.ui.updateTimer(Math.floor(this.gameTime));
        this.ui.updateKills(this.kills);
        this.ui.updateScore(this.score);
        this.ui.updateHealth(this.player.health, this.player.maxHealth);
        this.ui.updateXP(this.player.xp, this.player.xpToNextLevel, this.player.level);
        this.ui.updateWeapons(this.player.weapons);
    }

    /**
     * Pause game - shows settings popup
     */
    pauseGame() {
        if (this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;

            // Show settings popup
            const settingsPopup = document.getElementById('settings-popup');
            if (settingsPopup) {
                settingsPopup.classList.remove('hidden');
            }

            // Pause music
            if (this.audio) {
                this.audio.pauseBackgroundMusic();
            }

            // Update Music toggle button state
            const musicToggle = document.getElementById('music-toggle');
            if (musicToggle && this.audio) {
                if (this.audio.isMusicMuted()) {
                    musicToggle.classList.remove('on');
                    musicToggle.classList.add('off');
                    musicToggle.textContent = 'OFF';
                } else {
                    musicToggle.classList.remove('off');
                    musicToggle.classList.add('on');
                    musicToggle.textContent = 'ON';
                }
            }

            // Update SFX toggle button state
            const sfxToggle = document.getElementById('sfx-toggle');
            if (sfxToggle && this.audio) {
                if (this.audio.isSfxMuted()) {
                    sfxToggle.classList.remove('on');
                    sfxToggle.classList.add('off');
                    sfxToggle.textContent = 'OFF';
                } else {
                    sfxToggle.classList.remove('off');
                    sfxToggle.classList.add('on');
                    sfxToggle.textContent = 'ON';
                }
            }

            // Update track buttons state
            const trackButtons = document.querySelectorAll('.track-btn');
            if (trackButtons.length > 0 && this.audio) {
                const currentTrack = this.audio.getCurrentTrackIndex();
                trackButtons.forEach(btn => {
                    const trackIdx = Number.parseInt(btn.dataset.track, 10);
                    if (trackIdx === currentTrack) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }
        }
    }

    /**
     * Resume game - hides settings popup
     */
    resumeGame() {
        if (this.state === GAME_STATE.PAUSED) {
            this.state = GAME_STATE.PLAYING;
            this.lastFrameTime = performance.now();

            // Hide settings popup
            const settingsPopup = document.getElementById('settings-popup');
            if (settingsPopup) {
                settingsPopup.classList.add('hidden');
            }

            // Resume music
            if (this.audio) {
                this.audio.resumeBackgroundMusic();
            }
        }
    }

    /**
     * Quit to menu
     */
    quitGame() {
        // Hide settings popup
        const settingsPopup = document.getElementById('settings-popup');
        if (settingsPopup) {
            settingsPopup.classList.add('hidden');
        }

        // Stop music
        if (this.audio) {
            this.audio.stopBackgroundMusic();
        }

        this.stopGame();
        this.showMenu();
    }

    /**
     * Game over
     */
    gameOver() {
        console.log('[Game] Game Over!');

        this.state = GAME_STATE.GAME_OVER;
        this.audio.play('death');

        // Calculate final score - add survival time bonus (1 point per second survived)
        const timeBonus = Math.floor(this.gameTime) * CONFIG.SCORING.POINTS_PER_SECOND;
        this.score += timeBonus;

        // Update final stats UI
        this.ui.updateFinalStats({
            score: this.score,
            time: Math.floor(this.gameTime),
            kills: this.kills,
            level: this.player.level
        });

        this.ui.showScreen('gameOver');

        // Send score to platform
        this.sendGameOver(this.score);
    }

    /**
     * Stop game loop
     */
    stopGame() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Handle canvas resize
     */
    handleResize() {
        const gameUI = document.getElementById('gameUI');
        const weaponSlots = document.querySelector('.weapon-slots');
        const healthContainer = document.querySelector('.health-container');
        const modals = document.querySelectorAll('.modal');

        // Su desktop, mantieni sempre aspect ratio mobile (9:16)
        // Il fullscreen Ã¨ gestito dalla piattaforma (iframe parent), quindi
        // non possiamo usare document.fullscreenElement
        if (!this.isMobile()) {
            // Desktop: forza aspect ratio mobile (9:16)
            const screenHeight = window.innerHeight;
            const screenWidth = window.innerWidth;

            // Calcola dimensioni con aspect ratio 9:16
            let width, height;
            const targetRatio = 9 / 16;
            const screenRatio = screenWidth / screenHeight;

            if (screenRatio > targetRatio) {
                // Schermo piÃ¹ largo: limita per altezza
                height = screenHeight;
                width = Math.floor(height * targetRatio);
            } else {
                // Schermo piÃ¹ stretto: limita per larghezza
                width = screenWidth;
                height = Math.floor(width / targetRatio);
            }

            // Imposta risoluzione canvas
            this.canvas.width = width;
            this.canvas.height = height;

            // Imposta dimensioni CSS (sovrascrive width:100% height:100%)
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';

            // Centra il canvas
            this.canvas.style.position = 'fixed';
            this.canvas.style.left = '50%';
            this.canvas.style.top = '50%';
            this.canvas.style.transform = 'translate(-50%, -50%)';

            // Sfondo nero per le barre laterali
            document.body.classList.add('desktop-mode');

            // Posiziona UI dentro l'area del canvas
            const left = (screenWidth - width) / 2;
            const top = (screenHeight - height) / 2;

            // Salva le dimensioni per uso globale (per i modal che appaiono dopo)
            this.desktopBounds = { left, top, width, height };

            if (gameUI) {
                gameUI.style.left = left + 'px';
                gameUI.style.top = top + 'px';
                gameUI.style.width = width + 'px';
                gameUI.style.height = height + 'px';
            }

            if (weaponSlots) {
                weaponSlots.style.left = (left + 10) + 'px';
                weaponSlots.style.top = (top + 130) + 'px';
            }

            if (healthContainer) {
                healthContainer.style.left = left + 'px';
                healthContainer.style.width = width + 'px';
            }

            // Posiziona i modal nell'area del canvas
            modals.forEach(modal => {
                modal.style.left = left + 'px';
                modal.style.top = top + 'px';
                modal.style.width = width + 'px';
                modal.style.height = height + 'px';
            });
        } else {
            // Mobile: usa tutto lo schermo
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;

            // Reset stili canvas
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.position = 'fixed';
            this.canvas.style.left = '0';
            this.canvas.style.top = '0';
            this.canvas.style.transform = '';

            // Reset sfondo (rimuovi desktop mode)
            document.body.classList.remove('desktop-mode');

            // Clear desktop bounds
            this.desktopBounds = null;

            // Reset UI positioning
            if (gameUI) {
                gameUI.style.left = '0';
                gameUI.style.top = '0';
                gameUI.style.width = '100%';
                gameUI.style.height = '100%';
            }

            if (weaponSlots) {
                weaponSlots.style.left = '';
                weaponSlots.style.top = '';
            }

            if (healthContainer) {
                healthContainer.style.left = '';
                healthContainer.style.width = '';
            }

            // Reset modal positioning
            modals.forEach(modal => {
                modal.style.left = '0';
                modal.style.top = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
            });
        }
    }

    /**
     * Check if device is mobile
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            (window.innerWidth <= 768);
    }

    /**
     * Handle fullscreen change event
     */
    handleFullscreenChange() {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

        // Aggiungi/rimuovi classe per sfondo nero
        if (isFullscreen) {
            document.body.classList.add('fullscreen-active');
        } else {
            document.body.classList.remove('fullscreen-active');
        }

        // Ridimensiona canvas
        this.handleResize();
    }

    /**
     * Setup input handlers
     */
    setupInput() {
        // Keyboard input
        const keys = {};

        window.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;

            // Pause on Escape
            if (e.key === 'Escape') {
                if (this.state === GAME_STATE.PLAYING) {
                    this.pauseGame();
                } else if (this.state === GAME_STATE.PAUSED) {
                    this.resumeGame();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });

        // Update movement from keyboard
        const updateKeyboardMovement = () => {
            if (!this.input.joystickActive) {
                let dx = 0;
                let dy = 0;

                if (keys['w'] || keys['arrowup']) dy -= 1;
                if (keys['s'] || keys['arrowdown']) dy += 1;
                if (keys['a'] || keys['arrowleft']) dx -= 1;
                if (keys['d'] || keys['arrowright']) dx += 1;

                if (dx !== 0 || dy !== 0) {
                    const len = Math.hypot(dx, dy);
                    this.input.movement.x = dx / len;
                    this.input.movement.y = dy / len;
                } else {
                    this.input.movement.x = 0;
                    this.input.movement.y = 0;
                }
            }

            requestAnimationFrame(updateKeyboardMovement);
        };
        updateKeyboardMovement();

        // Touch/Mobile joystick
        this.setupJoystick();
    }

    /**
     * Setup virtual joystick (floating - appears where user touches)
     */
    setupJoystick() {
        // Create touch zone for capturing touches anywhere on screen
        // Must be inside game-container for fullscreen compatibility
        const gameContainer = document.getElementById('game-container');
        let touchZone = document.querySelector('.touch-zone');
        if (!touchZone && gameContainer) {
            touchZone = document.createElement('div');
            touchZone.className = 'touch-zone';
            gameContainer.appendChild(touchZone);
        }

        const joystick = this.ui.elements.joystickContainer;
        if (!joystick) return;

        let touchId = null;
        let centerX = 0;
        let centerY = 0;

        const handleStart = (e) => {
            // Ignore if game is paused or not playing
            if (this.state !== 'playing') return;

            // Don't capture touches on UI elements (pause button, etc.)
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && target.closest('button, .btn-primary, .btn-secondary, .upgrade-option, .modal, .screen, #fullscreen-btn, #pauseBtn, #gameUI button')) {
                return; // Let the button handle the touch
            }

            touchId = touch.identifier || 0;

            // Set center where user touched
            centerX = touch.clientX;
            centerY = touch.clientY;

            // Show joystick at touch position
            this.ui.showJoystickAt(centerX, centerY);

            this.input.joystickActive = true;
            e.preventDefault();
        };

        const handleMove = (e) => {
            if (!this.input.joystickActive) return;

            e.preventDefault();

            const touch = e.changedTouches
                ? Array.from(e.changedTouches).find(t => t.identifier === touchId)
                : e;

            if (!touch) return;

            const dx = touch.clientX - centerX;
            const dy = touch.clientY - centerY;
            const dist = Math.hypot(dx, dy);
            const maxDist = 50;

            if (dist > 0) {
                const clampedDist = Math.min(dist, maxDist);
                this.input.movement.x = (dx / dist) * (clampedDist / maxDist);
                this.input.movement.y = (dy / dist) * (clampedDist / maxDist);

                this.ui.updateJoystick(this.input.movement.x, this.input.movement.y);
            }
        };

        const handleEnd = (e) => {
            // Check if this is the right touch
            if (e.changedTouches) {
                const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId);
                if (!touch) return;
            }

            touchId = null;
            this.input.joystickActive = false;
            this.input.movement.x = 0;
            this.input.movement.y = 0;
            this.ui.resetJoystick();
            this.ui.hideJoystick();
        };

        // Listen on touch zone instead of joystick
        touchZone.addEventListener('touchstart', handleStart, { passive: false });
        touchZone.addEventListener('touchmove', handleMove, { passive: false });
        touchZone.addEventListener('touchend', handleEnd);
        touchZone.addEventListener('touchcancel', handleEnd);

        // Mouse support for testing (on joystick element for desktop)
        joystick.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
    }

    /**
     * Setup game events
     */
    setupEvents() {
        this.events.on('enemyDeath', (enemy) => this.handleEnemyDeath(enemy));
        this.events.on('bossSpawn', () => {
            this.ui.showBossWarning();
            this.ui.triggerScreenShake(5, 500);
        });
    }

    /**
     * Setup UI button callbacks
     */
    setupUICallbacks() {
        // Start button
        if (this.ui.elements.startButton) {
            this.ui.elements.startButton.addEventListener('click', () => {
                this.startGame();
            });
        }

        // Restart button
        if (this.ui.elements.restartButton) {
            this.ui.elements.restartButton.addEventListener('click', () => {
                this.startGame();
            });
        }

        // Pause button
        if (this.ui.elements.pauseButton) {
            this.ui.elements.pauseButton.addEventListener('click', () => {
                this.pauseGame();
            });
        }

        // Character select buttons
        const charSelectBtn = document.getElementById('charSelectBtn');
        const charSelectBtnGameOver = document.getElementById('charSelectBtnGameOver');
        const charCloseBtn = document.getElementById('charCloseBtn');

        if (charSelectBtn) {
            charSelectBtn.addEventListener('click', () => {
                this.characterManager.openSelector('charGrid');
            });
        }
        if (charSelectBtnGameOver) {
            charSelectBtnGameOver.addEventListener('click', () => {
                this.characterManager.openSelector('charGrid');
            });
        }
        if (charCloseBtn) {
            charCloseBtn.addEventListener('click', () => {
                this.characterManager.closeSelector();
                this.updateCharacterDisplay();
            });
        }

        // Setup settings popup handlers
        this.setupSettingsHandlers();
    }

    /**
     * Update the current character display on the start screen
     */
    updateCharacterDisplay() {
        const char = this.characterManager.getSelected();
        const nameEl = document.getElementById('currentCharName');
        const xpEl = document.getElementById('currentCharXP');
        const previewCanvas = document.getElementById('currentCharPreview');

        if (nameEl) nameEl.textContent = char.name;
        if (xpEl) {
            const xpMult = char.stats ? char.stats.xpMultiplier : 1;
            xpEl.textContent = `${xpMult}x XP`;
            xpEl.style.display = xpMult > 1 ? '' : 'none';
        }
        if (previewCanvas) {
            this.characterManager.drawCharacterPreview(previewCanvas, char);
        }
    }

    /**
     * Setup settings popup event handlers
     */
    setupSettingsHandlers() {
        const resumeButton = document.getElementById('resume-button');
        const quitButton = document.getElementById('quit-button');
        const musicToggle = document.getElementById('music-toggle');
        const sfxToggle = document.getElementById('sfx-toggle');
        const trackButtons = document.querySelectorAll('.track-btn');

        // Resume button - click and touch
        if (resumeButton) {
            const handleResume = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.resumeGame();
            };
            resumeButton.addEventListener('click', handleResume);
            resumeButton.addEventListener('touchend', handleResume, { passive: false });
        }

        // Quit button - click and touch
        if (quitButton) {
            const handleQuit = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.quitGame();
            };
            quitButton.addEventListener('click', handleQuit);
            quitButton.addEventListener('touchend', handleQuit, { passive: false });
        }

        // Music toggle - click and touch
        if (musicToggle) {
            const handleMusicToggle = (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (musicToggle.classList.contains('on')) {
                    musicToggle.classList.remove('on');
                    musicToggle.classList.add('off');
                    musicToggle.textContent = 'OFF';
                    if (this.audio) this.audio.muteMusic();
                } else {
                    musicToggle.classList.remove('off');
                    musicToggle.classList.add('on');
                    musicToggle.textContent = 'ON';
                    if (this.audio) this.audio.unmuteMusic();
                }
            };
            musicToggle.addEventListener('click', handleMusicToggle);
            musicToggle.addEventListener('touchend', handleMusicToggle, { passive: false });
        }

        // SFX toggle - click and touch
        if (sfxToggle) {
            const handleSfxToggle = (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (sfxToggle.classList.contains('on')) {
                    sfxToggle.classList.remove('on');
                    sfxToggle.classList.add('off');
                    sfxToggle.textContent = 'OFF';
                    if (this.audio) this.audio.muteSfx();
                } else {
                    sfxToggle.classList.remove('off');
                    sfxToggle.classList.add('on');
                    sfxToggle.textContent = 'ON';
                    if (this.audio) this.audio.unmuteSfx();
                }
            };
            sfxToggle.addEventListener('click', handleSfxToggle);
            sfxToggle.addEventListener('touchend', handleSfxToggle, { passive: false });
        }

        // Track selector buttons - click and touch
        const handleTrackChange = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const trackIndex = Number.parseInt(e.target.dataset.track, 10);
            if (Number.isNaN(trackIndex)) return;

            // Aggiorna UI
            trackButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Cambia traccia
            if (this.audio) {
                await this.audio.changeTrack(trackIndex);
            }
        };

        trackButtons.forEach(btn => {
            btn.addEventListener('click', handleTrackChange);
            btn.addEventListener('touchend', handleTrackChange, { passive: false });
        });
    }

    // ==========================================
    // Platform SDK Integration
    // ==========================================

    /**
     * Send game started notification to platform
     */
    sendGameStarted() {
        if (this.gameStartSent) return;
        this.gameStartSent = true;

        try {
            const targetOrigin = document.referrer ? new URL(document.referrer).origin : null;
            if (typeof PlatformSDK !== 'undefined') {
                window.parent.postMessage({
                    type: 'gameStarted',
                    payload: {},
                    timestamp: Date.now(),
                    protocolVersion: '1.0.0'
                },  targetOrigin);
                console.log('[Game] Game started notification sent');
            }
        } catch (error) {
            console.warn('[Game] Failed to send game started:', error);
        }
    }

    /**
     * Send game over with score to platform
     * @param {number} score 
     */
    sendGameOver(score) {
        try {
            if (typeof PlatformSDK !== 'undefined') {
                PlatformSDK.gameOver(this.score, {
                    extra_data: {
                        time: Math.floor(this.gameTime),
                        kills: this.kills,
                        level: this.player?.level || 1
                    }
                });
                console.log('[Game] Game over sent, score:', this.score);
            }
        } catch (error) {
            console.warn('[Game] Failed to send game over:', error);
        }
        // Reset for next game
        this.gameStartSent = false;
    }
}

export { Game };

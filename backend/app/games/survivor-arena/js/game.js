import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';
import { EventEmitter } from './utils.js';
import { Spawner } from './spawner.js';
import { ParticleSystem } from './particles.js';
import { SpatialHash } from './utils.js';
import { Player } from './player.js';
import { CONFIG } from './config.js';
import { Vector2 } from './utils.js';
import { MathUtils } from './utils.js';
import { XPOrb , HealthPack , MagnetPickup , BombPickup  } from './pickups.js';
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

        // Game objects
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.pickups = [];
        this.drones = [];
        this.boss = null;
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

        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.handleResize = this.handleResize.bind(this);

        // Initialize
        this.init();
    }

    /**
     * Initialize game
     */
    async init() {
        console.log('[Game] Initializing Survivor Arena...');

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
    }

    /**
     * Start new game
     */
    startGame() {
        console.log('[Game] Starting new game...');

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
        this.boss = null;
        this.miniBoss = null;
        this.particles.clear();

        // Create player at center
        const centerX = CONFIG.ARENA.WIDTH / 2;
        const centerY = CONFIG.ARENA.HEIGHT / 2;
        this.player = new Player(centerX, centerY);

        // Reset background scroll (starts at player position)
        this.bgScrollX = centerX;
        this.bgScrollY = centerY;

        // Add starting weapon
        this.player.addWeapon('pistol');

        // Center camera on player
        this.updateCamera();

        // Create spawner
        this.spawner = new Spawner(this);

        // Update UI
        this.state = GAME_STATE.PLAYING;
        this.ui.showScreen('game');
        this.ui.updateHealth(this.player.health, this.player.maxHealth);
        this.ui.updateXP(this.player.xp, this.player.xpToNextLevel, this.player.level);
        this.ui.updateWeapons(this.player.weapons);
        this.ui.updateScore(0);
        this.ui.updateKills(0);
        this.ui.updateTimer(0);

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
        ctx.fillStyle = '#1a0a2e';
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

        // Draw projectiles
        for (const proj of this.projectiles) {
            this.renderSeamless(ctx, proj);
        }

        // Draw enemies
        for (const enemy of this.enemies) {
            this.renderSeamless(ctx, enemy);
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
        }

        // Draw boss
        if (this.boss && !this.boss.isDead()) {
            this.renderSeamless(ctx, this.boss);
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

        // Draw particles (with seamless rendering)
        this.renderParticlesSeamless(ctx);

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
        for (const particle of this.particles.particles) {
            if (!particle.active) continue;

            const screen = this.worldToScreen(particle.x, particle.y);
            if (!screen.visible) continue;

            // Render particle at screen position
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Draw arena background with grid (scrolls smoothly without jumps)
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawArenaBackground(ctx) {
        const gridSize = 64;

        // Effective viewport size (zoomed)
        const viewWidth = this.canvas.width / this.camera.zoom;
        const viewHeight = this.canvas.height / this.camera.zoom;

        // Use continuous scroll position (never wraps, so no jumps)
        const offsetX = -this.bgScrollX % gridSize;
        const offsetY = -this.bgScrollY % gridSize;

        // Main grid lines
        ctx.strokeStyle = 'rgba(100, 50, 150, 0.3)';
        ctx.lineWidth = 1;

        ctx.beginPath();

        // Vertical lines (scrolling smoothly)
        for (let x = offsetX - gridSize; x <= viewWidth + gridSize; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, viewHeight);
        }

        // Horizontal lines (scrolling smoothly)
        for (let y = offsetY - gridSize; y <= viewHeight + gridSize; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(viewWidth, y);
        }

        ctx.stroke();

        // Add some moving dots/stars for extra parallax effect
        ctx.fillStyle = 'rgba(150, 100, 200, 0.4)';
        const dotSpacing = 128;
        const dotOffsetX = -this.bgScrollX % dotSpacing;
        const dotOffsetY = -this.bgScrollY % dotSpacing;

        for (let x = dotOffsetX; x <= viewWidth + dotSpacing; x += dotSpacing) {
            for (let y = dotOffsetY; y <= viewHeight + dotSpacing; y += dotSpacing) {
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Add larger decorative elements that scroll slower (parallax)
        ctx.fillStyle = 'rgba(80, 40, 120, 0.2)';
        const bigSpacing = 256;
        const bigOffsetX = (-this.bgScrollX * 0.5) % bigSpacing;
        const bigOffsetY = (-this.bgScrollY * 0.5) % bigSpacing;

        for (let x = bigOffsetX; x <= viewWidth + bigSpacing; x += bigSpacing) {
            for (let y = bigOffsetY; y <= viewHeight + bigSpacing; y += bigSpacing) {
                ctx.beginPath();
                ctx.arc(x, y, 20, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * Draw arena bounds - hidden for seamless world
     * @param {CanvasRenderingContext2D} ctx 
     */
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
        if (this.boss && !this.boss.isDead()) {
            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, this.boss.x, this.boss.y);
            ctx.fillStyle = '#ff8800';
            const bx = centerX - wrapped.dx * scale;
            const by = centerY - wrapped.dy * scale;
            ctx.beginPath();
            ctx.arc(bx, by, 5, 0, Math.PI * 2);
            ctx.fill();
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
            distance: Math.sqrt(dx * dx + dy * dy)
        };
    }

    /**
     * Fire player weapons
     * @param {number} deltaTime 
     */
    fireWeapons(deltaTime) {
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

        if (this.boss && !this.boss.isDead()) {
            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, this.boss.x, this.boss.y);
            if (wrapped.distance < nearestDist) {
                nearestDist = wrapped.distance;
                nearestEnemy = this.boss;
            }
        }

        // Fire weapons toward nearest enemy
        for (const weapon of this.player.weapons) {
            if (!weapon) continue;

            const projectiles = weapon.fire(deltaTime, this.player, nearestEnemy, this);
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

                // Update cooldown
                if (weapon.laserCooldown > 0) {
                    weapon.laserCooldown -= deltaTime * 1000;
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
                    if (this.boss && !this.boss.isDead()) {
                        const wrapped = this.getWrappedDistance(this.player.x, this.player.y, this.boss.x, this.boss.y);
                        if (wrapped.distance < nearestDist) {
                            nearestDist = wrapped.distance;
                            nearest = this.boss;
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
                        if (this.boss && !this.boss.isDead()) allTargets.push(this.boss);

                        for (const enemy of allTargets) {
                            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y);
                            if (wrapped.distance > beamLength) continue;

                            // Check if enemy is within beam width (using perpendicular distance)
                            const enemyAngle = Math.atan2(wrapped.dy, wrapped.dx);
                            const angleDiff = Math.abs(enemyAngle - weapon.laserAngle);
                            const perpDist = Math.sin(angleDiff) * wrapped.distance;

                            if (Math.abs(perpDist) < beamWidth + enemy.radius) {
                                enemy.takeDamage(weapon.damage);
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
                // Check all enemies
                for (const enemy of this.enemies) {
                    const wrapped = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y);
                    if (wrapped.distance < weapon.radius) {
                        enemy.takeDamage(weapon.damage * deltaTime * 10);

                        if (enemy.isDead()) {
                            this.handleEnemyDeath(enemy);
                        }
                    }
                }

                // Check miniboss
                if (this.miniBoss && !this.miniBoss.isDead()) {
                    const wrapped = this.getWrappedDistance(this.player.x, this.player.y, this.miniBoss.x, this.miniBoss.y);
                    if (wrapped.distance < weapon.radius) {
                        this.miniBoss.takeDamage(weapon.damage * deltaTime * 10);
                    }
                }

                // Check boss
                if (this.boss && !this.boss.isDead()) {
                    const wrapped = this.getWrappedDistance(this.player.x, this.player.y, this.boss.x, this.boss.y);
                    if (wrapped.distance < weapon.radius) {
                        this.boss.takeDamage(weapon.damage * deltaTime * 10);
                    }
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
                        this.ui.createDamageFlash();
                        enemy.projectiles.splice(j, 1);
                    }
                }
            }

            // Handle exploder explosion
            if (enemy.type === 'exploder' && enemy.hasExploded) {
                // Damage player if in range
                const dist = MathUtils.distance(this.player.x, this.player.y, enemy.x, enemy.y);
                if (dist < enemy.explosionRadius) {
                    this.player.takeDamage(enemy.damage * 2);
                    this.ui.createDamageFlash();
                    // Sound removed - too frequent
                }

                this.particles.createExplosion(enemy.x, enemy.y, { color: '#ff4400', count: 30 });
                this.enemies.splice(i, 1);
                continue;
            }

            // Remove dead enemies
            if (enemy.isDead()) {
                this.handleEnemyDeath(enemy);
                this.enemies.splice(i, 1);
            }
        }

        // Update mini-boss
        if (this.miniBoss && !this.miniBoss.isDead()) {
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

            if (this.miniBoss.isDead()) {
                this.handleMiniBossDeath(this.miniBoss);
            }
        }

        // Update boss
        if (this.boss && !this.boss.isDead()) {
            // Set target if not set
            if (!this.boss.target) {
                this.boss.setTarget(this.player);
            }

            this.boss.update(deltaTime, arena);

            // Handle boss abilities
            if (this.boss.summonEnemies) {
                this.boss.summonEnemies = false;
                this.spawner.spawnSummonedEnemies(this.boss.x, this.boss.y, 5);
            }

            if (this.boss.shootProjectiles) {
                this.boss.shootProjectiles = false;
                this.spawnBossProjectiles();
            }

            if (this.boss.isDead()) {
                this.handleBossDeath(this.boss);
            }
        }
    }

    /**
     * Spawn boss projectiles in pattern
     */
    spawnBossProjectiles() {
        const numProjectiles = 12;
        const angleStep = (Math.PI * 2) / numProjectiles;

        for (let i = 0; i < numProjectiles; i++) {
            const angle = angleStep * i;
            const proj = new Projectile(
                this.boss.x,
                this.boss.y,
                angle,
                200,
                15,
                '#ff0000',
                10
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
            pickup.update(deltaTime, this.player);

            // Wrap pickup position (seamless toroidal world)
            pickup.x = this.wrapCoordinate(pickup.x, CONFIG.ARENA.WIDTH);
            pickup.y = this.wrapCoordinate(pickup.y, CONFIG.ARENA.HEIGHT);

            // Check collection - only when actually touching
            const dist = this.getWrappedDistance(this.player.x, this.player.y, pickup.x, pickup.y).distance;
            const collectionDist = this.player.size + pickup.size + 5; // Use size, not radius
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
                        enemy.takeDamage(proj.damage);
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
                    this.ui.createDamageFlash();
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }

            // Player projectiles hit enemies
            if (!proj.isEnemy) {
                // Check regular enemies
                for (const enemy of this.enemies) {
                    const dist = this.getWrappedDistance(proj.x, proj.y, enemy.x, enemy.y).distance;
                    if (dist < enemy.radius + proj.radius) {
                        enemy.takeDamage(proj.damage * this.player.stats.damageMultiplier);
                        this.particles.createHitEffect(proj.x, proj.y, '#ffffff');
                        // Sound removed - too frequent

                        if (!proj.piercing) {
                            proj.shouldRemove = true;
                        }
                        break;
                    }
                }

                // Check mini-boss
                if (this.miniBoss && !this.miniBoss.isDead()) {
                    const dist = this.getWrappedDistance(proj.x, proj.y, this.miniBoss.x, this.miniBoss.y).distance;
                    if (dist < this.miniBoss.radius + proj.radius) {
                        this.miniBoss.takeDamage(proj.damage * this.player.stats.damageMultiplier);
                        this.particles.createHitEffect(proj.x, proj.y, '#ff8800');
                        // Sound removed - too frequent

                        if (!proj.piercing) {
                            proj.shouldRemove = true;
                        }
                    }
                }

                // Check boss
                if (this.boss && !this.boss.isDead()) {
                    const dist = this.getWrappedDistance(proj.x, proj.y, this.boss.x, this.boss.y).distance;
                    if (dist < this.boss.radius + proj.radius) {
                        this.boss.takeDamage(proj.damage * this.player.stats.damageMultiplier);
                        this.particles.createHitEffect(proj.x, proj.y, '#ff0000');
                        // Sound removed - too frequent

                        if (!proj.piercing) {
                            proj.shouldRemove = true;
                        }
                    }
                }
            }
        }

        // Enemy vs Player (contact damage)
        for (const enemy of this.enemies) {
            const wrapped = this.getWrappedDistance(this.player.x, this.player.y, enemy.x, enemy.y);
            if (wrapped.distance < this.player.radius + enemy.radius) {
                this.player.takeDamage(enemy.damage);
                this.ui.createDamageFlash();

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
                this.player.takeDamage(this.miniBoss.damage);
                this.ui.createDamageFlash();
            }
        }

        // Boss vs Player
        if (this.boss && !this.boss.isDead()) {
            const dist = this.getWrappedDistance(this.player.x, this.player.y, this.boss.x, this.boss.y).distance;
            if (dist < this.player.radius + this.boss.radius) {
                this.player.takeDamage(this.boss.damage);
                this.ui.createDamageFlash();
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
        this.kills++;
        this.addScore(CONFIG.SCORING.POINTS_PER_KILL[enemy.type] || 10);

        // Update combo
        this.player.registerKill();
        if (this.player.combo >= 10) {
            this.addScore(50); // Combo bonus
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

        // Drop lots of XP
        for (let i = 0; i < 10; i++) {
            const offsetX = MathUtils.randomRange(-50, 50);
            const offsetY = MathUtils.randomRange(-50, 50);
            this.pickups.push(new XPOrb(miniBoss.x + offsetX, miniBoss.y + offsetY, 20));
        }

        // Guaranteed health drop
        this.pickups.push(new HealthPack(miniBoss.x, miniBoss.y));

        this.particles.createExplosion(miniBoss.x, miniBoss.y, { color: '#ff6600', count: 40 });
        this.ui.triggerScreenShake(8, 300);
        // Sound removed - too frequent

        this.miniBoss = null;
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
        // Sound removed - too frequent

        this.boss = null;
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

        // Available weapon types
        const availableWeapons = Object.keys(CONFIG.WEAPONS).filter(type => {
            const config = CONFIG.WEAPONS[type];
            return !config.requiresLevel || this.player.level >= config.requiresLevel;
        });

        // Can get new weapon?
        if (this.player.weapons.length < 4) {
            const newWeaponOptions = availableWeapons.filter(type => !playerWeaponTypes.includes(type));
            if (newWeaponOptions.length > 0) {
                const type = newWeaponOptions[Math.floor(Math.random() * newWeaponOptions.length)];
                const config = CONFIG.WEAPONS[type];
                options.push({
                    type: 'newWeapon',
                    weaponType: type,
                    icon: config.icon,
                    name: `New: ${config.name}`,
                    description: config.description || `Acquire ${config.name}`,
                    rarity: config.rarity || 'common'
                });
            }
        }

        // Weapon upgrades
        for (const weapon of this.player.weapons) {
            if (weapon && weapon.level < 5 && options.length < 4) {
                const config = CONFIG.WEAPONS[weapon.type];
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
                    const trackIdx = parseInt(btn.dataset.track, 10);
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
        // Il fullscreen è gestito dalla piattaforma (iframe parent), quindi
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
                // Schermo più largo: limita per altezza
                height = screenHeight;
                width = Math.floor(height * targetRatio);
            } else {
                // Schermo più stretto: limita per larghezza
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
                    const len = Math.sqrt(dx * dx + dy * dy);
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
            const dist = Math.sqrt(dx * dx + dy * dy);
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

        // Setup settings popup handlers
        this.setupSettingsHandlers();
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
            const trackIndex = parseInt(e.target.dataset.track, 10);
            if (isNaN(trackIndex)) return;

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
            if (typeof PlatformSDK !== 'undefined') {
                window.parent.postMessage({
                    type: 'gameStarted',
                    payload: {},
                    timestamp: Date.now(),
                    protocolVersion: '1.0.0'
                }, '*');
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
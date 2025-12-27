/**
 * Battlefield Renderer
 * Canvas-based renderer for the combat battlefield
 * Manages animated sprites, effects, and background
 */

import { spriteRenderer } from './SpriteRenderer.js';
import { createPlayerSprite } from './sprites/createPlayerSprite.js';
import { createEnemySprite } from './sprites/createEnemySprite.js';
import { AnimationLibrary } from './AnimationLibrary.js';

export class BattlefieldRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        
        // Sprites
        this.playerSprite = null;
        this.enemySprite = null;
        
        // Animation state
        this.running = false;
        this.lastTime = 0;
        
        // Pending animations queue
        this.pendingAnimations = [];
        
        // Screen shake effect
        this.shakeIntensity = 0;
        this.shakeOffset = { x: 0, y: 0 };
        
        // Particle effects
        this.particles = [];
        
        // Background gradient cache
        this.bgGradient = null;
        
        // Setup
        this.setupCanvas();
        this.createBackgroundGradient();
    }

    /**
     * Setup canvas for high DPI displays
     */
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * Create background gradient
     */
    createBackgroundGradient() {
        const gradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width * 0.7
        );
        gradient.addColorStop(0, '#1a2030');
        gradient.addColorStop(0.5, '#0f1520');
        gradient.addColorStop(1, '#050810');
        this.bgGradient = gradient;
    }

    /**
     * Handle canvas resize
     */
    resize() {
        this.setupCanvas();
        this.createBackgroundGradient();
    }

    /**
     * Initialize player sprite based on character data
     */
    initPlayerSprite(character) {
        // Pass all affinities to create a mixed color sprite
        const affinities = character?.affinities || { TECH: 1 };
        
        this.playerSprite = createPlayerSprite(affinities);
        AnimationLibrary.applyAnimationsToSprite(this.playerSprite);
    }

    /**
     * Initialize enemy sprite based on character data
     */
    initEnemySprite(character) {
        const affinities = character?.affinities || {};
        let focus = 'TECH';
        let maxVal = 0;
        
        for (const [key, val] of Object.entries(affinities)) {
            if (val > maxVal) {
                maxVal = val;
                focus = key;
            }
        }
        
        const level = character?.level || 1;
        this.enemySprite = createEnemySprite(focus, level);
        AnimationLibrary.applyAnimationsToSprite(this.enemySprite);
    }

    /**
     * Start animation loop
     */
    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.animate();
    }

    /**
     * Stop animation loop
     */
    stop() {
        this.running = false;
    }

    /**
     * Main animation loop
     */
    animate() {
        if (!this.running) return;
        
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap delta time
        this.lastTime = now;
        
        this.update(dt);
        this.render();
        
        requestAnimationFrame(() => this.animate());
    }

    /**
     * Update all animated elements
     */
    update(dt) {
        // Update sprites
        if (this.playerSprite) {
            this.playerSprite.update(dt);
        }
        if (this.enemySprite) {
            this.enemySprite.update(dt);
        }
        
        // Update screen shake
        if (this.shakeIntensity > 0) {
            this.shakeOffset.x = (Math.random() - 0.5) * this.shakeIntensity * 10;
            this.shakeOffset.y = (Math.random() - 0.5) * this.shakeIntensity * 10;
            this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 5);
        } else {
            this.shakeOffset.x = 0;
            this.shakeOffset.y = 0;
        }
        
        // Update particles
        this.updateParticles(dt);
        
        // Process animation callbacks
        this.processPendingAnimations();
    }

    /**
     * Update particles
     */
    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Process pending animation callbacks
     */
    processPendingAnimations() {
        for (let i = this.pendingAnimations.length - 1; i >= 0; i--) {
            const anim = this.pendingAnimations[i];
            const sprite = anim.target === 'player' ? this.playerSprite : this.enemySprite;
            
            if (sprite && !sprite.isPlaying(anim.animationName)) {
                // Animation finished
                if (anim.callback) {
                    anim.callback();
                }
                this.pendingAnimations.splice(i, 1);
            }
        }
    }

    /**
     * Render the battlefield
     */
    render() {
        const ctx = this.ctx;
        
        ctx.save();
        
        // Apply screen shake
        ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
        
        // Draw background
        this.drawBackground(ctx);
        
        // Draw ground/platform
        this.drawPlatform(ctx);
        
        // Calculate sprite positions
        const playerX = this.width * 0.25;
        const enemyX = this.width * 0.75;
        const groundY = this.height * 0.45;
        const spriteSize = Math.min(this.width * 0.45, this.height * 0.50);
        
        // Draw sprites
        if (this.playerSprite) {
            spriteRenderer.renderSprite(ctx, this.playerSprite, playerX, groundY, spriteSize);
        }
        if (this.enemySprite) {
            spriteRenderer.renderSprite(ctx, this.enemySprite, enemyX, groundY, spriteSize);
        }
        
        // Draw particles
        this.drawParticles(ctx);
        
        ctx.restore();
    }

    /**
     * Draw background
     */
    drawBackground(ctx) {
        ctx.fillStyle = this.bgGradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Add subtle grid lines for tech feel
        ctx.strokeStyle = 'rgba(50, 100, 150, 0.08)';
        ctx.lineWidth = 1;
        
        const gridSize = 30;
        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
        
        // Ambient glow spots
        this.drawAmbientGlow(ctx, this.width * 0.2, this.height * 0.3, 60, 'rgba(0, 150, 255, 0.03)');
        this.drawAmbientGlow(ctx, this.width * 0.8, this.height * 0.3, 70, 'rgba(255, 50, 50, 0.03)');
    }

    /**
     * Draw ambient glow effect
     */
    drawAmbientGlow(ctx, x, y, radius, color) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    /**
     * Draw platform/ground
     */
    drawPlatform(ctx) {
        const groundY = this.height * 0.85;
        
        // Ground line
        const gradient = ctx.createLinearGradient(0, groundY, 0, this.height);
        gradient.addColorStop(0, 'rgba(60, 80, 100, 0.4)');
        gradient.addColorStop(1, 'rgba(20, 30, 40, 0.6)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, groundY, this.width, this.height - groundY);
        
        // Ground edge glow
        ctx.strokeStyle = 'rgba(80, 150, 200, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(this.width, groundY);
        ctx.stroke();
    }

    /**
     * Draw particles
     */
    drawParticles(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ========================================================================
    // ANIMATION TRIGGERS
    // ========================================================================

    /**
     * Play attack animation
     */
    playAttack(isPlayer, callback = null) {
        const sprite = isPlayer ? this.playerSprite : this.enemySprite;
        if (!sprite) return;
        
        sprite.play('attack', true);
        
        if (callback) {
            this.pendingAnimations.push({
                target: isPlayer ? 'player' : 'enemy',
                animationName: 'attack',
                callback: () => {
                    sprite.play('idle');
                    callback();
                }
            });
        } else {
            sprite.onAnimationComplete = () => {
                sprite.play('idle');
                sprite.onAnimationComplete = null;
            };
        }
        
        // Spawn attack particles
        this.spawnAttackParticles(isPlayer);
    }

    /**
     * Play hit animation
     */
    playHit(isPlayer, callback = null) {
        const sprite = isPlayer ? this.playerSprite : this.enemySprite;
        if (!sprite) return;
        
        sprite.play('hit', true);
        sprite.flash('#ffffff', 0.8);
        
        // Screen shake
        this.shakeIntensity = 0.5;
        
        // Spawn hit particles
        this.spawnHitParticles(isPlayer);
        
        if (callback) {
            this.pendingAnimations.push({
                target: isPlayer ? 'player' : 'enemy',
                animationName: 'hit',
                callback: () => {
                    sprite.play('idle');
                    callback();
                }
            });
        } else {
            sprite.onAnimationComplete = () => {
                sprite.play('idle');
                sprite.onAnimationComplete = null;
            };
        }
    }

    /**
     * Play cast animation
     */
    playCast(isPlayer, callback = null) {
        const sprite = isPlayer ? this.playerSprite : this.enemySprite;
        if (!sprite) return;
        
        sprite.play('cast', true);
        
        // Spawn cast particles
        this.spawnCastParticles(isPlayer);
        
        if (callback) {
            this.pendingAnimations.push({
                target: isPlayer ? 'player' : 'enemy',
                animationName: 'cast',
                callback: () => {
                    sprite.play('idle');
                    callback();
                }
            });
        } else {
            sprite.onAnimationComplete = () => {
                sprite.play('idle');
                sprite.onAnimationComplete = null;
            };
        }
    }

    /**
     * Play ability-specific animation
     */
    playAbilityAnimation(isPlayer, animationType, callback = null) {
        const sprite = isPlayer ? this.playerSprite : this.enemySprite;
        if (!sprite) return;
        
        // Check if the specific animation exists, fallback to cast
        const hasAnimation = sprite.animations && sprite.animations.has(animationType);
        const animToPlay = hasAnimation ? animationType : 'cast';
        
        sprite.play(animToPlay, true);
        
        // Spawn appropriate particles based on animation type
        if (animationType.includes('Lightning') || animationType.includes('Arcane')) {
            this.spawnLightningParticles(isPlayer);
        } else if (animationType.includes('Beam') || animationType.includes('Tech')) {
            this.spawnBeamParticles(isPlayer);
        } else if (animationType.includes('Claw') || animationType.includes('Primal')) {
            this.spawnClawParticles(isPlayer);
        } else if (animationType.includes('Shield')) {
            this.spawnShieldParticles(isPlayer);
        } else if (animationType.includes('Heal')) {
            this.spawnHealParticles(isPlayer);
        } else {
            this.spawnCastParticles(isPlayer);
        }
        
        if (callback) {
            this.pendingAnimations.push({
                target: isPlayer ? 'player' : 'enemy',
                animationName: animToPlay,
                callback: () => {
                    sprite.play('idle');
                    callback();
                }
            });
        } else {
            sprite.onAnimationComplete = () => {
                sprite.play('idle');
                sprite.onAnimationComplete = null;
            };
        }
    }

    /**
     * Play guard animation
     */
    playGuard(isPlayer, callback = null) {
        const sprite = isPlayer ? this.playerSprite : this.enemySprite;
        if (!sprite) return;
        
        sprite.play('guard', true);
        
        if (callback) {
            this.pendingAnimations.push({
                target: isPlayer ? 'player' : 'enemy',
                animationName: 'guard',
                callback: () => {
                    sprite.play('idle');
                    callback();
                }
            });
        } else {
            sprite.onAnimationComplete = () => {
                sprite.play('idle');
                sprite.onAnimationComplete = null;
            };
        }
    }

    /**
     * Play death animation
     */
    playDeath(isPlayer, callback = null) {
        const sprite = isPlayer ? this.playerSprite : this.enemySprite;
        if (!sprite) return;
        
        sprite.play('death', true);
        
        // Bigger screen shake for death
        this.shakeIntensity = 1.0;
        
        // Spawn death particles
        this.spawnDeathParticles(isPlayer);
        
        if (callback) {
            this.pendingAnimations.push({
                target: isPlayer ? 'player' : 'enemy',
                animationName: 'death',
                callback
            });
        }
    }

    /**
     * Play victory animation
     */
    playVictory(isPlayer, callback = null) {
        const sprite = isPlayer ? this.playerSprite : this.enemySprite;
        if (!sprite) return;
        
        sprite.play('victory', true);
        
        // Spawn victory particles
        this.spawnVictoryParticles(isPlayer);
        
        if (callback) {
            this.pendingAnimations.push({
                target: isPlayer ? 'player' : 'enemy',
                animationName: 'victory',
                callback: () => {
                    sprite.play('idle');
                    callback();
                }
            });
        } else {
            sprite.onAnimationComplete = () => {
                sprite.play('idle');
                sprite.onAnimationComplete = null;
            };
        }
    }

    // ========================================================================
    // PARTICLE EFFECTS
    // ========================================================================

    /**
     * Spawn attack particles
     */
    spawnAttackParticles(isPlayer) {
        const x = isPlayer ? this.width * 0.35 : this.width * 0.65;
        const y = this.height * 0.6;
        const color = isPlayer ? '#55ccff' : '#ff5555';
        
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                vx: (isPlayer ? 1 : -1) * (50 + Math.random() * 100),
                vy: (Math.random() - 0.5) * 80,
                size: 2 + Math.random() * 4,
                color: color,
                life: 0.3 + Math.random() * 0.3,
                maxLife: 0.6,
                alpha: 1
            });
        }
    }

    /**
     * Spawn hit particles
     */
    spawnHitParticles(isPlayer) {
        const x = isPlayer ? this.width * 0.25 : this.width * 0.75;
        const y = this.height * 0.6;
        const color = '#ffff55';
        
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                color: color,
                life: 0.2 + Math.random() * 0.3,
                maxLife: 0.5,
                alpha: 1
            });
        }
    }

    /**
     * Spawn cast particles
     */
    spawnCastParticles(isPlayer) {
        const x = isPlayer ? this.width * 0.25 : this.width * 0.75;
        const y = this.height * 0.6;
        const color = isPlayer ? '#aa77ff' : '#ff77aa';
        
        for (let i = 0; i < 25; i++) {
            const angle = (i / 25) * Math.PI * 2;
            const dist = 20 + Math.random() * 30;
            this.particles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: Math.cos(angle) * 30,
                vy: Math.sin(angle) * 30 - 50,
                size: 3 + Math.random() * 3,
                color: color,
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.8,
                alpha: 1
            });
        }
    }

    /**
     * Spawn lightning particles (Arcane)
     */
    spawnLightningParticles(isPlayer) {
        const x = isPlayer ? this.width * 0.25 : this.width * 0.75;
        const y = this.height * 0.5;
        
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 60;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                size: 2 + Math.random() * 4,
                color: '#88aaff',
                life: 0.6 + Math.random() * 0.4,
                maxLife: 1.0,
                alpha: 1
            });
        }
    }

    /**
     * Spawn beam particles (Tech)
     */
    spawnBeamParticles(isPlayer) {
        const x = isPlayer ? this.width * 0.25 : this.width * 0.75;
        const y = this.height * 0.55;
        const targetX = isPlayer ? this.width * 0.75 : this.width * 0.25;
        
        for (let i = 0; i < 20; i++) {
            const t = i / 20;
            this.particles.push({
                x: x + (targetX - x) * t,
                y: y + (Math.random() - 0.5) * 10,
                vx: (targetX - x) * 3,
                vy: (Math.random() - 0.5) * 20,
                size: 2 + Math.random() * 3,
                color: '#ffaa44',
                life: 0.4 + Math.random() * 0.3,
                maxLife: 0.7,
                alpha: 1
            });
        }
    }

    /**
     * Spawn claw particles (Primal)
     */
    spawnClawParticles(isPlayer) {
        const x = isPlayer ? this.width * 0.25 : this.width * 0.75;
        const y = this.height * 0.58;
        
        for (let i = 0; i < 25; i++) {
            const angle = (isPlayer ? 0 : Math.PI) + (Math.random() - 0.5) * 1.2;
            const speed = 50 + Math.random() * 70;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 5,
                color: '#44ff88',
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.8,
                alpha: 1
            });
        }
    }

    /**
     * Spawn shield particles
     */
    spawnShieldParticles(isPlayer) {
        const x = isPlayer ? this.width * 0.25 : this.width * 0.75;
        const y = this.height * 0.6;
        
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const radius = 40 + Math.random() * 20;
            this.particles.push({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius,
                vx: Math.cos(angle) * 10,
                vy: Math.sin(angle) * 10,
                size: 2 + Math.random() * 3,
                color: '#77ddff',
                life: 0.7 + Math.random() * 0.3,
                maxLife: 1.0,
                alpha: 1
            });
        }
    }

    /**
     * Spawn heal particles
     */
    spawnHealParticles(isPlayer) {
        const x = isPlayer ? this.width * 0.25 : this.width * 0.75;
        const y = this.height * 0.6;
        
        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 30;
            this.particles.push({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius,
                vx: (Math.random() - 0.5) * 20,
                vy: -50 - Math.random() * 40,
                size: 2 + Math.random() * 4,
                color: '#88ff88',
                life: 0.8 + Math.random() * 0.4,
                maxLife: 1.2,
                alpha: 1
            });
        }
    }

    /**
     * Spawn death particles
     */
    spawnDeathParticles(isPlayer) {
        const x = isPlayer ? this.width * 0.25 : this.width * 0.75;
        const y = this.height * 0.6;
        const color = isPlayer ? '#55ff55' : '#ff5555';
        
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 80;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 40,
                y: y + (Math.random() - 0.5) * 40,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                size: 2 + Math.random() * 5,
                color: color,
                life: 0.5 + Math.random() * 0.5,
                maxLife: 1.0,
                alpha: 1
            });
        }
    }

    /**
     * Spawn victory particles
     */
    spawnVictoryParticles(isPlayer) {
        const x = isPlayer ? this.width * 0.25 : this.width * 0.75;
        const y = this.height * 0.5;
        const colors = ['#ffdd55', '#55ff55', '#55ddff', '#ff55ff'];
        
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 60;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                vx: Math.cos(angle) * speed * 0.5,
                vy: -40 - Math.random() * 60,
                size: 3 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 0.6 + Math.random() * 0.4,
                maxLife: 1.0,
                alpha: 1
            });
        }
    }

    /**
     * Destroy renderer
     */
    destroy() {
        this.stop();
        this.playerSprite = null;
        this.enemySprite = null;
        this.particles = [];
        this.pendingAnimations = [];
    }
}

/**
 * Survivor Arena - Particle System
 * @fileoverview Visual effects and particles
 */

'use strict';

/**
 * Single particle
 */
class Particle {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {Object} options 
     */
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.size = options.size || 5;
        this.color = options.color || '#ffffff';
        this.lifetime = options.lifetime || 1000;
        this.age = 0;
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 0;
        this.fadeOut = options.fadeOut !== false;
        this.shrink = options.shrink || false;
        this.active = true;
        
        // Initial values for interpolation
        this.initialSize = this.size;
    }

    /**
     * Update particle
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        if (!this.active) return;

        this.age += deltaTime * 1000;
        
        if (this.age >= this.lifetime) {
            this.active = false;
            return;
        }

        // Apply physics
        this.vy += this.gravity * deltaTime;
        this.vx *= (1 - this.friction * deltaTime);
        this.vy *= (1 - this.friction * deltaTime);
        
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Shrink over time
        if (this.shrink) {
            const progress = this.age / this.lifetime;
            this.size = this.initialSize * (1 - progress);
        }
    }

    /**
     * Draw particle
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        // Fade out
        if (this.fadeOut) {
            const progress = this.age / this.lifetime;
            ctx.globalAlpha = 1 - progress;
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, Math.max(0.5, this.size), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Render particle (camera transform already applied)
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        if (!this.active) return;

        ctx.save();

        if (this.fadeOut) {
            const progress = this.age / this.lifetime;
            ctx.globalAlpha = 1 - progress;
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/**
 * Particle System Manager
 */
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
    }

    /**
     * Add a particle
     * @param {Particle} particle 
     */
    add(particle) {
        if (this.particles.length >= this.maxParticles) {
            // Remove oldest particle
            this.particles.shift();
        }
        this.particles.push(particle);
    }

    /**
     * Create explosion effect
     * @param {number} x 
     * @param {number} y 
     * @param {Object} options 
     */
    createExplosion(x, y, options = {}) {
        const count = options.count || 20;
        const color = options.color || '#ff6600';
        const speed = options.speed || 200;
        const size = options.size || 6;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + MathUtils.randomRange(-0.2, 0.2);
            const velocity = MathUtils.randomRange(speed * 0.5, speed);
            
            this.add(new Particle(x, y, {
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: MathUtils.randomRange(size * 0.5, size),
                color: this.randomizeColor(color, 20),
                lifetime: MathUtils.randomRange(300, 600),
                friction: 3,
                shrink: true
            }));
        }
    }

    /**
     * Create hit effect
     * @param {number} x 
     * @param {number} y 
     * @param {string} color 
     */
    createHitEffect(x, y, color = '#ffffff') {
        for (let i = 0; i < 8; i++) {
            const angle = MathUtils.randomRange(0, Math.PI * 2);
            const speed = MathUtils.randomRange(100, 200);
            
            this.add(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: MathUtils.randomRange(3, 6),
                color: color,
                lifetime: MathUtils.randomRange(200, 400),
                friction: 5,
                shrink: true
            }));
        }
    }

    /**
     * Create death effect
     * @param {number} x 
     * @param {number} y 
     * @param {string} color 
     * @param {number} size 
     */
    createDeathEffect(x, y, color = '#ff4444', size = 30) {
        // Main explosion
        this.createExplosion(x, y, {
            count: 30,
            color: color,
            speed: 250,
            size: 8
        });

        // Inner bright particles
        for (let i = 0; i < 10; i++) {
            const angle = MathUtils.randomRange(0, Math.PI * 2);
            const speed = MathUtils.randomRange(50, 100);
            
            this.add(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: MathUtils.randomRange(4, 8),
                color: '#ffffff',
                lifetime: MathUtils.randomRange(200, 400),
                friction: 4,
                shrink: true
            }));
        }

        // Smoke particles
        for (let i = 0; i < 5; i++) {
            const angle = MathUtils.randomRange(0, Math.PI * 2);
            const dist = MathUtils.randomRange(0, size * 0.5);
            
            this.add(new Particle(
                x + Math.cos(angle) * dist,
                y + Math.sin(angle) * dist,
                {
                    vx: MathUtils.randomRange(-20, 20),
                    vy: MathUtils.randomRange(-50, -100),
                    size: MathUtils.randomRange(15, 25),
                    color: 'rgba(100, 100, 100, 0.5)',
                    lifetime: MathUtils.randomRange(500, 800),
                    friction: 1,
                    shrink: true
                }
            ));
        }
    }

    /**
     * Create XP pickup effect
     * @param {number} x 
     * @param {number} y 
     */
    createXPPickupEffect(x, y) {
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const speed = 80;
            
            this.add(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4,
                color: '#00ff88',
                lifetime: 300,
                friction: 4,
                shrink: true
            }));
        }
    }

    /**
     * Create level up effect
     * @param {number} x 
     * @param {number} y 
     */
    createLevelUpEffect(x, y) {
        // Ring of particles
        for (let i = 0; i < 24; i++) {
            const angle = (Math.PI * 2 / 24) * i;
            const speed = 200;
            
            this.add(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 6,
                color: i % 2 === 0 ? '#ffd700' : '#00bfff',
                lifetime: 600,
                friction: 2,
                shrink: true
            }));
        }

        // Rising sparkles
        for (let i = 0; i < 15; i++) {
            this.add(new Particle(
                x + MathUtils.randomRange(-30, 30),
                y + MathUtils.randomRange(-30, 30),
                {
                    vx: MathUtils.randomRange(-20, 20),
                    vy: MathUtils.randomRange(-150, -250),
                    size: MathUtils.randomRange(3, 6),
                    color: '#ffd700',
                    lifetime: MathUtils.randomRange(500, 800),
                    gravity: -50,
                    shrink: true
                }
            ));
        }
    }

    /**
     * Create trail effect
     * @param {number} x 
     * @param {number} y 
     * @param {string} color 
     */
    createTrail(x, y, color = '#ffffff') {
        this.add(new Particle(x, y, {
            size: MathUtils.randomRange(2, 4),
            color: color,
            lifetime: 200,
            shrink: true
        }));
    }

    /**
     * Create damage number
     * @param {number} x 
     * @param {number} y 
     * @param {number} damage 
     * @param {boolean} isCrit 
     */
    createDamageNumber(x, y, damage, isCrit = false) {
        // This is handled by UI system, but we can add particles
        for (let i = 0; i < 3; i++) {
            this.add(new Particle(
                x + MathUtils.randomRange(-10, 10),
                y + MathUtils.randomRange(-10, 10),
                {
                    vx: MathUtils.randomRange(-30, 30),
                    vy: MathUtils.randomRange(-50, -80),
                    size: isCrit ? 4 : 3,
                    color: isCrit ? '#ffd700' : '#ff4444',
                    lifetime: 400,
                    gravity: 100,
                    shrink: true
                }
            ));
        }
    }

    /**
     * Create heal effect
     * @param {number} x 
     * @param {number} y 
     */
    createHealEffect(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = MathUtils.randomRange(0, Math.PI * 2);
            const dist = MathUtils.randomRange(10, 30);
            
            this.add(new Particle(
                x + Math.cos(angle) * dist,
                y + Math.sin(angle) * dist,
                {
                    vx: 0,
                    vy: MathUtils.randomRange(-80, -120),
                    size: MathUtils.randomRange(4, 7),
                    color: '#00ff00',
                    lifetime: MathUtils.randomRange(400, 600),
                    friction: 1,
                    shrink: true
                }
            ));
        }

        // Plus symbol particles
        const plusSize = 15;
        const positions = [
            { x: 0, y: -plusSize },
            { x: 0, y: plusSize },
            { x: -plusSize, y: 0 },
            { x: plusSize, y: 0 }
        ];

        for (const pos of positions) {
            this.add(new Particle(x + pos.x, y + pos.y, {
                vx: pos.x * 2,
                vy: pos.y * 2 - 50,
                size: 5,
                color: '#00ff00',
                lifetime: 500,
                friction: 2,
                shrink: true
            }));
        }
    }

    /**
     * Create boss death effect
     * @param {number} x 
     * @param {number} y 
     */
    createBossDeathEffect(x, y) {
        // Multiple waves of explosions
        for (let wave = 0; wave < 3; wave++) {
            setTimeout(() => {
                this.createExplosion(
                    x + MathUtils.randomRange(-50, 50),
                    y + MathUtils.randomRange(-50, 50),
                    {
                        count: 40,
                        color: wave === 0 ? '#9c27b0' : wave === 1 ? '#e91e63' : '#ffd700',
                        speed: 300,
                        size: 10
                    }
                );
            }, wave * 200);
        }

        // Confetti
        for (let i = 0; i < 50; i++) {
            const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
            this.add(new Particle(
                x + MathUtils.randomRange(-100, 100),
                y + MathUtils.randomRange(-100, 100),
                {
                    vx: MathUtils.randomRange(-200, 200),
                    vy: MathUtils.randomRange(-300, -100),
                    size: MathUtils.randomRange(4, 8),
                    color: colors[MathUtils.randomInt(0, colors.length - 1)],
                    lifetime: MathUtils.randomRange(1000, 2000),
                    gravity: 300,
                    friction: 0.5,
                    shrink: false
                }
            ));
        }
    }

    /**
     * Randomize color slightly
     * @param {string} color 
     * @param {number} variance 
     * @returns {string}
     */
    randomizeColor(color, variance) {
        const num = parseInt(color.replace('#', ''), 16);
        const R = MathUtils.clamp((num >> 16) + MathUtils.randomInt(-variance, variance), 0, 255);
        const G = MathUtils.clamp(((num >> 8) & 0x00FF) + MathUtils.randomInt(-variance, variance), 0, 255);
        const B = MathUtils.clamp((num & 0x0000FF) + MathUtils.randomInt(-variance, variance), 0, 255);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    /**
     * Update all particles
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);
            
            if (!particle.active) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Draw all particles
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        for (const particle of this.particles) {
            particle.draw(ctx, camera);
        }
    }

    /**
     * Render all particles (camera transform already applied)
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        for (const particle of this.particles) {
            particle.render(ctx);
        }
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }

    /**
     * Get particle count
     * @returns {number}
     */
    getCount() {
        return this.particles.length;
    }
}

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Particle, ParticleSystem };
}

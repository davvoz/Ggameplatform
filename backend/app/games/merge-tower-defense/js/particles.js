/**
 * Particle System
 * Advanced particle effects with pooling
 */

import { Utils } from './utils.js';
import { CONFIG } from './config.js';

export class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 0;
        this.text = '';
        this.color = '#ffffff';
        this.scale = 1.0;
        this.gravity = 0;
        this.fadeOut = true;
        this.glow = false;
    }

    init(x, y, options = {}) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.vx = options.vx || 0;
        this.vy = options.vy || -1;
        this.life = options.life || 1.0;
        this.maxLife = this.life;
        this.text = options.text || '•';
        this.color = options.color || '#ffffff';
        this.scale = options.scale || 1.0;
        this.gravity = options.gravity || 0;
        this.fadeOut = options.fadeOut !== false;
        this.glow = options.glow || false;
    }

    update(dt) {
        if (!this.active) return;
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        
        this.life -= dt;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }

    render(graphics) {
        if (!this.active) return;
        
        const opacity = this.fadeOut ? (this.life / this.maxLife) : 1.0;
        const currentScale = this.scale * (0.5 + opacity * 0.5);
        
        graphics.drawParticle(this.x, this.y, {
            text: this.text,
            color: this.color,
            size: currentScale,
            opacity: opacity,
            glow: this.glow
        });
    }
}

export class ParticleSystem {
    constructor() {
        this.pool = Utils.createPool(
            () => new Particle(),
            (p) => p.reset(),
            CONFIG.PARTICLE_POOL_SIZE
        );
    }

    /**
     * Emit a single particle
     */
    emit(x, y, options = {}) {
        if (this.pool.active.length >= CONFIG.MAX_PARTICLES) {
            return null;
        }
        
        const particle = this.pool.get();
        particle.init(x, y, options);
        return particle;
    }

    /**
     * Create damage number
     */
    createDamageNumber(x, y, damage, isCritical = false) {
        this.emit(x, y, {
            text: `-${Math.floor(damage)}`,
            color: isCritical ? '#ff0000' : '#ffaa00',
            vy: -2,
            vx: Utils.randomFloat(-0.5, 0.5),
            life: 1.0,
            scale: isCritical ? 1.5 : 1.0,
            glow: isCritical
        });
    }

    /**
     * Create coin reward
     */
    createCoinReward(x, y, amount) {
        this.emit(x, y, {
            text: `+${amount} 💰`,
            color: '#ffff00',
            vy: -1.5,
            vx: 0,
            life: 1.5,
            scale: 1.2,
            glow: true
        });
    }

    /**
     * Create death effect
     */
    createDeathEffect(x, y, enemyIcon) {
        // Main death particle
        this.emit(x, y, {
            text: '💀',
            color: '#00ff88',
            vy: -2,
            vx: 0,
            gravity: 2,
            life: 1.0,
            scale: 1.5,
            glow: true
        });
        
        // Debris particles - reduced from 8 to 4
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4;
            this.emit(x, y, {
                text: '•',
                color: '#00ff88',
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                gravity: 2,
                life: 0.6,
                scale: 0.6
            });
        }
    }

    /**
     * Create merge effect
     */
    createMergeEffect(x, y) {
        // Stars - reduced from 12 to 6
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            this.emit(x, y, {
                text: '⭐',
                color: '#ffff00',
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                gravity: 1,
                life: 0.8,
                scale: 1.0,
                glow: true
            });
        }
        
        // Center flash
        this.emit(x, y, {
            text: '✨',
            color: '#ffffff',
            vy: 0,
            vx: 0,
            life: 0.4,
            scale: 1.5,
            glow: true,
            fadeOut: true
        });
        
        // Level up text
        this.emit(x, y, {
            text: 'LEVEL UP!',
            color: '#00ff88',
            vy: -1,
            vx: 0,
            life: 1.2,
            scale: 1.0,
            glow: true
        });
    }

    /**
     * Create explosion effect
     */
    createExplosion(x, y, radius, color = '#ff8800') {
        // Simplified: use fixed small count instead of radius-based
        const particleCount = 4; // Reduced from radius * 10
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 3;
            
            this.emit(x, y, {
                text: '💥',
                color: color,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 1.5,
                life: 0.6,
                scale: 1.0,
                glow: true
            });
        }
    }

    /**
     * Create freeze effect
     */
    createFreezeEffect(x, y) {
        // Reduced from 6 to 4 particles
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4;
            this.emit(x, y, {
                text: '❄️',
                color: '#aaffff',
                vx: Math.cos(angle) * 1.2,
                vy: Math.sin(angle) * 1.2,
                gravity: 0.5,
                life: 0.8,
                scale: 0.7,
                glow: true
            });
        }
    }

    /**
     * Create shield block effect - visual feedback when enemy shield absorbs damage
     */
    createShieldBlock(x, y) {
        // Blue shield sparkle burst
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4 + Math.PI / 4;
            this.emit(x, y, {
                text: '✦',
                color: '#44aaff',
                vx: Math.cos(angle) * 1.5,
                vy: Math.sin(angle) * 1.5,
                gravity: 0.3,
                life: 0.5,
                scale: 0.8,
                glow: true
            });
        }
        
        // Shield ripple effect
        this.emit(x, y, {
            text: '◯',
            color: '#88ccff',
            vx: 0,
            vy: 0,
            life: 0.3,
            scale: 1.5,
            glow: true,
            fadeOut: true
        });
    }

    /**
     * Create chain lightning effect
     */
    createLightningEffect(x, y) {
        this.emit(x, y, {
            text: '⚡',
            color: '#aa00ff',
            vx: Utils.randomFloat(-1, 1),
            vy: Utils.randomFloat(-1, 1),
            life: 0.3,
            scale: 1.5,
            glow: true
        });
    }

    /**
     * Create wave clear effect
     */
    createWaveClearEffect(x, y) {
        this.emit(x, y, {
            text: '🎉 WAVE CLEAR! 🎉',
            color: '#00ff88',
            vy: -1,
            vx: 0,
            life: 2.0,
            scale: 1.5,
            glow: true
        });
    }

    /**
     * Create warning effect
     */
    createWarningEffect(x, y, message) {
        this.emit(x, y, {
            text: message,
            color: '#ff3333',
            vy: -0.5,
            vx: 0,
            life: 1.5,
            scale: 1.2,
            glow: true
        });
    }

    /**
     * Create placement effect
     */
    createPlacementEffect(x, y) {
        // Reduced from 8 to 4 particles
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4;
            this.emit(x, y, {
                text: '✨',
                color: '#00ff88',
                vx: Math.cos(angle) * 1,
                vy: Math.sin(angle) * 1,
                gravity: 0,
                life: 0.4,
                scale: 0.7,
                glow: true
            });
        }
    }

    update(dt) {
        const active = this.pool.active;
        
        for (let i = active.length - 1; i >= 0; i--) {
            const particle = active[i];
            particle.update(dt);
            
            if (!particle.active) {
                this.pool.release(particle);
            }
        }
    }

    render(graphics) {
        this.pool.active.forEach(particle => {
            particle.render(graphics);
        });
    }

    clear() {
        this.pool.releaseAll();
    }

    getCount() {
        return this.pool.active.length;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Particle, ParticleSystem };
}

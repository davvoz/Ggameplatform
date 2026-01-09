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

    /**
     * Create shop purchase effect
     */
    createShopEffect(x, y, icon, color) {
        // Central icon
        this.emit(x, y, {
            text: icon,
            color: color,
            vy: -1.5,
            life: 1.0,
            scale: 1.8,
            glow: true
        });

        // Radiating sparkles
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            this.emit(x, y, {
                text: '✨',
                color: color,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2 - 0.5,
                gravity: 2,
                life: 0.8,
                scale: 0.8,
                glow: true
            });
        }
    }

    /**
     * Create damage boost activation effect
     */
    createDamageBoostEffect(x, y) {
        // Central explosion
        this.emit(x, y, {
            text: '💥',
            color: '#ff4444',
            vy: -2,
            life: 1.2,
            scale: 2.0,
            glow: true
        });

        // Fire particles radiating outward
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.emit(x, y, {
                text: '🔥',
                color: '#ff6600',
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3 - 1,
                gravity: 1.5,
                life: 1.0,
                scale: 0.9,
                glow: true
            });
        }

        // Red sparkles
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6 + Math.PI / 6;
            this.emit(x, y, {
                text: '✦',
                color: '#ff2222',
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2 - 0.5,
                gravity: 1,
                life: 0.7,
                scale: 1.0,
                glow: true
            });
        }

        // Power surge text
        this.emit(x, y - 0.5, {
            text: 'POWER SURGE!',
            color: '#ff4444',
            vy: -1.5,
            life: 1.5,
            scale: 1.4,
            glow: true
        });
    }

    /**
     * Create range boost activation effect
     */
    createRangeBoostEffect(x, y) {
        // Central radar icon
        this.emit(x, y, {
            text: '📡',
            color: '#4488ff',
            vy: -1.5,
            life: 1.2,
            scale: 2.0,
            glow: true
        });

        // Expanding ring particles
        for (let wave = 0; wave < 3; wave++) {
            const ringParticles = 6 + wave * 2;
            for (let i = 0; i < ringParticles; i++) {
                const angle = (Math.PI * 2 * i) / ringParticles;
                const speed = 2 + wave * 0.8;
                this.emit(x, y, {
                    text: '◯',
                    color: wave === 0 ? '#66aaff' : wave === 1 ? '#4488ff' : '#2266dd',
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    gravity: 0.2,
                    life: 0.8 + wave * 0.2,
                    scale: 0.6 + wave * 0.2,
                    glow: true
                });
            }
        }

        // Blue sparkles
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.emit(x, y, {
                text: '✧',
                color: '#88ccff',
                vx: Math.cos(angle) * 1.5,
                vy: Math.sin(angle) * 1.5 - 1,
                gravity: 0.5,
                life: 0.9,
                scale: 0.8,
                glow: true
            });
        }

        // Radar boost text
        this.emit(x, y - 0.5, {
            text: 'RADAR BOOST!',
            color: '#4488ff',
            vy: -1.5,
            life: 1.5,
            scale: 1.4,
            glow: true
        });
    }

    /**
     * Create fire rate boost activation effect
     */
    createFireRateBoostEffect(x, y) {
        // Central turbo icon
        this.emit(x, y, {
            text: '💨',
            color: '#ffcc00',
            vy: -2,
            life: 1.2,
            scale: 2.0,
            glow: true
        });

        // Speed lines effect
        for (let i = 0; i < 6; i++) {
            const offsetY = (i - 2.5) * 0.3;
            this.emit(x - 0.5, y + offsetY, {
                text: '—',
                color: '#ffee00',
                vx: 4,
                vy: 0,
                gravity: 0,
                life: 0.5,
                scale: 1.2,
                glow: true
            });
        }

        // Yellow spark burst
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.emit(x, y, {
                text: '⚡',
                color: '#ffdd00',
                vx: Math.cos(angle) * 2.5,
                vy: Math.sin(angle) * 2.5 - 0.5,
                gravity: 1,
                life: 0.8,
                scale: 0.8,
                glow: true
            });
        }

        // Rotating sparks
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4 + Math.PI / 4;
            this.emit(x, y, {
                text: '✦',
                color: '#ffff88',
                vx: Math.cos(angle) * 1.8,
                vy: Math.sin(angle) * 1.8,
                gravity: 0.3,
                life: 0.7,
                scale: 1.0,
                glow: true
            });
        }

        // Turbo fire text
        this.emit(x, y - 0.5, {
            text: 'TURBO FIRE!',
            color: '#ffcc00',
            vy: -1.5,
            life: 1.5,
            scale: 1.4,
            glow: true
        });
    }

    /**
     * Create energy boost activation effect
     */
    createEnergyBoostEffect(x, y, amount) {
        // Central energy icon
        this.emit(x, y, {
            text: amount >= 50 ? '🔋' : '⚡',
            color: amount >= 50 ? '#00ff88' : '#00ffff',
            vy: -1.5,
            life: 1.2,
            scale: 2.0,
            glow: true
        });

        // Rising energy particles
        for (let i = 0; i < 10; i++) {
            const offsetX = (Math.random() - 0.5) * 2;
            this.emit(x + offsetX, y + 0.5, {
                text: '✦',
                color: i % 2 === 0 ? '#00ff88' : '#00ffff',
                vx: offsetX * 0.3,
                vy: -2 - Math.random(),
                gravity: -0.5,
                life: 1.0 + Math.random() * 0.5,
                scale: 0.5 + Math.random() * 0.5,
                glow: true
            });
        }

        // Energy swirl
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            this.emit(x, y, {
                text: '◆',
                color: '#88ffcc',
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2 - 1,
                gravity: 0.8,
                life: 0.8,
                scale: 0.7,
                glow: true
            });
        }

        // Energy boost text
        this.emit(x, y - 0.5, {
            text: `+${amount} ENERGY!`,
            color: '#00ff88',
            vy: -1.5,
            life: 1.5,
            scale: 1.4,
            glow: true
        });
    }

    /**
     * Create boost expired effect
     */
    createBoostExpiredEffect(x, y, icon, name) {
        // Fading icon
        this.emit(x, y, {
            text: icon,
            color: '#888888',
            vy: -1,
            life: 1.0,
            scale: 1.5,
            glow: false,
            fadeOut: true
        });

        // Dissipating particles
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            this.emit(x, y, {
                text: '•',
                color: '#666666',
                vx: Math.cos(angle) * 1.5,
                vy: Math.sin(angle) * 1.5 - 0.5,
                gravity: 0.5,
                life: 0.6,
                scale: 0.5,
                glow: false,
                fadeOut: true
            });
        }

        // Expired text
        this.emit(x, y - 0.3, {
            text: `${name} expired`,
            color: '#888888',
            vy: -1,
            life: 1.2,
            scale: 1.0,
            glow: false
        });
    }

    /**
     * Create tower upgrade effect (permanent level up)
     */
    createTowerUpgradeEffect(x, y) {
        // Central star burst
        this.emit(x, y, {
            text: '⭐',
            color: '#ffdd00',
            vy: -2,
            life: 1.5,
            scale: 2.5,
            glow: true
        });

        // Rising stars
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.emit(x, y, {
                text: '✨',
                color: '#ffff88',
                vx: Math.cos(angle) * 2.5,
                vy: Math.sin(angle) * 2.5 - 1.5,
                gravity: 1.2,
                life: 1.2,
                scale: 1.0,
                glow: true
            });
        }

        // Golden rings expanding
        for (let ring = 0; ring < 3; ring++) {
            const ringParticles = 6 + ring * 2;
            for (let i = 0; i < ringParticles; i++) {
                const angle = (Math.PI * 2 * i) / ringParticles;
                const speed = 1.5 + ring * 0.5;
                this.emit(x, y, {
                    text: '◆',
                    color: ring === 0 ? '#ffee00' : ring === 1 ? '#ffcc00' : '#ffaa00',
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 0.5,
                    gravity: 0.3,
                    life: 1.0 + ring * 0.2,
                    scale: 0.7 + ring * 0.1,
                    glow: true
                });
            }
        }

        // Shining particles floating up
        for (let i = 0; i < 10; i++) {
            const offsetX = (Math.random() - 0.5) * 1.5;
            this.emit(x + offsetX, y + 0.5, {
                text: '✦',
                color: i % 3 === 0 ? '#ffff00' : i % 3 === 1 ? '#ffdd00' : '#ffaa00',
                vx: offsetX * 0.2,
                vy: -2 - Math.random() * 1.5,
                gravity: -0.3,
                life: 1.5 + Math.random() * 0.5,
                scale: 0.6 + Math.random() * 0.4,
                glow: true
            });
        }

        // Evolution text
        this.emit(x, y - 0.7, {
            text: 'EVOLUTION!',
            color: '#ffdd00',
            vy: -1.8,
            life: 2.0,
            scale: 1.6,
            glow: true
        });
    }

    /**
     * Create mega bomb explosion effect - professional realistic explosion
     */
    createMegaBombEffect(x, y, radius, damage) {
        // Phase 1: Bright central flash (white-yellow core)
        this.emit(x, y, {
            text: '●',
            color: '#ffffff',
            vx: 0,
            vy: 0,
            life: 0.15,
            scale: 4.0,
            glow: true,
            fadeOut: true
        });
        
        // Phase 2: Expanding shockwave ring (12 particles in a circle)
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const speed = 4 + Math.random() * 1;
            this.emit(x, y, {
                text: '○',
                color: '#ffaa00',
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0,
                life: 0.4,
                scale: 1.2,
                glow: true,
                fadeOut: true
            });
        }
        
        // Phase 3: Debris/sparks flying outward (8 pieces)
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
            const speed = 2 + Math.random() * 2;
            const debrisChars = ['▪', '■', '▫'];
            this.emit(x, y, {
                text: debrisChars[Math.floor(Math.random() * debrisChars.length)],
                color: i % 2 === 0 ? '#ff6600' : '#ffcc00',
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                gravity: 3,
                life: 0.8,
                scale: 0.6 + Math.random() * 0.4,
                fadeOut: true
            });
        }
        
        // Phase 4: Smoke puffs (4 rising)
        for (let i = 0; i < 4; i++) {
            const offsetX = (Math.random() - 0.5) * 1.5;
            const offsetY = (Math.random() - 0.5) * 1.5;
            this.emit(x + offsetX, y + offsetY, {
                text: '●',
                color: '#555555',
                vx: (Math.random() - 0.5) * 0.5,
                vy: -0.8 - Math.random() * 0.5,
                gravity: -0.3,
                life: 1.0,
                scale: 1.0 + Math.random() * 0.5,
                fadeOut: true
            });
        }

        // Damage indicator - bold and clear
        this.emit(x, y - 1, {
            text: `${damage}`,
            color: '#ffffff',
            vy: -2,
            life: 1.5,
            scale: 1.8,
            glow: true,
            fadeOut: true
        });
    }

    /**
     * Create force wave pushback effect - clean horizontal wave
     */
    createForceWaveEffect(startY, waveWidth) {
        const centerX = waveWidth / 2;
        
        // Simple wave line - one particle per 2 columns
        for (let col = 0; col < waveWidth; col += 2) {
            this.emit(col + 0.5, startY, {
                text: '═',
                color: '#00ccff',
                vx: 0,
                vy: -3,
                gravity: 0,
                life: 0.6,
                scale: 1.5,
                glow: true,
                fadeOut: true
            });
        }

        // Central wave indicator
        this.emit(centerX, startY, {
            text: '◆',
            color: '#00eeff',
            vy: -2,
            life: 0.8,
            scale: 2.0,
            glow: true
        });
    }

    /**
     * Create individual enemy pushback effect - minimal
     */
    createEnemyPushbackEffect(x, y, pushDistance) {
        // Simple push indicator
        this.emit(x, y, {
            text: '↑',
            color: '#00ccff',
            vy: -2,
            vx: 0,
            life: 0.4,
            scale: 1.2,
            glow: true,
            fadeOut: true
        });
    }

    /**
     * Create ability ready pulse effect - minimal
     */
    createAbilityReadyEffect(x, y, icon, color) {
        this.emit(x, y, {
            text: icon,
            color: color,
            vy: -0.8,
            life: 0.6,
            scale: 1.5,
            glow: true
        });
    }

    /**
     * Create ability level up effect - clean
     */
    createAbilityLevelUpEffect(x, y, level, icon, color) {
        // Icon
        this.emit(x, y, {
            text: icon,
            color: color,
            vy: -1,
            life: 1.0,
            scale: 2.0,
            glow: true
        });

        // Level text
        this.emit(x, y - 0.5, {
            text: `LV${level}`,
            color: '#ffffff',
            vy: -1.2,
            life: 1.2,
            scale: 1.2,
            glow: true
        });
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

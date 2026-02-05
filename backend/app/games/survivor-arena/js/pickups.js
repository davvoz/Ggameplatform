import { Entity } from './entity.js';
import { CONFIG } from './config.js';
import { Player } from './player.js';
import { MathUtils } from './utils.js';
/**
 * Survivor Arena - Pickups System
 * @fileoverview XP orbs, health packs, and special pickups
 */



// Map pickup types to sprite types
const PICKUP_SPRITE_MAP = {
    'xpOrb': 'pickup-xp',
    'healthPack': 'pickup-health',
    'magnet': 'pickup-magnet',
    'bomb': 'pickup-bomb',
    'chest': 'pickup-chest'
};

/**
 * Base pickup class
 */
class Pickup extends Entity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {string} type 
     */
    constructor(x, y, type) {
        const config = CONFIG.PICKUPS[type];
        super(x, y, config?.size || 15);
        
        this.type = type;
        this.config = config;
        this.color = config?.color || '#ffffff';
        
        // Magnet attraction
        this.isAttracted = false;
        this.attractSpeed = 500;
        
        // Animation
        this.floatOffset = Math.random() * Math.PI * 2;
        this.floatAmplitude = 3;
        this.floatSpeed = 3;
        
        // Lifetime (optional)
        this.lifetime = 30000; // 30 seconds
        this.age = 0;
        
        // Spawn animation
        this.spawnScale = 0;
        this.spawnDuration = 200;
        this.spawnTimer = 0;
    }

    /**
     * Get wrapped direction to target (shortest path in toroidal world)
     * @param {Object} target - Object with x, y properties
     * @returns {{dx: number, dy: number, distance: number, dirX: number, dirY: number}}
     */
    getWrappedDirectionTo(target) {
        const W = CONFIG.ARENA.WIDTH;
        const H = CONFIG.ARENA.HEIGHT;
        
        let dx = target.x - this.x;
        let dy = target.y - this.y;
        
        // Wrap to shortest path
        if (dx > W / 2) dx -= W;
        if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H;
        if (dy < -H / 2) dy += H;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dirX = distance > 0 ? dx / distance : 0;
        const dirY = distance > 0 ? dy / distance : 0;
        
        return { dx, dy, distance, dirX, dirY };
    }

    /**
     * Update pickup
     * @param {number} deltaTime 
     * @param {Player} player 
     */
    update(deltaTime, player) {
        if (!this.active) return;

        // Spawn animation
        if (this.spawnTimer < this.spawnDuration) {
            this.spawnTimer += deltaTime * 1000;
            this.spawnScale = Math.min(1, this.spawnTimer / this.spawnDuration);
        }

        // Age tracking
        this.age += deltaTime * 1000;
        if (this.age >= this.lifetime) {
            this.destroy();
            return;
        }

        // Magnetic attraction (using wrapped distance for toroidal world)
        if (player) {
            const wrapped = this.getWrappedDirectionTo(player);
            const dist = wrapped.distance;
            const magnetRange = (player.stats && player.stats.pickupRange) ? player.stats.pickupRange : 100;
            
            // If already attracted (magnet pickup) or within range, move towards player
            if (this.isAttracted || dist < magnetRange) {
                this.isAttracted = true;
                // Use constant speed when attracted, don't use negative formula
                const speed = this.attractSpeed;
                
                this.velocity.set(wrapped.dirX * speed, wrapped.dirY * speed);
            }
        }

        super.update(deltaTime);

        // Check collection handled by game.js with wrapped distance
    }

    /**
     * Collect pickup - override in subclasses
     * @param {Player} player 
     */
    collect(player) {
        this.destroy();
    }

    /**
     * Draw pickup
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y + Math.sin(Date.now() / 200 + this.floatOffset) * this.floatAmplitude;
        const scale = this.spawnScale;

        ctx.save();

        // Fade out near end of lifetime
        if (this.age > this.lifetime - 3000) {
            const fadeProgress = (this.age - (this.lifetime - 3000)) / 3000;
            ctx.globalAlpha = 1 - fadeProgress;
            
            // Blink effect
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.globalAlpha *= 0.5;
            }
        }

        // Glow
        const glowGradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, this.size * 2 * scale
        );
        glowGradient.addColorStop(0, this.color);
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * scale, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(
            screenX - this.size * 0.3 * scale,
            screenY - this.size * 0.3 * scale,
            this.size * 0.3 * scale,
            0, Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
    }

    /**
     * Render pickup (camera transform already applied)
     * Called by renderSeamless - delegates to draw with camera at 0,0
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        // Delegate to draw method which each subclass implements
        this.draw(ctx, camera);
    }

    /**
     * Draw pickup - base implementation
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y + Math.sin(Date.now() / 200 + this.floatOffset) * this.floatAmplitude;
        const scale = this.spawnScale;

        ctx.save();

        // Fade out near end of lifetime
        if (this.age > this.lifetime - 3000) {
            const fadeProgress = (this.age - (this.lifetime - 3000)) / 3000;
            ctx.globalAlpha = 1 - fadeProgress;
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.globalAlpha *= 0.5;
            }
        }

        // Procedural rendering with glow
        // Glow
        const glowGradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, this.size * 2 * scale
        );
        glowGradient.addColorStop(0, this.color);
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * scale, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(
            screenX - this.size * 0.3 * scale,
            screenY - this.size * 0.3 * scale,
            this.size * 0.3 * scale,
            0, Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
    }
}

/**
 * XP Orb pickup
 */
class XPOrb extends Pickup {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} value - XP value
     */
    constructor(x, y, value = 1) {
        super(x, y, 'xpOrb');
        this.value = value;
        
        // Size based on value
        if (value >= 10) {
            this.size = 18;
            this.color = '#ffd700'; // Gold for big orbs
        } else if (value >= 5) {
            this.size = 15;
            this.color = '#00bfff'; // Blue for medium
        } else {
            this.size = CONFIG.PICKUPS.xpOrb.size;
            this.color = CONFIG.PICKUPS.xpOrb.color;
        }
        
        // Initial scatter velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = MathUtils.randomRange(50, 150);
        this.velocity.set(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
        
        // Friction to slow down scatter
        this.friction = 5;
    }

    /**
     * Update XP orb
     * @param {number} deltaTime 
     * @param {Player} player 
     */
    update(deltaTime, player) {
        // Apply friction to scatter velocity
        if (!this.isAttracted && this.velocity.magnitudeSquared() > 1) {
            this.velocity.multiply(1 - this.friction * deltaTime);
        }
        
        super.update(deltaTime, player);
    }

    /**
     * Collect XP
     * @param {Player} player 
     */
    collect(player) {
        const leveled = player.addXP(this.value);
        super.collect(player);
        
        // Return whether player leveled up
        return leveled;
    }

    /**
     * Draw XP orb
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y + Math.sin(Date.now() / 200 + this.floatOffset) * this.floatAmplitude;
        const scale = this.spawnScale;

        ctx.save();

        // Fade out near end of lifetime
        if (this.age > this.lifetime - 3000) {
            const fadeProgress = (this.age - (this.lifetime - 3000)) / 3000;
            ctx.globalAlpha = 1 - fadeProgress;
            if (this.isAttracted) {
                ctx.globalAlpha *= 0.5;
            }
        }

        // Particle trail when attracted
        if (this.isAttracted) {
            ctx.fillStyle = `${this.color}44`;
            for (let i = 0; i < 3; i++) {
                const trailX = screenX - this.velocity.x * 0.01 * (i + 1);
                const trailY = screenY - this.velocity.y * 0.01 * (i + 1);
                ctx.beginPath();
                ctx.arc(trailX, trailY, this.size * 0.5 * scale * (1 - i * 0.2), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Glow
        const glowGradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, this.size * 2.5 * scale
        );
        glowGradient.addColorStop(0, this.color + 'aa');
        glowGradient.addColorStop(0.5, this.color + '44');
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Core with gradient
        const coreGradient = ctx.createRadialGradient(
            screenX - this.size * 0.3 * scale, screenY - this.size * 0.3 * scale, 0,
            screenX, screenY, this.size * scale
        );
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.3, this.color);
        coreGradient.addColorStop(1, this.darkenColor(this.color, 30));
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Darken color helper
     * @param {string} color 
     * @param {number} percent 
     * @returns {string}
     */
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }
}

/**
 * Health Pack pickup
 */
class HealthPack extends Pickup {
    /**
     * @param {number} x 
     * @param {number} y 
     */
    constructor(x, y) {
        super(x, y, 'healthPack');
        this.healAmount = CONFIG.PICKUPS.healthPack.healAmount;
        this.isAttracted = false; // Health packs don't get attracted
    }

    /**
     * Update (no magnet)
     * @param {number} deltaTime 
     * @param {Player} player 
     */
    update(deltaTime, player) {
        if (!this.active) return;

        // Spawn animation
        if (this.spawnTimer < this.spawnDuration) {
            this.spawnTimer += deltaTime * 1000;
            this.spawnScale = Math.min(1, this.spawnTimer / this.spawnDuration);
        }

        // Age tracking
        this.age += deltaTime * 1000;
        if (this.age >= this.lifetime) {
            this.destroy();
            return;
        }

        // Check collision manually (no magnet)
        if (player && this.collidesWith(player)) {
            this.collect(player);
        }
    }

    /**
     * Collect health
     * @param {Player} player 
     */
    collect(player) {
        player.heal(this.healAmount);
        super.collect(player);
    }

    /**
     * Draw health pack
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y + Math.sin(Date.now() / 300 + this.floatOffset) * this.floatAmplitude;
        const scale = this.spawnScale;

        ctx.save();

        // Fade out near end
        if (this.age > this.lifetime - 3000) {
            const fadeProgress = (this.age - (this.lifetime - 3000)) / 3000;
            ctx.globalAlpha = 1 - fadeProgress;
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.globalAlpha *= 0.5;
            }
        }

        // Glow
        const glowGradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, this.size * 2 * scale
        );
        glowGradient.addColorStop(0, '#ff444488');
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * scale, 0, Math.PI * 2);
        ctx.fill();

        // Red cross
        ctx.fillStyle = '#ff4444';
        const crossWidth = this.size * 0.4 * scale;
        const crossLength = this.size * 0.8 * scale;
        
        ctx.fillRect(screenX - crossWidth / 2, screenY - crossLength / 2, crossWidth, crossLength);
        ctx.fillRect(screenX - crossLength / 2, screenY - crossWidth / 2, crossLength, crossWidth);

        // Outline
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * scale, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

/**
 * Magnet pickup - attracts all XP orbs
 */
class MagnetPickup extends Pickup {
    /**
     * @param {number} x 
     * @param {number} y 
     */
    constructor(x, y) {
        super(x, y, 'magnet');
        this.duration = CONFIG.PICKUPS.magnet.duration;
        this.range = CONFIG.PICKUPS.magnet.range;
    }

    /**
     * Collect magnet
     * @param {Player} player 
     * @returns {Object} Effect data
     */
    collect(player) {
        super.collect(player);
        return {
            type: 'magnet',
            range: this.range,
            duration: this.duration
        };
    }

    /**
     * Draw magnet
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y + Math.sin(Date.now() / 250 + this.floatOffset) * this.floatAmplitude;
        const scale = Math.max(0.1, this.spawnScale); // Ensure scale is never too small

        ctx.save();

        // Magnetic field effect
        ctx.strokeStyle = '#9c27b0';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const baseRadius = this.size * (1.5 + i * 0.5) * scale;
            const radius = Math.max(1, baseRadius + Math.sin(Date.now() / 200 + i) * 3 * scale);
            const alpha = 0.5 - i * 0.15;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Core
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, Math.max(1, this.size * scale), 0, Math.PI * 2);
        ctx.fill();

        // Magnet shape
        ctx.fillStyle = '#e91e63';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 0.6 * scale, 0, Math.PI, true);
        ctx.fill();
        
        ctx.fillStyle = '#2196f3';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 0.6 * scale, 0, Math.PI, false);
        ctx.fill();

        ctx.restore();
    }
}

/**
 * Bomb pickup - clears screen
 */
class BombPickup extends Pickup {
    /**
     * @param {number} x 
     * @param {number} y 
     */
    constructor(x, y) {
        super(x, y, 'bomb');
        this.damage = CONFIG.PICKUPS.bomb.damage;
        this.explosionRadius = CONFIG.PICKUPS.bomb.radius;
    }

    /**
     * Collect bomb
     * @param {Player} player 
     * @returns {Object} Effect data
     */
    collect(player) {
        super.collect(player);
        return {
            type: 'bomb',
            x: player.x,
            y: player.y,
            damage: this.damage,
            radius: this.explosionRadius
        };
    }

    /**
     * Draw bomb
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y + Math.sin(Date.now() / 200 + this.floatOffset) * this.floatAmplitude;
        const scale = this.spawnScale;

        ctx.save();

        // Danger warning ring (pulsing red)
        const pulseScale = 1 + Math.sin(Date.now() / 100) * 0.3;
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(Date.now() / 100) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 2 * scale * pulseScale, 0, Math.PI * 2);
        ctx.stroke();
        
        // Outer warning glow (red/orange)
        const glowGradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, this.size * 2.5 * scale * pulseScale
        );
        glowGradient.addColorStop(0, 'rgba(255, 100, 0, 0.6)');
        glowGradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.3)');
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 2.5 * scale * pulseScale, 0, Math.PI * 2);
        ctx.fill();

        // Bomb body (dark with red tint)
        const bodyGradient = ctx.createRadialGradient(
            screenX - this.size * 0.3 * scale, screenY - this.size * 0.3 * scale, 0,
            screenX, screenY, this.size * scale
        );
        bodyGradient.addColorStop(0, '#555555');
        bodyGradient.addColorStop(0.5, '#333333');
        bodyGradient.addColorStop(1, '#1a1a1a');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Red danger stripe
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 0.7 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner dark circle
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 0.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Explosion symbol (star/burst)
        ctx.fillStyle = '#ffcc00';
        const spikes = 6;
        const outerRadius = this.size * 0.4 * scale;
        const innerRadius = this.size * 0.2 * scale;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI / spikes) - Math.PI / 2;
            const px = screenX + Math.cos(angle) * radius;
            const py = screenY + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Fuse on top
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - this.size * scale);
        ctx.quadraticCurveTo(
            screenX + 8 * scale, screenY - this.size * 1.3 * scale,
            screenX + 4 * scale, screenY - this.size * 1.5 * scale
        );
        ctx.stroke();

        // Animated spark/flame on fuse
        const sparkPhase = (Date.now() / 50) % 1;
        const sparkSize = 5 + Math.sin(Date.now() / 30) * 3;
        
        // Flame colors
        const flameGradient = ctx.createRadialGradient(
            screenX + 4 * scale, screenY - this.size * 1.5 * scale, 0,
            screenX + 4 * scale, screenY - this.size * 1.5 * scale, sparkSize * scale
        );
        flameGradient.addColorStop(0, '#ffffff');
        flameGradient.addColorStop(0.3, '#ffff00');
        flameGradient.addColorStop(0.6, '#ff6600');
        flameGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(screenX + 4 * scale, screenY - this.size * 1.5 * scale, sparkSize * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Spark particles
        ctx.fillStyle = '#ffff00';
        for (let i = 0; i < 3; i++) {
            const angle = (Date.now() / 100 + i * 2) % (Math.PI * 2);
            const dist = 3 + Math.random() * 4;
            const sx = screenX + 4 * scale + Math.cos(angle) * dist * scale;
            const sy = screenY - this.size * 1.5 * scale + Math.sin(angle) * dist * scale;
            ctx.beginPath();
            ctx.arc(sx, sy, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // "BOOM" text indicator
        ctx.fillStyle = '#ff3300';
        ctx.font = `bold ${10 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💥', screenX, screenY + this.size * 1.8 * scale);

        ctx.restore();
    }
}

export { Pickup, XPOrb, HealthPack, MagnetPickup, BombPickup ,PICKUP_SPRITE_MAP };

import { Entity } from './entity.js';
import { CONFIG, WORLD_WEAPONS } from './config.js';
import { MathUtils } from './utils.js';
/**
 * Survivor Arena - Weapons System
 * @fileoverview Weapon classes and projectile management
 */



/**
 * Projectile class
 */
class Projectile extends Entity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} angle 
     * @param {Object} config - Weapon configuration
     */
    constructor(x, y, angle, config) {
        super(x, y, config.projectileSize || 8);
        
        this.damage = config.damage || 10;
        this.speed = config.projectileSpeed || 400;
        this.range = config.range || 400;
        this.pierce = config.pierce || 1;
        this.pierceCount = 0;
        this.color = config.projectileColor || '#ffeb3b';
        this.weaponType = config.type || 'basicGun';
        
        // Special properties
        this.explosionRadius = config.explosionRadius || 0;
        this.returns = config.returns || false;
        this.returnPhase = false;
        this.owner = null;
        this.homing = config.homing || false;
        this.homingStrength = config.homingStrength || 0;
        this.homingTarget = null;
        
        // Bounce properties (ice grenade)
        this.bounces = config.bounces || 0;
        this.bounceCount = 0;
        this.freezeDuration = config.freezeDuration || 0;
        this.arcHeight = config.arcHeight || 0;
        this._currentArcHeight = 0;
        
        // Distance traveled (incremental)
        this.distanceTraveled = 0;
        this.lastX = x;
        this.lastY = y;
        
        // Set velocity based on angle
        this.velocity.set(
            Math.cos(angle) * this.speed,
            Math.sin(angle) * this.speed
        );
        this.angle = angle;
        
        // Enemies already hit (for pierce)
        this.hitEnemies = new Set();
        
        // Animation
        this.animTime = 0;
    }

    /**
     * Update projectile
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        super.update(deltaTime);
        
        this.animTime += deltaTime;
        
        // Track distance incrementally (works with toroidal wrapping)
        const dx = this.x - this.lastX;
        const dy = this.y - this.lastY;
        // Only add small movements (ignore wrap teleports)
        if (Math.abs(dx) < 100 && Math.abs(dy) < 100) {
            this.distanceTraveled += Math.hypot(dx, dy);
        }
        this.lastX = this.x;
        this.lastY = this.y;
        
        // Handle boomerang return
        if (this.returns && !this.returnPhase && this.distanceTraveled >= this.range) {
            this.returnPhase = true;
            this.hitEnemies.clear(); // Can hit again on return
        }
        
        if (this.returnPhase && this.owner) {
            // Move towards owner
            const dir = this.position.directionTo(this.owner.position);
            this.velocity.set(dir.x * this.speed, dir.y * this.speed);
            this.angle = Math.atan2(dir.y, dir.x);
            
            // Check if returned to owner
            if (this.position.distanceTo(this.owner.position) < this.owner.size + this.size) {
                this.destroy();
            }
        }
        
        // Destroy if out of range (non-returning projectiles)
        if (!this.returns && this.distanceTraveled >= this.range) {
            if (this.bounces > 0 && this.bounceCount < this.bounces) {
                // Bounce: reflect in a random direction, slow down slightly
                this.bounceCount++;
                this.distanceTraveled = 0;
                this._currentArcHeight = 0;
                const newAngle = this.angle + Math.PI + (Math.random() - 0.5) * Math.PI * 0.8;
                this.velocity.set(
                    Math.cos(newAngle) * this.speed * 0.85,
                    Math.sin(newAngle) * this.speed * 0.85
                );
                this.angle = newAngle;
            } else {
                this.destroy();
            }
        }
        
        // Grenade arc height
        if (this.arcHeight > 0) {
            const progress = Math.min(this.distanceTraveled / this.range, 1);
            this._currentArcHeight = this.arcHeight * 4 * progress * (1 - progress);
        }

        // Rocket wobble (sinusoidal path)
        if (this.weaponType === 'rocketLauncher') {
            const wobble = Math.sin(this.animTime * 6) * 2.5 * deltaTime;
            this.angle += wobble;
            this.velocity.set(
                Math.cos(this.angle) * this.speed,
                Math.sin(this.angle) * this.speed
            );
        }

        // Homing behavior: gently curve toward nearest enemy (with toroidal wrapping)
        if (this.homing && this.homingTarget && this.homingTarget.active) {
            let dx2 = this.homingTarget.x - this.x;
            let dy2 = this.homingTarget.y - this.y;
            // Wrap to shortest path in toroidal world
            const W = CONFIG.ARENA.WIDTH;
            const H = CONFIG.ARENA.HEIGHT;
            if (dx2 > W / 2) dx2 -= W;
            if (dx2 < -W / 2) dx2 += W;
            if (dy2 > H / 2) dy2 -= H;
            if (dy2 < -H / 2) dy2 += H;
            const targetAngle = Math.atan2(dy2, dx2);
            let angleDiff = targetAngle - this.angle;
            // Normalize angle difference
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            this.angle += angleDiff * this.homingStrength * deltaTime;
            this.velocity.set(
                Math.cos(this.angle) * this.speed,
                Math.sin(this.angle) * this.speed
            );
        }
    }

    /**
     * Handle hitting an enemy
     * @param {Enemy} enemy 
     * @returns {boolean} Whether to continue (pierce)
     */
    onHitEnemy(enemy) {
        if (this.hitEnemies.has(enemy)) {
            return true; // Already hit this enemy
        }
        
        this.hitEnemies.add(enemy);
        this.pierceCount++;
        
        if (this.pierceCount >= this.pierce && !this.returns) {
            this.destroy();
            return false;
        }
        
        return true;
    }

    /**
     * Draw projectile with unique style per weapon type
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        switch(this.weaponType) {
            case 'pistol':
            case 'basicGun':
                this.renderBullet(ctx);
                break;
            case 'shotgun':
                this.renderPellet(ctx);
                break;
            case 'smg':
            case 'machineGun':
                this.renderSmgBullet(ctx);
                break;
            case 'sniper':
                this.renderSniperTracer(ctx);
                break;
            case 'laser':
                this.renderLaser(ctx);
                break;
            case 'rocket':
                this.renderRocket(ctx);
                break;
            case 'flamethrower':
            case 'flame':
                this.renderFlame(ctx);
                break;
            case 'tesla':
            case 'lightning':
                this.renderLightning(ctx);
                break;
            case 'freezeGun':
            case 'ice':
                this.renderIce(ctx);
                break;
            case 'boomerang':
                this.renderBoomerang(ctx);
                break;
            case 'drone':
                this.renderDroneShot(ctx);
                break;
            case 'meteorStaff':
                this.renderMeteor(ctx);
                break;
            case 'iceShard':
                this.renderIce(ctx);
                break;
            case 'plasmaCannon':
                this.renderPlasma(ctx);
                break;
            case 'phantomBlade':
                this.renderPhantom(ctx);
                break;
            case 'iceGrenade':
                this.renderIceGrenade(ctx);
                break;
            case 'arrow':
                this.renderArrow(ctx);
                break;
            case 'fireball':
                this.renderFireball(ctx);
                break;
            case 'energyBall':
                this.renderEnergyBall(ctx);
                break;
            case 'laserBolt':
                this.renderLaserBolt(ctx);
                break;
            case 'darkOrb':
                this.renderDarkOrb(ctx);
                break;
            case 'enemyDefault':
                this.renderEnemyDefault(ctx);
                break;
            default:
                this.renderDefault(ctx);
        }

        ctx.restore();
    }
    
    renderBullet(ctx) {
        // Yellow bullet
        const gradient = ctx.createLinearGradient(-this.size, 0, this.size, 0);
        gradient.addColorStop(0, '#ffd54f');
        gradient.addColorStop(0.5, '#ffeb3b');
        gradient.addColorStop(1, '#fff59d');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 1.5, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Trail
        ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
        ctx.beginPath();
        ctx.ellipse(-this.size * 2, 0, this.size * 2, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderPellet(ctx) {
        // Orange shotgun pellet
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffcc80';
        ctx.beginPath();
        ctx.arc(-this.size * 0.2, -this.size * 0.2, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderSmgBullet(ctx) {
        // Small fast bullet
        ctx.fillStyle = '#ffc107';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderSniperTracer(ctx) {
        // Long cyan tracer
        const gradient = ctx.createLinearGradient(-this.size * 4, 0, this.size * 2, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, 'rgba(0, 229, 255, 0.3)');
        gradient.addColorStop(1, '#00e5ff');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-this.size * 4, -this.size * 0.3, this.size * 6, this.size * 0.6);
        
        // Bright tip
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.size * 1.5, -this.size * 0.15, this.size * 0.5, this.size * 0.3);
    }
    
    renderLaser(ctx) {
        // Red laser beam
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-this.size * 3, -this.size * 0.2, this.size * 6, this.size * 0.4);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.size * 3, -this.size * 0.1, this.size * 6, this.size * 0.2);
    }
    
    renderRocket(ctx) {
        const s = this.size;
        // Smoke trail (multiple fading puffs behind)
        for (let i = 1; i <= 4; i++) {
            const trailX = -s * 1.8 - i * s * 1.2;
            const puffSize = s * (0.4 + i * 0.25);
            const wobble = Math.sin(this.animTime * 10 + i * 2) * s * 0.15;
            ctx.fillStyle = `rgba(150, 150, 150, ${0.25 - i * 0.05})`;
            ctx.beginPath();
            ctx.arc(trailX, wobble, puffSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Exhaust flame (flickering, multi-layered)
        const flicker = Math.sin(this.animTime * 30) * 0.3 + 0.7;
        const flameLen = s * 2.5 + Math.sin(this.animTime * 25) * s * 0.5;
        // Outer flame (orange)
        ctx.fillStyle = `rgba(255, 100, 0, ${flicker * 0.6})`;
        ctx.beginPath();
        ctx.moveTo(-flameLen, 0);
        ctx.lineTo(-s * 1.0, -s * 0.55);
        ctx.lineTo(-s * 1.0, s * 0.55);
        ctx.closePath();
        ctx.fill();
        // Inner flame (yellow)
        ctx.fillStyle = `rgba(255, 220, 50, ${flicker * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(-flameLen * 0.7, 0);
        ctx.lineTo(-s * 1.0, -s * 0.3);
        ctx.lineTo(-s * 1.0, s * 0.3);
        ctx.closePath();
        ctx.fill();

        // Rocket body (metallic gradient)
        const bodyGrad = ctx.createLinearGradient(0, -s * 0.7, 0, s * 0.7);
        bodyGrad.addColorStop(0, '#888');
        bodyGrad.addColorStop(0.4, '#aaa');
        bodyGrad.addColorStop(0.6, '#999');
        bodyGrad.addColorStop(1, '#666');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 1.5, s * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nose cone (red, pointed)
        ctx.fillStyle = '#e53935';
        ctx.beginPath();
        ctx.moveTo(s * 2.2, 0);
        ctx.quadraticCurveTo(s * 1.6, -s * 0.5, s * 0.8, -s * 0.5);
        ctx.lineTo(s * 0.8, s * 0.5);
        ctx.quadraticCurveTo(s * 1.6, s * 0.5, s * 2.2, 0);
        ctx.closePath();
        ctx.fill();

        // Band around nose
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s * 0.8, -s * 0.55);
        ctx.lineTo(s * 0.8, s * 0.55);
        ctx.stroke();

        // Fins (angled, sharper)
        ctx.fillStyle = '#757575';
        ctx.beginPath();
        ctx.moveTo(-s * 0.8, -s * 0.3);
        ctx.lineTo(-s * 1.8, -s * 1.0);
        ctx.lineTo(-s * 0.3, -s * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-s * 0.8, s * 0.3);
        ctx.lineTo(-s * 1.8, s * 1.0);
        ctx.lineTo(-s * 0.3, s * 0.25);
        ctx.closePath();
        ctx.fill();
        // Center fin
        ctx.beginPath();
        ctx.moveTo(-s * 0.9, 0);
        ctx.lineTo(-s * 1.5, -s * 0.08);
        ctx.lineTo(-s * 0.4, 0);
        ctx.closePath();
        ctx.fill();
    }
    
    renderFlame(ctx) {
        const s = this.size;
        const flicker = Math.sin(this.animTime * 20) * 0.3;
        const size = s * (1 + flicker);
        // Trailing sparks
        for (let i = 0; i < 3; i++) {
            const tx = -s * (1.5 + i * 0.8) + Math.sin(this.animTime * 15 + i * 3) * s * 0.2;
            const ty = Math.sin(this.animTime * 10 + i * 5) * s * 0.3;
            ctx.fillStyle = `rgba(255, ${100 + i * 40}, 0, ${0.3 - i * 0.08})`;
            ctx.beginPath();
            ctx.arc(tx, ty, s * (0.35 - i * 0.06), 0, Math.PI * 2);
            ctx.fill();
        }
        // Outer flame (teardrop shape)
        ctx.fillStyle = '#dd3300';
        ctx.beginPath();
        ctx.moveTo(size * 0.8, 0);
        ctx.quadraticCurveTo(0, -size * 1.2, -size * 1.0, 0);
        ctx.quadraticCurveTo(0, size * 1.2, size * 0.8, 0);
        ctx.fill();
        // Middle flame
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(size * 0.5, 0);
        ctx.quadraticCurveTo(0, -size * 0.8, -size * 0.6, 0);
        ctx.quadraticCurveTo(0, size * 0.8, size * 0.5, 0);
        ctx.fill();
        // Core
        ctx.fillStyle = '#ffee44';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderLightning(ctx) {
        const s = this.size;
        const pulse = Math.sin(this.animTime * 15) * 0.2 + 0.8;
        ctx.shadowColor = '#2196f3';
        ctx.shadowBlur = 15;
        // Outer glow
        ctx.fillStyle = `rgba(33, 150, 243, ${pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, s * 2, 0, Math.PI * 2);
        ctx.fill();
        // Core (pulsing)
        ctx.fillStyle = '#64b5f6';
        ctx.beginPath();
        ctx.arc(0, 0, s * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // Forked lightning bolts (jagged)
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const sa = (this.animTime * 5 + i * Math.PI / 2) % (Math.PI * 2);
            let px = 0, py = 0;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const segments = 3;
            for (let j = 1; j <= segments; j++) {
                const frac = j / segments;
                const jx = Math.cos(sa) * s * 1.8 * frac;
                const jy = Math.sin(sa) * s * 1.8 * frac;
                const jitter = (j < segments) ? s * 0.3 : 0;
                px = jx + (Math.random() - 0.5) * jitter;
                py = jy + (Math.random() - 0.5) * jitter;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
            // Branch fork
            if (Math.sin(this.animTime * 8 + i * 2) > 0) {
                const bAngle = sa + (Math.random() - 0.5) * 1.2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(sa) * s * 0.9, Math.sin(sa) * s * 0.9);
                ctx.lineTo(Math.cos(bAngle) * s * 1.5, Math.sin(bAngle) * s * 1.5);
                ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;
    }
    
    renderIce(ctx) {
        // Ice shard
        ctx.fillStyle = '#80deea';
        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 2;
        
        // Crystal shape
        ctx.beginPath();
        ctx.moveTo(this.size * 1.5, 0);
        ctx.lineTo(this.size * 0.3, -this.size * 0.6);
        ctx.lineTo(-this.size * 1.2, -this.size * 0.3);
        ctx.lineTo(-this.size * 1.2, this.size * 0.3);
        ctx.lineTo(this.size * 0.3, this.size * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(this.size * 0.5, -this.size * 0.2);
        ctx.lineTo(this.size * 0.2, -this.size * 0.4);
        ctx.lineTo(-this.size * 0.3, -this.size * 0.1);
        ctx.closePath();
        ctx.fill();
    }
    
    renderBoomerang(ctx) {
        // Spinning boomerang
        ctx.rotate(-this.angle); // Reset
        ctx.rotate(this.animTime * 15); // Spin
        
        ctx.fillStyle = '#8d6e63';
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 2;
        
        // Boomerang shape
        ctx.beginPath();
        ctx.moveTo(-this.size * 1.5, 0);
        ctx.quadraticCurveTo(-this.size, -this.size, 0, -this.size * 0.3);
        ctx.quadraticCurveTo(this.size, -this.size, this.size * 1.5, 0);
        ctx.quadraticCurveTo(this.size, this.size * 0.3, 0, this.size * 0.1);
        ctx.quadraticCurveTo(-this.size, this.size * 0.3, -this.size * 1.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Decoration lines
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.8, -this.size * 0.1);
        ctx.lineTo(-this.size * 0.4, -this.size * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.size * 0.4, -this.size * 0.1);
        ctx.lineTo(this.size * 0.8, -this.size * 0.1);
        ctx.stroke();
    }
    
    renderDroneShot(ctx) {
        // Cyan energy shot
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#00e5ff');
        gradient.addColorStop(1, 'rgba(0, 229, 255, 0.3)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 1.2, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderMeteor(ctx) {
        const s = this.size;
        // Fire trail particles (scattered behind)
        for (let i = 1; i <= 5; i++) {
            const tx = -s * 1.5 * i + Math.sin(this.animTime * 12 + i * 3) * s * 0.3;
            const ty = Math.sin(this.animTime * 8 + i * 2) * s * 0.4;
            const tSize = s * (0.6 - i * 0.08);
            ctx.fillStyle = `rgba(255, ${Math.floor(80 + i * 30)}, 0, ${0.5 - i * 0.08})`;
            ctx.beginPath();
            ctx.arc(tx, ty, tSize, 0, Math.PI * 2);
            ctx.fill();
        }
        // Ember sparks
        for (let i = 0; i < 4; i++) {
            const sx = -s * (2 + i * 0.8) + Math.sin(this.animTime * 15 + i * 5) * s * 0.5;
            const sy = Math.cos(this.animTime * 10 + i * 4) * s * 0.6;
            ctx.fillStyle = `rgba(255, 200, 50, ${0.3 + Math.sin(this.animTime * 20 + i) * 0.2})`;
            ctx.beginPath();
            ctx.arc(sx, sy, s * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
        // Main meteor body (rocky with glow)
        const gradient = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 0, 0, 0, s * 1.5);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.2, '#ffcc00');
        gradient.addColorStop(0.5, '#ff6600');
        gradient.addColorStop(0.8, '#cc3300');
        gradient.addColorStop(1, 'rgba(100, 20, 0, 0.4)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        // Slightly irregular shape
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const r = s * 1.4 + Math.sin(i * 3.7 + this.animTime * 3) * s * 0.15;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Crater-like surface detail
        ctx.fillStyle = 'rgba(80, 20, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(s * 0.2, -s * 0.1, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-s * 0.3, s * 0.3, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderPlasma(ctx) {
        // Glowing cyan-green plasma ball
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.3);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#00ffcc');
        gradient.addColorStop(0.7, '#00aa88');
        gradient.addColorStop(1, 'rgba(0, 255, 200, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 1.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderPhantom(ctx) {
        const s = this.size;

        // Ghostly trail (subtle)
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#9966cc';
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // === BLADE (silver/steel) ===
        const bladeGrad = ctx.createLinearGradient(-s * 1.8, 0, s * 2.2, 0);
        bladeGrad.addColorStop(0, '#888888');
        bladeGrad.addColorStop(0.3, '#cccccc');
        bladeGrad.addColorStop(0.5, '#ffffff');
        bladeGrad.addColorStop(0.7, '#dddddd');
        bladeGrad.addColorStop(1, '#aaaaaa');
        ctx.fillStyle = bladeGrad;

        // Blade shape - pointed tip, widens to guard
        ctx.beginPath();
        ctx.moveTo(s * 2.4, 0);              // Tip
        ctx.lineTo(s * 0.8, -s * 0.22);      // Upper edge near guard
        ctx.lineTo(-s * 0.2, -s * 0.28);     // Upper shoulder
        ctx.lineTo(-s * 0.2, s * 0.28);      // Lower shoulder
        ctx.lineTo(s * 0.8, s * 0.22);       // Lower edge near guard
        ctx.closePath();
        ctx.fill();

        // Blade edge highlight (sharp edge line)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s * 2.4, 0);
        ctx.lineTo(s * 0.8, -s * 0.22);
        ctx.lineTo(-s * 0.2, -s * 0.28);
        ctx.stroke();

        // Fuller line (groove down the blade center)
        ctx.strokeStyle = 'rgba(100, 100, 120, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s * 2.0, 0);
        ctx.lineTo(s * 0.0, 0);
        ctx.stroke();

        // === GUARD (cross piece) - gold/dark ===
        ctx.fillStyle = '#aa8833';
        ctx.beginPath();
        ctx.moveTo(-s * 0.15, -s * 0.55);
        ctx.lineTo(s * 0.05, -s * 0.55);
        ctx.lineTo(s * 0.05, s * 0.55);
        ctx.lineTo(-s * 0.15, s * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#776622';
        ctx.lineWidth = 1;
        ctx.stroke();

        // === HANDLE (dark leather) ===
        ctx.fillStyle = '#443322';
        ctx.fillRect(-s * 1.1, -s * 0.14, s * 0.95, s * 0.28);

        // Handle wrap lines
        ctx.strokeStyle = '#332211';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const hx = -s * 1.0 + i * s * 0.22;
            ctx.beginPath();
            ctx.moveTo(hx, -s * 0.14);
            ctx.lineTo(hx, s * 0.14);
            ctx.stroke();
        }

        // === POMMEL (round end) ===
        ctx.fillStyle = '#aa8833';
        ctx.beginPath();
        ctx.arc(-s * 1.15, 0, s * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Spectral glow (very subtle purple aura)
        ctx.shadowColor = '#8844cc';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(136, 68, 204, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s * 2.4, 0);
        ctx.lineTo(s * 0.8, -s * 0.22);
        ctx.lineTo(-s * 0.2, -s * 0.28);
        ctx.lineTo(-s * 0.2, s * 0.28);
        ctx.lineTo(s * 0.8, s * 0.22);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    renderIceGrenade(ctx) {
        const s = this.size;
        const h = this._currentArcHeight || 0;
        const spin = this.animTime * 5;

        // Undo the automatic angle rotation (grenade tumbles freely)
        ctx.rotate(-this.angle);

        // Shadow on the ground (stays at y=0)
        const shadowScale = 1 - h * 0.008;
        ctx.globalAlpha = 0.25 * shadowScale;
        ctx.fillStyle = '#004466';
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 1.1, s * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Lift grenade up by arc height
        ctx.translate(0, -h);

        // Scale slightly when high
        const heightScale = 1 + h * 0.006;
        ctx.scale(heightScale, heightScale);

        // Tumble rotation
        ctx.rotate(spin);

        // Icy glow aura
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#66ccff';
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main body - round grenade
        const bodyGrad = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 0, 0, 0, s * 1.1);
        bodyGrad.addColorStop(0, '#ddf4ff');
        bodyGrad.addColorStop(0.4, '#77ccee');
        bodyGrad.addColorStop(1, '#2288aa');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();

        // Metal band around middle
        ctx.strokeStyle = '#556677';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.lineTo(s, 0);
        ctx.stroke();

        // Frost lines on surface
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.7)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI + spin * 0.3;
            const len = s * 0.6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
            ctx.stroke();
            // Small branches
            const bx = Math.cos(a) * len * 0.6;
            const by = Math.sin(a) * len * 0.6;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(a + 0.8) * len * 0.3, by + Math.sin(a + 0.8) * len * 0.3);
            ctx.stroke();
        }

        // Top pin / fuse nub
        ctx.fillStyle = '#aaeeff';
        ctx.beginPath();
        ctx.arc(0, -s * 0.8, s * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#55aacc';
        ctx.fillRect(-s * 0.08, -s * 1.15, s * 0.16, s * 0.35);

        // Outer glow ring
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(100, 220, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.05, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    renderArrow(ctx) {
        // Arrow shaft
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(-this.size * 2, -this.size * 0.2, this.size * 3.5, this.size * 0.4);
        // Arrowhead (sharp triangle)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.size * 2, 0);
        ctx.lineTo(this.size * 0.8, -this.size * 0.7);
        ctx.lineTo(this.size * 0.8, this.size * 0.7);
        ctx.closePath();
        ctx.fill();
        // Fletching (tail feathers)
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.beginPath();
        ctx.moveTo(-this.size * 2, 0);
        ctx.lineTo(-this.size * 1.3, -this.size * 0.6);
        ctx.lineTo(-this.size * 1.0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-this.size * 2, 0);
        ctx.lineTo(-this.size * 1.3, this.size * 0.6);
        ctx.lineTo(-this.size * 1.0, 0);
        ctx.closePath();
        ctx.fill();
    }

    renderFireball(ctx) {
        // Fiery core
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.5);
        grad.addColorStop(0, '#ffff44');
        grad.addColorStop(0.3, '#ff8800');
        grad.addColorStop(0.7, '#ff3300');
        grad.addColorStop(1, 'rgba(200, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Flickering flames trailing behind
        for (let i = 0; i < 4; i++) {
            const fAngle = Math.PI + (Math.random() - 0.5) * 1.2;
            const fDist = this.size + Math.random() * this.size;
            const fx = Math.cos(fAngle) * fDist;
            const fy = Math.sin(fAngle) * fDist;
            ctx.fillStyle = `rgba(255, ${100 + Math.floor(Math.random() * 100)}, 0, ${0.4 + Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(fx, fy, this.size * (0.3 + Math.random() * 0.4), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderEnergyBall(ctx) {
        // Purple energy orb with ring
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.3);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(1, 'rgba(100, 0, 180, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 1.3, 0, Math.PI * 2);
        ctx.fill();
        // Orbiting ring
        ctx.strokeStyle = `rgba(200, 150, 255, 0.6)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 1.5, this.size * 0.5, this.animTime * 3, 0, Math.PI * 2);
        ctx.stroke();
    }

    renderLaserBolt(ctx) {
        // Neon laser bolt (elongated, bright)
        const grad = ctx.createLinearGradient(-this.size * 2, 0, this.size * 2, 0);
        grad.addColorStop(0, 'rgba(0, 255, 180, 0)');
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(0.7, '#ffffff');
        grad.addColorStop(1, this.color);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 2.5, this.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.fillStyle = `rgba(0, 255, 200, 0.15)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 3, this.size * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    renderDarkOrb(ctx) {
        // Dark void orb with swirling shadow
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.5);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.4, '#330055');
        grad.addColorStop(0.8, this.color);
        grad.addColorStop(1, 'rgba(100, 0, 180, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Swirling tendrils
        ctx.strokeStyle = `rgba(150, 50, 255, 0.5)`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const a = this.animTime * 4 + (i * Math.PI * 2 / 3);
            ctx.beginPath();
            ctx.arc(0, 0, this.size * (0.8 + i * 0.3), a, a + Math.PI * 0.6);
            ctx.stroke();
        }
    }

    renderEnemyDefault(ctx) {
        // Simple colored bullet for generic ranged enemies
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(-this.size * 0.2, -this.size * 0.2, this.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }

    renderDefault(ctx) {
        // Default glowing projectile
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Weapon class
 */
class Weapon {
    /**
     * @param {string} type - Weapon type from CONFIG.WEAPONS
     */
    constructor(type) {
        this.type = type;
        const config = CONFIG.WEAPONS[type] || WORLD_WEAPONS[type];
        
        if (!config) {
            console.error(`Unknown weapon type: ${type}`);
            return;
        }
        
        this.name = config.name;
        this.icon = config.icon;
        this.level = 1;
        
        // Copy base stats
        this.damage = config.damage;
        this.fireRate = config.fireRate;
        this.projectileSpeed = config.projectileSpeed;
        this.projectileSize = config.projectileSize;
        this.projectileColor = config.projectileColor;
        this.range = config.range;
        this.pierce = config.pierce || 1;
        this.spread = config.spread || 0;
        this.projectiles = config.projectiles || 1;
        
        // Special properties
        this.explosionRadius = config.explosionRadius || 0;
        this.returns = config.returns || false;
        this.width = config.width || 0;
        this.radius = config.radius || 0;
        this.rotationSpeed = config.rotationSpeed || 0;
        this.orbitRadius = config.orbitRadius || 0;
        this.count = config.count || 1;
        
        // World-specific weapon properties
        this.chainTargets = config.chainTargets || 0;
        this.chainRange = config.chainRange || 0;
        this.lifeSteal = config.lifeSteal || 0;
        this.homing = config.homing || false;
        this.homingStrength = config.homingStrength || 0;
        this.bounces = config.bounces || 0;
        this.freezeDuration = config.freezeDuration || 0;
        this.arcHeight = config.arcHeight || 0;
        this.description = config.description || '';
        
        // Cooldown
        this.cooldown = 0;
        this.lastFireTime = 0;
        
        // Active projectiles (for this weapon)
        this.projectilePool = [];
        
        // For continuous weapons (laser, forcefield)
        this.isActive = true;
        this.rotation = 0;
    }

    /**
     * Update weapon
     * @param {number} deltaTime 
     * @param {Player} player 
     */
    update(deltaTime, player) {
        // Update cooldown
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime * 1000;
        }
        
        // Special weapon updates
        if (this.type === 'forcefield') {
            this.rotation += this.rotationSpeed * deltaTime;
        }
        
        // Update projectiles
        for (let i = this.projectilePool.length - 1; i >= 0; i--) {
            const proj = this.projectilePool[i];
            if (proj.active) {
                proj.update(deltaTime);
            } else {
                this.projectilePool.splice(i, 1);
            }
        }
    }

    /**
     * Fire weapon
     * @param {number} deltaTime - Time since last frame
     * @param {Player} player - Player firing the weapon
     * @param {Entity} target - Target enemy (can be null)
     * @param {Game} game - Game instance for wrapped distance calculation
     * @returns {Array<Projectile>|null}
     */
    fire(deltaTime, player, target = null, game = null) {
        if (this.cooldown > 0) return null;
        
        // Don't fire if no target (except special weapons handled separately)
        if (!target && this.type !== 'laser' && this.type !== 'forcefield' && this.type !== 'drone' 
            && this.type !== 'teslaCoil' && this.type !== 'soulDrain' && this.type !== 'blizzardOrb') {
            return null;
        }
        
        // Special weapons don't fire projectiles normally - they have their own logic
        if (this.type === 'laser' || this.type === 'forcefield' || this.type === 'drone'
            || this.type === 'teslaCoil' || this.type === 'soulDrain' || this.type === 'blizzardOrb') {
            return null;
        }
        
        this.cooldown = this.fireRate;
        const newProjectiles = [];
        
        // Calculate aim direction using wrapped distance for toroidal world
        let aimDirection;
        if (target && game) {
            // Use wrapped distance for correct direction in toroidal world
            const wrapped = game.getWrappedDistance(player.x, player.y, target.x, target.y);
            const len = wrapped.distance || 1;
            aimDirection = { x: wrapped.dx / len, y: wrapped.dy / len };
        } else if (target) {
            // Fallback to direct calculation
            const dx = target.x - player.x;
            const dy = target.y - player.y;
            const len = Math.hypot(dx, dy) || 1;
            aimDirection = { x: dx / len, y: dy / len };
        } else {
            // Fire in facing direction if no target
            aimDirection = { x: player.facingDirection.x, y: player.facingDirection.y };
        }
        
        const baseAngle = Math.atan2(aimDirection.y, aimDirection.x);
        
        // Fire multiple projectiles with spread
        for (let i = 0; i < this.projectiles; i++) {
            let angle = baseAngle;
            
            if (this.projectiles > 1 && this.spread > 0) {
                const spreadRad = MathUtils.degToRad(this.spread);
                const offset = (i - (this.projectiles - 1) / 2) * (spreadRad / (this.projectiles - 1));
                angle += offset;
            } else if (this.spread > 0) {
                // Random spread for single projectile
                const spreadRad = MathUtils.degToRad(this.spread);
                angle += MathUtils.randomRange(-spreadRad / 2, spreadRad / 2);
            }
            
            const proj = new Projectile(
                player.x,
                player.y,
                angle,
                {
                    type: this.type,
                    damage: this.damage,
                    projectileSpeed: this.projectileSpeed,
                    projectileSize: this.projectileSize,
                    projectileColor: this.projectileColor,
                    range: this.range,
                    pierce: this.pierce,
                    explosionRadius: this.explosionRadius,
                    returns: this.returns,
                    homing: this.homing,
                    homingStrength: this.homingStrength,
                    bounces: this.bounces || 0,
                    freezeDuration: this.freezeDuration || 0,
                    arcHeight: this.arcHeight || 0
                }
            );
            
            proj.owner = player;
            // Set homing target
            if (this.homing && target) {
                proj.homingTarget = target;
            }
            this.projectilePool.push(proj);
            newProjectiles.push(proj);
        }
        
        return newProjectiles.length > 0 ? newProjectiles : null;
    }

    /**
     * Upgrade weapon
     */
    upgrade() {
        this.level++;
        
        // Apply level bonuses
        this.damage *= 1.15;
        this.fireRate *= 0.90; // 10% faster per level
        
        // Every 3 levels, add a projectile
        if (this.level % 3 === 0) {
            if (this.type === 'shotgun' || this.type === 'machineGun') {
                this.projectiles++;
            }
        }
        
        // Every 5 levels, increase range
        if (this.level % 5 === 0) {
            this.range *= 1.2;
        }
    }

    /**
     * Draw weapon effects (for continuous weapons)
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     * @param {Player} player 
     * @param {Array} enemies 
     */
    draw(ctx, camera, player, enemies) {
        const screenX = player.x - camera.x;
        const screenY = player.y - camera.y;
        
        // Draw laser beam
        if (this.type === 'laser' && enemies.length > 0) {
            // Find nearest enemy
            let nearest = null;
            let nearestDist = this.range;
            
            for (const enemy of enemies) {
                const dist = player.position.distanceTo(enemy.position);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = enemy;
                }
            }
            
            if (nearest) {
                const enemyScreenX = nearest.x - camera.x;
                const enemyScreenY = nearest.y - camera.y;
                
                // Draw laser
                const gradient = ctx.createLinearGradient(
                    screenX, screenY,
                    enemyScreenX, enemyScreenY
                );
                gradient.addColorStop(0, CONFIG.WEAPONS.laser.color);
                gradient.addColorStop(1, 'rgba(0, 188, 212, 0.3)');
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = this.width;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(enemyScreenX, enemyScreenY);
                ctx.stroke();
                
                // Glow effect
                ctx.strokeStyle = 'rgba(0, 188, 212, 0.3)';
                ctx.lineWidth = this.width * 3;
                ctx.stroke();
            }
        }
        
        // Draw forcefield
        if (this.type === 'forcefield') {
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(this.rotation);
            
            // Outer ring
            ctx.strokeStyle = CONFIG.WEAPONS.forcefield.color;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Inner glow
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
            gradient.addColorStop(0, 'rgba(0, 191, 255, 0)');
            gradient.addColorStop(0.7, 'rgba(0, 191, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 191, 255, 0.3)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Rotating segments
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI / 2) * i;
                ctx.strokeStyle = '#00bfff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius - 5, angle, angle + Math.PI / 4);
                ctx.stroke();
            }
            
            ctx.restore();
        }
        
        // Draw projectiles
        for (const proj of this.projectilePool) {
            if (proj.active) {
                proj.draw(ctx, camera);
            }
        }
    }

    /**
     * Get active projectiles
     * @returns {Array<Projectile>}
     */
    getProjectiles() {
        return this.projectilePool.filter(p => p.active);
    }

    /**
     * Clear all projectiles
     */
    clearProjectiles() {
        this.projectilePool = [];
    }
}

/**
 * Drone weapon (orbiting shooter)
 */
class Drone extends Entity {
    /**
     * @param {Player} owner 
     * @param {number} orbitIndex 
     */
    constructor(owner, orbitIndex = 0) {
        super(owner.x, owner.y, 15);
        
        this.owner = owner;
        this.orbitIndex = orbitIndex;
        this.orbitAngle = (Math.PI * 2 / 4) * orbitIndex;
        this.orbitRadius = CONFIG.WEAPONS.drone.orbitRadius;
        this.orbitSpeed = 2;
        
        this.damage = CONFIG.WEAPONS.drone.damage;
        this.fireRate = CONFIG.WEAPONS.drone.fireRate;
        this.cooldown = 0;
        
        this.color = '#607d8b';
        this.projectilePool = [];
        
        // Animation
        this.animTime = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    /**
     * Get wrapped distance (shortest path in toroidal world)
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @returns {Object} {dx, dy, distance}
     */
    getWrappedDistance(x1, y1, x2, y2) {
        const W = CONFIG.ARENA.WIDTH;
        const H = CONFIG.ARENA.HEIGHT;
        
        let dx = x2 - x1;
        let dy = y2 - y1;
        
        if (Math.abs(dx) > W / 2) {
            dx = dx > 0 ? dx - W : dx + W;
        }
        if (Math.abs(dy) > H / 2) {
            dy = dy > 0 ? dy - H : dy + H;
        }
        
        return {
            dx, dy,
            distance: Math.hypot(dx, dy)
        };
    }

    /**
     * Update drone
     * @param {number} deltaTime 
     * @param {Array} enemies 
     */
    update(deltaTime, enemies) {
        this.animTime += deltaTime;
        
        // Orbit around player
        this.orbitAngle += this.orbitSpeed * deltaTime;
        this.x = this.owner.x + Math.cos(this.orbitAngle) * this.orbitRadius;
        this.y = this.owner.y + Math.sin(this.orbitAngle) * this.orbitRadius;
        
        // Wrap drone position
        if (this.x < 0) this.x += CONFIG.ARENA.WIDTH;
        if (this.x >= CONFIG.ARENA.WIDTH) this.x -= CONFIG.ARENA.WIDTH;
        if (this.y < 0) this.y += CONFIG.ARENA.HEIGHT;
        if (this.y >= CONFIG.ARENA.HEIGHT) this.y -= CONFIG.ARENA.HEIGHT;
        
        // Fire at nearest enemy (using wrapped distance)
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime * 1000;
        } else if (enemies.length > 0) {
            let nearest = null;
            let nearestDist = CONFIG.WEAPONS.drone.range;
            
            for (const enemy of enemies) {
                const wrapped = this.getWrappedDistance(this.x, this.y, enemy.x, enemy.y);
                if (wrapped.distance < nearestDist) {
                    nearestDist = wrapped.distance;
                    nearest = enemy;
                }
            }
            
            if (nearest) {
                this.fire(nearest);
            }
        }
        
        // Update projectiles
        for (let i = this.projectilePool.length - 1; i >= 0; i--) {
            const proj = this.projectilePool[i];
            if (proj.active) {
                proj.update(deltaTime);
                // Wrap projectile position
                if (proj.x < 0) proj.x += CONFIG.ARENA.WIDTH;
                if (proj.x >= CONFIG.ARENA.WIDTH) proj.x -= CONFIG.ARENA.WIDTH;
                if (proj.y < 0) proj.y += CONFIG.ARENA.HEIGHT;
                if (proj.y >= CONFIG.ARENA.HEIGHT) proj.y -= CONFIG.ARENA.HEIGHT;
            } else {
                this.projectilePool.splice(i, 1);
            }
        }
    }

    /**
     * Fire at target (using wrapped direction)
     * @param {Enemy} target 
     * @returns {Projectile[]|null}
     */
    fire(target) {
        // Can't fire yet or no target
        if (this.cooldown > 0 || !target) {
            return null;
        }
        
        this.cooldown = this.fireRate;
        
        // Calculate angle to target using wrapped distance
        const wrapped = this.getWrappedDistance(this.x, this.y, target.x, target.y);
        const angle = Math.atan2(wrapped.dy, wrapped.dx);
        
        const proj = new Projectile(
            this.x, this.y, angle,
            {
                type: 'drone',
                damage: this.damage,
                projectileSpeed: CONFIG.WEAPONS.drone.projectileSpeed,
                projectileSize: CONFIG.WEAPONS.drone.projectileSize,
                projectileColor: CONFIG.WEAPONS.drone.projectileColor,
                range: CONFIG.WEAPONS.drone.range,
                pierce: 1
            }
        );
        
        this.projectilePool.push(proj);
        return [proj];
    }

    /**
     * Draw drone
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        ctx.save();
        ctx.translate(screenX, screenY);
        this.renderDroneBody(ctx);
        ctx.restore();
        
        // Draw projectiles
        for (const proj of this.projectilePool) {
            if (proj.active) {
                proj.draw(ctx, camera);
            }
        }
    }

    /**
     * Render drone (camera transform already applied)
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        this.renderDroneBody(ctx);
        ctx.restore();
        
        // Draw projectiles
        for (const proj of this.projectilePool) {
            if (proj.active) {
                proj.render(ctx);
            }
        }
    }
    
    /**
     * Render drone body (robotic helper)
     * @param {CanvasRenderingContext2D} ctx
     */
    renderDroneBody(ctx) {
        const bob = Math.sin(this.animTime * 5 + this.bobOffset) * 2;
        const propellerSpin = this.animTime * 30;
        
        ctx.translate(0, bob);
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, this.size + 5 - bob, this.size * 0.8, this.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Propeller blur (top)
        ctx.fillStyle = 'rgba(100, 181, 246, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, -this.size * 0.8, this.size * 1.2, this.size * 0.3, propellerSpin % Math.PI, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body (rounded rectangle)
        ctx.fillStyle = '#607d8b';
        ctx.beginPath();
        ctx.roundRect(-this.size * 0.7, -this.size * 0.5, this.size * 1.4, this.size * 1.2, 5);
        ctx.fill();
        
        // Body highlight
        ctx.fillStyle = '#78909c';
        ctx.beginPath();
        ctx.roundRect(-this.size * 0.5, -this.size * 0.4, this.size * 1, this.size * 0.5, 3);
        ctx.fill();
        
        // Eye visor
        ctx.fillStyle = '#263238';
        ctx.beginPath();
        ctx.roundRect(-this.size * 0.55, -this.size * 0.3, this.size * 1.1, this.size * 0.35, 3);
        ctx.fill();
        
        // Eyes (LEDs)
        const eyePulse = (Math.sin(this.animTime * 3) + 1) * 0.5;
        ctx.fillStyle = `rgba(0, 230, 118, ${0.7 + eyePulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(-this.size * 0.25, -this.size * 0.15, this.size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.size * 0.25, -this.size * 0.15, this.size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        // Antenna
        ctx.strokeStyle = '#455a64';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.5);
        ctx.lineTo(0, -this.size * 0.9);
        ctx.stroke();
        
        // Antenna ball
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(0, -this.size * 0.95, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Gun barrel
        ctx.fillStyle = '#37474f';
        ctx.fillRect(-this.size * 0.1, this.size * 0.4, this.size * 0.2, this.size * 0.5);
        
        // Gun tip glow when ready to fire
        if (this.cooldown <= 0) {
            ctx.fillStyle = '#00e5ff';
            ctx.beginPath();
            ctx.arc(0, this.size * 0.95, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

export { Weapon, Projectile, Drone };
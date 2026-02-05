import { Entity } from './entity.js';
import { CONFIG } from './config.js';
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
            this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
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
            this.destroy();
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
        // Rocket with exhaust
        ctx.rotate(-this.angle); // Reset rotation for proper drawing
        ctx.rotate(this.angle);
        
        // Exhaust flame
        const flicker = Math.sin(this.animTime * 30) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 152, 0, ${flicker})`;
        ctx.beginPath();
        ctx.moveTo(-this.size * 2.5, 0);
        ctx.lineTo(-this.size * 1, -this.size * 0.5);
        ctx.lineTo(-this.size * 1, this.size * 0.5);
        ctx.closePath();
        ctx.fill();
        
        // Rocket body
        ctx.fillStyle = '#616161';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 1.5, this.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Nose cone
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.moveTo(this.size * 1.5, 0);
        ctx.lineTo(this.size * 0.8, -this.size * 0.5);
        ctx.lineTo(this.size * 0.8, this.size * 0.5);
        ctx.closePath();
        ctx.fill();
        
        // Fins
        ctx.fillStyle = '#757575';
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.lineTo(-this.size * 1.5, -this.size * 0.8);
        ctx.lineTo(-this.size * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.lineTo(-this.size * 1.5, this.size * 0.8);
        ctx.lineTo(-this.size * 0.5, 0);
        ctx.closePath();
        ctx.fill();
    }
    
    renderFlame(ctx) {
        // Fire particle
        const flicker = Math.sin(this.animTime * 20) * 0.3;
        const size = this.size * (1 + flicker);
        
        // Outer flame
        ctx.fillStyle = '#ff5722';
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Middle
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderLightning(ctx) {
        // Electric orb
        const pulse = Math.sin(this.animTime * 15) * 0.2 + 0.8;
        
        ctx.shadowColor = '#2196f3';
        ctx.shadowBlur = 15;
        
        // Outer glow
        ctx.fillStyle = `rgba(33, 150, 243, ${pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = '#64b5f6';
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Lightning sparks
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const sparkAngle = (this.animTime * 5 + i * Math.PI / 2) % (Math.PI * 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(
                Math.cos(sparkAngle) * this.size * 1.5,
                Math.sin(sparkAngle) * this.size * 1.5
            );
            ctx.stroke();
        }
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
        const config = CONFIG.WEAPONS[type];
        
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
        if (!target && this.type !== 'laser' && this.type !== 'forcefield' && this.type !== 'drone') {
            return null;
        }
        
        // Special weapons don't fire projectiles normally - they have their own logic
        if (this.type === 'laser' || this.type === 'forcefield' || this.type === 'drone') {
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
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
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
                    returns: this.returns
                }
            );
            
            proj.owner = player;
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
        
        // Every 3 levels, add a projectile or pierce
        if (this.level % 3 === 0) {
            if (this.type === 'shotgun' || this.type === 'machineGun') {
                this.projectiles++;
            } else {
                this.pierce++;
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
            distance: Math.sqrt(dx * dx + dy * dy)
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
/**
 * Survivor Arena - Enemy System
 * @fileoverview Enemy types and behaviors
 */

'use strict';

// Map enemy types to sprite types
const ENEMY_SPRITE_MAP = {
    'basic': 'zombie',
    'fast': 'runner',
    'tank': 'tank',
    'ranged': 'shooter',
    'exploder': 'exploder',
    'swarm': 'zombie',
    'ghost': 'ghost'
};

/**
 * Base enemy class
 */
class Enemy extends LivingEntity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {string} type - Enemy type from CONFIG.ENEMIES
     * @param {Object} difficultyMult - Difficulty multipliers
     */
    constructor(x, y, type, difficultyMult = {}) {
        const config = CONFIG.ENEMIES[type] || CONFIG.ENEMIES.basic;
        
        const health = config.health * (difficultyMult.enemyHealth || 1);
        super(x, y, config.size, health);
        
        this.type = type;
        this.config = config;
        
        // Apply difficulty scaling
        this.damage = config.damage * (difficultyMult.enemyDamage || 1);
        this.speed = config.speed * (difficultyMult.enemySpeed || 1);
        this.baseSpeed = this.speed;
        
        this.color = config.color;
        this.target = null;
        
        // XP and score values
        this.xpValue = CONFIG.LEVELING.XP_FROM_ENEMY[type] || 1;
        this.scoreValue = CONFIG.SCORING.POINTS_PER_KILL[type] || 10;
        
        // Initialize sprite system
        const spriteType = ENEMY_SPRITE_MAP[type] || 'zombie';
        this.sprite = spriteManager.createSprite(spriteType);
        if (this.sprite) {
            this.sprite.play('walk');
        }
        this.spriteScale = this.size * 2.5;
        
        // State machine
        this.state = 'chase';
        this.stateTimer = 0;
        
        // Ranged enemy specifics
        if (type === 'ranged') {
            this.attackRange = config.attackRange;
            this.projectileSpeed = config.projectileSpeed;
            this.fireRate = config.fireRate;
            this.fireCooldown = 0;
            this.projectiles = [];
        }
        
        // Exploder specifics
        if (type === 'exploder') {
            this.explosionRadius = config.explosionRadius;
            this.isExploding = false;
            this.explosionTimer = 0;
        }
        
        // Knockback
        this.knockbackVelocity = new Vector2(0, 0);
        this.knockbackDecay = 10;
        
        // Animation
        this.animationOffset = Math.random() * Math.PI * 2;
    }

    /**
     * Set target to chase
     * @param {Entity} target 
     */
    setTarget(target) {
        this.target = target;
    }

    /**
     * Update enemy
     * @param {number} deltaTime 
     * @param {Object} arena 
     */
    update(deltaTime, arena) {
        if (!this.active || !this.target) return;

        // Apply knockback
        if (this.knockbackVelocity.magnitudeSquared() > 0.1) {
            this.velocity.x = this.knockbackVelocity.x;
            this.velocity.y = this.knockbackVelocity.y;
            
            // Decay knockback
            this.knockbackVelocity.multiply(1 - this.knockbackDecay * deltaTime);
        } else {
            this.knockbackVelocity.set(0, 0);
            
            // Behavior based on type - direct chase, no wrapping
            this.updateBehavior(deltaTime);
        }

        super.update(deltaTime);

        // Wrap position for seamless toroidal world
        this.x = this.wrapCoord(this.x, CONFIG.ARENA.WIDTH);
        this.y = this.wrapCoord(this.y, CONFIG.ARENA.HEIGHT);
        this.position.set(this.x, this.y);

        // Update ranged projectiles
        if (this.projectiles) {
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const proj = this.projectiles[i];
                if (proj.active) {
                    proj.update(deltaTime);
                } else {
                    this.projectiles.splice(i, 1);
                }
            }
        }

        // Update sprite animation
        if (this.sprite) {
            this.sprite.update(deltaTime);
        }
    }
    
    /**
     * Wrap coordinate for infinite world
     * @param {number} value 
     * @param {number} max 
     * @returns {number}
     */
    wrapCoord(value, max) {
        if (value < 0) return value + max;
        if (value >= max) return value - max;
        return value;
    }
    
    /**
     * Get wrapped direction to target (shortest path in toroidal world)
     * @param {Object} arena
     * @returns {Object} {dx, dy, distance, dirX, dirY}
     */
    getWrappedDirectionToTarget(arena) {
        if (!this.target) return { dx: 0, dy: 0, distance: 0, dirX: 0, dirY: 0 };
        
        let dx = this.target.x - this.x;
        let dy = this.target.y - this.y;
        
        // Wrap horizontally - take shorter path
        if (Math.abs(dx) > arena.width / 2) {
            dx = dx > 0 ? dx - arena.width : dx + arena.width;
        }
        
        // Wrap vertically - take shorter path
        if (Math.abs(dy) > arena.height / 2) {
            dy = dy > 0 ? dy - arena.height : dy + arena.height;
        }
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dirX = distance > 0 ? dx / distance : 0;
        const dirY = distance > 0 ? dy / distance : 0;
        
        return { dx, dy, distance, dirX, dirY };
    }

    /**
     * Update behavior based on type (using wrapped distance for seamless toroidal world)
     * @param {number} deltaTime 
     */
    updateBehavior(deltaTime) {
        // Use wrapped direction for shortest path in toroidal world
        const arena = { width: CONFIG.ARENA.WIDTH, height: CONFIG.ARENA.HEIGHT };
        const wrapped = this.getWrappedDirectionToTarget(arena);
        const distToTarget = wrapped.distance;
        const dirToTarget = new Vector2(wrapped.dirX, wrapped.dirY);

        switch (this.type) {
            case 'ranged':
                this.updateRangedBehavior(deltaTime, distToTarget, dirToTarget);
                break;
            case 'exploder':
                this.updateExploderBehavior(deltaTime, distToTarget, dirToTarget);
                break;
            default:
                this.updateChaseBehavior(dirToTarget);
        }
    }

    /**
     * Basic chase behavior
     * @param {Vector2} dirToTarget 
     */
    updateChaseBehavior(dirToTarget) {
        this.velocity.set(
            dirToTarget.x * this.speed,
            dirToTarget.y * this.speed
        );
    }

    /**
     * Ranged enemy behavior
     * @param {number} deltaTime 
     * @param {number} distToTarget 
     * @param {Vector2} dirToTarget 
     */
    updateRangedBehavior(deltaTime, distToTarget, dirToTarget) {
        this.fireCooldown -= deltaTime * 1000;

        if (distToTarget > this.attackRange) {
            // Move closer
            this.velocity.set(
                dirToTarget.x * this.speed,
                dirToTarget.y * this.speed
            );
        } else if (distToTarget < this.attackRange * 0.5) {
            // Too close, back away
            this.velocity.set(
                -dirToTarget.x * this.speed * 0.5,
                -dirToTarget.y * this.speed * 0.5
            );
        } else {
            // In range, stop and shoot
            this.velocity.set(0, 0);
            
            if (this.fireCooldown <= 0) {
                this.fireProjectile(dirToTarget);
                this.fireCooldown = this.fireRate;
            }
        }
    }

    /**
     * Fire a projectile at target
     * @param {Vector2} direction 
     */
    fireProjectile(direction) {
        const angle = Math.atan2(direction.y, direction.x);
        const proj = new Projectile(
            this.x, this.y, angle,
            {
                damage: this.damage,
                projectileSpeed: this.projectileSpeed,
                projectileSize: 8,
                projectileColor: '#ba68c8',
                range: this.attackRange * 1.5,
                pierce: 1
            }
        );
        proj.isEnemyProjectile = true;
        this.projectiles.push(proj);
    }

    /**
     * Exploder behavior
     * @param {number} deltaTime 
     * @param {number} distToTarget 
     * @param {Vector2} dirToTarget 
     */
    updateExploderBehavior(deltaTime, distToTarget, dirToTarget) {
        if (this.isExploding) {
            this.explosionTimer -= deltaTime * 1000;
            
            // Pulsate effect
            this.size = this.config.size * (1 + 0.3 * Math.sin(Date.now() / 50));
            
            if (this.explosionTimer <= 0) {
                this.explode();
            }
            this.velocity.set(0, 0);
        } else if (distToTarget < 60) {
            // Start explosion countdown
            this.isExploding = true;
            this.explosionTimer = 1000; // 1 second warning
            this.velocity.set(0, 0);
        } else {
            // Chase faster than normal
            this.velocity.set(
                dirToTarget.x * this.speed,
                dirToTarget.y * this.speed
            );
        }
    }

    /**
     * Explode (for exploder type)
     */
    explode() {
        this.hasExploded = true;
        this.active = false;
        // Explosion damage is handled by game.js
    }

    /**
     * Apply knockback
     * @param {Vector2} direction 
     * @param {number} force 
     */
    applyKnockback(direction, force) {
        this.knockbackVelocity.set(
            direction.x * force,
            direction.y * force
        );
    }

    /**
     * Take damage with knockback
     * @param {number} amount 
     * @param {Entity} source 
     * @returns {boolean}
     */
    takeDamage(amount, source = null) {
        const died = super.takeDamage(amount, source);
        
        // Apply knockback from damage source
        if (source && !died) {
            const dir = source.position.directionTo(this.position);
            this.applyKnockback(dir, 200);
        }
        
        return died;
    }

    /**
     * Draw enemy
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        // Damage flash
        if (this.damageFlash > 0) {
            ctx.globalAlpha = 0.7;
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX + 2, screenY + this.size * 0.7, this.size * 0.7, this.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Exploder warning pulse
        if (this.type === 'exploder' && this.isExploding) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.explosionRadius * (1 + 0.2 * Math.sin(Date.now() / 100)), 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw body with gradient
        const gradient = ctx.createRadialGradient(
            screenX - this.size * 0.3, screenY - this.size * 0.3, 0,
            screenX, screenY, this.size
        );
        
        // Lighter version of color for highlight
        gradient.addColorStop(0, this.lightenColor(this.color, 30));
        gradient.addColorStop(1, this.color);

        ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = this.darkenColor(this.color, 30);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eyes (looking at target)
        if (this.target) {
            const eyeAngle = this.position.angleTo(this.target.position);
            const eyeOffset = this.size * 0.3;
            const eyeSize = this.size * 0.2;
            
            // Eye whites
            ctx.fillStyle = '#ffffff';
            const leftEyeAngle = eyeAngle - 0.5;
            const rightEyeAngle = eyeAngle + 0.5;
            
            ctx.beginPath();
            ctx.arc(
                screenX + Math.cos(leftEyeAngle) * eyeOffset,
                screenY + Math.sin(leftEyeAngle) * eyeOffset,
                eyeSize, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.beginPath();
            ctx.arc(
                screenX + Math.cos(rightEyeAngle) * eyeOffset,
                screenY + Math.sin(rightEyeAngle) * eyeOffset,
                eyeSize, 0, Math.PI * 2
            );
            ctx.fill();

            // Pupils
            const pupilOffset = eyeSize * 0.3;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(
                screenX + Math.cos(leftEyeAngle) * eyeOffset + Math.cos(eyeAngle) * pupilOffset,
                screenY + Math.sin(leftEyeAngle) * eyeOffset + Math.sin(eyeAngle) * pupilOffset,
                eyeSize * 0.5, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.beginPath();
            ctx.arc(
                screenX + Math.cos(rightEyeAngle) * eyeOffset + Math.cos(eyeAngle) * pupilOffset,
                screenY + Math.sin(rightEyeAngle) * eyeOffset + Math.sin(eyeAngle) * pupilOffset,
                eyeSize * 0.5, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // Health bar for tanks and stronger enemies
        if (this.maxHealth > 30 && this.health < this.maxHealth) {
            const barWidth = this.size * 2;
            const barHeight = 4;
            const barY = screenY - this.size - 10;
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);
            
            // Health
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336';
            ctx.fillRect(screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        }

        ctx.restore();

        // Draw ranged projectiles
        if (this.projectiles) {
            for (const proj of this.projectiles) {
                if (proj.active) {
                    proj.draw(ctx, camera);
                }
            }
        }
    }

    /**
     * Lighten a hex color
     * @param {string} color 
     * @param {number} percent 
     * @returns {string}
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    /**
     * Darken a hex color
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

    /**
     * Render enemy (camera transform already applied)
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        if (!this.active) return;

        ctx.save();

        // Damage flash
        let opacity = 1.0;
        if (this.damageFlash > 0) {
            opacity = 0.7;
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + 2, this.y + this.size * 0.7, this.size * 0.7, this.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rarity glow effect
        if (this.rarityGlow && this.rarityColor) {
            const glowSize = this.size * 1.5 + Math.sin(Date.now() / 200) * 5;
            const gradient = ctx.createRadialGradient(
                this.x, this.y, this.size * 0.5,
                this.x, this.y, glowSize
            );
            gradient.addColorStop(0, this.rarityColor + '80');
            gradient.addColorStop(0.5, this.rarityColor + '40');
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Exploder warning pulse
        if (this.type === 'exploder' && this.isExploding) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.explosionRadius * (1 + 0.2 * Math.sin(Date.now() / 100)), 0, Math.PI * 2);
            ctx.fill();
        }

        // Use sprite system if available
        if (this.sprite) {
            // Determine facing direction
            let flipX = false;
            if (this.target) {
                flipX = this.target.x < this.x;
            } else if (this.velocity.x !== 0) {
                flipX = this.velocity.x < 0;
            }

            this.sprite.render(ctx, this.x, this.y, this.spriteScale, {
                opacity: opacity,
                flipX: flipX,
                tint: this.damageFlash > 0 ? '#ffffff' : (this.rarityColor || null)
            });
        } else {
            // Fallback to basic rendering
            ctx.globalAlpha = opacity;
            
            const bodyColor = this.rarityColor || this.color;
            const gradient = ctx.createRadialGradient(
                this.x - this.size * 0.3, this.y - this.size * 0.3, 0,
                this.x, this.y, this.size
            );
            gradient.addColorStop(0, this.lightenColor(bodyColor, 30));
            gradient.addColorStop(1, bodyColor);

            ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = this.darkenColor(bodyColor, 30);
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Rarity indicator
        if (this.rarity && this.rarity !== 'common') {
            const raritySymbols = {
                'uncommon': '★',
                'rare': '★★',
                'epic': '★★★',
                'legendary': '♦'
            };
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = this.rarityColor || '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeText(raritySymbols[this.rarity] || '', this.x, this.y - this.size - 15);
            ctx.fillText(raritySymbols[this.rarity] || '', this.x, this.y - this.size - 15);
        }

        // Health bar for stronger enemies
        if (this.maxHealth > 30 && this.health < this.maxHealth) {
            const barWidth = this.size * 2;
            const barHeight = 4;
            const barY = this.y - this.size - (this.rarity && this.rarity !== 'common' ? 25 : 10);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
            
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336';
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        }

        ctx.restore();
    }
}

/**
 * Mini Boss class
 */
class MiniBoss extends Enemy {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {Object} difficultyMult 
     */
    constructor(x, y, difficultyMult = {}) {
        // Create mini boss with custom config
        const config = CONFIG.MINI_BOSS;
        const tempConfig = {
            size: config.size,
            speed: config.speed,
            health: config.health,
            damage: config.damage,
            color: config.color,
            spawnWeight: 0
        };
        
        // Temporarily add to CONFIG for parent constructor
        CONFIG.ENEMIES.miniBoss = tempConfig;
        super(x, y, 'miniBoss', difficultyMult);
        
        // Use miniboss sprite instead of zombie
        this.sprite = spriteManager.createSprite('miniboss');
        if (this.sprite) {
            this.sprite.play('walk');
        }
        this.spriteScale = this.size * 2;
        
        this.xpValue = CONFIG.LEVELING.XP_FROM_ENEMY.miniBoss;
        this.scoreValue = CONFIG.SCORING.POINTS_PER_KILL.miniBoss;
        
        this.abilities = config.abilities;
        this.currentAbility = null;
        this.abilityCooldown = 3000;
        this.abilityTimer = this.abilityCooldown;
        
        // Charge attack
        this.isCharging = false;
        this.chargeDirection = new Vector2(0, 0);
        this.chargeTimer = 0;
        
        // Summon cooldown
        this.summonCount = 0;
        this.maxSummons = 3;
    }

    /**
     * Update mini boss
     * @param {number} deltaTime 
     * @param {Object} arena 
     */
    update(deltaTime, arena) {
        if (!this.active || !this.target) return;

        // Ability cooldown
        this.abilityTimer -= deltaTime * 1000;
        
        if (this.abilityTimer <= 0 && !this.currentAbility) {
            this.useAbility();
        }

        // Handle current ability
        if (this.currentAbility) {
            this.updateAbility(deltaTime);
        } else {
            // Normal chase behavior - use wrapped direction for seamless toroidal world
            const arena = { width: CONFIG.ARENA.WIDTH, height: CONFIG.ARENA.HEIGHT };
            const wrapped = this.getWrappedDirectionToTarget(arena);
            const dirToTarget = new Vector2(wrapped.dirX, wrapped.dirY);
            this.velocity.set(
                dirToTarget.x * this.speed,
                dirToTarget.y * this.speed
            );
        }

        // Call LivingEntity update (skip Enemy behavior)
        LivingEntity.prototype.update.call(this, deltaTime);

        // Wrap position for seamless toroidal world
        this.x = this.wrapCoord(this.x, CONFIG.ARENA.WIDTH);
        this.y = this.wrapCoord(this.y, CONFIG.ARENA.HEIGHT);
        this.position.set(this.x, this.y);
    }

    /**
     * Use a random ability
     */
    useAbility() {
        const ability = this.abilities[MathUtils.randomInt(0, this.abilities.length - 1)];
        
        switch (ability) {
            case 'charge':
                this.startCharge();
                break;
            case 'summon':
                if (this.summonCount < this.maxSummons) {
                    this.summonMinions();
                }
                break;
            case 'aoe':
                this.aoeAttack();
                break;
        }
    }

    /**
     * Start charge attack
     */
    startCharge() {
        this.currentAbility = 'charge';
        this.isCharging = true;
        this.chargeDirection = this.position.directionTo(this.target.position);
        this.chargeTimer = 500; // 0.5 second charge
        this.velocity.set(0, 0);
    }

    /**
     * Update ability state
     * @param {number} deltaTime 
     */
    updateAbility(deltaTime) {
        switch (this.currentAbility) {
            case 'charge':
                this.chargeTimer -= deltaTime * 1000;
                
                if (this.chargeTimer > 0) {
                    // Charging up - slow movement
                    this.velocity.set(
                        -this.chargeDirection.x * 50,
                        -this.chargeDirection.y * 50
                    );
                } else {
                    // Execute charge
                    this.velocity.set(
                        this.chargeDirection.x * this.speed * 4,
                        this.chargeDirection.y * this.speed * 4
                    );
                    
                    // End charge after distance
                    if (this.chargeTimer < -300) {
                        this.endAbility();
                    }
                }
                break;
        }
    }

    /**
     * Summon minions (returns positions for game to spawn)
     * @returns {Array<{x: number, y: number}>}
     */
    summonMinions() {
        this.currentAbility = 'summon';
        this.summonCount++;
        
        const positions = [];
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i;
            positions.push({
                x: this.x + Math.cos(angle) * 80,
                y: this.y + Math.sin(angle) * 80
            });
        }
        
        setTimeout(() => this.endAbility(), 500);
        
        return positions;
    }

    /**
     * AOE attack (returns damage area)
     * @returns {{x: number, y: number, radius: number, damage: number}}
     */
    aoeAttack() {
        this.currentAbility = 'aoe';
        
        setTimeout(() => this.endAbility(), 500);
        
        return {
            x: this.x,
            y: this.y,
            radius: 150,
            damage: this.damage * 0.5
        };
    }

    /**
     * End current ability
     */
    endAbility() {
        this.currentAbility = null;
        this.isCharging = false;
        this.abilityTimer = this.abilityCooldown;
    }

    /**
     * Draw mini boss
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        // Charging indicator
        if (this.isCharging && this.chargeTimer > 0) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(
                screenX + this.chargeDirection.x * 200,
                screenY + this.chargeDirection.y * 200
            );
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw shadow (larger)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(screenX + 4, screenY + this.size * 0.6, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main body with gradient
        const gradient = ctx.createRadialGradient(
            screenX - this.size * 0.3, screenY - this.size * 0.3, 0,
            screenX, screenY, this.size
        );
        gradient.addColorStop(0, '#ff69b4');
        gradient.addColorStop(1, this.color);

        ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Spiky outline
        ctx.strokeStyle = '#ff1493';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Crown/horns
        ctx.fillStyle = '#ffd700';
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 2 + (i - 2) * 0.3;
            const hornX = screenX + Math.cos(angle) * (this.size + 5);
            const hornY = screenY + Math.sin(angle) * (this.size + 5);
            
            ctx.beginPath();
            ctx.moveTo(hornX, hornY);
            ctx.lineTo(hornX + Math.cos(angle) * 15, hornY + Math.sin(angle) * 15);
            ctx.lineTo(hornX + Math.cos(angle + 0.3) * 8, hornY + Math.sin(angle + 0.3) * 8);
            ctx.closePath();
            ctx.fill();
        }

        // Angry eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX - 15, screenY - 5, 12, 0, Math.PI * 2);
        ctx.arc(screenX + 15, screenY - 5, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(screenX - 15, screenY - 5, 6, 0, Math.PI * 2);
        ctx.arc(screenX + 15, screenY - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barWidth = this.size * 2.5;
        const barHeight = 8;
        const barY = screenY - this.size - 20;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(screenX - barWidth / 2 - 2, barY - 2, barWidth + 4, barHeight + 4);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // "MINI BOSS" text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('MINI BOSS', screenX, barY - 5);

        ctx.restore();
    }
}

/**
 * Boss class
 */
class Boss extends MiniBoss {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {Object} difficultyMult 
     */
    constructor(x, y, difficultyMult = {}) {
        super(x, y, difficultyMult);
        
        // Override with boss config
        const config = CONFIG.BOSS;
        this.maxHealth = config.health * (difficultyMult.enemyHealth || 1);
        this.health = this.maxHealth;
        this.damage = config.damage * (difficultyMult.enemyDamage || 1);
        this.size = config.size;
        this.speed = config.speed * (difficultyMult.enemySpeed || 1);
        this.color = config.color;
        
        // Use boss sprite
        this.sprite = spriteManager.createSprite('boss');
        if (this.sprite) {
            this.sprite.play('walk');
        }
        this.spriteScale = this.size * 1.8;
        
        this.xpValue = CONFIG.LEVELING.XP_FROM_ENEMY.boss;
        this.scoreValue = CONFIG.SCORING.POINTS_PER_KILL.boss;
        
        this.phase = 1;
        this.maxPhases = config.phases;
        this.phaseThresholds = [0.66, 0.33]; // Health % to trigger phase change
        
        // More abilities
        this.abilityCooldown = 2000;
        this.maxSummons = 5;
    }

    /**
     * Take damage and check phase transitions
     * @param {number} amount 
     * @param {Entity} source 
     * @returns {boolean}
     */
    takeDamage(amount, source = null) {
        const died = super.takeDamage(amount, source);
        
        if (!died) {
            // Check for phase transition
            const healthPercent = this.health / this.maxHealth;
            const newPhase = this.phase < this.maxPhases && 
                healthPercent <= this.phaseThresholds[this.phase - 1];
            
            if (newPhase) {
                this.phase++;
                this.onPhaseChange();
            }
        }
        
        return died;
    }

    /**
     * Called when boss enters new phase
     */
    onPhaseChange() {
        // Increase speed and ability frequency
        this.speed *= 1.2;
        this.abilityCooldown *= 0.8;
        
        // Visual feedback handled in draw
    }

    /**
     * Draw boss
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        // Phase aura
        const auraColors = ['#9c27b0', '#e91e63', '#f44336'];
        ctx.strokeStyle = auraColors[this.phase - 1];
        ctx.lineWidth = 5 + Math.sin(Date.now() / 200) * 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size + 20 + Math.sin(Date.now() / 300) * 10, 0, Math.PI * 2);
        ctx.stroke();

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(screenX + 5, screenY + this.size * 0.5, this.size * 0.9, this.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        const gradient = ctx.createRadialGradient(
            screenX - this.size * 0.3, screenY - this.size * 0.3, 0,
            screenX, screenY, this.size
        );
        gradient.addColorStop(0, '#ce93d8');
        gradient.addColorStop(1, this.color);

        ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#7b1fa2';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Crown
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(screenX - 40, screenY - this.size + 10);
        ctx.lineTo(screenX - 30, screenY - this.size - 30);
        ctx.lineTo(screenX - 15, screenY - this.size);
        ctx.lineTo(screenX, screenY - this.size - 40);
        ctx.lineTo(screenX + 15, screenY - this.size);
        ctx.lineTo(screenX + 30, screenY - this.size - 30);
        ctx.lineTo(screenX + 40, screenY - this.size + 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ff8f00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Gems on crown
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(screenX, screenY - this.size - 25, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX - 25, screenY - 10, 18, 0, Math.PI * 2);
        ctx.arc(screenX + 25, screenY - 10, 18, 0, Math.PI * 2);
        ctx.fill();

        // Pupils (change color with phase)
        ctx.fillStyle = auraColors[this.phase - 1];
        ctx.beginPath();
        ctx.arc(screenX - 25, screenY - 10, 10, 0, Math.PI * 2);
        ctx.arc(screenX + 25, screenY - 10, 10, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barWidth = 200;
        const barHeight = 12;
        const barY = screenY - this.size - 60;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(screenX - barWidth / 2 - 3, barY - 3, barWidth + 6, barHeight + 6);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);
        
        // Phase segments
        for (let i = 0; i < this.maxPhases - 1; i++) {
            const segX = screenX - barWidth / 2 + barWidth * this.phaseThresholds[i];
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(segX, barY);
            ctx.lineTo(segX, barY + barHeight);
            ctx.stroke();
        }
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = auraColors[this.phase - 1];
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // "BOSS" text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`⚔️ BOSS - PHASE ${this.phase} ⚔️`, screenX, barY - 8);

        ctx.restore();
    }

    /**
     * Render boss (camera transform already applied)
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        if (!this.active) return;

        ctx.save();

        const auraColors = ['#9c27b0', '#e91e63', '#f44336'];

        // Phase aura
        ctx.strokeStyle = auraColors[this.phase - 1];
        ctx.lineWidth = 5 + Math.sin(Date.now() / 200) * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + 15 + Math.sin(Date.now() / 300) * 5, 0, Math.PI * 2);
        ctx.stroke();

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(this.x + 5, this.y + this.size * 0.5, this.size * 0.9, this.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Use sprite if available
        if (this.sprite) {
            let flipX = false;
            if (this.target) {
                flipX = this.target.x < this.x;
            }

            this.sprite.render(ctx, this.x, this.y, this.spriteScale, {
                opacity: this.damageFlash > 0 ? 0.7 : 1.0,
                flipX: flipX,
                tint: this.damageFlash > 0 ? '#ffffff' : null,
                glow: true,
                glowColor: auraColors[this.phase - 1],
                glowIntensity: 0.5
            });
        } else {
            // Fallback basic rendering
            const gradient = ctx.createRadialGradient(
                this.x - this.size * 0.3, this.y - this.size * 0.3, 0,
                this.x, this.y, this.size
            );
            gradient.addColorStop(0, '#ce93d8');
            gradient.addColorStop(1, this.color);

            ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Health bar
        const barWidth = 200;
        const barHeight = 12;
        const barY = this.y - this.size - 60;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(this.x - barWidth / 2 - 3, barY - 3, barWidth + 6, barHeight + 6);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
        
        // Phase segments
        for (let i = 0; i < this.maxPhases - 1; i++) {
            const segX = this.x - barWidth / 2 + barWidth * this.phaseThresholds[i];
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(segX, barY);
            ctx.lineTo(segX, barY + barHeight);
            ctx.stroke();
        }
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = auraColors[this.phase - 1];
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // "BOSS" text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`⚔️ BOSS - PHASE ${this.phase} ⚔️`, this.x, barY - 8);

        ctx.restore();
    }
}

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Enemy, MiniBoss, Boss };
}

/**
 * Survivor Arena - Player Class
 * @fileoverview Player character with movement, weapons, and stats
 */

'use strict';

class Player extends LivingEntity {
    /**
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     */
    constructor(x, y) {
        super(x, y, CONFIG.PLAYER.SIZE, CONFIG.PLAYER.BASE_HEALTH);
        
        this.color = CONFIG.PLAYER.COLOR;
        this.speed = CONFIG.PLAYER.BASE_SPEED;
        this.baseSpeed = CONFIG.PLAYER.BASE_SPEED;
        
        // Movement input
        this.moveDirection = new Vector2(0, 0);
        this.facingDirection = new Vector2(0, -1); // Start facing up
        
        // Sprite system
        this.sprite = spriteManager.createSprite('player');
        if (this.sprite) {
            this.sprite.play('idle');
        }
        this.isMoving = false;
        this.spriteScale = this.size * 2.5; // Scale for rendering
        
        // Stats that can be upgraded
        this.stats = {
            maxHealth: CONFIG.PLAYER.BASE_HEALTH,
            speed: CONFIG.PLAYER.BASE_SPEED,
            armor: 0,               // Damage reduction (0-1)
            healthRegen: CONFIG.PLAYER.HEALTH_REGEN,
            pickupRadius: 100,      // XP pickup magnet range
            xpMultiplier: 1,
            damageMultiplier: 1,    // Damage bonus
            critChance: 0.05        // Critical hit chance
        };
        
        // Level & XP
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = CONFIG.LEVELING.BASE_XP_REQUIRED;
        this.pendingLevelUp = false; // Flag for game to check
        
        // Weapons (array of weapon instances)
        this.weapons = [];
        
        // Dodge ability
        this.isDodging = false;
        this.dodgeCooldown = 0;
        this.dodgeTimer = 0;
        this.dodgeDirection = new Vector2(0, 0);
        
        // Health regen timer
        this.regenTimer = 0;
        
        // Combo tracking
        this.combo = 0;
        this.comboTimer = 0;
        
        // Kill tracking for this session
        this.kills = 0;
    }

    /**
     * Set movement direction from input
     * @param {number} dx 
     * @param {number} dy 
     */
    setMoveDirection(dx, dy) {
        this.moveDirection.set(dx, dy);
        
        // Update facing direction if moving
        if (dx !== 0 || dy !== 0) {
            this.facingDirection.set(dx, dy).normalize();
        }
    }

    /**
     * Update player state
     * @param {number} deltaTime 
     * @param {Object} arena - Arena bounds
     */
    update(deltaTime, arena) {
        // Handle dodge
        if (this.isDodging) {
            this.updateDodge(deltaTime);
        } else {
            // Normal movement
            const moveSpeed = this.stats.speed * deltaTime;
            
            if (this.moveDirection.magnitudeSquared() > 0) {
                const normalizedDir = this.moveDirection.clone().normalize();
                this.velocity.set(
                    normalizedDir.x * this.stats.speed,
                    normalizedDir.y * this.stats.speed
                );
            } else {
                this.velocity.set(0, 0);
            }
        }

        // Apply movement
        super.update(deltaTime);

        // Position wrapping is handled in game.js for infinite world

        // Update dodge cooldown
        if (this.dodgeCooldown > 0) {
            this.dodgeCooldown -= deltaTime * 1000;
        }

        // Health regeneration
        if (this.stats.healthRegen > 0 && this.health < this.maxHealth) {
            this.regenTimer += deltaTime;
            if (this.regenTimer >= 1) {
                this.heal(this.stats.healthRegen);
                this.regenTimer = 0;
            }
        }

        // Combo timer decay
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime * 1000;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        // Update weapons
        for (const weapon of this.weapons) {
            weapon.update(deltaTime, this);
        }

        // Update sprite animation
        if (this.sprite) {
            const wasMoving = this.isMoving;
            this.isMoving = this.moveDirection.magnitudeSquared() > 0.1;
            
            if (this.isMoving && !wasMoving) {
                this.sprite.play('walk');
            } else if (!this.isMoving && wasMoving) {
                this.sprite.play('idle');
            }
            
            this.sprite.update(deltaTime);
        }
    }

    /**
     * Update dodge movement
     * @param {number} deltaTime 
     */
    updateDodge(deltaTime) {
        this.dodgeTimer -= deltaTime * 1000;
        
        if (this.dodgeTimer <= 0) {
            this.isDodging = false;
            this.invincible = false;
            return;
        }

        // Move in dodge direction
        const dodgeSpeed = this.stats.speed * CONFIG.PLAYER.DODGE_SPEED_MULT;
        this.velocity.set(
            this.dodgeDirection.x * dodgeSpeed,
            this.dodgeDirection.y * dodgeSpeed
        );
    }

    /**
     * Attempt to dodge
     * @returns {boolean} Whether dodge was successful
     */
    dodge() {
        if (this.dodgeCooldown > 0 || this.isDodging) {
            return false;
        }

        // Dodge in movement direction, or facing direction if not moving
        if (this.moveDirection.magnitudeSquared() > 0) {
            this.dodgeDirection = this.moveDirection.clone().normalize();
        } else {
            this.dodgeDirection = this.facingDirection.clone();
        }

        this.isDodging = true;
        this.dodgeTimer = CONFIG.PLAYER.DODGE_DURATION;
        this.dodgeCooldown = CONFIG.PLAYER.DODGE_COOLDOWN;
        this.invincible = true;

        return true;
    }

    /**
     * Take damage with armor reduction
     * @param {number} amount 
     * @param {Entity} source 
     * @returns {boolean}
     */
    takeDamage(amount, source = null) {
        if (this.isDodging) return false;

        // Apply armor reduction
        const reducedDamage = amount * (1 - this.stats.armor);
        return super.takeDamage(reducedDamage, source);
    }

    /**
     * Add XP and check for level up
     * @param {number} amount 
     * @returns {boolean} Whether leveled up
     */
    addXP(amount) {
        const adjustedXP = amount * this.stats.xpMultiplier;
        this.xp += adjustedXP;

        if (this.xp >= this.xpToNextLevel) {
            return this.levelUp();
        }
        return false;
    }

    /**
     * Level up the player
     * @returns {boolean}
     */
    levelUp() {
        if (this.level >= CONFIG.LEVELING.MAX_LEVEL) {
            return false;
        }

        this.xp -= this.xpToNextLevel;
        this.level++;
        this.xpToNextLevel = Math.floor(
            CONFIG.LEVELING.BASE_XP_REQUIRED * 
            Math.pow(CONFIG.LEVELING.XP_GROWTH_RATE, this.level - 1)
        );
        
        this.pendingLevelUp = true;

        // Keep excess XP
        if (this.xp >= this.xpToNextLevel) {
            // Multiple level ups possible - but only one upgrade selection at a time
            // excess XP will trigger another level up later
        }

        return true;
    }
    
    /**
     * Check if there's a pending level up
     * @returns {boolean}
     */
    checkLevelUp() {
        if (this.pendingLevelUp) {
            this.pendingLevelUp = false;
            return true;
        }
        return false;
    }

    /**
     * Add a new weapon
     * @param {string} weaponType 
     * @returns {Weapon|null}
     */
    addWeapon(weaponType) {
        if (this.weapons.length >= 4) {
            return null;
        }

        // Check if already has this weapon type
        const existing = this.weapons.find(w => w.type === weaponType);
        if (existing) {
            existing.upgrade();
            return existing;
        }

        const weapon = new Weapon(weaponType);
        this.weapons.push(weapon);
        return weapon;
    }

    /**
     * Apply stat upgrade
     * @param {string} statName 
     * @param {number} value 
     * @param {string} operation - 'add' or 'multiply'
     */
    applyStat(statName, value, operation = 'add') {
        if (!(statName in this.stats)) return;

        if (operation === 'add') {
            this.stats[statName] += value;
        } else if (operation === 'multiply') {
            this.stats[statName] *= value;
        }

        // Update max health if changed
        if (statName === 'maxHealth') {
            const healthPercent = this.health / this.maxHealth;
            this.maxHealth = this.stats.maxHealth;
            this.health = this.maxHealth * healthPercent;
        }
    }

    /**
     * Increment kill count and combo
     */
    registerKill() {
        this.kills++;
        this.combo++;
        this.comboTimer = 3000; // 3 second combo window
    }

    /**
     * Get combo multiplier
     * @returns {number}
     */
    getComboMultiplier() {
        const mult = 1 + (this.combo * CONFIG.SCORING.COMBO_MULTIPLIER);
        return Math.min(mult, CONFIG.SCORING.MAX_COMBO_MULT);
    }

    /**
     * Get XP progress percentage
     * @returns {number}
     */
    getXPProgress() {
        return this.xp / this.xpToNextLevel;
    }

    /**
     * Draw player
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Save context
        ctx.save();

        // Damage flash or invincibility effect
        if (this.damageFlash > 0) {
            ctx.globalAlpha = 0.7;
        } else if (this.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX + 3, screenY + this.size * 0.8, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw body (circle with gradient)
        const gradient = ctx.createRadialGradient(
            screenX - this.size * 0.3, screenY - this.size * 0.3, 0,
            screenX, screenY, this.size
        );
        gradient.addColorStop(0, '#66d9ff');
        gradient.addColorStop(1, this.color);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw eyes (facing direction)
        const eyeOffset = this.size * 0.35;
        const eyeSize = this.size * 0.2;
        const eyeAngle = Math.atan2(this.facingDirection.y, this.facingDirection.x);
        
        const leftEyeAngle = eyeAngle - 0.4;
        const rightEyeAngle = eyeAngle + 0.4;

        ctx.fillStyle = '#ffffff';
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

        // Draw pupils
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

        ctx.restore();

        // Draw dodge cooldown indicator
        if (this.dodgeCooldown > 0) {
            const cooldownProgress = 1 - (this.dodgeCooldown / CONFIG.PLAYER.DODGE_COOLDOWN);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.size + 5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownProgress));
            ctx.stroke();
        }
    }

    /**
     * Render player (camera transform already applied)
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        if (!this.active) return;

        ctx.save();

        // Damage flash or invincibility effect
        let opacity = 1.0;
        if (this.damageFlash > 0) {
            opacity = 0.7;
        } else if (this.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
            opacity = 0.5;
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + 3, this.y + this.size * 0.8, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Use sprite system if available
        if (this.sprite) {
            ctx.save();
            
            // Flip sprite based on facing direction
            const facingAngle = Math.atan2(this.facingDirection.y, this.facingDirection.x);
            const flipX = this.facingDirection.x < -0.1;
            
            this.sprite.render(ctx, this.x, this.y, this.spriteScale, {
                opacity: opacity,
                flipX: flipX,
                tint: this.damageFlash > 0 ? '#ff6666' : null
            });
            
            ctx.restore();
        } else {
            // Fallback to basic rendering
            ctx.globalAlpha = opacity;
            
            const gradient = ctx.createRadialGradient(
                this.x - this.size * 0.3, this.y - this.size * 0.3, 0,
                this.x, this.y, this.size
            );
            gradient.addColorStop(0, '#66d9ff');
            gradient.addColorStop(1, this.color);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();

        // Dodge cooldown indicator
        if (this.dodgeCooldown > 0) {
            const cooldownProgress = 1 - (this.dodgeCooldown / CONFIG.PLAYER.DODGE_COOLDOWN);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownProgress));
            ctx.stroke();
        }
    }

    /**
     * Reset player for new game
     * @param {number} x 
     * @param {number} y 
     */
    reset(x, y) {
        super.reset(x, y);
        
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = CONFIG.LEVELING.BASE_XP_REQUIRED;
        this.kills = 0;
        this.combo = 0;
        this.comboTimer = 0;
        
        // Reset stats
        this.stats = {
            maxHealth: CONFIG.PLAYER.BASE_HEALTH,
            speed: CONFIG.PLAYER.BASE_SPEED,
            armor: 0,
            healthRegen: CONFIG.PLAYER.HEALTH_REGEN,
            pickupRange: 100,
            xpMultiplier: 1
        };
        
        this.maxHealth = this.stats.maxHealth;
        this.health = this.maxHealth;
        
        // Clear weapons
        this.weapons = [];
        
        // Reset dodge
        this.isDodging = false;
        this.dodgeCooldown = 0;
        this.dodgeTimer = 0;
        
        this.moveDirection.set(0, 0);
        this.facingDirection.set(0, -1);
    }
}

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
}

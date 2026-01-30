/**
 * Survivor Arena - Base Entity Class
 * @fileoverview Base class for all game entities (player, enemies, projectiles)
 */

'use strict';

/**
 * Base entity class
 */
class Entity {
    /**
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {number} size - Entity radius
     */
    constructor(x, y, size) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.size = size;
        this.active = true;
        this.color = '#ffffff';
    }

    /**
     * Get X position
     * @returns {number}
     */
    get x() {
        return this.position.x;
    }

    /**
     * Set X position
     * @param {number} value
     */
    set x(value) {
        this.position.x = value;
    }

    /**
     * Get Y position
     * @returns {number}
     */
    get y() {
        return this.position.y;
    }

    /**
     * Set Y position
     * @param {number} value
     */
    set y(value) {
        this.position.y = value;
    }

    /**
     * Get radius (alias for size)
     * @returns {number}
     */
    get radius() {
        return this.size;
    }

    /**
     * Update entity state
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Move based on velocity
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
    }

    /**
     * Draw entity
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera - Camera offset
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Check collision with another entity
     * @param {Entity} other 
     * @returns {boolean}
     */
    collidesWith(other) {
        if (!this.active || !other.active) return false;
        
        return MathUtils.circleCollision(
            this.x, this.y, this.size,
            other.x, other.y, other.size
        );
    }

    /**
     * Get distance to another entity
     * @param {Entity} other 
     * @returns {number}
     */
    distanceTo(other) {
        return this.position.distanceTo(other.position);
    }

    /**
     * Get direction to another entity
     * @param {Entity} other 
     * @returns {Vector2}
     */
    directionTo(other) {
        return this.position.directionTo(other.position);
    }

    /**
     * Destroy entity
     */
    destroy() {
        this.active = false;
    }

    /**
     * Reset entity for object pooling
     * @param {number} x 
     * @param {number} y 
     */
    reset(x, y) {
        this.position.set(x, y);
        this.velocity.set(0, 0);
        this.active = true;
    }
}

/**
 * Living entity with health
 */
class LivingEntity extends Entity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} size 
     * @param {number} maxHealth 
     */
    constructor(x, y, size, maxHealth) {
        super(x, y, size);
        this.maxHealth = maxHealth;
        this.health = maxHealth;
        this.invincible = false;
        this.invincibilityTimer = 0;
        this.damageFlash = 0;
    }

    /**
     * Take damage
     * @param {number} amount 
     * @param {Entity} source - Source of damage
     * @returns {boolean} Whether damage was applied
     */
    takeDamage(amount, source = null) {
        if (this.invincible || !this.active) return false;

        this.health -= amount;
        this.damageFlash = 150; // ms

        if (this.health <= 0) {
            this.health = 0;
            this.die(source);
            return true;
        }

        return true;
    }

    /**
     * Heal
     * @param {number} amount 
     */
    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }

    /**
     * Called when entity dies
     * @param {Entity} killer 
     */
    die(killer = null) {
        this.active = false;
    }

    /**
     * Check if entity is dead
     * @returns {boolean}
     */
    isDead() {
        return this.health <= 0 || !this.active;
    }

    /**
     * Update living entity
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        super.update(deltaTime);

        // Update invincibility
        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer -= deltaTime * 1000;
            if (this.invincibilityTimer <= 0) {
                this.invincible = false;
            }
        }

        // Update damage flash
        if (this.damageFlash > 0) {
            this.damageFlash -= deltaTime * 1000;
        }
    }

    /**
     * Draw with damage flash
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera 
     */
    draw(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Damage flash effect
        if (this.damageFlash > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = this.color;
        }

        // Invincibility blink
        if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    /**
     * Set invincibility
     * @param {number} duration - Duration in ms
     */
    setInvincible(duration) {
        this.invincible = true;
        this.invincibilityTimer = duration;
    }

    /**
     * Get health percentage
     * @returns {number}
     */
    getHealthPercent() {
        return this.health / this.maxHealth;
    }

    /**
     * Reset living entity
     * @param {number} x 
     * @param {number} y 
     */
    reset(x, y) {
        super.reset(x, y);
        this.health = this.maxHealth;
        this.invincible = false;
        this.invincibilityTimer = 0;
        this.damageFlash = 0;
    }
}

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Entity, LivingEntity };
}

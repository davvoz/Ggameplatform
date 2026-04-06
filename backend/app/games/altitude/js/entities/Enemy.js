/**
 * Enemy - Various enemy types with unique behaviors
 * Strategy Pattern: Different enemy behaviors encapsulated.
 */

import { GameObject } from './GameObject.js';
import { ENEMY_TYPES, COLORS, DESIGN_WIDTH } from '../config/Constants.js';
import { SpriteGenerator } from '../graphics/SpriteGenerator.js';
import { updateAndCompact } from '../core/ArrayUtils.js';

export class Enemy extends GameObject {
    #type;
    #typeData;
    #animFrame = 0;
    #animTimer = 0;
    #behaviorTimer = 0;
    #direction = 1;
    #state = 'idle'; // idle, attacking, phased
    #phaseTimer = 0;
    #startY;
    #swoopTarget = null;
    #shootCooldown = 0;
    #bullets = [];

    constructor(x, y, type = 'floater') {
        const typeData = ENEMY_TYPES[type.toUpperCase()] || ENEMY_TYPES.FLOATER;
        super(x, y, typeData.width, typeData.height);
        
        this.#type = type;
        this.#typeData = typeData;
        this.#startY = y;
        this.#direction = Math.random() > 0.5 ? 1 : -1;
        this.tag = 'enemy';

        if (type === 'shooter') {
            this.#shootCooldown = typeData.shootInterval || 2;
        }
    }

    get type() { return this.#type; }
    get canBeStomped() { 
        // Ghost can only be stomped when not phased
        if (this.#type === 'ghost' && this.#state === 'phased') {
            return false;
        }
        return this.#typeData.canBeStomped; 
    }
    get damage() { return this.#typeData.damage; }
    get scoreValue() { return this.#typeData.scoreValue; }
    get bullets() { return this.#bullets; }

    update(dt, player) {
        this.#animTimer += dt;
        this.#behaviorTimer += dt;

        // Update animation frame
        if (this.#animTimer >= 0.15) {
            this.#animTimer = 0;
            this.#animFrame = (this.#animFrame + 1) % 4;
        }

        // Type-specific behavior
        switch (this.#type) {
            case 'floater':
                this.#updateFloater(dt);
                break;
            case 'chaser':
                this.#updateChaser(dt, player);
                break;
            case 'shooter':
                this.#updateShooter(dt, player);
                break;
            case 'bat':
                this.#updateBat(dt, player);
                break;
            case 'ghost':
                this.#updateGhost(dt, player);
                break;
        }

        // Update bullets
        updateAndCompact(this.#bullets, b => {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            return b.active && b.life > 0;
        });

        // Screen wrapping
        if (this.x < -this.width) this.x += DESIGN_WIDTH + this.width * 2;
        if (this.x > DESIGN_WIDTH + this.width) this.x -= DESIGN_WIDTH + this.width * 2;
    }

    #updateFloater(dt) {
        // Simple horizontal patrol with bobbing
        this.x += this.#typeData.speed * this.#direction * dt;
        this.y = this.#startY + Math.sin(this.#behaviorTimer * 2) * 15;

        // Reverse at screen edges
        if (this.x < 30 || this.x > DESIGN_WIDTH - 30) {
            this.#direction *= -1;
        }
    }

    #updateChaser(dt, player) {
        if (!player) return;

        // Chase player horizontally
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Only chase if within range
        if (dist < 200) {
            const speed = this.#typeData.speed * dt;
            this.x += (dx / dist) * speed;
            this.y += (dy / dist) * speed * 0.5; // Slower vertical chase
            this.#direction = dx > 0 ? 1 : -1;
        } else {
            // Patrol behavior
            this.#updateFloater(dt);
        }
    }

    #updateShooter(dt, player) {
        // Patrol slowly
        this.x += this.#typeData.speed * this.#direction * dt;
        
        if (this.x < 50 || this.x > DESIGN_WIDTH - 50) {
            this.#direction *= -1;
        }

        // Shoot at player
        this.#shootCooldown -= dt;
        if (this.#shootCooldown <= 0 && player) {
            this.#shoot(player);
            this.#shootCooldown = this.#typeData.shootInterval;
        }
    }

    #shoot(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 300) return; // Don't shoot if too far

        const speed = this.#typeData.bulletSpeed || 200;
        this.#bullets.push({
            x: this.x,
            y: this.y + this.height / 2,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            active: true,
            life: 4,   // seconds before auto-despawn
            width: 8,
            height: 8,
        });
    }

    #updateBat(dt, player) {
        // Swoop behavior
        if (this.#swoopTarget) {
            // Moving toward target
            const dx = this.#swoopTarget.x - this.x;
            const dy = this.#swoopTarget.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                // Reached target, return to start
                this.#swoopTarget = null;
            } else {
                const speed = this.#typeData.speed * dt;
                this.x += (dx / dist) * speed;
                this.y += (dy / dist) * speed;
            }
        } else {
            // Return to patrol height
            const dy = this.#startY - this.y;
            this.y += dy * 2 * dt;

            // Patrol
            this.x += this.#typeData.speed * 0.3 * this.#direction * dt;
            
            if (this.x < 30 || this.x > DESIGN_WIDTH - 30) {
                this.#direction *= -1;
            }

            // Check for swoop opportunity
            if (player && Math.random() < 0.01) {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                if (Math.abs(dx) < 100 && dy > 0 && dy < 150) {
                    this.#swoopTarget = { x: player.x, y: player.y };
                }
            }
        }
    }

    #updateGhost(dt, player) {
        // Phase in and out
        this.#phaseTimer += dt;
        const cycleTime = 4; // 2 seconds visible, 2 seconds phased
        const cycle = this.#phaseTimer % cycleTime;
        
        if (cycle < 2) {
            this.#state = 'idle';
        } else {
            this.#state = 'phased';
        }

        // Move toward player slowly
        if (player && this.#state === 'idle') {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 250 && dist > 0) {
                const speed = this.#typeData.speed * dt;
                this.x += (dx / dist) * speed;
                this.y += (dy / dist) * speed;
            }
        }

        // Bob animation
        this.y += Math.sin(this.#behaviorTimer * 3) * 20 * dt;
    }

    draw(ctx, cameraY) {
        if (!this.active) return;

        const screenX = this.x;
        const screenY = this.y - cameraY;

        ctx.save();

        // Ghost transparency when phased
        if (this.#type === 'ghost' && this.#state === 'phased') {
            ctx.globalAlpha = 0.3;
        }

        // Flip based on direction
        ctx.translate(screenX, screenY);
        if (this.#direction < 0) {
            ctx.scale(-1, 1);
        }

        // Get sprite
        const sprite = SpriteGenerator.get('enemies');
        if (sprite) {
            const typeIndex = sprite.types.indexOf(this.#type.toUpperCase());
            const rowIndex = typeIndex >= 0 ? typeIndex : 0;
            const frameX = this.#animFrame * sprite.frameSize;
            const frameY = rowIndex * sprite.frameSize;

            ctx.drawImage(
                sprite.canvas,
                frameX, frameY,
                sprite.frameSize, sprite.frameSize,
                -sprite.frameSize / 2, -sprite.frameSize / 2,
                sprite.frameSize, sprite.frameSize
            );
        } else {
            // Fallback drawing
            ctx.fillStyle = COLORS.ENEMY_PRIMARY;
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-5, -3, 4, 0, Math.PI * 2);
            ctx.arc(5, -3, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Draw bullets
        this.#drawBullets(ctx, cameraY);
    }

    #drawBullets(ctx, cameraY) {
        for (const bullet of this.#bullets) {
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y - cameraY, 4, 0, Math.PI * 2);
            ctx.fill();

            // Glow
            ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y - cameraY, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Called when stomped by player
     */
    onStomp(particles, sound) {
        if (!this.canBeStomped) return false;

        this.active = false;
        particles?.enemyDeath(this.x, this.y, COLORS.ENEMY_PRIMARY);
        sound?.playEnemyHit();
        return true;
    }

    /**
     * Destroy enemy's bullets
     */
    clearBullets() {
        this.#bullets = [];
    }
}

/**
 * EnemyFactory - Factory for creating enemies
 */
export class EnemyFactory {
    /**
     * Create a specific enemy type
     */
    static createType(x, y, type, altitude = 0) {
        return new Enemy(x, y, type);
    }

    /**
     * Create a random enemy based on altitude
     */
    static create(x, y, altitude) {
        const type = EnemyFactory.#getRandomType(altitude);
        return new Enemy(x, y, type);
    }

    static #getRandomType(altitude) {
        const types = Object.keys(ENEMY_TYPES);
        
        // Weight types based on altitude
        let weights;
        if (altitude < 1000) {
            weights = { floater: 0.7, chaser: 0.2, bat: 0.1, shooter: 0, ghost: 0 };
        } else if (altitude < 3000) {
            weights = { floater: 0.3, chaser: 0.3, bat: 0.2, shooter: 0.15, ghost: 0.05 };
        } else {
            weights = { floater: 0.2, chaser: 0.25, bat: 0.2, shooter: 0.2, ghost: 0.15 };
        }

        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;

        for (const [type, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) {
                return type;
            }
        }

        return 'floater';
    }
}

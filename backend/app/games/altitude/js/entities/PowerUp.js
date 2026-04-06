/**
 * PowerUp - Temporary power-up pickups
 * Single Responsibility: Represent power-up items.
 */

import { GameObject } from './GameObject.js';
import { POWERUP_TYPES, COLORS } from '../config/Constants.js';
import { SpriteGenerator } from '../graphics/SpriteGenerator.js';

export class PowerUp extends GameObject {
    #type;
    #typeData;
    #animFrame = 0;
    #animTimer = 0;
    #bobPhase = 0;
    #collected = false;
    #collectTimer = 0;
    #startY;
    #glowPhase = 0;

    constructor(x, y, type = 'jetpack') {
        const typeKey = type.toUpperCase();
        const typeData = POWERUP_TYPES[typeKey] || POWERUP_TYPES.JETPACK;
        super(x, y, 36, 36);
        
        this.#type = type.toLowerCase();
        this.#typeData = typeData;
        this.#startY = y;
        this.#bobPhase = Math.random() * Math.PI * 2;
        this.tag = 'powerup';
    }

    get type() { return this.#type; }
    get duration() { return this.#typeData.duration; }
    get name() { return this.#typeData.name; }
    get icon() { return this.#typeData.icon; }
    get color() { return this.#typeData.color; }
    get isCollected() { return this.#collected; }

    update(dt) {
        // Animation
        this.#animTimer += dt;
        if (this.#animTimer >= 0.15) {
            this.#animTimer = 0;
            this.#animFrame = (this.#animFrame + 1) % 4;
        }

        // Bob and glow
        this.#bobPhase += dt * 2;
        this.#glowPhase += dt * 4;
        this.y = this.#startY + Math.sin(this.#bobPhase) * 8;

        // Collection animation
        if (this.#collected) {
            this.#collectTimer += dt;
            if (this.#collectTimer > 0.4) {
                this.active = false;
            }
        }
    }

    draw(ctx, cameraY) {
        if (!this.active) return;

        const screenX = this.x;
        const screenY = this.y - cameraY;

        ctx.save();

        // Collection animation
        if (this.#collected) {
            const progress = this.#collectTimer / 0.4;
            const scale = 1 + progress;
            ctx.globalAlpha = 1 - progress;
            ctx.translate(screenX, screenY);
            ctx.scale(scale, scale);
            ctx.translate(-screenX, -screenY);
        }

        // Outer glow
        const glowIntensity = 0.3 + Math.sin(this.#glowPhase) * 0.2;
        ctx.fillStyle = this.#typeData.color;
        ctx.globalAlpha = glowIntensity;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Get sprite
        const sprite = SpriteGenerator.get('powerups');
        if (sprite) {
            const typeIndex = sprite.types.indexOf(this.#type.toUpperCase());
            const rowIndex = typeIndex >= 0 ? typeIndex : 0;
            const frameX = this.#animFrame * sprite.frameSize;
            const frameY = rowIndex * sprite.frameSize;

            ctx.drawImage(
                sprite.canvas,
                frameX, frameY,
                sprite.frameSize, sprite.frameSize,
                screenX - sprite.frameSize / 2,
                screenY - sprite.frameSize / 2,
                sprite.frameSize, sprite.frameSize
            );
        } else {
            // Fallback drawing
            this.#drawFallback(ctx, screenX, screenY);
        }

        ctx.restore();
    }

    #drawFallback(ctx, x, y) {
        // Box background
        ctx.fillStyle = this.#typeData.color;
        ctx.beginPath();
        ctx.roundRect(x - 16, y - 16, 32, 32, 8);
        ctx.fill();

        // Inner
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(x - 12, y - 12, 24, 24, 6);
        ctx.fill();

        // Icon
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.#typeData.icon, x, y + 1);
    }

    /**
     * Called when collected by player
     */
    collect(player, particles, sound) {
        if (this.#collected) return false;

        this.#collected = true;
        this.#collectTimer = 0;

        // Activate on player
        player?.activatePowerUp(this.#type, this.#typeData.duration);

        // Particle burst (skipped for extra_life — PlayingState handles it)
        if (this.#type !== 'extra_life') {
            particles?.burst(this.x, this.y, {
                color: this.#typeData.color,
                size: 8,
                sizeEnd: 0,
                life: 0.5,
                speed: 100,
                spread: 360,
                shape: 'star',
            }, 12);
        }

        sound?.playPowerUp();

        return true;
    }
}

/**
 * PowerUpFactory - Factory for creating power-ups
 */
export class PowerUpFactory {
    static #lastType = null;

    /**
     * Create a random power-up
     */
    static create(x, y) {
        const type = PowerUpFactory.#getRandomType();
        return new PowerUp(x, y, type);
    }

    static #getRandomType() {
        const types = Object.keys(POWERUP_TYPES);
        
        // Avoid repeating the same power-up
        let type;
        do {
            type = types[Math.floor(Math.random() * types.length)].toLowerCase();
        } while (type === PowerUpFactory.#lastType && types.length > 1);

        PowerUpFactory.#lastType = type;
        return type;
    }

    /**
     * Create a specific power-up type
     */
    static createType(x, y, type) {
        return new PowerUp(x, y, type);
    }
}

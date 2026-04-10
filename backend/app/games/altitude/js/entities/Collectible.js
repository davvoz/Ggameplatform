/**
 * Collectible - Coins, gems, and other pickups
 * Single Responsibility: Represent collectable items.
 */

import { GameObject } from './GameObject.js';
import { COLLECTIBLES, COLORS } from '../config/Constants.js';
import { SpriteGenerator } from '../graphics/SpriteGenerator.js';

export class Collectible extends GameObject {
    #type;
    #typeData;
    #animFrame = 0;
    #animTimer = 0;
    #bobPhase = 0;
    #collected = false;
    #collectTimer = 0;
    #startY;

    constructor(x, y, type = 'coin') {
        const typeKey = type.toUpperCase();
        const typeData = COLLECTIBLES[typeKey] || COLLECTIBLES.COIN;
        super(x, y, typeData.size, typeData.size);
        
        this.#type = type;
        this.#typeData = typeData;
        this.#startY = y;
        this.#bobPhase = Math.random() * Math.PI * 2;
        this.tag = 'collectible';
    }

    get type() { return this.#type; }
    get value() { return this.#typeData.value; }
    get scoreValue() { return this.#typeData.scoreValue; }
    get isCollected() { return this.#collected; }

    update(dt) {
        // Animation
        this.#animTimer += dt;
        if (this.#animTimer >= 0.1) {
            this.#animTimer = 0;
            this.#animFrame = (this.#animFrame + 1) % 6;
        }

        // Bob up and down
        this.#bobPhase += dt * 3;
        this.y = this.#startY + Math.sin(this.#bobPhase) * 5;

        // Collection animation
        if (this.#collected) {
            this.#collectTimer += dt;
            if (this.#collectTimer > 0.3) {
                this.active = false;
            }
        }
    }

    draw(ctx, cameraY) {
        if (!this.active) return;

        const screenX = this.x;
        const screenY = this.y - cameraY;

        ctx.save();

        // Collection animation - scale up and fade
        if (this.#collected) {
            const progress = this.#collectTimer / 0.3;
            const scale = 1 + progress * 0.5;
            ctx.globalAlpha = 1 - progress;
            ctx.translate(screenX, screenY);
            ctx.scale(scale, scale);
            ctx.translate(-screenX, -screenY);
        }

        // Get sprite
        const sprite = SpriteGenerator.get('collectibles');
        if (sprite) {
            const typeIndex = sprite.types.indexOf(this.#type);
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
        const colors = {
            coin: COLORS.COIN_GOLD,
            gem: COLORS.GEM_CYAN,
            diamond: COLORS.GEM_PURPLE,
            star: COLORS.NEON_YELLOW,
        };

        const color = colors[this.#type] || colors.coin;
        const size = this.width / 2;

        // Glow
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(x, y, size + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main shape
        ctx.fillStyle = color;
        if (this.#type === 'star') {
            this.#drawStar(ctx, x, y, size);
        } else if (this.#type === 'diamond' || this.#type === 'gem') {
            this.#drawGem(ctx, x, y, size);
        } else {
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    #drawStar(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? size : size / 2;
            const angle = (i * Math.PI / 5) - Math.PI / 2;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    #drawGem(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y - size / 3);
        ctx.lineTo(x + size * 0.6, y + size);
        ctx.lineTo(x - size * 0.6, y + size);
        ctx.lineTo(x - size, y - size / 3);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Called when collected by player
     */
    collect(particles, sound) {
        if (this.#collected) return false;

        this.#collected = true;
        this.#collectTimer = 0;

        // Particle effect
        const colors = {
            coin: COLORS.COIN_GOLD,
            gem: COLORS.GEM_CYAN,
            diamond: COLORS.GEM_PURPLE,
            star: COLORS.NEON_YELLOW,
        };
        particles?.coinCollect(this.x, this.y, colors[this.#type] || colors.coin);

        // Sound
        if (this.#type === 'coin') {
            sound?.playCoin();
        } else {
            sound?.playGem();
        }

        return true;
    }

    /**
     * Move toward player (magnet effect)
     */
    attractTo(targetX, targetY, strength, dt) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
            const speed = strength * dt;
            this.x += (dx / dist) * speed;
            this.#startY += (dy / dist) * speed;
        }
    }
}

/**
 * CollectibleFactory - Factory for creating collectibles
 */
export class CollectibleFactory {
    /**
     * Create a specific collectible type
     */
    static createType(x, y, type, altitude = 0) {
        return new Collectible(x, y, type);
    }

    /**
     * Create a random collectible based on altitude and luck
     */
    static create(x, y, altitude, luckyBonus = 0) {
        const type = CollectibleFactory.#getRandomType(altitude, luckyBonus);
        return new Collectible(x, y, type);
    }

    static #getRandomType(altitude, luckyBonus) {
        // Base weights
        let weights = {
            coin: 0.75,
            gem: 0.15,
            diamond: 0.07,
            star: 0.03,
        };

        // Adjust for altitude (rarer items more common higher up)
        if (altitude > 2000) {
            weights.coin = 0.6;
            weights.gem = 0.25;
            weights.diamond = 0.1;
            weights.star = 0.05;
        }
        if (altitude > 5000) {
            weights.coin = 0.5;
            weights.gem = 0.3;
            weights.diamond = 0.12;
            weights.star = 0.08;
        }

        // Apply lucky bonus
        if (luckyBonus > 0) {
            weights.gem += luckyBonus * 0.1;
            weights.diamond += luckyBonus * 0.05;
            weights.star += luckyBonus * 0.03;
            weights.coin -= luckyBonus * 0.18;
        }

        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;

        for (const [type, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) {
                return type;
            }
        }

        return 'coin';
    }
}

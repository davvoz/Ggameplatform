/**
 * Platform - Various platform types with different behaviors
 * Strategy Pattern: Different platform types have different behaviors.
 */

import { GameObject } from './GameObject.js';
import { PLATFORM, PHYSICS, COLORS, DESIGN_WIDTH } from '../config/Constants.js';
import { SpriteGenerator } from '../graphics/SpriteGenerator.js';

export class Platform extends GameObject {
    #type;
    #broken = false;
    #breakTimer = 0;
    #moveDirection = 1;
    #moveRange = 60;
    #startX;
    #opacity = 1;
    #visibleTimer = 0; // For cloud platforms
    #animPhase = 0;

    constructor(x, y, type = 'normal') {
        super(x, y, PLATFORM.WIDTH, PLATFORM.HEIGHT);
        this.#type = type;
        this.#startX = x;
        this.tag = 'platform';

        // Set random initial values for moving platforms
        if (type === 'moving') {
            this.#moveDirection = Math.random() > 0.5 ? 1 : -1;
            this.#moveRange = 40 + Math.random() * 40;
        }

        // Cloud platforms are initially visible but intermittent
        if (type === 'cloud') {
            this.#visibleTimer = Math.random() * 3;
        }
    }

    get type() { return this.#type; }
    get isBroken() { return this.#broken; }
    get isSolid() { return this.#opacity > 0.3; }
    get isDeadly() { return this.#type === 'deadly'; }

    /**
     * Get bounce multiplier for this platform type
     */
    getBounceMultiplier() {
        switch (this.#type) {
            case 'bouncy': return PHYSICS.BOUNCE_SUPER;
            default: return PHYSICS.BOUNCE_NORMAL;
        }
    }

    /**
     * Called when player lands on this platform
     * Returns true if platform should break
     */
    onLand(player, particles, sound) {
        switch (this.#type) {
            case 'fragile':
                if (!this.#broken) {
                    this.#broken = true;
                    this.#breakTimer = 0.3; // Time before disappearing
                    particles?.platformBreak(this.x, this.y, this.width, COLORS.PLATFORM_FRAGILE);
                    sound?.playPlatformBreak();
                }
                return false; // Still land on it once

            case 'bouncy':
                sound?.playBounce();
                // Emit bounce particles
                particles?.burst(this.x, this.y - 5, {
                    color: COLORS.PLATFORM_BOUNCY,
                    size: 4,
                    life: 0.3,
                    speed: 60,
                    angle: -90,
                    spread: 90,
                }, 5);
                return false;

            case 'deadly':
                // Player dies, don't land
                return true;

            case 'cloud':
                // Only solid when visible
                if (this.#opacity < 0.5) {
                    return true; // Pass through
                }
                return false;

            default:
                sound?.playLand();
                particles?.jumpDust(this.x, this.y);
                return false;
        }
    }

    update(dt) {
        this.#animPhase += dt;

        // Moving platform behavior
        if (this.#type === 'moving' && !this.#broken) {
            // Sinusoidal movement
            const progress = Math.sin(this.#animPhase * 2);
            this.x = this.#startX + progress * this.#moveRange;

            // Screen wrapping
            if (this.x < 0) this.x += DESIGN_WIDTH;
            if (this.x > DESIGN_WIDTH) this.x -= DESIGN_WIDTH;
        }

        // Cloud platform visibility cycling
        if (this.#type === 'cloud') {
            this.#visibleTimer += dt;
            // 3 seconds visible, 2 seconds fading out, 1 second invisible
            const cycle = this.#visibleTimer % 6;
            if (cycle < 3) {
                this.#opacity = 1;
            } else if (cycle < 5) {
                this.#opacity = 1 - (cycle - 3) / 2;
            } else {
                this.#opacity = 0;
            }
        }

        // Fragile platform break timer
        if (this.#broken && this.#breakTimer > 0) {
            this.#breakTimer -= dt;
            if (this.#breakTimer <= 0) {
                this.active = false;
            }
        }
    }

    draw(ctx, cameraY) {
        if (!this.active) return;

        const screenX = this.x;
        const screenY = this.y - cameraY;

        ctx.save();
        ctx.globalAlpha = this.#opacity;

        // Get sprite data
        const sprite = SpriteGenerator.get('platforms');
        if (sprite) {
            const typeIndex = sprite.types.indexOf(this.#type);
            if (typeIndex >= 0) {
                const srcX = typeIndex * sprite.width;
                const srcY = this.#broken ? sprite.height : 0;
                
                ctx.drawImage(
                    sprite.canvas,
                    srcX, srcY,
                    sprite.width, sprite.height,
                    screenX - sprite.width / 2,
                    screenY - sprite.height / 2,
                    sprite.width, sprite.height
                );
            }
        } else {
            // Fallback drawing
            this.#drawFallback(ctx, screenX, screenY);
        }

        // Moving platform indicator
        if (this.#type === 'moving') {
            this.#drawMoveIndicator(ctx, screenX, screenY);
        }

        // Deadly spikes drawn on top of sprite in screen space
        if (this.#type === 'deadly') {
            this.#drawDeadlySpikes(ctx, screenX, screenY);
        }

        ctx.restore();
    }

    #drawDeadlySpikes(ctx, x, y) {
        const platformTop = y - this.height / 2;
        const spikeH      = 18;
        const spikeW      = 10;
        const count       = 7;
        const totalSpan   = count * spikeW + (count - 1) * 2;
        const startX      = x - totalSpan / 2;

        ctx.save();
        // Red glow
        ctx.shadowColor = COLORS.PLATFORM_DEADLY;
        ctx.shadowBlur  = 10;

        for (let i = 0; i < count; i++) {
            const sx = startX + i * (spikeW + 2);
            const tipX = sx + spikeW / 2;

            // White fill
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(sx,          platformTop);
            ctx.lineTo(sx + spikeW, platformTop);
            ctx.lineTo(tipX,        platformTop - spikeH);
            ctx.closePath();
            ctx.fill();

            // Red outline
            ctx.strokeStyle = COLORS.PLATFORM_DEADLY;
            ctx.lineWidth   = 1;
            ctx.stroke();

            // Inner highlight — left face
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth   = 0.8;
            ctx.beginPath();
            ctx.moveTo(sx + 2,  platformTop - 2);
            ctx.lineTo(tipX,    platformTop - spikeH);
            ctx.stroke();
        }

        ctx.restore();
    }

    #drawFallback(ctx, x, y) {
        const colors = {
            normal: COLORS.PLATFORM_NORMAL,
            fragile: COLORS.PLATFORM_FRAGILE,
            moving: COLORS.PLATFORM_MOVING,
            bouncy: COLORS.PLATFORM_BOUNCY,
            cloud: COLORS.PLATFORM_CLOUD,
            deadly: COLORS.PLATFORM_DEADLY,
        };

        ctx.fillStyle = colors[this.#type] || colors.normal;
        ctx.fillRect(
            x - this.width / 2,
            y - this.height / 2,
            this.width,
            this.height
        );

        // Cracks for broken
        if (this.#broken) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 10, y - 5);
            ctx.lineTo(x, y);
            ctx.lineTo(x + 8, y + 5);
            ctx.stroke();
        }

        // Spikes for deadly are drawn via #drawDeadlySpikes in the main draw() path
    }

    #drawMoveIndicator(ctx, x, y) {
        // Small arrows showing movement direction
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        
        const arrowY = y + this.height / 2 + 5;
        const arrowSize = 4;
        
        // Left arrow
        ctx.beginPath();
        ctx.moveTo(x - 20, arrowY);
        ctx.lineTo(x - 20 + arrowSize, arrowY - arrowSize);
        ctx.lineTo(x - 20 + arrowSize, arrowY + arrowSize);
        ctx.closePath();
        ctx.fill();

        // Right arrow
        ctx.beginPath();
        ctx.moveTo(x + 20, arrowY);
        ctx.lineTo(x + 20 - arrowSize, arrowY - arrowSize);
        ctx.lineTo(x + 20 - arrowSize, arrowY + arrowSize);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Check if player can land on this platform
     */
    canLand(player) {
        // Cloud platforms: only when visible
        if (this.#type === 'cloud' && this.#opacity < 0.5) {
            return false;
        }

        // Fragile platforms: not if already broken and timer expired
        if (this.#broken && this.#breakTimer <= 0) {
            return false;
        }

        // Player must be falling and above the platform
        return player.vy > 0 && player.bottom <= this.top + 15;
    }
}

/**
 * PlatformFactory - Factory for creating platforms
 */
export class PlatformFactory {
    /**
     * Create a platform with weighted random type based on altitude
     */
    static create(x, y, altitude) {
        const type = PlatformFactory.#getRandomType(altitude);
        return new Platform(x, y, type);
    }

    static #getRandomType(altitude) {
        let weights;
        
        if (altitude < 500) {
            weights = PLATFORM.SPAWN_WEIGHTS.LOW;
        } else if (altitude < 3000) {
            weights = PLATFORM.SPAWN_WEIGHTS.MID;
        } else {
            weights = PLATFORM.SPAWN_WEIGHTS.HIGH;
        }

        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;

        for (const [type, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) {
                return type;
            }
        }

        return 'normal';
    }

    /**
     * Create a specific platform type
     */
    static createType(x, y, type) {
        return new Platform(x, y, type);
    }
}

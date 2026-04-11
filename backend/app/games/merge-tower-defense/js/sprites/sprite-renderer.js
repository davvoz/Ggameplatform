/**
 * Professional Sprite Rendering System
 * Vector-based sprite engine for high-quality entity rendering
 * NO EMOJI, NO TEXT SYMBOLS - Pure canvas vector art
 */

// ============================================================================
// SPRITE RENDERER - Core rendering engine
// ============================================================================

export class SpriteRenderer {
    constructor() {
        this.spriteCache = new Map();
        this.animationFrameCache = new Map();
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
    }

    /**
     * Render a sprite definition to canvas context
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {Object} spriteDefinition - Sprite data
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Render size
     * @param {Object} options - Render options
     */
    renderSprite(ctx, spriteDefinition, x, y, size, options = {}) {
        const {
            scale = 1.0,
            rotation = 0,
            opacity = 1.0,
            tint = null,
            flipX = false,
            flipY = false,
            glow = false,
            glowColor = null,
            glowIntensity = 0.5
        } = options;

        const finalSize = size * scale;
        
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        if (flipX) ctx.scale(-1, 1);
        if (flipY) ctx.scale(1, -1);

        // Apply glow effect
        if (glow && glowColor) {
            ctx.shadowBlur = finalSize * glowIntensity;
            ctx.shadowColor = glowColor;
        }

        // Render based on sprite type
        this.drawSpriteGeometry(ctx, spriteDefinition, finalSize, tint);

        ctx.restore();
    }

    /**
     * Draw sprite geometry from definition
     */
    drawSpriteGeometry(ctx, spriteDef, size, tint) {
        ctx.translate(-size / 2, -size / 2);

        const parts = spriteDef.parts || [];
        
        for (const part of parts) {
            this.drawSpritePart(ctx, part, size, tint);
        }
    }

    /**
     * Draw individual sprite part
     */
    drawSpritePart(ctx, part, size, tint) {
        const { type, color, points, radius, width, height, x, y, stroke, strokeWidth, fill } = part;

        ctx.save();

        // Apply tint if specified
        const finalColor = tint || color || '#ffffff';

        switch (type) {
            case 'circle':
                this.drawCircle(ctx, x * size, y * size, radius * size, finalColor, fill, stroke, strokeWidth);
                break;
            case 'rect':
                this.drawRect(ctx, x * size, y * size, width * size, height * size, finalColor, fill, stroke, strokeWidth);
                break;
            case 'polygon':
                this.drawPolygon(ctx, points, size, finalColor, fill, stroke, strokeWidth);
                break;
            case 'path':
                this.drawPath(ctx, points, size, finalColor, stroke, strokeWidth, fill);
                break;
            case 'ellipse':
                this.drawEllipse(ctx, x * size, y * size, width * size, height * size, finalColor, fill, stroke, strokeWidth);
                break;
        }

        ctx.restore();
    }

    drawCircle(ctx, x, y, radius, color, fill = true, stroke = false, strokeWidth = 1) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        if (fill) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }
    }

    drawRect(ctx, x, y, width, height, color, fill = true, stroke = false, strokeWidth = 1) {
        if (fill) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, width, height);
        }
        if (stroke) {
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.strokeRect(x, y, width, height);
        }
    }

    drawPolygon(ctx, points, size, color, fill = true, stroke = false, strokeWidth = 1) {
        if (!points || points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x * size, points[0].y * size);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x * size, points[i].y * size);
        }
        ctx.closePath();

        if (fill) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }
    }

    drawPath(ctx, points, size, color, stroke = true, strokeWidth = 2, fill = false) {
        if (!points || points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x * size, points[0].y * size);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x * size, points[i].y * size);
        }

        if (fill) {
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }
    }

    drawEllipse(ctx, x, y, width, height, color, fill = true, stroke = false, strokeWidth = 1) {
        ctx.beginPath();
        ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
        
        if (fill) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }
    }

    /**
     * Get cached sprite or create if needed
     */
    getCachedSprite(spriteKey, spriteDefinition, size) {
        const cacheKey = `${spriteKey}_${size}`;
        
        if (this.spriteCache.has(cacheKey)) {
            return this.spriteCache.get(cacheKey);
        }

        // Create cached sprite
        const canvas = document.createElement('canvas');
        canvas.width = size * 2;
        canvas.height = size * 2;
        const ctx = canvas.getContext('2d', { alpha: true });

        this.renderSprite(ctx, spriteDefinition, size, size, size);

        this.spriteCache.set(cacheKey, canvas);
        return canvas;
    }

    clearCache() {
        this.spriteCache.clear();
        this.animationFrameCache.clear();
    }
}

// ============================================================================
// ANIMATION CONTROLLER - Professional animation system
// ============================================================================

class AnimationController {
    constructor(animationDefinitions) {
        this.animations = animationDefinitions;
        this.currentAnimation = null;
        this.currentFrame = 0;
        this.animationTime = 0;
        this.frameTime = 0;
        this.loop = true;
        this.finished = false;
        this.transitionBlend = 0;
        this.previousAnimation = null;
    }

    /**
     * Play an animation
     */
    play(animationName, options = {}) {
        const { loop = true, reset = true, blendTime = 0.1 } = options;

        if (this.currentAnimation === animationName && !reset) return;

        // Store previous for blending
        if (blendTime > 0 && this.currentAnimation) {
            this.previousAnimation = {
                name: this.currentAnimation,
                frame: this.currentFrame,
                blend: 1.0,
                blendTime: blendTime
            };
            this.transitionBlend = 0;
        }

        this.currentAnimation = animationName;
        this.currentFrame = 0;
        this.animationTime = 0;
        this.frameTime = 0;
        this.loop = loop;
        this.finished = false;
    }

    /**
     * Update animation state
     */
    update(dt) {
        if (!this.currentAnimation || this.finished) return;

        const anim = this.animations[this.currentAnimation];
        if (!anim) return;

        this.frameTime += dt;
        this.animationTime += dt;

        // Update blend transition
        if (this.previousAnimation) {
            this.transitionBlend += dt / this.previousAnimation.blendTime;
            if (this.transitionBlend >= 1.0) {
                this.previousAnimation = null;
                this.transitionBlend = 0;
            }
        }

        // Frame advancement
        const frameDuration = 1.0 / (anim.fps || 8);
        
        if (this.frameTime >= frameDuration) {
            this.frameTime -= frameDuration;
            this.currentFrame++;

            const totalFrames = anim.frames || 1;
            
            if (this.currentFrame >= totalFrames) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = totalFrames - 1;
                    this.finished = true;
                }
            }
        }
    }

    /**
     * Get current sprite definition for rendering
     */
    getCurrentSprite() {
        if (!this.currentAnimation) return null;

        const anim = this.animations[this.currentAnimation];
        if (!anim) return null;

        // Handle frame arrays or single sprite
        if (Array.isArray(anim.sprites)) {
            return anim.sprites[this.currentFrame] || anim.sprites[0];
        }

        return anim.sprite;
    }

    /**
     * Get animation progress (0-1)
     */
    getProgress() {
        const anim = this.animations[this.currentAnimation];
        if (!anim) return 0;

        const totalFrames = anim.frames || 1;
        return (this.currentFrame + (this.frameTime * (anim.fps || 8))) / totalFrames;
    }

    /**
     * Check if animation is complete
     */
    isFinished() {
        return this.finished;
    }

    /**
     * Get current animation name
     */
    getCurrentAnimationName() {
        return this.currentAnimation;
    }

    /**
     * Get blend factor for transitions
     */
    getBlendFactor() {
        return this.transitionBlend;
    }

    reset() {
        this.currentFrame = 0;
        this.animationTime = 0;
        this.frameTime = 0;
        this.finished = false;
    }
}

// Export to global scope
window.SpriteRenderer = SpriteRenderer;
window.AnimationController = AnimationController;

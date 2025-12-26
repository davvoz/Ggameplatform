/**
 * Professional Sprite Rendering System
 * Vector-based sprite engine for high-quality entity rendering
 * Supports gradients, glows, shadows, and complex geometries
 */

export class SpriteRenderer {
    constructor() {
        this.gradientCache = new Map();
    }

    /**
     * Render a multi-part sprite to canvas
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {MultiPartSprite} sprite - The sprite to render
     * @param {number} x - X position (center)
     * @param {number} y - Y position (center)
     * @param {number} size - Base render size
     * @param {Object} options - Render options
     */
    renderSprite(ctx, sprite, x, y, size, options = {}) {
        const {
            scale = 1.0,
            opacity = 1.0,
            shadowColor = 'rgba(0,0,0,0.5)',
            shadowBlur = 8,
            shadowOffsetY = 4
        } = options;

        const finalSize = size * scale;

        ctx.save();
        ctx.globalAlpha = opacity;
        
        // Position at sprite center
        ctx.translate(x, y);
        
        // Apply flip if needed
        if (sprite.flipX) {
            ctx.scale(-1, 1);
        }

        // Apply root transform
        const rootWorld = sprite.rootTransform.getWorldTransform();
        ctx.translate(rootWorld.x * finalSize, rootWorld.y * finalSize);
        ctx.rotate(rootWorld.rotation);
        ctx.scale(rootWorld.scaleX, rootWorld.scaleY);

        // Draw shadow first
        this.drawShadow(ctx, sprite, finalSize, shadowColor, shadowBlur, shadowOffsetY);

        // Get sorted parts and render
        const parts = sprite.getSortedParts();
        
        for (const part of parts) {
            this.renderPart(ctx, part, finalSize, sprite);
        }

        ctx.restore();
    }

    /**
     * Draw sprite shadow
     */
    drawShadow(ctx, sprite, size, color, blur, offsetY) {
        ctx.save();
        ctx.translate(0, size * 0.4 + offsetY);
        ctx.scale(1, 0.3);
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.35, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.filter = `blur(${blur}px)`;
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
    }

    /**
     * Render individual sprite part
     */
    renderPart(ctx, part, size, sprite) {
        const world = part.transform.getWorldTransform();

        ctx.save();

        // Apply part transform
        ctx.translate(world.x * size, world.y * size);
        ctx.rotate(world.rotation);
        ctx.scale(world.scaleX, world.scaleY);

        // Apply part opacity
        ctx.globalAlpha *= part.opacity;

        // Apply glow effect
        if (part.glowIntensity > 0 && part.glowColor) {
            ctx.shadowColor = part.glowColor;
            ctx.shadowBlur = part.glowIntensity * size * 0.2;
        }

        // Apply flash effect from sprite
        const flashMix = sprite.flashIntensity || 0;

        // Render geometry
        const geometries = Array.isArray(part.geometry) ? part.geometry : [part.geometry];
        const tint = part.tint || sprite.baseTint;
        
        for (const geom of geometries) {
            this.drawGeometry(ctx, geom, size, tint, flashMix, sprite.flashColor);
        }

        ctx.restore();
    }

    /**
     * Draw geometry
     */
    drawGeometry(ctx, geom, size, tint, flashMix = 0, flashColor = '#ffffff') {
        if (!geom) return;

        ctx.save();

        // Apply per-geometry local offset
        if (geom.x || geom.y) {
            ctx.translate((geom.x || 0) * size, (geom.y || 0) * size);
        }

        // Apply per-geometry rotation
        if (geom.rotation) {
            ctx.rotate(geom.rotation);
        }

        // Apply glow from geometry
        if (geom.glow) {
            ctx.shadowColor = geom.glow.color || geom.color;
            ctx.shadowBlur = (geom.glow.blur || 10) * (size / 100);
        }

        // Determine color
        let color = tint || geom.color || '#ffffff';
        
        // Apply flash effect
        if (flashMix > 0) {
            color = this.mixColors(color, flashColor, flashMix);
        }

        // Handle gradient
        if (geom.gradient) {
            color = this.createGradient(ctx, geom.gradient, size);
        }

        switch (geom.type) {
            case 'circle':
                this.drawCircle(ctx, geom, size, color);
                break;
            case 'ellipse':
                this.drawEllipse(ctx, geom, size, color);
                break;
            case 'rect':
                this.drawRect(ctx, geom, size, color);
                break;
            case 'roundRect':
                this.drawRoundRect(ctx, geom, size, color);
                break;
            case 'polygon':
                this.drawPolygon(ctx, geom, size, color);
                break;
            case 'path':
                this.drawPath(ctx, geom, size, color);
                break;
            case 'arc':
                this.drawArc(ctx, geom, size, color);
                break;
            case 'line':
                this.drawLine(ctx, geom, size, color);
                break;
        }

        ctx.restore();
    }

    /**
     * Draw circle
     */
    drawCircle(ctx, geom, size, color) {
        ctx.beginPath();
        ctx.arc(0, 0, (geom.radius || 0.1) * size, 0, Math.PI * 2);
        
        if (geom.fill !== false) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (geom.stroke) {
            ctx.strokeStyle = geom.strokeColor || color;
            ctx.lineWidth = (geom.strokeWidth || 1) * (size / 100);
            ctx.stroke();
        }
    }

    /**
     * Draw ellipse
     */
    drawEllipse(ctx, geom, size, color) {
        const w = (geom.width || 0.2) * size;
        const h = (geom.height || 0.1) * size;
        
        ctx.beginPath();
        ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
        
        if (geom.fill !== false) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (geom.stroke) {
            ctx.strokeStyle = geom.strokeColor || color;
            ctx.lineWidth = (geom.strokeWidth || 1) * (size / 100);
            ctx.stroke();
        }
    }

    /**
     * Draw rectangle
     */
    drawRect(ctx, geom, size, color) {
        const w = (geom.width || 0.2) * size;
        const h = (geom.height || 0.2) * size;
        
        if (geom.fill !== false) {
            ctx.fillStyle = color;
            ctx.fillRect(-w / 2, -h / 2, w, h);
        }
        if (geom.stroke) {
            ctx.strokeStyle = geom.strokeColor || color;
            ctx.lineWidth = (geom.strokeWidth || 1) * (size / 100);
            ctx.strokeRect(-w / 2, -h / 2, w, h);
        }
    }

    /**
     * Draw rounded rectangle
     */
    drawRoundRect(ctx, geom, size, color) {
        const w = (geom.width || 0.2) * size;
        const h = (geom.height || 0.2) * size;
        const r = (geom.radius || 0.02) * size;
        
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, r);
        
        if (geom.fill !== false) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (geom.stroke) {
            ctx.strokeStyle = geom.strokeColor || color;
            ctx.lineWidth = (geom.strokeWidth || 1) * (size / 100);
            ctx.stroke();
        }
    }

    /**
     * Draw polygon
     */
    drawPolygon(ctx, geom, size, color) {
        if (!geom.points || geom.points.length < 3) return;

        ctx.beginPath();
        ctx.moveTo(geom.points[0].x * size, geom.points[0].y * size);
        
        for (let i = 1; i < geom.points.length; i++) {
            ctx.lineTo(geom.points[i].x * size, geom.points[i].y * size);
        }
        ctx.closePath();
        
        if (geom.fill !== false) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (geom.stroke) {
            ctx.strokeStyle = geom.strokeColor || color;
            ctx.lineWidth = (geom.strokeWidth || 1) * (size / 100);
            ctx.stroke();
        }
    }

    /**
     * Draw path (open shape)
     */
    drawPath(ctx, geom, size, color) {
        if (!geom.points || geom.points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(geom.points[0].x * size, geom.points[0].y * size);
        
        for (let i = 1; i < geom.points.length; i++) {
            const pt = geom.points[i];
            if (pt.cp) {
                // Bezier curve
                ctx.quadraticCurveTo(
                    pt.cp.x * size, pt.cp.y * size,
                    pt.x * size, pt.y * size
                );
            } else {
                ctx.lineTo(pt.x * size, pt.y * size);
            }
        }

        if (geom.closed) {
            ctx.closePath();
        }
        
        if (geom.fill) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (geom.stroke !== false) {
            ctx.strokeStyle = geom.strokeColor || color;
            ctx.lineWidth = (geom.strokeWidth || 2) * (size / 100);
            ctx.lineCap = geom.lineCap || 'round';
            ctx.lineJoin = geom.lineJoin || 'round';
            ctx.stroke();
        }
    }

    /**
     * Draw arc
     */
    drawArc(ctx, geom, size, color) {
        const radius = (geom.radius || 0.1) * size;
        const startAngle = geom.startAngle || 0;
        const endAngle = geom.endAngle || Math.PI;
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, startAngle, endAngle);
        
        if (geom.fill) {
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (geom.stroke !== false) {
            ctx.strokeStyle = geom.strokeColor || color;
            ctx.lineWidth = (geom.strokeWidth || 2) * (size / 100);
            ctx.lineCap = geom.lineCap || 'round';
            ctx.stroke();
        }
    }

    /**
     * Draw line
     */
    drawLine(ctx, geom, size, color) {
        const x1 = (geom.x1 || 0) * size;
        const y1 = (geom.y1 || 0) * size;
        const x2 = (geom.x2 || 0) * size;
        const y2 = (geom.y2 || 0) * size;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = (geom.strokeWidth || 2) * (size / 100);
        ctx.lineCap = geom.lineCap || 'round';
        ctx.stroke();
    }

    /**
     * Create gradient
     */
    createGradient(ctx, gradientDef, size) {
        if (gradientDef.type === 'radial') {
            const grad = ctx.createRadialGradient(
                (gradientDef.cx || 0) * size,
                (gradientDef.cy || 0) * size,
                0,
                (gradientDef.cx || 0) * size,
                (gradientDef.cy || 0) * size,
                (gradientDef.radius || 0.5) * size
            );
            for (const stop of gradientDef.stops) {
                grad.addColorStop(stop.offset, stop.color);
            }
            return grad;
        } else {
            // Linear gradient
            const grad = ctx.createLinearGradient(
                (gradientDef.x1 || 0) * size,
                (gradientDef.y1 || -0.5) * size,
                (gradientDef.x2 || 0) * size,
                (gradientDef.y2 || 0.5) * size
            );
            for (const stop of gradientDef.stops) {
                grad.addColorStop(stop.offset, stop.color);
            }
            return grad;
        }
    }

    /**
     * Mix two colors
     */
    mixColors(color1, color2, t) {
        // Simple color mixing - parse colors and blend
        const c1 = this.parseColor(color1);
        const c2 = this.parseColor(color2);
        
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        
        return `rgb(${r},${g},${b})`;
    }

    /**
     * Parse color string to RGB
     */
    parseColor(color) {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                return {
                    r: parseInt(hex[0] + hex[0], 16),
                    g: parseInt(hex[1] + hex[1], 16),
                    b: parseInt(hex[2] + hex[2], 16)
                };
            }
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16)
            };
        }
        // Default fallback
        return { r: 255, g: 255, b: 255 };
    }
}

// Singleton instance
export const spriteRenderer = new SpriteRenderer();

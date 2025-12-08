/**
 * BaseCollectible - Abstract base class for all collectible renderers
 * Implements Template Method Pattern
 */
export class BaseCollectible {
    constructor(renderer, textCtx = null) {
        if (new.target === BaseCollectible) {
            throw new TypeError('Cannot construct BaseCollectible instances directly');
        }
        this.renderer = renderer;
        this.textCtx = textCtx;
        this.labelRenderer = null;
    }

    setLabelRenderer(labelRenderer) {
        this.labelRenderer = labelRenderer;
    }

    /**
     * Template method - defines the rendering algorithm structure
     */
    render(entity, context) {
        this.renderLabel(entity);
        this.renderVisual(entity, context);
    }

    /**
     * Render label using centralized system
     */
    renderLabel(entity) {
        if (this.labelRenderer) {
            const labelY = entity.y - (entity.radius || entity.height / 2);
            this.labelRenderer.renderCollectibleLabel(entity, entity.x, labelY);
        }
    }

    /**
     * Abstract method - must be implemented by subclasses
     */
    renderVisual(entity, context) {
        throw new Error('Method renderVisual() must be implemented by subclass');
    }

    /**
     * Helper method - render ellipse
     */
    renderEllipse(x, y, radiusX, radiusY, color) {
        const steps = 8;
        for (let i = 0; i < steps; i++) {
            const offset = (i - steps / 2) * (radiusY * 2 / steps);
            const width = radiusX * Math.sqrt(1 - Math.pow(offset / radiusY, 2));
            if (width > 0) {
                this.renderer.drawCircle(x, y + offset, width, color);
            }
        }
    }

    /**
     * Helper method - render star shape
     */
    renderStar(x, y, radius, rotation = 0, points = 5) {
        for (let i = 0; i < points * 2; i++) {
            const angle = (i / (points * 2)) * Math.PI * 2 + rotation;
            const r = i % 2 === 0 ? radius * 0.6 : radius * 0.3;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;

            const nextI = (i + 1) % (points * 2);
            const nextAngle = (nextI / (points * 2)) * Math.PI * 2 + rotation;
            const nextR = nextI % 2 === 0 ? radius * 0.6 : radius * 0.3;
            const nextPx = x + Math.cos(nextAngle) * nextR;
            const nextPy = y + Math.sin(nextAngle) * nextR;

            for (let j = 0; j < 3; j++) {
                const t = j / 3;
                const lx = px + (nextPx - px) * t;
                const ly = py + (nextPy - py) * t;
                this.renderer.drawCircle(lx, ly, 1.5, [1.0, 1.0, 0.5, 0.9]);
            }
        }
    }
}

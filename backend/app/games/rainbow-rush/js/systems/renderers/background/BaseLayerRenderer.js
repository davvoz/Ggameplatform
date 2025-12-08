/**
 * BaseLayerRenderer - Abstract base class for layer renderers
 * Implements Template Method Pattern and provides common functionality
 */
export class BaseLayerRenderer {
    constructor(renderer) {
        if (new.target === BaseLayerRenderer) {
            throw new TypeError('Cannot construct BaseLayerRenderer instances directly');
        }
        this.renderer = renderer;
    }

    /**
     * Template method for rendering
     * @param {Object} layer - Layer configuration
     * @param {Object} context - Rendering context
     */
    render(layer, context) {
        if (!this.canHandle(layer.type)) {
            return;
        }
        this.doRender(layer, context);
    }

    /**
     * Abstract method to be implemented by subclasses
     * @param {Object} layer - Layer configuration
     * @param {Object} context - Rendering context
     */
    doRender(layer, context) {
        throw new Error('Method doRender() must be implemented');
    }

    /**
     * Abstract method to check if renderer can handle layer type
     * @param {string} layerType - Type of layer
     * @returns {boolean}
     */
    canHandle(layerType) {
        throw new Error('Method canHandle() must be implemented');
    }

    /**
     * Helper: Interpolate color between two colors
     * @param {Array} color1 - Start color [r, g, b, a]
     * @param {Array} color2 - End color [r, g, b, a]
     * @param {number} t - Interpolation factor (0-1)
     * @returns {Array} Interpolated color
     */
    interpolateColor(color1, color2, t) {
        return [
            color1[0] + (color2[0] - color1[0]) * t,
            color1[1] + (color2[1] - color1[1]) * t,
            color1[2] + (color2[2] - color1[2]) * t,
            color1[3] + (color2[3] - color1[3]) * t
        ];
    }

    /**
     * Helper: Apply alpha to color
     * @param {Array} color - Base color
     * @param {number} alpha - Alpha value
     * @returns {Array} Color with new alpha
     */
    applyAlpha(color, alpha) {
        return [...color.slice(0, 3), alpha];
    }

    /**
     * Helper: Scale color brightness
     * @param {Array} color - Base color
     * @param {number} scale - Scale factor
     * @returns {Array} Scaled color
     */
    scaleColor(color, scale) {
        return [
            color[0] * scale,
            color[1] * scale,
            color[2] * scale,
            color[3]
        ];
    }
}

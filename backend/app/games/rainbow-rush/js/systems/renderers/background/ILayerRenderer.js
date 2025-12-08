/**
 * Interface for layer rendering strategy
 * Follows Interface Segregation Principle (SOLID)
 */
export class ILayerRenderer {
    /**
     * Renders a background layer
     * @param {Object} layer - Layer configuration
     * @param {Object} context - Rendering context (time, canvas dimensions, etc.)
     */
    render(layer, context) {
        throw new Error('Method render() must be implemented');
    }

    /**
     * Checks if this renderer can handle the given layer type
     * @param {string} layerType - Type of layer
     * @returns {boolean}
     */
    canHandle(layerType) {
        throw new Error('Method canHandle() must be implemented');
    }
}

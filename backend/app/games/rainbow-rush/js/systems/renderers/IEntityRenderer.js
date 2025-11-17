/**
 * IEntityRenderer - Interface for entity-specific renderers
 * Implements Strategy Pattern for polymorphic rendering
 */
export class IEntityRenderer {
    constructor(renderer) {
        if (new.target === IEntityRenderer) {
            throw new TypeError('Cannot construct IEntityRenderer instances directly');
        }
        this.renderer = renderer;
    }

    /**
     * Render the entity
     * @param {Object} entity - The entity to render
     * @param {Object} context - Rendering context (time, canvas dimensions, etc.)
     */
    render(entity, context) {
        throw new Error('Method render() must be implemented by subclass');
    }
}

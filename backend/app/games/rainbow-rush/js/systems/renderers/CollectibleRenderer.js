/**
 * CollectibleRenderer - Facade for rendering collectibles using OOP design
 * Implements Facade Pattern to provide simple interface to complex subsystem
 * Uses Factory Pattern for creating specialized renderers
 */
import { IEntityRenderer } from './IEntityRenderer.js';
import { CollectibleFactory } from './collectibles/CollectibleFactory.js';

export class CollectibleRenderer extends IEntityRenderer {
    constructor(renderer, textCtx = null) {
        super(renderer);
        this.textCtx = textCtx;
        this.labelRenderer = null;
    }

    setLabelRenderer(labelRenderer) {
        this.labelRenderer = labelRenderer;
        CollectibleFactory.setLabelRenderer(labelRenderer);
    }

    render(entity, context) {
        const type = entity.entityType || entity.type;

        try {
            const collectibleRenderer = CollectibleFactory.getRenderer(type, this.renderer, this.textCtx);

            if (this.labelRenderer) {
                collectibleRenderer.setLabelRenderer(this.labelRenderer);
            }

            collectibleRenderer.render(entity, context);
        } catch (error) {
            console.warn(`Failed to render collectible type "${type}":`, error);
        }
    }
}

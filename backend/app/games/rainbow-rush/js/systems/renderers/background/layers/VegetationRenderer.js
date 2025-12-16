import { BaseLayerRenderer } from '../BaseLayerRenderer.js';
import { LAYER_TYPES, TREE_CONFIG, MUSHROOM_CONFIG, GIANT_MUSHROOM_CONFIG } from '../BackgroundRendererConfig.js';

/**
 * Renderer for organic/nature layers (trees, mushrooms, seaweed)
 * Single Responsibility: Rendering vegetation
 */
export class VegetationRenderer extends BaseLayerRenderer {
    canHandle(layerType) {
        return [
            LAYER_TYPES.TREE,
            LAYER_TYPES.MUSHROOM,
            LAYER_TYPES.GIANT_MUSHROOM,
            LAYER_TYPES.SEAWEED
        ].includes(layerType);
    }

    doRender(layer, context) {
        const renderers = {
            [LAYER_TYPES.TREE]: () => this.renderTree(layer, context),
            [LAYER_TYPES.MUSHROOM]: () => this.renderMushroom(layer, context),
            [LAYER_TYPES.GIANT_MUSHROOM]: () => this.renderGiantMushroom(layer, context),
            [LAYER_TYPES.SEAWEED]: () => this.renderSeaweed(layer, context)
        };

        const renderFunction = renderers[layer.type];
        if (renderFunction) {
            renderFunction();
        }
    }

    renderTree(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileBaseX = tileIndex * tileWidth + offset;
            const x = tileBaseX + (layer.x % tileWidth);
            
            // Render trunk
            const trunkColor = [...TREE_CONFIG.TRUNK_COLOR, layer.color[3]];
            this.renderer.drawRect(
                x + layer.width * TREE_CONFIG.TRUNK_X_OFFSET,
                layer.y + layer.height * TREE_CONFIG.TRUNK_Y_OFFSET,
                layer.width * TREE_CONFIG.TRUNK_WIDTH_RATIO,
                layer.height * TREE_CONFIG.TRUNK_HEIGHT_RATIO,
                trunkColor
            );

            // Render crown
            this.renderer.drawCircle(
                x + layer.width / 2,
                layer.y + layer.height * TREE_CONFIG.CROWN_Y_OFFSET,
                layer.width * TREE_CONFIG.CROWN_RADIUS_RATIO,
                layer.color
            );
        }
    }

    renderMushroom(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileBaseX = tileIndex * tileWidth + offset;
            const x = tileBaseX + (layer.x % tileWidth);
            
            // Render stem
            this.renderer.drawRect(
                x + layer.size * MUSHROOM_CONFIG.STEM_X_OFFSET,
                layer.y,
                layer.size * MUSHROOM_CONFIG.STEM_WIDTH_RATIO,
                layer.size * MUSHROOM_CONFIG.STEM_HEIGHT_RATIO,
                MUSHROOM_CONFIG.STEM_COLOR
            );

            // Render cap
            this.renderer.drawCircle(
                x + layer.size / 2,
                layer.y,
                layer.size * MUSHROOM_CONFIG.CAP_RADIUS_RATIO,
                layer.color
            );
        }
    }

    renderGiantMushroom(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileBaseX = tileIndex * tileWidth + offset;
            const x = tileBaseX + (layer.x % tileWidth);
            
            // Render stem
            this.renderer.drawRect(
                x - layer.size * GIANT_MUSHROOM_CONFIG.STEM_X_OFFSET,
                layer.y,
                layer.size * GIANT_MUSHROOM_CONFIG.STEM_WIDTH_RATIO,
                layer.stemHeight,
                GIANT_MUSHROOM_CONFIG.STEM_COLOR
            );

            // Render cap
            this.renderer.drawCircle(
                x,
                layer.y - layer.stemHeight,
                layer.size,
                layer.color
            );
        }
    }

    renderSeaweed(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        const sway = Math.sin(context.time + (layer.swayPhase || 0)) * 5;
        
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileBaseX = tileIndex * tileWidth + offset;
            const x = tileBaseX + (layer.x % tileWidth) + sway;
            this.renderer.drawRect(
                x,
                layer.y - layer.height,
                layer.width,
                layer.height,
                layer.color
            );
        }
    }
}

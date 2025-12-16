import { BaseLayerRenderer } from '../BaseLayerRenderer.js';
import { GRADIENT_CONFIG, LAYER_TYPES } from '../BackgroundRendererConfig.js';

/**
 * Renderer for sky gradient layers
 * Single Responsibility: Rendering gradient backgrounds
 */
export class SkyGradientRenderer extends BaseLayerRenderer {
    canHandle(layerType) {
        return layerType === LAYER_TYPES.SKY_GRADIENT;
    }

    doRender(layer, context) {
        // Tile-based infinite scrolling for sky gradient
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        const bands = GRADIENT_CONFIG.BANDS;
        const skyTopColor = GRADIENT_CONFIG.SKY_TOP_COLOR;
        const skyBottomColor = layer.color;
        
        // Calculate which tiles are visible
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        // Draw gradient for each tile
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileX = tileIndex * tileWidth + offset;
            
            for (let i = 0; i < bands; i++) {
                const t = i / bands;
                const bandY = layer.y + (layer.height * t);
                const bandHeight = layer.height / bands + 1;
                const color = this.interpolateColor(skyTopColor, skyBottomColor, t);
                this.renderer.drawRect(tileX, bandY, tileWidth, bandHeight, color);
            }
        }
    }
}

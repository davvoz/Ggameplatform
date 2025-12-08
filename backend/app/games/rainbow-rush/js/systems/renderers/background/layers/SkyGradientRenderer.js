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
        const skyTopColor = GRADIENT_CONFIG.SKY_TOP_COLOR;
        const skyBottomColor = layer.color;
        const bands = GRADIENT_CONFIG.BANDS;
        
        for (let i = 0; i < bands; i++) {
            const t = i / bands;
            const bandY = layer.y + (layer.height * t);
            const bandHeight = layer.height / bands + 1;
            const color = this.interpolateColor(skyTopColor, skyBottomColor, t);
            this.renderer.drawRect(0, bandY, context.canvasWidth * 10, bandHeight, color);
        }
    }
}

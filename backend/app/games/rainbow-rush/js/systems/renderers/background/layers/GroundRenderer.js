import { BaseLayerRenderer } from '../BaseLayerRenderer.js';
import { GROUND_CONFIG, LAYER_TYPES } from '../BackgroundRendererConfig.js';

/**
 * Renderer for ground layers with texture details
 * Single Responsibility: Rendering ground/terrain
 */
export class GroundRenderer extends BaseLayerRenderer {
    canHandle(layerType) {
        return layerType === LAYER_TYPES.GROUND;
    }

    doRender(layer, context) {
        // Draw base ground
        this.renderer.drawRect(0, layer.y, context.canvasWidth * 10, layer.height, layer.color);
        
        // Add rock texture details
        this.renderRockTexture(layer, context);
    }

    renderRockTexture(layer, context) {
        const numRocks = GROUND_CONFIG.NUM_ROCKS;
        
        for (let i = 0; i < numRocks; i++) {
            const rock = this.calculateRockProperties(i, layer, context);
            this.renderer.drawCircle(rock.x, rock.y, rock.size, rock.color);
        }
    }

    calculateRockProperties(index, layer, context) {
        const rockX = (context.canvasWidth / GROUND_CONFIG.NUM_ROCKS) * index + 
                      Math.sin(index * 2.5) * 30;
        const rockY = layer.y + GROUND_CONFIG.ROCK_Y_OFFSET + 
                      Math.random() * GROUND_CONFIG.ROCK_Y_VARIANCE;
        const rockSize = GROUND_CONFIG.ROCK_MIN_SIZE + 
                        Math.random() * (GROUND_CONFIG.ROCK_MAX_SIZE - GROUND_CONFIG.ROCK_MIN_SIZE);
        
        const variance = GROUND_CONFIG.ROCK_COLOR_VARIANCE_MIN + 
                        Math.random() * GROUND_CONFIG.ROCK_COLOR_VARIANCE_MAX;
        const rockColor = this.scaleColor(layer.color, variance);
        rockColor[3] = GROUND_CONFIG.ROCK_ALPHA;

        return { x: rockX, y: rockY, size: rockSize, color: rockColor };
    }
}

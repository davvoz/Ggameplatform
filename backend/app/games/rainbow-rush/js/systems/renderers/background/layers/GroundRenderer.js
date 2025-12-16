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
        // Tile-based infinite scrolling
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        
        // Calculate which tiles are visible
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        // Draw each tile
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileX = tileIndex * tileWidth + offset;
            
            // Draw ground base
            this.renderer.drawRect(tileX, layer.y, tileWidth, layer.height, layer.color);
            
            // Draw rock texture for this tile
            this.renderRockTexture(tileIndex, tileX, tileWidth, layer);
        }
    }

    renderRockTexture(tileIndex, tileX, tileWidth, layer) {
        const numRocks = GROUND_CONFIG.NUM_ROCKS;
        
        for (let i = 0; i < numRocks; i++) {
            const rock = this.calculateRockProperties(tileIndex, i, tileX, tileWidth, layer);
            this.renderer.drawCircle(rock.x, rock.y, rock.size, rock.color);
        }
    }

    calculateRockProperties(tileIndex, rockIndex, tileX, tileWidth, layer) {
        // Deterministic rock positions based on tile index + rock index
        const seed = tileIndex * 1000 + rockIndex;
        
        const rockX = tileX + (tileWidth / GROUND_CONFIG.NUM_ROCKS) * rockIndex + 
                      Math.sin(seed * 2.5) * 30;
        const rockY = layer.y + GROUND_CONFIG.ROCK_Y_OFFSET + 
                      Math.sin(seed * 3.7) * GROUND_CONFIG.ROCK_Y_VARIANCE;
        const rockSize = GROUND_CONFIG.ROCK_MIN_SIZE + 
                        Math.sin(seed * 5.3) * (GROUND_CONFIG.ROCK_MAX_SIZE - GROUND_CONFIG.ROCK_MIN_SIZE);
        
        const variance = GROUND_CONFIG.ROCK_COLOR_VARIANCE_MIN + 
                        Math.sin(seed * 7.1) * GROUND_CONFIG.ROCK_COLOR_VARIANCE_MAX;
        const rockColor = this.scaleColor(layer.color, variance);
        rockColor[3] = GROUND_CONFIG.ROCK_ALPHA;

        return { x: rockX, y: rockY, size: rockSize, color: rockColor };
    }
}

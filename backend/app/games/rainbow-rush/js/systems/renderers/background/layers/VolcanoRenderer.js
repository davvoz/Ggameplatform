import { BaseLayerRenderer } from '../BaseLayerRenderer.js';
import { LAYER_TYPES } from '../BackgroundRendererConfig.js';

const VOLCANO_CONFIG = {
    LIGHT_COLOR_SCALE: 1.3,
    DARK_COLOR_SCALE: 0.7,
    CRATER_WALL_OFFSET: 5,
    CRATER_WALL_LEFT_COLOR: [0.08, 0.04, 0.02, 1.0],
    CRATER_WALL_RIGHT_COLOR: [0.1, 0.05, 0.03, 1.0],
    LAVA_GLOW_SPEED: 2,
    LAVA_GLOW_AMPLITUDE: 0.15,
    LAVA_GLOW_BASE: 0.85,
    LAVA_Y_OFFSET: 5,
    LAVA_X_PADDING: 8,
    LAVA_HEIGHT: 15,
    LAVA_CENTER_Y_OFFSET: 3,
    LAVA_CENTER_HEIGHT: 8,
    NUM_ROCKS: 8,
    ROCK_HEIGHT_FACTOR: 0.7,
    ROCK_SIZE_BASE: 6,
    ROCK_COLOR_SCALE: 0.6,
    ROCK_ALPHA: 0.8
};

/**
 * Renderer for volcano layers
 * Single Responsibility: Rendering volcanic terrain
 */
export class VolcanoRenderer extends BaseLayerRenderer {
    canHandle(layerType) {
        return layerType === LAYER_TYPES.VOLCANO;
    }

    doRender(layer, context) {
        // Tile-based infinite scrolling
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2; // Each tile is 2x screen width
        
        // Calculate which tiles are visible
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4; // Draw 4 tiles to cover screen + margins
        
        // Draw volcano in each tile
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            // Position within this tile (using original layer.x as offset within tile)
            const tileBaseX = tileIndex * tileWidth + offset;
            const volcanoX = tileBaseX + (layer.x % tileWidth);
            
            // Render volcano at this position
            const baseY = layer.y + layer.height;
            const peak = layer.y;
            
            this.renderVolcanoBody(volcanoX, baseY, layer.width, peak, layer.craterWidth || 60, layer.color);
            this.renderCrater(volcanoX, peak, layer.craterWidth || 60, layer.craterDepth || 50, context.time);
            this.renderRockTexture(volcanoX, peak, layer.width, layer.height, layer.color);
        }
    }

    renderVolcanoBody(baseX, baseY, width, peak, craterWidth, baseColor) {
        const leftBase = baseX - width / 2;
        const rightBase = baseX + width / 2;
        
        const lightColor = this.scaleColor(baseColor, VOLCANO_CONFIG.LIGHT_COLOR_SCALE);
        const darkColor = this.scaleColor(baseColor, VOLCANO_CONFIG.DARK_COLOR_SCALE);

        // Left slope (darker)
        this.renderer.drawTriangle(
            leftBase, baseY,
            baseX - craterWidth / 2, peak,
            baseX, baseY,
            darkColor
        );

        // Right slope (lighter - lit by sun)
        this.renderer.drawTriangle(
            baseX, baseY,
            baseX + craterWidth / 2, peak,
            rightBase, baseY,
            lightColor
        );
    }

    renderCrater(baseX, peak, craterWidth, craterDepth, time) {
        const craterLeftX = baseX - craterWidth / 2;
        const craterRightX = baseX + craterWidth / 2;
        const craterBottomY = peak + craterDepth;

        // Inner crater walls
        this.renderer.drawTriangle(
            craterLeftX, peak,
            craterLeftX + VOLCANO_CONFIG.CRATER_WALL_OFFSET, craterBottomY,
            baseX, craterBottomY,
            VOLCANO_CONFIG.CRATER_WALL_LEFT_COLOR
        );
        
        this.renderer.drawTriangle(
            baseX, craterBottomY,
            craterRightX - VOLCANO_CONFIG.CRATER_WALL_OFFSET, craterBottomY,
            craterRightX, peak,
            VOLCANO_CONFIG.CRATER_WALL_RIGHT_COLOR
        );

        // Animated lava pool
        this.renderLavaPool(baseX, craterLeftX, craterWidth, craterBottomY, time);
    }

    renderLavaPool(baseX, craterLeftX, craterWidth, craterBottomY, time) {
        const lavaGlow = Math.sin(time * VOLCANO_CONFIG.LAVA_GLOW_SPEED) * 
                        VOLCANO_CONFIG.LAVA_GLOW_AMPLITUDE + VOLCANO_CONFIG.LAVA_GLOW_BASE;
        const lavaY = craterBottomY - VOLCANO_CONFIG.LAVA_Y_OFFSET;

        // Main lava pool
        this.renderer.drawRect(
            craterLeftX + VOLCANO_CONFIG.LAVA_X_PADDING,
            lavaY,
            craterWidth - (VOLCANO_CONFIG.LAVA_X_PADDING * 2),
            VOLCANO_CONFIG.LAVA_HEIGHT,
            [1.0 * lavaGlow, 0.4 * lavaGlow, 0.0, 0.95]
        );

        // Bright lava center
        this.renderer.drawRect(
            baseX - craterWidth / 4,
            lavaY + VOLCANO_CONFIG.LAVA_CENTER_Y_OFFSET,
            craterWidth / 2,
            VOLCANO_CONFIG.LAVA_CENTER_HEIGHT,
            [1.0, 0.7 * lavaGlow, 0.2 * lavaGlow, 1.0]
        );
    }

    renderRockTexture(baseX, peak, width, height, baseColor) {
        for (let i = 0; i < VOLCANO_CONFIG.NUM_ROCKS; i++) {
            const rock = this.calculateRockPosition(i, baseX, peak, width, height, baseColor);
            this.renderer.drawCircle(rock.x, rock.y, rock.size, rock.color);
        }
    }

    calculateRockPosition(index, baseX, peak, width, height, baseColor) {
        const t = (index + 0.5) / VOLCANO_CONFIG.NUM_ROCKS;
        const y = peak + height * t * VOLCANO_CONFIG.ROCK_HEIGHT_FACTOR;
        const xOffset = (index % 2 === 0 ? -1 : 1) * 
                       (width / 4 + Math.sin(index * 2.5) * width / 8);
        const rockSize = VOLCANO_CONFIG.ROCK_SIZE_BASE + Math.sin(index * 3) * 4;
        
        const rockColor = this.scaleColor(baseColor, VOLCANO_CONFIG.ROCK_COLOR_SCALE);
        rockColor[3] = VOLCANO_CONFIG.ROCK_ALPHA;

        return { x: baseX + xOffset, y, size: rockSize, color: rockColor };
    }
}

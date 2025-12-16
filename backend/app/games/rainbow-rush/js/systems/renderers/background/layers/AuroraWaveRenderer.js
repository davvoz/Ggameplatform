import { BaseLayerRenderer } from '../BaseLayerRenderer.js';
import { LAYER_TYPES, AURORA_WAVE_CONFIG } from '../BackgroundRendererConfig.js';

/**
 * Renderer for aurora wave effects
 * Single Responsibility: Rendering animated wave patterns
 */
export class AuroraWaveRenderer extends BaseLayerRenderer {
    canHandle(layerType) {
        return layerType === LAYER_TYPES.AURORA_WAVE;
    }

    doRender(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        const numPoints = AURORA_WAVE_CONFIG.NUM_POINTS;
        const wavePhase = context.time * layer.speed / AURORA_WAVE_CONFIG.SPEED_DIVISOR + 
                         (layer.phaseOffset || 0);
        
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        // Draw wave segments for each tile
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileBaseX = tileIndex * tileWidth + offset;
            
            for (let i = 0; i < numPoints - 1; i++) {
                const segment = this.calculateWaveSegment(i, numPoints, layer, tileBaseX, tileWidth, wavePhase);
                this.renderWaveSegment(segment);
            }
        }
    }

    calculateWaveSegment(index, numPoints, layer, tileBaseX, tileWidth, wavePhase) {
        const x1 = tileBaseX + (tileWidth / numPoints) * index;
        const x2 = tileBaseX + (tileWidth / numPoints) * (index + 1);
        const y1 = layer.y + Math.sin((x1 * layer.frequency) + wavePhase) * layer.amplitude;
        const y2 = layer.y + Math.sin((x2 * layer.frequency) + wavePhase) * layer.amplitude;
        
        return { x1, y1, x2, y2, color: layer.color };
    }

    renderWaveSegment(segment) {
        this.renderer.drawRect(
            segment.x1,
            segment.y1 - AURORA_WAVE_CONFIG.WAVE_HALF_THICKNESS,
            segment.x2 - segment.x1 + 1,
            AURORA_WAVE_CONFIG.WAVE_THICKNESS,
            segment.color
        );
    }
}

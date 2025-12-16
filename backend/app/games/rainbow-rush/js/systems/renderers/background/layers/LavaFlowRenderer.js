import { BaseLayerRenderer } from '../BaseLayerRenderer.js';
import { LAYER_TYPES } from '../BackgroundRendererConfig.js';

const LAVA_FLOW_CONFIG = {
    SEGMENTS: 12,
    WAVE_SPEED: 3,
    PULSE_SPEED: 4,
    PULSE_AMPLITUDE: 0.2,
    PULSE_BASE: 0.8,
    WIDTH_BASE: 0.6,
    WIDTH_GROWTH: 0.4,
    WAVE_AMPLITUDE: 5,
    BRIGHTNESS_BASE: 0.8,
    BRIGHTNESS_VARIANCE: 0.2,
    CORE_WIDTH_RATIO: 0.5,
    CORE_X_OFFSET: 0.25,
    CORE_ALPHA_MULTIPLIER: 0.9,
    CENTER_WIDTH_RATIO: 0.3,
    CENTER_X_OFFSET: 0.15
};

/**
 * Renderer for lava flow layers
 * Single Responsibility: Rendering animated lava streams
 */
export class LavaFlowRenderer extends BaseLayerRenderer {
    canHandle(layerType) {
        return layerType === LAYER_TYPES.LAVA_FLOW;
    }

    doRender(layer, context) {
        const glowPulse = Math.sin(context.time * LAVA_FLOW_CONFIG.PULSE_SPEED + layer.flowPhase) * 
                         LAVA_FLOW_CONFIG.PULSE_AMPLITUDE + LAVA_FLOW_CONFIG.PULSE_BASE;
        
        const segmentHeight = layer.height / LAVA_FLOW_CONFIG.SEGMENTS;
        
        for (let i = 0; i < LAVA_FLOW_CONFIG.SEGMENTS; i++) {
            this.renderLavaSegment(i, layer, context, segmentHeight, glowPulse);
        }
    }

    renderLavaSegment(index, layer, context, segmentHeight, glowPulse) {
        const t = index / LAVA_FLOW_CONFIG.SEGMENTS;
        const y = layer.y + index * segmentHeight;
        
        const segment = this.calculateSegmentProperties(
            index, t, layer, context.time, segmentHeight, glowPulse
        );
        
        // Main lava segment
        this.renderer.drawRect(segment.x, y, segment.width, segmentHeight + 2, segment.edgeColor);
        
        // Inner darker core for depth
        this.renderer.drawRect(
            segment.coreX,
            y + 1,
            segment.coreWidth,
            segmentHeight,
            segment.coreColor
        );
        
        // Bright flowing center line (every other segment)
        if (index % 2 === 0) {
            this.renderCenterLine(layer, y, segment, segmentHeight);
        }
    }

    calculateSegmentProperties(index, t, layer, time, segmentHeight, glowPulse) {
        const offset = layer.offset || 0;
        // Width variation
        const widthFactor = LAVA_FLOW_CONFIG.WIDTH_BASE + t * LAVA_FLOW_CONFIG.WIDTH_GROWTH + 
                           Math.sin(time * 5 + layer.flowPhase + index * 0.5) * 0.15;
        const segmentWidth = layer.width * widthFactor;
        
        // Horizontal wave movement
        const wave = Math.sin(time * 4 + layer.flowPhase + index * 0.3) * LAVA_FLOW_CONFIG.WAVE_AMPLITUDE;
        const x = layer.x + offset - segmentWidth / 2 + wave;
        
        // Color gradient
        const brightness = glowPulse * (LAVA_FLOW_CONFIG.BRIGHTNESS_BASE + 
                          Math.sin(time * 6 + index * 0.4) * LAVA_FLOW_CONFIG.BRIGHTNESS_VARIANCE);
        
        const edgeColor = [
            1.0 * brightness,
            0.35 * brightness,
            0.0,
            layer.color[3]
        ];
        
        const coreColor = [
            0.7 * brightness,
            0.2 * brightness,
            0.0,
            layer.color[3] * LAVA_FLOW_CONFIG.CORE_ALPHA_MULTIPLIER
        ];

        return {
            x,
            width: segmentWidth,
            edgeColor,
            coreColor,
            coreX: x + segmentWidth * LAVA_FLOW_CONFIG.CORE_X_OFFSET,
            coreWidth: segmentWidth * LAVA_FLOW_CONFIG.CORE_WIDTH_RATIO,
            wave,
            brightness
        };
    }

    renderCenterLine(layer, y, segment, segmentHeight) {
        this.renderer.drawRect(
            layer.x - layer.width * LAVA_FLOW_CONFIG.CENTER_X_OFFSET + segment.wave * 0.5,
            y,
            layer.width * LAVA_FLOW_CONFIG.CENTER_WIDTH_RATIO,
            segmentHeight,
            [1.0, 0.6 * segment.brightness, 0.1 * segment.brightness, 0.7]
        );
    }
}

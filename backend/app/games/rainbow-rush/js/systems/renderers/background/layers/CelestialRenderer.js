import { BaseLayerRenderer } from '../BaseLayerRenderer.js';
import { LAYER_TYPES, PLANET_CONFIG, MOON_CONFIG, NEBULA_CONFIG } from '../BackgroundRendererConfig.js';

/**
 * Renderer for celestial objects (planet, moon, sun, nebula)
 * Single Responsibility: Rendering space/sky objects
 */
export class CelestialRenderer extends BaseLayerRenderer {
    canHandle(layerType) {
        return [
            LAYER_TYPES.PLANET,
            LAYER_TYPES.MOON,
            LAYER_TYPES.SUN,
            LAYER_TYPES.NEBULA,
            LAYER_TYPES.SUNRAY,
            LAYER_TYPES.CELESTIAL
        ].includes(layerType);
    }

    doRender(layer, context) {
        // Handle CELESTIAL type (generic celestial object)
        if (layer.type === LAYER_TYPES.CELESTIAL) {
            this.renderCelestial(layer);
            return;
        }

        const renderers = {
            [LAYER_TYPES.PLANET]: () => this.renderPlanet(layer),
            [LAYER_TYPES.MOON]: () => this.renderMoon(layer),
            [LAYER_TYPES.SUN]: () => this.renderSun(layer),
            [LAYER_TYPES.NEBULA]: () => this.renderNebula(layer),
            [LAYER_TYPES.SUNRAY]: () => this.renderSunray(layer)
        };

        const renderFunction = renderers[layer.type];
        if (renderFunction) {
            renderFunction();
        }
    }

    renderCelestial(layer) {
        // Render main celestial body
        this.renderer.drawCircle(layer.x, layer.y, layer.radius, layer.color);
        
        // Render glow if present
        if (layer.glowColor && layer.glowRadius) {
            this.renderer.drawCircle(layer.x, layer.y, layer.glowRadius, layer.glowColor);
        }
    }

    renderPlanet(layer) {
        const offset = layer.offset || 0;
        const x = layer.x - offset;
        this.renderer.drawCircle(x, layer.y, layer.radius, layer.color);
        
        if (layer.radius > PLANET_CONFIG.RING_THRESHOLD_RADIUS) {
            this.renderPlanetRing(layer, x);
        }
    }

    renderPlanetRing(layer, x) {
        const ringColor = this.applyAlpha(
            layer.color,
            layer.color[3] * PLANET_CONFIG.RING_ALPHA_MULTIPLIER
        );
        
        this.renderer.drawRect(
            x - layer.radius * PLANET_CONFIG.RING_SCALE,
            layer.y,
            layer.radius * PLANET_CONFIG.RING_WIDTH_SCALE,
            PLANET_CONFIG.RING_HEIGHT,
            ringColor
        );
    }

    renderMoon(layer) {
        // Main moon body
        this.renderer.drawCircle(layer.x, layer.y, layer.radius, layer.color);
        
        // Render craters
        MOON_CONFIG.CRATER_POSITIONS.forEach(crater => {
            this.renderer.drawCircle(
                layer.x + crater.offsetX,
                layer.y + crater.offsetY,
                crater.radius,
                MOON_CONFIG.CRATER_COLOR
            );
        });
    }

    renderSun(layer) {
        this.renderer.drawCircle(layer.x, layer.y, layer.radius, layer.color);
    }

    renderNebula(layer) {
        const offset = layer.offset || 0;
        const x = layer.x - offset;
        
        // Main nebula cloud
        this.renderer.drawCircle(x, layer.y, layer.width / 2, layer.color);
        
        // Secondary cloud
        this.renderer.drawCircle(
            x + NEBULA_CONFIG.SECONDARY_OFFSET_X,
            layer.y + NEBULA_CONFIG.SECONDARY_OFFSET_Y,
            layer.width * NEBULA_CONFIG.SECONDARY_SIZE_RATIO,
            layer.color
        );
    }

    renderSunray(layer) {
        // Apply parallax offset
        const offset = layer.offset || 0;
        const x = layer.x - offset;
        
        const rayEndX = x + Math.cos(layer.angle) * layer.length;
        const rayEndY = layer.y + Math.sin(layer.angle) * layer.length;
        this.renderer.drawRect(
            x,
            layer.y,
            Math.abs(rayEndX - x),
            2,
            layer.color
        );
    }
}

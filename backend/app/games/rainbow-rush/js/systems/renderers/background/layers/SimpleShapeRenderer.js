import { BaseLayerRenderer } from '../BaseLayerRenderer.js';
import { LAYER_TYPES } from '../BackgroundRendererConfig.js';

/**
 * Renderer for simple geometric layers (wave, pyramid, dune, crystal)
 * Single Responsibility: Rendering basic shapes
 */
export class SimpleShapeRenderer extends BaseLayerRenderer {
    canHandle(layerType) {
        return [
            LAYER_TYPES.WAVE,
            LAYER_TYPES.PYRAMID,
            LAYER_TYPES.DUNE,
            LAYER_TYPES.CRYSTAL,
            LAYER_TYPES.CRYSTAL_HANGING,
            LAYER_TYPES.CRYSTAL_FLOOR,
            LAYER_TYPES.HEATWAVE
        ].includes(layerType);
    }

    doRender(layer, context) {
        const renderers = {
            [LAYER_TYPES.WAVE]: () => this.renderWave(layer, context),
            [LAYER_TYPES.PYRAMID]: () => this.renderPyramid(layer),
            [LAYER_TYPES.DUNE]: () => this.renderDune(layer),
            [LAYER_TYPES.CRYSTAL]: () => this.renderCrystal(layer),
            [LAYER_TYPES.CRYSTAL_HANGING]: () => this.renderCrystalHanging(layer),
            [LAYER_TYPES.CRYSTAL_FLOOR]: () => this.renderCrystalFloor(layer),
            [LAYER_TYPES.HEATWAVE]: () => this.renderHeatwave(layer, context)
        };

        const renderFunction = renderers[layer.type];
        if (renderFunction) {
            renderFunction();
        }
    }

    renderWave(layer, context) {
        const offset = layer.offset || 0;
        this.renderer.drawRect(-offset, layer.y, 10000, 50, layer.color);
    }

    renderPyramid(layer) {
        this.renderer.drawRect(layer.x, layer.y, layer.width, layer.height, layer.color);
    }

    renderDune(layer) {
        this.renderer.drawCircle(layer.x, layer.y, layer.width / 2, layer.color);
    }

    renderCrystal(layer) {
        this.renderer.drawRect(
            layer.x - layer.size / 2,
            layer.y - layer.size / 2,
            layer.size,
            layer.size,
            layer.color
        );
    }

    renderCrystalHanging(layer) {
        this.renderer.drawRect(
            layer.x - layer.width / 2,
            layer.y,
            layer.width,
            layer.height,
            layer.color
        );
    }

    renderCrystalFloor(layer) {
        this.renderer.drawRect(
            layer.x - layer.width / 2,
            layer.y - layer.height,
            layer.width,
            layer.height,
            layer.color
        );
    }

    renderHeatwave(layer, context) {
        this.renderer.drawRect(0, layer.y, context.canvasWidth, 2, layer.color);
    }
}

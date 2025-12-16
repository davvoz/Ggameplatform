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
            LAYER_TYPES.HEATWAVE,
            LAYER_TYPES.SIMPLE_SHAPE
        ].includes(layerType);
    }

    doRender(layer, context) {
        // Handle SIMPLE_SHAPE with shape property
        if (layer.type === LAYER_TYPES.SIMPLE_SHAPE) {
            this.renderSimpleShape(layer, context);
            return;
        }

        const renderers = {
            [LAYER_TYPES.WAVE]: () => this.renderWave(layer, context),
            [LAYER_TYPES.PYRAMID]: () => this.renderPyramid(layer, context),
            [LAYER_TYPES.DUNE]: () => this.renderDune(layer, context),
            [LAYER_TYPES.CRYSTAL]: () => this.renderCrystal(layer, context),
            [LAYER_TYPES.CRYSTAL_HANGING]: () => this.renderCrystalHanging(layer, context),
            [LAYER_TYPES.CRYSTAL_FLOOR]: () => this.renderCrystalFloor(layer, context),
            [LAYER_TYPES.HEATWAVE]: () => this.renderHeatwave(layer, context)
        };

        const renderFunction = renderers[layer.type];
        if (renderFunction) {
            renderFunction();
        }
    }

    renderSimpleShape(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        const shapeRenderers = {
            'dune': () => this.renderDune(layer, context),
            'pyramid': () => this.renderPyramid(layer, context),
            'rectangle': () => {
                for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
                    const tileBaseX = tileIndex * tileWidth + offset;
                    const x = tileBaseX + (layer.x % tileWidth);
                    this.renderer.drawRect(x, layer.y, layer.width, layer.height, layer.color);
                }
            },
            'mushroom_cap': () => {
                for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
                    const tileBaseX = tileIndex * tileWidth + offset;
                    const x = tileBaseX + (layer.x % tileWidth);
                    this.renderer.drawCircle(x, layer.y, layer.width / 2, layer.color);
                }
            },
            'small_mushroom': () => {
                for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
                    const tileBaseX = tileIndex * tileWidth + offset;
                    const x = tileBaseX + (layer.x % tileWidth);
                    this.renderer.drawCircle(x, layer.y, layer.width / 2, layer.color);
                }
            },
            'line': () => {
                for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
                    const x = tileIndex * tileWidth + offset;
                    this.renderer.drawRect(x, layer.y, tileWidth, layer.thickness || 2, layer.color);
                }
            }
        };

        const shapeRenderer = shapeRenderers[layer.shape];
        if (shapeRenderer) {
            shapeRenderer();
        }
    }



    renderWave(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const x = tileIndex * tileWidth + offset;
            this.renderer.drawRect(x, layer.y, tileWidth, 50, layer.color);
        }
    }

    renderPyramid(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileBaseX = tileIndex * tileWidth + offset;
            const x = tileBaseX + (layer.x % tileWidth);
            this.renderer.drawRect(x, layer.y, layer.width, layer.height, layer.color);
        }
    }

    renderDune(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileBaseX = tileIndex * tileWidth + offset;
            const x = tileBaseX + (layer.x % tileWidth);
            this.renderer.drawCircle(x, layer.y, layer.width / 2, layer.color);
        }
    }

    renderCrystal(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileBaseX = tileIndex * tileWidth + offset;
            const x = tileBaseX + (layer.x % tileWidth);
            this.renderer.drawRect(
                x - layer.size / 2,
                layer.y - layer.size / 2,
                layer.size,
                layer.size,
                layer.color
            );
        }
    }

    renderCrystalHanging(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileBaseX = tileIndex * tileWidth + offset;
            const x = tileBaseX + (layer.x % tileWidth);
            this.renderer.drawRect(
                x - layer.width / 2,
                layer.y,
                layer.width,
                layer.height,
                layer.color
            );
        }
    }

    renderCrystalFloor(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const tileBaseX = tileIndex * tileWidth + offset;
            const x = tileBaseX + (layer.x % tileWidth);
            this.renderer.drawRect(
                x - layer.width / 2,
                layer.y - layer.height,
                layer.width,
                layer.height,
                layer.color
            );
        }
    }

    renderHeatwave(layer, context) {
        const offset = layer.offset || 0;
        const tileWidth = context.canvasWidth * 2;
        const startTile = Math.floor(-offset / tileWidth) - 1;
        const endTile = startTile + 4;
        
        for (let tileIndex = startTile; tileIndex <= endTile; tileIndex++) {
            const x = tileIndex * tileWidth + offset;
            this.renderer.drawRect(x, layer.y, tileWidth, 2, layer.color);
        }
    }
}

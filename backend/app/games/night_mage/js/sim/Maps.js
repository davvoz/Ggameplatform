import { mirrorLayers } from './Terrain.js';

/**
 * Turns map specs and the surfaces of their scenes into what a night needs.
 * @param {readonly import('../config/Scenes.js').MapSpec[]} specs
 * @param {Record<string, {canvasWidth: number, canvasHeight: number, layers?: number[][], heightmap?: number[]}>} surfaces by scene
 * @returns {{id: string, terrain: {width: number, height: number, layers: (number|null)[][]}, mageX?: number}[]}
 */
export function buildMaps(specs, surfaces) {
    return specs.filter((spec) => surfaces[spec.scene]).map((spec) => {
        const data = surfaces[spec.scene];
        const layers = data.layers?.length ? data.layers : [data.heightmap];
        const mageX = spec.mageX === undefined || !spec.mirror ? spec.mageX : data.canvasWidth - 1 - spec.mageX;
        return {
            id: spec.id,
            terrain: {
                width: data.canvasWidth,
                height: data.canvasHeight,
                layers: spec.mirror ? mirrorLayers(layers) : layers,
            },
            ...(mageX === undefined ? {} : { mageX }),
        };
    });
}

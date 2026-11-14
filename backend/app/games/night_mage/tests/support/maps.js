import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAPS, SCENES } from '../../js/config/Scenes.js';
import { buildMaps } from '../../js/sim/Maps.js';

const root = fileURLToPath(new URL('../../', import.meta.url));

/** The real surfaces of every scene, read from disk like the game fetches them. */
export function sceneSurfaces() {
    return Object.fromEntries(Object.entries(SCENES).map(([key, scene]) => [key, JSON.parse(readFileSync(root + scene.surfaces, 'utf8'))]));
}

export function realMaps() {
    return buildMaps(MAPS, sceneSurfaces());
}

/** A flat floor at y = 440, nothing else. */
export function flatMap(id = 'flat') {
    return { id, terrain: { width: 960, height: 540, layers: [new Array(960).fill(440)] } };
}

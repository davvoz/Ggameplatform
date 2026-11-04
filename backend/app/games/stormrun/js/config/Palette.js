/**
 * The whole colour system. Style rules, enforced by tests/art-rules.test.js:
 * flat colours, cut-paper edges, paper grain. No glow, no blur, no gradients.
 */

export const RAINBOW = Object.freeze([
    '#e5483f', '#f28a2e', '#f7c93e', '#5fb55a', '#3f8fd2', '#4b57b5', '#8b4fb0',
]);

export const Ink = Object.freeze({
    line: '#2f2a44',
    body: '#3d3560',
    edge: '#fff7e8',
    eye: '#fffdf6',
    shadow: 'rgba(47,42,68,0.22)',
    storm: 'rgba(104,112,124,0.86)',
    stormCloud: '#59616d',
    stormCloudLight: '#6d7682',
    rain: '#c9d6e3',
    water: '#6fb1dc',
    waterLight: '#a9d4ee',
    wood: '#a8764a',
    woodLight: '#d6ad7b',
    woodDark: '#7d5635',
    grumpy: '#8d90a6',
    grumpyLight: '#a7aabd',
    leaf: '#4f8f4a',
});

/** Scenery colours by distance. They loop, so an endless run keeps changing. */
export const Biomes = Object.freeze([
    {
        sky: '#cfe9ef', cloud: '#fbf6ea', far: '#b6dccb', near: '#9fd09a',
        ground: '#86c266', ground2: '#6aa955', ground3: '#528f4b', sun: '#f7c93e',
    },
    {
        sky: '#f6dfb4', cloud: '#fff4dc', far: '#eec48b', near: '#e3a964',
        ground: '#d9984a', ground2: '#bd7b3a', ground3: '#9c6232', sun: '#e5483f',
    },
    {
        sky: '#e7b9c6', cloud: '#f7dfe2', far: '#c79dc4', near: '#a483b8',
        ground: '#7f6bab', ground2: '#685795', ground3: '#52457c', sun: '#f7c93e',
    },
    {
        sky: '#dfeaf5', cloud: '#ffffff', far: '#c3d5ea', near: '#a9c3e0',
        ground: '#f4f7fb', ground2: '#cfdcec', ground3: '#a9bed8', sun: '#f2a0a0',
    },
]);

export const BIOME_SPAN = 900;
export const BIOME_BLEND = 140;

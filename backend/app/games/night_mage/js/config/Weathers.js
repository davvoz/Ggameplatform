/**
 * Weather of a map: what falls or floats in front of the scene. Drawn by
 * `render/Weather.js`; `motion` picks how a particle moves.
 *
 * - `count`: particles on screen; `size`: [min, max] px; `speed`: px/s
 * - `colors`: picked at random per particle; `tint`: a wash over the scene
 */
export const WEATHERS = Object.freeze({
    fireflies: { motion: 'wander', count: 34, size: [2, 4], speed: 18, colors: ['#c8ff7a', '#9dff5c', '#f4ffb0'], glow: true },
    fog: { motion: 'drift', count: 7, size: [160, 300], speed: 14, colors: ['rgba(140,180,220,0.07)'], tint: 'rgba(30,60,90,0.12)' },
    embers: { motion: 'rise', count: 40, size: [2, 4], speed: 46, colors: ['#ff9a3c', '#ff5a1f', '#ffd27a'], glow: true },
    rain: { motion: 'rain', count: 90, size: [1, 2], speed: 760, colors: ['rgba(170,200,255,0.55)'], tint: 'rgba(10,20,40,0.18)' },
    snow: { motion: 'fall', count: 70, size: [2, 4], speed: 46, colors: ['#ffffff', '#dfefff'] },
    leaves: { motion: 'flutter', count: 22, size: [4, 7], speed: 60, colors: ['#e0782a', '#c4471c', '#f2b13b'] },
    spores: { motion: 'wander', count: 44, size: [2, 3], speed: 12, colors: ['#e58bff', '#a0f0ff', '#d6ff8a'], glow: true },
});

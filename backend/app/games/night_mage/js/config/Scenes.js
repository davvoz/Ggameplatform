/**
 * Scenes and maps.
 *
 * A scene is a painted background plus its walkable surfaces, drawn with the
 * heightmap editor (`tools/heightmap-editor.html`) over the image and saved
 * next to it. A map is a way to play a scene: as painted or mirrored, with a
 * colour grade (`config/Grades.js`) and a weather (`render/Weather.js`).
 *
 * New scene: put `name.webp` and `name.json` in `assets/scenes/`, add a line
 * to SCENES and as many maps as you like to MAPS.
 */
export const SCENES = Object.freeze({
    green: { image: 'assets/scenes/foresta_verde_notte.webp', surfaces: 'assets/scenes/foresta_verde_notte.json' },
    blue: { image: 'assets/scenes/foresta_blu_notte.webp', surfaces: 'assets/scenes/foresta_blu_notte.json' },
    blood: { image: 'assets/scenes/foresta_sangue_notte.webp', surfaces: 'assets/scenes/foresta_sangue_notte.json' },
    ruins: { image: 'assets/scenes/piattaforme_notte.webp', surfaces: 'assets/scenes/piattaforme_notte.json' },
});

/**
 * @typedef {Object} MapSpec
 * @property {string} id
 * @property {string} name shown when the scene changes
 * @property {keyof SCENES} scene
 * @property {boolean} [mirror]
 * @property {string} [grade] key of GRADES
 * @property {string} [weather] key of the weather kinds
 * @property {number} [mageX] where the mage stands, if not in the middle
 */
/** @type {readonly MapSpec[]} */
export const MAPS = Object.freeze([
    { id: 'green_wood', name: 'GREEN WOOD', scene: 'green', weather: 'fireflies' },
    { id: 'blue_wood', name: 'BLUE WOOD', scene: 'blue', weather: 'fog' },
    { id: 'blood_grove', name: 'BLOOD GROVE', scene: 'blood', weather: 'embers' },
    { id: 'storm_ruins', name: 'STORM RUINS', scene: 'ruins', weather: 'rain' },
    { id: 'autumn_wood', name: 'AUTUMN WOOD', scene: 'green', mirror: true, grade: 'autumn', weather: 'leaves' },
    { id: 'frozen_wood', name: 'FROZEN WOOD', scene: 'blue', mirror: true, grade: 'frost', weather: 'snow' },
    { id: 'violet_hollow', name: 'VIOLET HOLLOW', scene: 'blood', mirror: true, grade: 'violet', weather: 'spores' },
    { id: 'burning_ruins', name: 'BURNING RUINS', scene: 'ruins', mirror: true, grade: 'ember', weather: 'embers' },
    { id: 'poison_marsh', name: 'POISON MARSH', scene: 'green', grade: 'toxic', weather: 'spores' },
    { id: 'rainy_hollow', name: 'RAINY HOLLOW', scene: 'blue', grade: 'moonlit', weather: 'rain' },
    { id: 'ice_grove', name: 'ICE GROVE', scene: 'blood', grade: 'frost', weather: 'snow' },
    { id: 'ghost_ruins', name: 'GHOST RUINS', scene: 'ruins', mirror: true, grade: 'moonlit', weather: 'fog' },
]);

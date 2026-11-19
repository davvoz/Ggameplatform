import { mixPixel, toPixel, rgbOf } from '../color.js';

/**
 * The colours of a strip: light or dark band (every `bandSegments`
 * segments), faded into the fog by distance in a few steps, as the old
 * consoles did. Every combination is mixed once and kept.
 *
 * Broken road has the theme's patched asphalt and no lane marks; a theme
 * with potholes names their colours (`road.hole`), faded the same way. The
 * weather may fade the road into a colour of its own (`haze`: a blizzard's white).
 * A theme with a vortex (`vortex`) adds its walls' colours: the panels in
 * bands, a ring of light, the seams, a turbo strip's two flashes.
 */
export class RoadPalette {
    #cache = new Map();
    #theme;
    #road;
    #start;
    #haze;

    /**
     * @param {typeof import('../../config/Themes.js').THEMES.dusk} theme
     * @param {{bandSegments: number, drawDistance: number, fogStart: number, fogEnd: number, fogSteps: number}} road
     * @param {{fogStart: number, fogEnd: number, haze?: string}} [weather] brings the fog nearer, maybe in its own colour
     */
    constructor(theme, road, weather = road) {
        this.#theme = theme;
        this.#road = { ...road, fogStart: weather.fogStart, fogEnd: weather.fogEnd };
        this.#haze = weather.haze ?? theme.fog;
        this.#start = toPixel(rgbOf(theme.road.start));
    }

    /** @param {import('./project.js').Strip} strip @returns {import('./raster.js').RowColors} */
    colorsOf(strip) {
        const band = Math.floor(strip.index / this.#road.bandSegments) % 2;
        const step = this.#fogStep(strip.n);
        const inside = strip.tunnel === true;
        const broken = strip.broken === true;
        const key = ((step * 2 + band) * 2 + (inside ? 1 : 0)) * 2 + (broken ? 1 : 0);
        let colors = this.#cache.get(key);
        if (!colors) {
            colors = this.#mix(band, step / this.#road.fogSteps, { inside, broken });
            this.#cache.set(key, colors);
        }
        // the start line: one segment of white asphalt
        return strip.index === 0 ? { ...colors, asphalt: this.#start, lane: null } : colors;
    }

    #fogStep(n) {
        const { drawDistance, fogStart, fogEnd, fogSteps } = this.#road;
        const depth = (n / drawDistance - fogStart) / (fogEnd - fogStart);
        return Math.round(Math.min(1, Math.max(0, depth)) * fogSteps);
    }

    #mix(band, fog, { inside, broken }) {
        const { road } = this.#theme;
        const haze = this.#haze;
        const fade = (color) => mixPixel(color, haze, fog);
        const tone = (pair) => fade(pair[band]);
        const colors = {
            // inside a tunnel the side of the road is its wall
            grass: tone(inside ? this.#theme.tunnel.wall : road.grass),
            rumble: tone(road.rumble),
            asphalt: tone(broken ? road.patch ?? road.asphalt : road.asphalt),
            // the marks are worn away where the road is broken
            lane: band === 0 && !broken ? fade(road.lane) : null,
            // a ramp before a gap: warning stripes across it, a segment each
            ramp: (road.ramp ?? road.asphalt).map(fade),
        };
        if (road.hole) colors.hole = Object.fromEntries(Object.entries(road.hole).map(([part, color]) => [part, fade(color)]));
        const { vortex } = this.#theme;
        if (vortex) Object.assign(colors, { wall: tone(vortex.wall), ring: fade(vortex.ring), seam: fade(vortex.seam), turbo: vortex.turbo.map(fade), grid: fade(vortex.grid) });
        return colors;
    }
}

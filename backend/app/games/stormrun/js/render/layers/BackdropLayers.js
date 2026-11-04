import { Ink } from '../../config/Palette.js';
import { drawSprite } from '../art/Bake.js';

/**
 * What stays far away: the sky, paper clouds and distant hills. The shapes are
 * built once and only filled with the colours of the current biome.
 *
 * @typedef {Object} Scene
 * @property {import('../../sim/Simulation.js').Simulation} sim
 * @property {import('../Camera.js').Camera} camera
 * @property {Object<string, string>} colors current biome
 * @property {number} time seconds since the page opened
 * @property {number} dt seconds since the last frame
 * @property {number} runnerX interpolated
 * @property {number} runnerY interpolated
 *
 * @typedef {Object} Layer
 * @property {(ctx: CanvasRenderingContext2D, scene: Scene) => void} draw
 * @property {(scene: Scene) => void} [update] called before drawing
 * @property {(event: {type: string, value: number, x: number, y: number}) => void} [onEvent]
 * @property {() => void} [reset] called when a new run starts
 * @property {(width: number, height: number) => void} [resize]
 */

const TILE_WIDTH = 1600;
// tiles overlap a little, or their shared edge shows as a thin line
const TILE_OVERLAP = 6;

const WORRY_GAP = 24;

export class SkyLayer {
    #sun;

    /** @param {{rays: import('../art/Bake.js').Sprite, happy: object, worried: object}} sun */
    constructor(sun) {
        this.#sun = sun;
    }

    draw(ctx, { sim, camera, colors, time }) {
        ctx.fillStyle = colors.sky;
        ctx.fillRect(0, 0, camera.width, camera.height);

        const size = camera.height * 0.42;
        const x = camera.width * 0.8;
        const y = camera.height * 0.24;
        const half = size / 2;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * 0.25);
        ctx.drawImage(this.#sun.rays.canvas, -half, -half, size, size);
        ctx.restore();

        const face = sim.gap < WORRY_GAP ? this.#sun.worried : this.#sun.happy;
        ctx.drawImage(face.canvas, x - half, y - half, size, size);
    }
}

/** A repeating band of scenery that scrolls slower than the ground. */
class ParallaxLayer {
    #parallax;
    #colorKey;
    #path = null;

    constructor(parallax, colorKey) {
        this.#parallax = parallax;
        this.#colorKey = colorKey;
    }

    /** @param {number} width @param {number} height @returns {Path2D} */
    buildPath(width, height) {
        throw new Error(`buildPath not implemented for ${width}x${height}`);
    }

    paintTile(ctx, path) {
        ctx.fill(path);
    }

    resize(width, height) {
        this.#path = this.buildPath(width, height);
    }

    draw(ctx, { camera, colors }) {
        const offset = camera.scrollFor(this.#parallax) % TILE_WIDTH;
        ctx.fillStyle = colors[this.#colorKey];
        for (let x = -offset; x < camera.width; x += TILE_WIDTH) {
            ctx.save();
            ctx.translate(x - TILE_WIDTH, 0);
            this.paintTile(ctx, this.#path);
            ctx.translate(TILE_WIDTH, 0);
            this.paintTile(ctx, this.#path);
            ctx.restore();
        }
    }
}

/** Sprites placed along a repeating band. */
export class SpriteBandLayer {
    #parallax;
    #items;
    #groundAt;
    #artScale;

    /**
     * @param {number} parallax
     * @param {{sprite: import('../art/Bake.js').Sprite, x: number}[]} items
     * @param {number} artScale art units to screen, as a share of the screen height
     * @param {(x: number, height: number) => number} groundAt where an item stands
     */
    constructor(parallax, items, artScale, groundAt) {
        this.#parallax = parallax;
        this.#items = items;
        this.#artScale = artScale;
        this.#groundAt = groundAt;
    }

    draw(ctx, { camera }) {
        const scale = camera.height * this.#artScale;
        const offset = camera.scrollFor(this.#parallax) % TILE_WIDTH;

        for (const tile of [-TILE_WIDTH, 0, TILE_WIDTH]) {
            for (const { sprite, x } of this.#items) {
                const screenX = x + tile - offset;
                if (screenX < -sprite.width * scale || screenX > camera.width + sprite.width * scale) continue;
                drawSprite(ctx, sprite, screenX, this.#groundAt(x, camera.height), scale);
            }
        }
    }
}

export class HillsLayer extends ParallaxLayer {
    #baseShare;
    #amplitudeShare;
    #waves;
    #outline = null;

    /**
     * @param {number} parallax
     * @param {string} colorKey
     * @param {number} baseShare height of the band, as a share of the screen
     * @param {number} amplitudeShare
     * @param {number[]} waves whole wave counts, so the band tiles without a seam
     */
    constructor(parallax, colorKey, baseShare, amplitudeShare, waves) {
        super(parallax, colorKey);
        this.#baseShare = baseShare;
        this.#amplitudeShare = amplitudeShare;
        this.#waves = waves;
    }

    /** @returns {number} height of the band on screen at a tile position */
    surfaceAt = (x, height) => {
        const [first, second] = this.#waves;
        const t = (x / TILE_WIDTH) * Math.PI * 2;
        return height * this.#baseShare
            - height * this.#amplitudeShare * (Math.sin(t * first) + 0.5 * Math.sin(t * second + 1));
    };

    buildPath(_width, height) {
        const line = new Path2D();
        line.moveTo(-TILE_OVERLAP, this.surfaceAt(-TILE_OVERLAP, height));
        for (let x = -TILE_OVERLAP; x <= TILE_WIDTH + TILE_OVERLAP; x += 6) {
            line.lineTo(x, this.surfaceAt(x, height));
        }
        this.#outline = line;

        const area = new Path2D(line);
        area.lineTo(TILE_WIDTH + TILE_OVERLAP, height);
        area.lineTo(-TILE_OVERLAP, height);
        area.closePath();
        return area;
    }

    // Only the top is inked: the sides of a tile must not show.
    paintTile(ctx, path) {
        ctx.fill(path);
        ctx.strokeStyle = Ink.line;
        ctx.lineWidth = 1.5;
        ctx.stroke(this.#outline);
    }
}

export class PaperGrainLayer {
    #grain;
    #pattern = null;

    /** @param {HTMLCanvasElement} grain */
    constructor(grain) {
        this.#grain = grain;
    }

    draw(ctx, { camera }) {
        this.#pattern ??= ctx.createPattern(this.#grain, 'repeat');
        ctx.fillStyle = this.#pattern;
        ctx.fillRect(0, 0, camera.width, camera.height);
    }
}

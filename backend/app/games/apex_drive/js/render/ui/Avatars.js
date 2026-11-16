import { makeCanvas } from '../canvas.js';
import { drawText } from '../PixelFont.js';
import { UI } from './widgets.js';

/**
 * Players' Steem avatars, as small pixel portraits: each is loaded once from
 * the platform's image service, then shrunk to the size asked (the frame
 * blows it up with square pixels, so it looks like the rest of the game).
 * Until it has loaded, or for a player with no Steem name, a portrait is
 * a tile of the player's own colour with their initial.
 *
 * The images come from another site: drawn, they mark the frame as not to
 * be read back, which the game never does.
 *
 * @typedef {{name: string, steem: string|null}} Player
 */

/** Where a Steem avatar is served (as the platform shows them). */
export function avatarUrl(steem) {
    return `https://steemitimages.com/u/${encodeURIComponent(steem)}/avatar/small`;
}

/** The tile colours, picked by the name: the same player always gets the same one. */
const TILES = ['#2a6cff', '#e8721c', '#9a3ad8', '#2ec24a', '#d22f4a', '#1a8496', '#c8a020', '#6a6a80'];

export function tileColor(name) {
    let hash = 0;
    for (const letter of String(name)) hash = Math.imul(hash ^ letter.codePointAt(0), 0x01000193);
    return TILES[(hash >>> 0) % TILES.length];
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`no avatar at ${url}`));
        image.src = url;
    });
}

/** The image shrunk to size x size, smoothly (a downscale), on a canvas of its own. */
function shrink(image, size) {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, size, size);
    return canvas;
}

export class Avatars {
    /** steem name -> {image: null|Image, failed: boolean, sizes: Map<number, canvas>} */
    #known = new Map();
    #load;
    #shrink;

    /**
     * @param {{load?: (url: string) => Promise<object>, shrink?: (image: object, size: number) => object}} [io]
     *   how images are loaded and shrunk (the tests pass their own)
     */
    constructor({ load = loadImage, shrink: shrinkImage = shrink } = {}) {
        this.#load = load;
        this.#shrink = shrinkImage;
    }

    /**
     * A player's portrait at `size` pixels, or null while it loads or when there
     * is none (asking starts the load, once).
     * @param {string|null} steem
     */
    portrait(steem, size) {
        if (!steem) return null;
        let known = this.#known.get(steem);
        if (!known) {
            known = { image: null, failed: false, sizes: new Map() };
            this.#known.set(steem, known);
            this.#load(avatarUrl(steem)).then(
                (image) => { known.image = image; },
                () => { known.failed = true; },
            );
        }
        if (!known.image) return null;
        if (!known.sizes.has(size)) known.sizes.set(size, this.#shrink(known.image, size));
        return known.sizes.get(size);
    }
}

/**
 * Draws a player's portrait, framed, with its top left at (x, y): their
 * Steem avatar, else their tile and initial.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Avatars} avatars
 * @param {Player} player
 */
export function drawAvatar(ctx, avatars, player, x, y, size) {
    ctx.fillStyle = UI.ink;
    ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
    const portrait = avatars.portrait(player.steem, size);
    if (portrait) {
        ctx.drawImage(portrait, x, y);
        return;
    }
    ctx.fillStyle = tileColor(player.name);
    ctx.fillRect(x, y, size, size);
    const initial = String(player.name).slice(0, 1) || '?';
    drawText(ctx, initial, x + Math.floor((size - 5) / 2), y + Math.floor((size - 7) / 2), { color: UI.cream });
}

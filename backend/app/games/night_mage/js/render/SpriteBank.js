import { ACTORS, CELEBRATION, FRAMES } from '../config/Sprites.js';
import { loadImage } from './loadImage.js';


/** A copy of a sheet painted flat in one colour (hit flashes, silhouettes). */
function tinted(image, color) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
}

/**
 * Every sprite sheet, loaded once. Draws a frame of an actor's animation with
 * its feet (or centre) on a world point.
 */
export class SpriteBank {
    #sheets = new Map();
    #flashes = new Map();
    celebration = null;

    /** @param {(done: number, total: number) => void} [onProgress] */
    async load(onProgress = () => {}) {
        const jobs = [];
        for (const [actor, spec] of Object.entries(ACTORS)) {
            for (const anim of spec.anims) {
                for (const side of ['LEFT', 'RIGHT']) jobs.push({ key: `${actor}/${anim}_${side}`, src: `${spec.folder}/${anim}_${side}.webp` });
            }
        }
        let done = 0;
        await Promise.all(jobs.map(async ({ key, src }) => {
            this.#sheets.set(key, await loadImage(src));
            onProgress(++done, jobs.length + 1);
        }));
        this.celebration = await loadImage(CELEBRATION.file);
        onProgress(jobs.length + 1, jobs.length + 1);
    }

    #sheet(actor, anim, facing, flash) {
        const key = `${actor}/${anim}_${facing < 0 ? 'LEFT' : 'RIGHT'}`;
        const sheet = this.#sheets.get(key);
        if (!flash || !sheet) return sheet;
        if (!this.#flashes.has(key)) this.#flashes.set(key, tinted(sheet, '#ffffff'));
        return this.#flashes.get(key);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{actor: string, anim: string, frame: number, facing: number, x: number, y: number, flash?: boolean, scale?: number}} what
     */
    draw(ctx, { actor, anim, frame, facing, x, y, flash = false, scale = 1 }) {
        const spec = ACTORS[actor];
        const sheet = this.#sheet(actor, anim, facing, false);
        if (!sheet) return;
        const frameWidth = sheet.width / FRAMES;
        const sx = Math.floor(Math.min(FRAMES - 1, Math.max(0, frame)) * frameWidth);
        const sw = Math.floor(frameWidth);
        const k = spec.scale * scale;
        const w = sw * k;
        const h = sheet.height * k;
        const top = spec.anchor === 'center' ? y - h / 2 : y - spec.feet * k;
        ctx.drawImage(sheet, sx, 0, sw, sheet.height, x - w / 2, top, w, h);
        if (flash) {
            ctx.save();
            ctx.globalAlpha *= 0.75;
            ctx.drawImage(this.#sheet(actor, anim, facing, true), sx, 0, sw, sheet.height, x - w / 2, top, w, h);
            ctx.restore();
        }
    }

    /** A frame of the mage's victory dance, `size` world pixels tall, feet on (x, y). */
    drawCelebration(ctx, frame, x, y, size) {
        const image = this.celebration;
        if (!image) return;
        const { columns, rows } = CELEBRATION;
        const cell = frame % (columns * rows);
        const fw = image.width / columns;
        const fh = image.height / rows;
        const k = size / fh;
        ctx.drawImage(image, Math.floor((cell % columns) * fw), Math.floor(Math.floor(cell / columns) * fh), Math.floor(fw), Math.floor(fh),
            x - (fw * k) / 2, y - fh * k, fw * k, fh * k);
    }
}

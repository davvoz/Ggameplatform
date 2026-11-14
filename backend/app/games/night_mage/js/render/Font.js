/**
 * The game's lettering: Pixelify Sans (SIL OFL, `assets/font/OFL.txt`), a
 * readable pixel face, drawn with a dark outline. `size` is the height of the
 * capitals in world pixels and `y` the top of the capitals, so layouts do not
 * depend on the font's own metrics.
 */
const FAMILY = 'Pixelify Sans';
const STACK = `"${FAMILY}", system-ui, -apple-system, "Segoe UI", sans-serif`;
const FACES = [
    { file: 'assets/font/pixelify-600-latin.woff2', range: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212' },
    { file: 'assets/font/pixelify-600-latin-ext.woff2', range: 'U+0100-024F, U+1E00-1EFF, U+20A0-20CF, U+2C60-2C7F, U+A720-A7FF' },
];
const OUTLINE = '#1a0a2e';
/** Capital height of the face, as a fraction of its font size. */
const CAP = 0.7;

function setFace(ctx, size) {
    ctx.font = `600 ${Math.round((size / CAP) * 10) / 10}px ${STACK}`;
}

export class Font {
    #scratch = null;

    async load() {
        if (!globalThis.FontFace || !document.fonts) return;
        await Promise.all(FACES.map(async ({ file, range }) => {
            const face = new FontFace(FAMILY, `url(${file})`, { weight: '600', unicodeRange: range });
            document.fonts.add(await face.load());
        }));
    }

    /** Width of a text at a capital height, in world pixels. */
    measure(text, size, ctx = this.#context()) {
        ctx.save();
        setFace(ctx, size);
        const width = ctx.measureText(text).width;
        ctx.restore();
        return width;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} x
     * @param {number} y top of the capitals
     * @param {{size?: number, color?: string, align?: 'left'|'center'|'right', alpha?: number, outline?: boolean}} [style]
     */
    draw(ctx, text, x, y, { size = 20, color = '#ffd27a', align = 'left', alpha = 1, outline = true } = {}) {
        if (alpha <= 0) return;
        if (alpha < 1) {
            // fading text is painted whole first, or the outline would show through the letters
            this.#drawFaded(ctx, text, x, y, { size, color, align, alpha, outline });
            return;
        }
        paint(ctx, text, x, y, { size, color, align, outline });
    }

    #drawFaded(ctx, text, x, y, { size, color, align, alpha, outline }) {
        const pixels = ctx.getTransform().a || 1;
        const pad = Math.ceil(size / 3) + 2;
        const width = this.measure(text, size, ctx);
        const w = Math.ceil((width + pad * 2) * pixels);
        const h = Math.ceil((size + pad * 2) * pixels);
        this.#scratch ??= document.createElement('canvas');
        const scratch = this.#scratch;
        scratch.width = Math.max(scratch.width, w);
        scratch.height = Math.max(scratch.height, h);
        const sctx = scratch.getContext('2d');
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.clearRect(0, 0, w, h);
        sctx.setTransform(pixels, 0, 0, pixels, 0, 0);
        paint(sctx, text, pad, pad, { size, color, align: 'left', outline });
        let left = x;
        if (align === 'center') left = x - width / 2;
        else if (align === 'right') left = x - width;
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.drawImage(scratch, 0, 0, w, h, left - pad, y - pad, w / pixels, h / pixels);
        ctx.restore();
    }

    #context() {
        this.#scratch ??= document.createElement('canvas');
        return this.#scratch.getContext('2d');
    }
}

function paint(ctx, text, x, y, { size, color, align, outline }) {
    ctx.save();
    setFace(ctx, size);
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    if (outline) {
        // copies shifted around the letters, not a stroke: a stroke would close small openings (C, e)
        const o = Math.max(1, size / 11);
        ctx.fillStyle = OUTLINE;
        for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o]]) {
            ctx.fillText(text, x + dx, y + size + dy);
        }
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + size);
    ctx.restore();
}

/** A player's name, in the same face (other scripts fall back to the system font). */
export function drawName(ctx, name, x, y, { size = 16, color = '#ffffff', align = 'center' } = {}) {
    paint(ctx, name, x, y, { size: size * CAP, color, align, outline: true });
}

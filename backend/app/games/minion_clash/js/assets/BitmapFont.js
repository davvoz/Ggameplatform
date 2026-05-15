/**
 * BitmapFont — chunky chibi font sourced from a fixed-grid spritesheet.
 *
 * Manifest shape (data/font.json):
 *   src          — path to font PNG
 *   cellW/cellH  — pixel size of each glyph cell on the sheet
 *   cols         — columns in the grid (rows derived from glyph count)
 *   firstChar    — ASCII code of the first glyph (cell 0)
 *   lastChar     — ASCII code of the last glyph
 *   glyphHeightPx — visible glyph height inside a cell, used to scale
 *                   "Npx" font hints from legacy callers
 *   advancePx    — horizontal advance per glyph in source px (monospaced)
 *
 * Tinting: drawing with a non-default `color` produces a sheet recolored
 * via `source-in`. Cached by color string. The default (no color) keeps
 * the baked multi-color art (cream/gold/cyan + outline + highlight).
 */
export class BitmapFont {
    static async load(manifestUrl) {
        const res = await fetch(manifestUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(`BitmapFont: failed to fetch ${manifestUrl} (${res.status})`);
        const m = await res.json();
        const baseDir = manifestUrl.includes('/')
            ? manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1).replace(/data\/$/, '')
            : '';
        const image = await BitmapFont._loadImage(baseDir + m.src);
        return new BitmapFont({ image, manifest: m });
    }

    constructor({ image, manifest }) {
        this._image = image;
        this.cellW = manifest.cellW;
        this.cellH = manifest.cellH;
        this._cols = manifest.cols;
        this._firstChar = manifest.firstChar;
        this._lastChar = manifest.lastChar;
        this._glyphHeightPx = manifest.glyphHeightPx ?? this.cellH;
        this._advancePx = manifest.advancePx ?? this.cellW;
        this._tintCache = new Map();
    }

    /** Convert a "Npx ..." CSS font hint into a render scale. */
    scaleForPx(px) {
        if (!Number.isFinite(px) || px <= 0) return 1;
        return px / this._glyphHeightPx;
    }

    measure(str, scale = 1) {
        return {
            w: str.length * this._advancePx * scale,
            h: this.cellH * scale
        };
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} str
     * @param {number} x
     * @param {number} y
     * @param {{
     *   scale?:number,
     *   color?:string|null,
     *   align?:'left'|'center'|'right',
     *   baseline?:'top'|'middle'|'alphabetic',
     *   outline?:{color?:string,width?:number}|null
     * }} [opts]
     */
    draw(ctx, str, x, y, opts = {}) {
        const scale    = opts.scale    ?? 1;
        const align    = opts.align    ?? 'left';
        const baseline = opts.baseline ?? 'top';
        const color    = opts.color    ?? null;
        const outline  = opts.outline  ?? null;
        const w = this.measure(str, scale).w;
        const h = this.cellH * scale;

        let startX = x;
        if (align === 'center') startX = x - w / 2;
        else if (align === 'right') startX = x - w;

        let dy = y;
        if (baseline === 'middle') dy = y - h / 2;
        else if (baseline === 'alphabetic') dy = y - this._glyphHeightPx * scale;

        const advance = this._advancePx * scale;
        const drawW   = Math.round(this.cellW * scale);
        const drawH   = Math.round(this.cellH * scale);
        const baseY   = Math.round(dy);

        // Pre-compute glyph source/dest positions once (used for both passes).
        const glyphs = [];
        let dx = startX;
        for (let i = 0; i < str.length; i++) {
            const code = str.codePointAt(i);
            if (code >= this._firstChar && code <= this._lastChar) {
                const idx = code - this._firstChar;
                glyphs.push({
                    sx: (idx % this._cols) * this.cellW,
                    sy: Math.floor(idx / this._cols) * this.cellH,
                    dx: Math.round(dx)
                });
            }
            dx += advance;
        }

        const prevSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;

        // Outline pass: stamp each glyph at 8 offsets using a tinted sheet.
        if (outline) {
            this._drawOutline(ctx, glyphs, outline, drawW, drawH, baseY);
        }

        // Main pass — draws the actual glyph art on top.
        const sheet = color ? this._getTinted(color) : this._image;
        for (const g of glyphs) {
            ctx.drawImage(sheet,
                g.sx, g.sy, this.cellW, this.cellH,
                g.dx, baseY, drawW, drawH);
        }

        ctx.imageSmoothingEnabled = prevSmoothing;
    }

    /** Renders each glyph at 8 surrounding offsets in the outline colour. */
    _drawOutline(ctx, glyphs, outline, drawW, drawH, baseY) {
        const outColor = outline.color ?? 'rgba(0,0,0,0.95)';
        const outOff   = Math.max(1, Math.round(outline.width ?? 1));
        const outSheet = this._getTinted(outColor);
        const offsets  = [
            [-outOff, 0], [outOff, 0], [0, -outOff], [0, outOff],
            [-outOff, -outOff], [outOff, -outOff], [-outOff, outOff], [outOff, outOff]
        ];
        for (const [ox, oy] of offsets) {
            for (const g of glyphs) {
                ctx.drawImage(outSheet,
                    g.sx, g.sy, this.cellW, this.cellH,
                    g.dx + ox, baseY + oy, drawW, drawH);
            }
        }
    }

    _getTinted(color) {
        const cached = this._tintCache.get(color);
        if (cached) return cached;
        const off = document.createElement('canvas');
        off.width = this._image.width;
        off.height = this._image.height;
        const c = off.getContext('2d');
        c.drawImage(this._image, 0, 0);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = color;
        c.fillRect(0, 0, off.width, off.height);
        this._tintCache.set(color, off);
        return off;
    }

    static _loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`BitmapFont: image load failed: ${url}`));
            img.src = url;
        });
    }
}

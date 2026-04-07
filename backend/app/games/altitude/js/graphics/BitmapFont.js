/**
 * BitmapFont.js — bitmap sprite-sheet font renderer
 *
 * Uppercase sheet : assets/fonts/alphabet_MAIUSC.png  →  6 cols × 5 rows, A-Z
 * Lowercase sheet : assets/fonts/alphabet_MINUSC.png  →  6 cols × 5 rows, a-z
 *
 * Both sheets share the same grid layout (26 glyphs + 4 empty cells).
 * The PNG white backgrounds are removed once via flood-fill from the four
 * corners, so letters render correctly on any background.
 *
 * Usage:
 *   import { bitmapFont } from '../graphics/BitmapFont.js';
 *
 *   // Preload once (called by Game.js#init):
 *   await bitmapFont.load();
 *
 *   // Draw text — preserves case (uppercase → MAIUSC sheet, lowercase → MINUSC sheet):
 *   bitmapFont.drawText(ctx, 'ALTITUDE', x, y, 32);
 *   bitmapFont.drawText(ctx, 'Game Over', cx, cy, 48, { align: 'center', letterSpacing: 2 });
 */

// ── Sheet constants ────────────────────────────────────────────────────────────
const COLS        = 6;
const ROWS        = 5;
const SHEET_UPPER = new URL('../../assets/fonts/alphabet_MAIUSC_cartoon_green.png',    import.meta.url).href;
const SHEET_LOWER = new URL('../../assets/fonts/alphabet_MINUSC_cartoon_green.png',    import.meta.url).href;
const SHEET_SYM   = new URL('../../assets/fonts/numbers_simbols_green.png',    import.meta.url).href;

/**
 * Fraction of cell size to inset when slicing sym-sheet glyphs.
 * Removes the dark letterboard separator lines at cell edges.
 */
const SYM_CELL_PAD = 0.05;

/**
 * Maps each digit / symbol character to its flat grid index in the sym sheet.
 * index = row * COLS + col
 *
 * Grid layout (6 cols × 5 rows):
 *   Row 0: 1  2  3  4  5  6
 *   Row 1: 7  8  9  0  _  _
 *   Row 2: +  -  ×  ÷  =  _
 *   Row 3: !  ?  ¿  ,  :  ;
 *   Row 4: (  )  [  ]  {  }
 */
const SYMBOL_MAP = new Map([
    // Digits
    ['1', 0], ['2', 1], ['3', 2], ['4', 3], ['5', 4], ['6', 5],
    ['7', 6], ['8', 7], ['9', 8], ['0', 9],
    // Math operators
    ['+', 12], ['-', 13], ['*', 14], ['\u00d7', 14],
    ['/', 15], ['\u00f7', 15], ['=', 16],
    // Punctuation
    ['!', 18], ['?', 19], ['\u00bf', 20], [',', 21], [':', 22], [';', 23],
    // Brackets
    ['(', 24], [')', 25], ['[', 26], [']', 27], ['{', 28], ['}', 29],
]);

// ── BitmapFont class ───────────────────────────────────────────────────────────
class BitmapFont {
    /** Processed offscreen canvases with transparent backgrounds */
    #sheetUpper = null;
    #sheetLower = null;
    #sheetSym   = null;
    /** Resolved Promise once all sheets are loaded */
    #loading = null;
    /** Reusable offscreen canvases for tinted text (avoid per-frame allocation) */
    #tintTmp1 = null;
    #tintCtx1 = null;
    #tintTmp2 = null;
    #tintCtx2 = null;

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Load and pre-process all three sprite sheets. Safe to call multiple times.
     * @returns {Promise<void>}
     */
    load() {
        if (this.#loading) return this.#loading;
        const loadOne = (url, gridSeed = false) => new Promise((resolve) => {
            const img = new Image();
            img.onload  = () => resolve(this.#process(img, gridSeed));
            img.onerror = () => { console.warn('[BitmapFont] Failed to load:', url); resolve(null); };
            img.src = url;
        });
        this.#loading = Promise.all([
            loadOne(SHEET_UPPER),
            loadOne(SHEET_LOWER),
            loadOne(SHEET_SYM, true),   // grid-seeded flood-fill: JPG has dark cell borders
        ]).then(([upper, lower, sym]) => {
            this.#sheetUpper = upper;
            this.#sheetLower = lower;
            this.#sheetSym   = sym;
        });
        return this.#loading;
    }

    /** True once all sheets are ready to use */
    get ready() { return this.#sheetUpper !== null && this.#sheetLower !== null && this.#sheetSym !== null; }

    /**
     * Width in px of a single character at the given charHeight.
     * Falls back to 0.67 aspect ratio if sheets not yet loaded.
     */
    charWidth(charHeight) {
        const sheet = this.#sheetUpper ?? this.#sheetLower;
        if (!sheet) return charHeight * 0.67;
        return charHeight * (sheet.width / COLS) / (sheet.height / ROWS);
    }

    /**
     * Total pixel width of a rendered string.
     * Spaces = 0.4 × charHeight. Case is respected.
     * @param {string} text
     * @param {number} charHeight
     * @param {number} [letterSpacing=0]  extra px between each glyph
     */
    measureWidth(text, charHeight, letterSpacing = 0) {
        const cw     = this.charWidth(charHeight);
        const spaceW = charHeight * 0.4;
        return this.#measureRaw(text, cw, spaceW, letterSpacing);
    }

    /**
     * Draw a string using the bitmap font.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {string}  text
     * @param {number}  x             Left edge (or centre / right, depending on align)
     * @param {number}  y             Vertical centre of the glyphs
     * @param {number}  charHeight    Pixel height of each glyph
     * @param {object}  [opts]
     * @param {'left'|'center'|'right'} [opts.align='left']
     * @param {number}  [opts.letterSpacing=0]  Extra px between glyphs
     * @param {number}  [opts.alpha=1]           Overall opacity (multiplied with current globalAlpha)
     * @param {number}  [opts.scaleX=1]          Horizontal scale for squeeze/stretch effects
     * @param {string|null} [opts.color=null]    CSS color to tint the white letter fill.
     *   White pixels become that color; black outline pixels stay black; transparent bg stays clear.
     *   e.g. '#00ffaa', 'rgb(255,80,80)', null = original B&W
     */
    drawText(ctx, text, x, y, charHeight, {
        align         = 'left',
        letterSpacing = 0,
        alpha         = 1,
        scaleX        = 1,
        color         = null,
    } = {}) {
        if (!this.#sheetUpper && !this.#sheetLower) return;

        const cw     = this.charWidth(charHeight) * scaleX;
        const spaceW = charHeight * 0.4 * scaleX;
        const totalW = this.#measureRaw(text, cw, spaceW, letterSpacing);

        let originX = x;
        if (align === 'center') originX = x - totalW / 2;
        if (align === 'right')  originX = x - totalW;

        const originY = y - charHeight / 2;   // centre → top edge
        const prevA   = ctx.globalAlpha;
        ctx.globalAlpha = prevA * alpha;

        if (color !== null) {
            this.#tintedDraw(ctx, text, originX, originY, charHeight, cw, spaceW, letterSpacing, color, totalW);
        } else {
            this.#renderGlyphs(ctx, text, originX, originY, charHeight, cw, spaceW, letterSpacing);
        }

        ctx.globalAlpha = prevA;
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Render glyphs directly onto ctx.
     * originX/originY are the top-left of the text block (not centre).
     */
    #renderGlyphs(ctx, text, originX, originY, charHeight, cw, spaceW, letterSpacing) {
        let drawX = originX;
        for (const ch of text) {
            const isLower = ch >= 'a' && ch <= 'z';
            const isUpper = ch >= 'A' && ch <= 'Z';
            if (isUpper || isLower) {
                const sheet = isLower ? this.#sheetLower : this.#sheetUpper;
                const src   = sheet ?? (isLower ? this.#sheetUpper : this.#sheetLower);
                if (src) {
                    const code  = ch.toUpperCase().charCodeAt(0) - 65;
                    const col   = code % COLS;
                    const row   = (code / COLS) | 0;
                    const cellW = src.width  / COLS;
                    const cellH = src.height / ROWS;
                    ctx.drawImage(src, col * cellW, row * cellH, cellW, cellH,
                                  drawX, originY, cw, charHeight);
                }
                drawX += cw + letterSpacing;
            } else if (SYMBOL_MAP.has(ch)) {
                const src = this.#sheetSym;
                if (src) {
                    const idx   = SYMBOL_MAP.get(ch);
                    const col   = idx % COLS;
                    const row   = (idx / COLS) | 0;
                    const cellW = src.width  / COLS;
                    const cellH = src.height / ROWS;
                    const padX  = cellW * SYM_CELL_PAD;
                    const padY  = cellH * SYM_CELL_PAD;
                    ctx.drawImage(src,
                                  col * cellW + padX, row * cellH + padY,
                                  cellW - 2 * padX,   cellH - 2 * padY,
                                  drawX, originY, cw, charHeight);
                }
                drawX += cw + letterSpacing;
            } else if (ch === ' ') {
                drawX += spaceW + letterSpacing;
            }
        }
    }

    /**
     * Render text with a color tint applied to the white letter-fill.
     *
     * Technique (2-pass offscreen canvas):
     *   1. Render raw glyphs (white fill, black outline, transparent bg) → tmp1
     *   2. Create tmp2 filled with the target color
     *   3. multiply-draw tmp1 onto tmp2  → white areas become color, black stays black
     *   4. destination-in-draw tmp1 onto tmp2 → trim away the color spill outside glyphs
     *   5. Composite tmp2 onto the main canvas
     */
    #tintedDraw(ctx, text, originX, originY, charHeight, cw, spaceW, letterSpacing, color, totalW) {
        const tw = Math.ceil(totalW) + 2 || 2;
        const th = Math.ceil(charHeight) + 2;

        // Reuse offscreen canvases — avoids document.createElement per frame
        if (!this.#tintTmp1) {
            this.#tintTmp1 = document.createElement('canvas');
            this.#tintCtx1 = this.#tintTmp1.getContext('2d');
            this.#tintTmp2 = document.createElement('canvas');
            this.#tintCtx2 = this.#tintTmp2.getContext('2d');
        }

        // Grow canvas when needed (setting width/height clears it).
        // When reusing a larger canvas, clear the FULL surface to avoid stale pixels.
        if (this.#tintTmp1.width < tw || this.#tintTmp1.height < th) {
            this.#tintTmp1.width  = Math.max(this.#tintTmp1.width, tw);
            this.#tintTmp1.height = Math.max(this.#tintTmp1.height, th);
        } else {
            this.#tintCtx1.clearRect(0, 0, this.#tintTmp1.width, this.#tintTmp1.height);
        }
        if (this.#tintTmp2.width < tw || this.#tintTmp2.height < th) {
            this.#tintTmp2.width  = Math.max(this.#tintTmp2.width, tw);
            this.#tintTmp2.height = Math.max(this.#tintTmp2.height, th);
        } else {
            this.#tintCtx2.clearRect(0, 0, this.#tintTmp2.width, this.#tintTmp2.height);
        }

        const tc1 = this.#tintCtx1;
        const tc2 = this.#tintCtx2;
        tc1.globalCompositeOperation = 'source-over';
        tc2.globalCompositeOperation = 'source-over';

        // tmp1 — raw glyphs, transparent background
        this.#renderGlyphs(tc1, text, 0, 0, charHeight, cw, spaceW, letterSpacing);

        // Step A: fill with target color
        tc2.fillStyle = color;
        tc2.fillRect(0, 0, tw, th);

        // Step B: multiply — white × color = color; black × color = black
        tc2.globalCompositeOperation = 'multiply';
        tc2.drawImage(this.#tintTmp1, 0, 0);

        // Step C: destination-in — cut away pixels where glyphs had no alpha
        tc2.globalCompositeOperation = 'destination-in';
        tc2.drawImage(this.#tintTmp1, 0, 0);

        // Composite only the needed region onto main canvas (crop away any stale area)
        ctx.drawImage(this.#tintTmp2, 0, 0, tw, th, originX, originY, tw, th);
    }

    /** measureWidth variant that accepts pre-computed cw/spaceW to avoid redundant calls */
    #measureRaw(text, cw, spaceW, letterSpacing) {
        let w = 0;
        for (const ch of text) {
            if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || SYMBOL_MAP.has(ch)) {
                w += cw + letterSpacing;
            } else if (ch === ' ') {
                w += spaceW + letterSpacing;
            }
        }
        return w;
    }

    /**
     * Load image onto an offscreen canvas, then flood-fill transparent any
     * white-ish background pixel reachable from seed points.
     *
     * @param {HTMLImageElement} img
     * @param {boolean} gridSeed  When true, seeds from the interior corners of every
     *   grid cell instead of the image corners. Required for sheets (like the sym JPG)
     *   that have dark separator lines at the image edges, which would block a
     *   corner-seeded fill.
     */
    #process(img, gridSeed = false) {
        const W = img.naturalWidth;
        const H = img.naturalHeight;
        const canvas  = document.createElement('canvas');
        canvas.width  = W;
        canvas.height = H;
        const ctx  = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, W, H);
        const px      = imgData.data;   // Uint8ClampedArray, 4 bytes per pixel
        const N       = W * H;
        const visited = new Uint8Array(N);

        // A pixel counts as "background" if all channels are bright.
        // Threshold 200 (not 225) is safe for JPEG sheets: white compresses to ~210-255,
        // while black outline cores are 0-30 and anti-alias edges rarely exceed 180.
        const isLight = (i4) => px[i4] > 200 && px[i4 + 1] > 200 && px[i4 + 2] > 200;

        // Iterative flood-fill (stack-based BFS)
        const queue = [];
        const seed  = (xi, yi) => {
            xi = Math.round(xi); yi = Math.round(yi);
            if (xi < 0 || xi >= W || yi < 0 || yi >= H) return;
            const i = yi * W + xi;
            if (!visited[i] && isLight(i * 4)) { visited[i] = 1; queue.push(i); }
        };

        if (gridSeed) {
            // Interior cell seeding for sheets with thick physical borders (sym sheet).
            // Seeds are placed at 15% inset inside each cell so they land safely in the
            // white background region, not on the dark separator lines.
            const cellW = W / COLS;
            const cellH = H / ROWS;
            const iX = cellW * 0.15;
            const iY = cellH * 0.15;
            for (let row = 0; row < ROWS; row++) {
                for (let col = 0; col < COLS; col++) {
                    const x0 = col * cellW,       y0 = row * cellH;
                    const x1 = (col + 1) * cellW, y1 = (row + 1) * cellH;
                    const mx = (x0 + x1) / 2,     my = (y0 + y1) / 2;
                    seed(x0 + iX, y0 + iY); seed(x1 - iX, y0 + iY);
                    seed(x0 + iX, y1 - iY); seed(x1 - iX, y1 - iY);
                    seed(mx,      y0 + iY); seed(mx,      y1 - iY);
                    seed(x0 + iX, my);      seed(x1 - iX, my);
                }
            }
        } else {
            // Border seeding for letter sheets (PNG or JPEG, no physical separators).
            // Seeds are placed every ~5% along all 4 image edges (not just 4 corners).
            // This guarantees at least one seed lands on accessible white background even
            // when JPEG compression darkens individual corner pixels below threshold.
            // Seeds are always on the image border → they can NEVER land inside a letter's
            // enclosed white fill (which is surrounded by black outlines), so there is no
            // risk of accidentally flood-filling letter interiors.
            const N = 20;
            for (let i = 0; i <= N; i++) {
                const px_ = Math.round(i / N * (W - 1));
                const py_ = Math.round(i / N * (H - 1));
                seed(px_, 0);     // top edge
                seed(px_, H - 1); // bottom edge
                seed(0,   py_);   // left edge
                seed(W - 1, py_); // right edge
            }
        }

        while (queue.length) {
            const pos = queue.pop();
            px[pos * 4 + 3] = 0;                         // make transparent

            const xi = pos % W;
            const yi = (pos / W) | 0;

            const neighbours = [
                xi > 0     ? pos - 1 : -1,
                xi < W - 1 ? pos + 1 : -1,
                yi > 0     ? pos - W : -1,
                yi < H - 1 ? pos + W : -1,
            ];
            for (const n of neighbours) {
                if (n >= 0 && !visited[n] && isLight(n * 4)) {
                    visited[n] = 1;
                    queue.push(n);
                }
            }
        }

        // Remap green-ink pixels → white so that multiply-blend tinting works correctly.
        // The PNG glyphs are drawn in green (G≈255, R≈0, B≈0); the multiply composite
        // expects white fill so that: white × tintColor = tintColor, black × any = black.
        // Using the green channel as brightness preserves the black outline and anti-alias.
        for (let i = 0; i < N; i++) {
            if (px[i * 4 + 3] === 0) continue;   // already transparent (background)
            const brightness = px[i * 4 + 1];    // green channel → luminance
            px[i * 4 + 0] = brightness;           // R
            px[i * 4 + 1] = brightness;           // G
            px[i * 4 + 2] = brightness;           // B
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }
}

// ── Singleton export ───────────────────────────────────────────────────────────
export const bitmapFont = new BitmapFont();

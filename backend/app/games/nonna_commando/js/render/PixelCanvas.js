/**
 * A small pixel buffer to paint sprites in code, at load time. Everything is
 * drawn with hard pixels (no anti-aliasing), then `outline()` adds the dark
 * contour that gives the game its look. The result becomes a canvas for the
 * sprite bank.
 */

const cache = new Map();

/** '#rrggbb' to a little-endian RGBA word. */
export function rgba(hex) {
    let v = cache.get(hex);
    if (v === undefined) {
        const n = parseInt(hex.slice(1), 16);
        v = (0xff << 24 | (n & 0xff) << 16 | (n >> 8 & 0xff) << 8 | n >> 16) >>> 0;
        cache.set(hex, v);
    }
    return v;
}

export function makeCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

export class PixelCanvas {
    w;
    h;
    data;

    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.data = new Uint32Array(w * h);
    }

    get(x, y) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
        return this.data[y * this.w + x];
    }

    px(x, y, color) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= this.w || y >= this.h || !color) return this;
        this.data[y * this.w + x] = rgba(color);
        return this;
    }

    rect(x, y, w, h, color) {
        x = Math.round(x);
        y = Math.round(y);
        const v = rgba(color);
        const x0 = Math.max(0, x);
        const y0 = Math.max(0, y);
        const x1 = Math.min(this.w, x + Math.round(w));
        const y1 = Math.min(this.h, y + Math.round(h));
        for (let j = y0; j < y1; j++) this.data.fill(v, j * this.w + x0, j * this.w + x1);
        return this;
    }

    /** Erase a rectangle. */
    clear(x, y, w, h) {
        for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) {
            for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.data[j * this.w + i] = 0;
        }
        return this;
    }

    line(x0, y0, x1, y1, color) {
        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0);
        const dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
            this.px(x0, y0, color);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x0 += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y0 += sy;
            }
        }
        return this;
    }

    /** Thick line made of square stamps. */
    stroke(x0, y0, x1, y1, width, color) {
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        const half = (width - 1) / 2;
        for (let i = 0; i <= steps; i++) {
            const x = x0 + ((x1 - x0) * i) / steps;
            const y = y0 + ((y1 - y0) * i) / steps;
            this.rect(Math.round(x - half), Math.round(y - half), width, width, color);
        }
        return this;
    }

    /** Filled ellipse centred on (cx, cy). */
    ellipse(cx, cy, rx, ry, color) {
        const v = rgba(color);
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
            if (y < 0 || y >= this.h) continue;
            const t = (y - cy) / (ry || 0.5);
            if (Math.abs(t) > 1) continue;
            const half = rx * Math.sqrt(1 - t * t);
            const x0 = Math.max(0, Math.round(cx - half));
            const x1 = Math.min(this.w - 1, Math.round(cx + half));
            for (let x = x0; x <= x1; x++) this.data[y * this.w + x] = v;
        }
        return this;
    }

    circle(cx, cy, r, color) {
        return this.ellipse(cx, cy, r, r, color);
    }

    /** Filled polygon, points as [x, y] pairs. */
    poly(points, color) {
        const v = rgba(color);
        let minY = Infinity;
        let maxY = -Infinity;
        for (const [, y] of points) {
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(this.h - 1, Math.ceil(maxY)); y++) {
            const sy = y + 0.5;
            const xs = [];
            for (let i = 0; i < points.length; i++) {
                const [ax, ay] = points[i];
                const [bx, by] = points[(i + 1) % points.length];
                if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
            }
            xs.sort((a, b) => a - b);
            for (let k = 0; k + 1 < xs.length; k += 2) {
                const x0 = Math.max(0, Math.round(xs[k]));
                const x1 = Math.min(this.w - 1, Math.round(xs[k + 1]) - 1);
                for (let x = x0; x <= x1; x++) this.data[y * this.w + x] = v;
            }
        }
        return this;
    }

    /** Checkerboard of two colours: the pixel-art way to blend. */
    dither(x, y, w, h, a, b) {
        for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) this.px(x + i, y + j, (i + j) % 2 === 0 ? a : b);
        }
        return this;
    }

    /** Replace one colour with another in a region (or everywhere). */
    recolor(from, to, x = 0, y = 0, w = this.w, h = this.h) {
        const f = rgba(from);
        const t = rgba(to);
        for (let j = y; j < y + h; j++) {
            for (let i = x; i < x + w; i++) {
                if (this.get(i, j) === f) this.data[j * this.w + i] = t;
            }
        }
        return this;
    }

    /** Dark contour around everything painted, the signature of the style. */
    outline(color, diagonal = false) {
        const v = rgba(color);
        const src = this.data.slice();
        const { w, h } = this;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (src[y * w + x] !== 0) continue;
                const near = (x > 0 && src[y * w + x - 1]) || (x < w - 1 && src[y * w + x + 1])
                    || (y > 0 && src[(y - 1) * w + x]) || (y < h - 1 && src[(y + 1) * w + x])
                    || (diagonal && ((x > 0 && y > 0 && src[(y - 1) * w + x - 1]) || (x < w - 1 && y > 0 && src[(y - 1) * w + x + 1])
                        || (x > 0 && y < h - 1 && src[(y + 1) * w + x - 1]) || (x < w - 1 && y < h - 1 && src[(y + 1) * w + x + 1])));
                if (near) this.data[y * w + x] = v;
            }
        }
        return this;
    }

    /** Copy another pixel canvas on top, skipping transparent pixels. */
    stamp(other, dx, dy, flip = false) {
        for (let y = 0; y < other.h; y++) {
            for (let x = 0; x < other.w; x++) {
                const v = other.data[y * other.w + x];
                if (!v) continue;
                const tx = dx + (flip ? other.w - 1 - x : x);
                const ty = dy + y;
                if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.data[ty * this.w + tx] = v;
            }
        }
        return this;
    }

    toCanvas() {
        const canvas = makeCanvas(this.w, this.h);
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(this.w, this.h);
        new Uint32Array(img.data.buffer).set(this.data);
        ctx.putImageData(img, 0, 0);
        return canvas;
    }
}

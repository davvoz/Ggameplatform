import { TILE_H, TILE_W } from '../../core/iso.js';
import { hash, path } from '../forgeArt.js';
import { perf } from '../perf.js';

const ZOOM_SETTLE_MS = 150;   // performance mode: the ground is redrawn sharp once a pinch has rested this long

/** The ground under everything: sky, basalt tiles and iron rim; in performance mode the tiles are cached and slid under the camera. */
export class GroundLayer {
    constructor(renderer) {
        this.renderer = renderer;
        this.ground = null;
        this.groundDirty = true;
        // performance mode: the tiles are cached around the field and slid or stretched under the
        // camera, so a drag never repaints them; sky and vignette are gradients made once per size
        this.tiles = null;
        this.sky = null;
    }

    drawGround() {
        if (perf.on) {
            this.#fastGround();
            return;
        }
        if (this.groundDirty) {
            this.ground = this.#paintGround();
            this.groundDirty = false;
        }
        this.renderer.ctx.drawImage(this.ground, 0, 0);
    }

    #paintGround() {
        const canvas = this.ground ?? document.createElement('canvas');
        if (canvas.width !== this.renderer.w) canvas.width = this.renderer.w;
        if (canvas.height !== this.renderer.h) canvas.height = this.renderer.h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = this.#skyGradient(ctx);
        ctx.fillRect(0, 0, this.renderer.w, this.renderer.h);
        this.#paintTiles(ctx);
        ctx.fillStyle = this.#vignetteGradient(ctx);
        ctx.fillRect(0, 0, this.renderer.w, this.renderer.h);
        return canvas;
    }

    #skyGradient(ctx) {
        const bg = ctx.createLinearGradient(0, 0, 0, this.renderer.h);
        bg.addColorStop(0, '#0b0605');
        bg.addColorStop(0.65, '#170c07');
        bg.addColorStop(1, '#261006');
        return bg;
    }

    #vignetteGradient(ctx) {
        const vignette = ctx.createRadialGradient(this.renderer.w / 2, this.renderer.h * 0.55, this.renderer.h * 0.25, this.renderer.w / 2, this.renderer.h * 0.55, this.renderer.h * 0.9);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(8,2,0,0.65)');
        return vignette;
    }

    /** The basalt tiles and the iron rim, through the current camera. */
    #paintTiles(ctx) {
        const { grid } = this.renderer.city;
        for (let x = 0; x < grid; x++) {
            for (let y = 0; y < grid; y++) {
                const outside = x === 0 || y === 0 || x === grid - 1 || y === grid - 1;
                const v = (outside ? 15 : 27) + hash(x * 31 + y * 17) * 9;
                this.#tile(ctx, x, y, `rgb(${Math.round(v + 5)}, ${Math.round(v - 2)}, ${Math.round(v - 7)})`, '#0a0605');
            }
        }
        // iron rim around the city limits
        ctx.lineWidth = 3 * this.renderer.camera.scale;
        ctx.strokeStyle = '#3a2a20';
        this.outline(ctx, 1, 1, grid - 2);
        ctx.lineWidth = 1 * this.renderer.camera.scale;
        ctx.strokeStyle = 'rgba(255, 140, 60, 0.35)';
        this.outline(ctx, 1, 1, grid - 2);
    }

    // ── ground, performance mode ───────────────────────────────────────
    /**
     * Same picture as #paintGround, but the tiles live in a cache that only
     * covers the field (plus a margin around the screen when zoomed in): a
     * drag slides it, a pinch stretches it, and it is repainted sharp only
     * when the pinch rests or the view runs past what the cache holds.
     */
    #fastGround() {
        const { ctx, camera } = this.renderer;
        this.sky ??= { sky: this.#skyGradient(ctx), vignette: this.#vignetteGradient(ctx) };
        ctx.fillStyle = this.sky.sky;
        ctx.fillRect(0, 0, this.renderer.w, this.renderer.h);
        let t = this.tiles;
        if (this.#tilesStale(t, camera)) t = this.#cacheTiles(t);
        if (t.w > 0 && t.h > 0) {
            const s = camera.scale / t.cam.scale;
            ctx.drawImage(t.canvas, 0, 0, t.w, t.h,
                camera.ox + s * (t.x0 - t.cam.ox), camera.oy + s * (t.y0 - t.cam.oy), t.w * s, t.h * s);
        }
        ctx.fillStyle = this.sky.vignette;
        ctx.fillRect(0, 0, this.renderer.w, this.renderer.h);
    }

    /**
     * The cache must be repainted: none yet, the view turned, another field,
     * a pinch that has rested (or stretched it too far), or the view runs past it.
     */
    #tilesStale(t, camera) {
        if (t?.rot !== this.renderer.rot || t.grid !== this.renderer.city.grid) return true;
        const k = camera.scale / t.cam.scale;
        const settled = performance.now() - this.renderer.zoomedAt > ZOOM_SETTLE_MS;
        if (k !== 1 && (settled || k < 0.6 || k > 1.7)) return true;
        return !this.#tilesCover(t, camera);
    }

    /** Screen box of the whole field (with room for the rim) through `camera`; turning does not change it. */
    #fieldBox(camera) {
        const g = this.renderer.city.grid;
        const m = 3 * camera.scale + 2;
        const half = (g * TILE_W / 2) * camera.scale;
        return {
            x0: camera.ox - half - m, x1: camera.ox + half + m,
            y0: camera.oy - m, y1: camera.oy + g * TILE_H * camera.scale + m,
        };
    }

    #cacheTiles(previous) {
        const cam = { ...this.renderer.camera };
        const pad = Math.round(0.25 * Math.max(this.renderer.w, this.renderer.h));
        const box = this.#fieldBox(cam);
        const x0 = Math.floor(Math.max(box.x0, -pad));
        const y0 = Math.floor(Math.max(box.y0, -pad));
        const w = Math.max(0, Math.ceil(Math.min(box.x1, this.renderer.w + pad)) - x0);
        const h = Math.max(0, Math.ceil(Math.min(box.y1, this.renderer.h + pad)) - y0);
        const canvas = previous?.canvas ?? document.createElement('canvas');
        canvas.width = Math.max(1, w);       // resizing also clears it
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, -x0, -y0);
        this.#paintTiles(ctx);
        this.tiles = { canvas, cam, rot: this.renderer.rot, grid: this.renderer.city.grid, x0, y0, w, h };
        return this.tiles;
    }

    /** Does the cache hold every part of the field that `camera` shows? */
    #tilesCover(t, camera) {
        const k = camera.scale / t.cam.scale;
        const back = (sx, o, o0) => o0 + (sx - o) / k;        // screen now → screen when cached
        const box = this.#fieldBox(t.cam);
        const x0 = Math.max(back(0, camera.ox, t.cam.ox), box.x0);
        const x1 = Math.min(back(this.renderer.w, camera.ox, t.cam.ox), box.x1);
        const y0 = Math.max(back(0, camera.oy, t.cam.oy), box.y0);
        const y1 = Math.min(back(this.renderer.h, camera.oy, t.cam.oy), box.y1);
        if (x0 >= x1 || y0 >= y1) return true;                // the field is off screen: nothing to show
        return x0 >= t.x0 - 1 && y0 >= t.y0 - 1 && x1 <= t.x0 + t.w + 1 && y1 <= t.y0 + t.h + 1;
    }

    #tile(ctx, x, y, fill, stroke) {
        const pts = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([px, py]) => this.renderer.at(px, py));
        path(ctx, pts);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }

    outline(ctx, x, y, size) {
        const pts = [[x, y], [x + size, y], [x + size, y + size], [x, y + size]].map(([px, py]) => this.renderer.at(px, py));
        path(ctx, pts);
        ctx.stroke();
    }
}

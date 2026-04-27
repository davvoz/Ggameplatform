/**
 * Per-floor ambient atmosphere effects.
 *
 * Open/Closed: to add a floor's ambient effect, call
 * `ambientRenderer.register('MY_KEY', fn)` passing a function with
 * signature `(screenTop, sectionH) => void`.
 *
 * Each palette should declare `ambientKey` (defaults to `palette.name`).
 */
export class AmbientRenderer {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ time: number }} timeSource — object with a `time` getter
     * @param {number} canvasW
     */
    constructor(ctx, timeSource, canvasW) {
        this._ctx    = ctx;
        this._ts     = timeSource;
        this._W      = canvasW;
        this._fns    = new Map([
            ['INFERNO',   this._inferno.bind(this)],
            ['CATHEDRAL', this._cathedral.bind(this)],
            ['DUNGEON',   this._dungeon.bind(this)],
            ['VOID',      this._void.bind(this)],
            ['ARCADE',    this._arcade.bind(this)],
        ]);
    }

    /**
     * Register a custom ambient effect for a palette key.
     * `fn(screenTop, sectionH)` — called with pre-saved context state.
     * @param {string} key
     * @param {(screenTop: number, sectionH: number) => void} fn
     */
    register(key, fn) {
        this._fns.set(key, fn.bind(this));
    }

    /**
     * Draw the ambient effect for the given section palette.
     * @param {object} palette
     * @param {number} screenTop — section top in screen coordinates
     * @param {number} sectionH  — section pixel height
     */
    draw(palette, screenTop, sectionH) {
        const key = palette.ambientKey ?? palette.name;
        const fn  = this._fns.get(key);
        if (fn) fn(screenTop, sectionH);
    }

    // ── Private effects ─────────────────────────────────────────────────────

    _inferno(screenTop, sectionH) {
        const ctx = this._ctx;
        const W   = this._W;
        const t   = this._ts.time;
        ctx.save();

        const a = 0.05 + 0.03 * Math.sin(t * 0.9);
        const lava = ctx.createLinearGradient(0, screenTop + sectionH * 0.72, 0, screenTop + sectionH);
        lava.addColorStop(0, 'rgba(0,0,0,0)');
        lava.addColorStop(1, `rgba(220,50,0,${a})`);
        ctx.fillStyle = lava;
        ctx.fillRect(0, screenTop + sectionH * 0.72, W, sectionH * 0.28);

        ctx.globalAlpha = 0.08 + 0.04 * Math.sin(t * 1.1);
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth   = 1;
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur  = 4;
        const fissures = [
            [[0.12, 1], [0.17, 0.8], [0.21, 0.76], [0.18, 0.64]],
            [[0.88, 1], [0.82, 0.82], [0.75, 0.78], [0.78, 0.65]],
            [[0.42, 1], [0.44, 0.9], [0.39, 0.84]],
            [[0.62, 1], [0.6, 0.88], [0.65, 0.8]],
        ];
        for (const pts of fissures) {
            ctx.beginPath();
            ctx.moveTo(pts[0][0] * W, screenTop + pts[0][1] * sectionH);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i][0] * W, screenTop + pts[i][1] * sectionH);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    _cathedral(screenTop, sectionH) {
        const ctx = this._ctx;
        const W   = this._W;
        const t   = this._ts.time;
        ctx.save();
        for (let i = 0; i < 5; i++) {
            const xBase = W * (0.1 + i * 0.2);
            const a     = 0.025 + 0.015 * Math.sin(t * 0.55 + i * 1.1);
            const shaft = ctx.createLinearGradient(xBase, screenTop, xBase + 25, screenTop + sectionH * 0.65);
            shaft.addColorStop(0,   `rgba(68,170,255,${(a * 3).toFixed(3)})`);
            shaft.addColorStop(0.5, `rgba(68,170,255,${a.toFixed(3)})`);
            shaft.addColorStop(1,   'rgba(68,170,255,0)');
            ctx.fillStyle = shaft;
            ctx.beginPath();
            ctx.moveTo(xBase,      screenTop);
            ctx.lineTo(xBase + 5,  screenTop);
            ctx.lineTo(xBase + 55, screenTop + sectionH * 0.65);
            ctx.lineTo(xBase + 35, screenTop + sectionH * 0.65);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    _dungeon(screenTop, sectionH) {
        const ctx = this._ctx;
        const W   = this._W;
        const t   = this._ts.time;
        const cx  = W / 2;
        const cy  = screenTop + sectionH * 0.48;
        const R   = Math.min(W, sectionH) * 0.34;
        const rot = t * 0.22;
        ctx.save();

        ctx.globalAlpha = 0.07 + 0.03 * Math.sin(t * 0.65);
        ctx.strokeStyle = '#bb33ff';
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = '#cc44ff';
        ctx.shadowBlur  = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.72, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (i * 4 / 5) * Math.PI * 2 - Math.PI / 2;
            if (i === 0) ctx.moveTo(R * Math.cos(a), R * Math.sin(a));
            else         ctx.lineTo(R * Math.cos(a), R * Math.sin(a));
        }
        ctx.closePath();
        ctx.stroke();

        ctx.globalAlpha = 0.04;
        ctx.rotate(-rot * 1.6);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(R * 0.68 * Math.cos(a), R * 0.68 * Math.sin(a));
            ctx.stroke();
        }
        ctx.restore();
        ctx.restore();
    }

    _void(screenTop, sectionH) {
        const ctx = this._ctx;
        const W   = this._W;
        const t   = this._ts.time;
        ctx.save();

        // Drifting nebula bands
        for (let i = 0; i < 4; i++) {
            const phase = i * 1.57;
            const yOff  = screenTop + sectionH * (0.15 + i * 0.22 + 0.04 * Math.sin(t * 0.25 + phase));
            const a     = 0.03 + 0.02 * Math.sin(t * 0.38 + phase);
            const band  = ctx.createLinearGradient(0, yOff - 40, 0, yOff + 40);
            band.addColorStop(0,   'rgba(0,0,0,0)');
            band.addColorStop(0.5, `rgba(0,229,255,${a.toFixed(3)})`);
            band.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = band;
            ctx.fillRect(0, yOff - 40, W, 80);
        }

        // Bottom void darkness
        const vGrad = ctx.createLinearGradient(0, screenTop + sectionH * 0.6, 0, screenTop + sectionH);
        vGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vGrad.addColorStop(1, 'rgba(0,5,15,0.22)');
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, screenTop + sectionH * 0.6, W, sectionH * 0.4);
        ctx.restore();
    }

    _arcade(screenTop, sectionH) {
        const ctx = this._ctx;
        const W   = this._W;
        const t   = this._ts.time;
        ctx.save();

        // Horizontal scanlines (CRT arcade feel)
        ctx.globalAlpha = 0.04;
        ctx.fillStyle   = '#ff9900';
        const lineStep  = 6;
        for (let y = screenTop; y < screenTop + sectionH; y += lineStep) {
            ctx.fillRect(0, y, W, 2);
        }

        // Pulsing side columns — like cabinet side art
        const pulse = 0.03 + 0.015 * Math.sin(t * 1.4);
        const colL  = ctx.createLinearGradient(0, screenTop, 40, screenTop);
        colL.addColorStop(0,   `rgba(255,153,0,${pulse})`);
        colL.addColorStop(1,   'rgba(255,153,0,0)');
        const colR  = ctx.createLinearGradient(W, screenTop, W - 40, screenTop);
        colR.addColorStop(0,   `rgba(255,153,0,${pulse})`);
        colR.addColorStop(1,   'rgba(255,153,0,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle   = colL;
        ctx.fillRect(0, screenTop, 40, sectionH);
        ctx.fillStyle   = colR;
        ctx.fillRect(W - 40, screenTop, 40, sectionH);
        ctx.restore();
    }
}

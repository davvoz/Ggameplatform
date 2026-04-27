/**
 * JSON-driven background renderer.
 *
 * Each section JSON declares a `background` block:
 *   {
 *     "gradient": { "top": "#1c0020", "bottom": "#080006" },
 *     "layers": [
 *       { "type": "nebula",        "color": "#ff5040", "alpha": 0.10, "y": 0.42 },
 *       { "type": "lava_glow",     "color": "#dc3200", "alpha": 0.08 },
 *       { "type": "lava_fissures", "color": "#ff4400", "alpha": 0.08 }
 *     ]
 *   }
 *
 * Open/Closed: add a new background type by adding a static entry to
 * BackgroundRenderer.PRIMITIVES — zero changes elsewhere.
 * Each primitive signature: (ctx, W, screenTop, sectionH, time, params) => void
 */
export class BackgroundRenderer {

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasW
     */
    constructor(ctx, canvasW) {
        this._ctx = ctx;
        this._W   = canvasW;
    }

    /**
     * Draw the full background for a section.
     * @param {object} bg         — section.background parsed from JSON
     * @param {number} screenTop  — section top in screen coordinates
     * @param {number} sectionH   — section pixel height
     * @param {number} time       — current game time in seconds
     */
    draw(bg, screenTop, sectionH, time) {
        if (!bg) return;
        const ctx = this._ctx;
        const W   = this._W;

        // 1 — Gradient base
        const g = bg.gradient ?? {};
        const grad = ctx.createLinearGradient(0, screenTop, 0, screenTop + sectionH);
        grad.addColorStop(0, g.top    ?? '#000000');
        grad.addColorStop(1, g.bottom ?? '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, screenTop, W, sectionH);

        // 2 — Stacked layers
        if (!Array.isArray(bg.layers)) return;
        for (const layer of bg.layers) {
            const fn = BackgroundRenderer.PRIMITIVES[layer.type];
            if (fn) {
                ctx.save();
                fn(ctx, W, screenTop, sectionH, time, layer);
                ctx.restore();
            }
        }
    }

    /**
     * Returns the list of all registered primitive type names.
     * Useful for editor tooling.
     * @returns {string[]}
     */
    static list() {
        return Object.keys(BackgroundRenderer.PRIMITIVES);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Primitives registry
// Signature: (ctx, W, screenTop, sectionH, time, params) => void
// Each primitive calls ctx.save() / ctx.restore() via the draw() wrapper.
// ─────────────────────────────────────────────────────────────────────────────

BackgroundRenderer.PRIMITIVES = {

    /**
     * Radial nebula glow — soft atmospheric haze centred on the section.
     * params: { color, alpha, y }
     *   color — hex colour of the glow centre (e.g. "#ff5040")
     *   alpha — peak opacity (0–1, default 0.10)
     *   y     — vertical centre as fraction of sectionH (default 0.42)
     */
    nebula(ctx, W, screenTop, H, _t, p) {
        const cx = W * 0.5;
        const cy = screenTop + H * (p.y ?? 0.42);
        const r  = W * 0.78;
        // Derive a 2-digit hex alpha for the inner stop (#rrggbbAA)
        const aHex = Math.round((p.alpha ?? 0.1) * 255).toString(16).padStart(2, '0');
        const neb = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        neb.addColorStop(0,   (p.color ?? '#ffffff') + aHex);
        neb.addColorStop(0.5, (p.color ?? '#ffffff') + '0a');
        neb.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = neb;
        ctx.fillRect(0, screenTop, W, H);
    },

    /**
     * Lava heat glow — warm gradient rising from the bottom.
     * params: { color, alpha, yStart }
     *   color  — glow color (default "#dc3200")
     *   alpha  — peak opacity at bottom (animated ±0.03, default 0.08)
     *   yStart — where glow begins as fraction of H (default 0.72)
     */
    lava_glow(ctx, W, screenTop, H, t, p) {
        const yS = p.yStart ?? 0.72;
        const a  = (p.alpha ?? 0.08) + 0.03 * Math.sin(t * 0.9);
        const lava = ctx.createLinearGradient(0, screenTop + H * yS, 0, screenTop + H);
        lava.addColorStop(0, 'rgba(0,0,0,0)');
        lava.addColorStop(1, _hexToRgba(p.color ?? '#dc3200', a));
        ctx.fillStyle = lava;
        ctx.fillRect(0, screenTop + H * yS, W, H * (1 - yS));
    },

    /**
     * Lava fissures — animated crack lines near the floor.
     * params: { color, alpha, yStart }
     *   color  — stroke color (default "#ff4400")
     *   alpha  — base stroke opacity (animated, default 0.08)
     *   yStart — top of fissure region as fraction of H (default 0.64)
     */
    lava_fissures(ctx, W, screenTop, H, t, p) {
        const yS = p.yStart ?? 0.64;
        ctx.globalAlpha = (p.alpha ?? 0.08) + 0.04 * Math.sin(t * 1.1);
        ctx.strokeStyle = p.color ?? '#ff4400';
        ctx.lineWidth   = 1;
        ctx.shadowColor = p.color ?? '#ff3300';
        ctx.shadowBlur  = 4;
        const fissures = [
            [[0.12, 1], [0.17, 0.8], [0.21, 0.76], [0.18, yS / 1]],
            [[0.88, 1], [0.82, 0.82], [0.75, 0.78], [0.78, yS / 1]],
            [[0.42, 1], [0.44, 0.9], [0.39, 0.84]],
            [[0.62, 1], [0.6, 0.88], [0.65, 0.8]],
        ];
        for (const pts of fissures) {
            ctx.beginPath();
            ctx.moveTo(pts[0][0] * W, screenTop + pts[0][1] * H);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i][0] * W, screenTop + pts[i][1] * H);
            }
            ctx.stroke();
        }
    },

    /**
     * Light shafts — angled cathedral rays from the top.
     * params: { color, alpha, count }
     *   color — shaft color (default "#44aaff")
     *   alpha — peak shaft opacity (default 0.025)
     *   count — number of shafts (default 5)
     */
    light_shafts(ctx, W, screenTop, H, t, p) {
        const color = p.color ?? '#44aaff';
        const aBase = p.alpha ?? 0.025;
        const n     = p.count ?? 5;
        for (let i = 0; i < n; i++) {
            const xBase = W * (0.1 + i * (0.8 / (n - 1 || 1)));
            const a     = aBase + (aBase * 0.6) * Math.sin(t * 0.55 + i * 1.1);
            const shaft = ctx.createLinearGradient(xBase, screenTop, xBase + 25, screenTop + H * 0.65);
            shaft.addColorStop(0,   _hexToRgba(color, a * 3));
            shaft.addColorStop(0.5, _hexToRgba(color, a));
            shaft.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = shaft;
            ctx.beginPath();
            ctx.moveTo(xBase,      screenTop);
            ctx.lineTo(xBase + 5,  screenTop);
            ctx.lineTo(xBase + 55, screenTop + H * 0.65);
            ctx.lineTo(xBase + 35, screenTop + H * 0.65);
            ctx.closePath();
            ctx.fill();
        }
    },

    /**
     * Pentagram — rotating occult circle with inner star.
     * params: { color, alpha, cx, cy }
     *   color — stroke color (default "#bb33ff")
     *   alpha — base opacity (default 0.07)
     *   cx    — centre X as fraction of W (default 0.5)
     *   cy    — centre Y as fraction of H (default 0.48)
     */
    pentagram(ctx, W, screenTop, H, t, p) {
        const cx  = W * (p.cx ?? 0.5);
        const cy  = screenTop + H * (p.cy ?? 0.48);
        const R   = Math.min(W, H) * 0.34;
        const rot = t * 0.22;
        const clr = p.color ?? '#bb33ff';

        ctx.globalAlpha = (p.alpha ?? 0.07) + 0.03 * Math.sin(t * 0.65);
        ctx.strokeStyle = clr;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = clr;
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
    },

    /**
     * Nebula bands — drifting horizontal bands of colour (void / cosmic feel).
     * params: { color, alpha, count }
     *   color — band tint color (default "#00e5ff")
     *   alpha — peak band opacity (default 0.03)
     *   count — number of bands (default 4)
     */
    nebula_bands(ctx, W, screenTop, H, t, p) {
        const color = p.color ?? '#00e5ff';
        const aBase = p.alpha ?? 0.03;
        const n     = p.count ?? 4;
        for (let i = 0; i < n; i++) {
            const phase = i * 1.57;
            const yOff  = screenTop + H * (0.15 + i * (0.7 / n) + 0.04 * Math.sin(t * 0.25 + phase));
            const a     = aBase + 0.02 * Math.sin(t * 0.38 + phase);
            const band  = ctx.createLinearGradient(0, yOff - 40, 0, yOff + 40);
            band.addColorStop(0,   'rgba(0,0,0,0)');
            band.addColorStop(0.5, _hexToRgba(color, a));
            band.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = band;
            ctx.fillRect(0, yOff - 40, W, 80);
        }
    },

    /**
     * Void darkness — deep shadow rising from the bottom.
     * params: { color, alpha, yStart }
     *   color  — shadow tint (default "#00050f")
     *   alpha  — peak opacity at bottom (default 0.22)
     *   yStart — where shadow begins as fraction of H (default 0.6)
     */
    void_dark(ctx, W, screenTop, H, _t, p) {
        const yS   = p.yStart ?? 0.6;
        const a    = p.alpha  ?? 0.22;
        const vGrad = ctx.createLinearGradient(0, screenTop + H * yS, 0, screenTop + H);
        vGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vGrad.addColorStop(1, _hexToRgba(p.color ?? '#00050f', a));
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, screenTop + H * yS, W, H * (1 - yS));
    },

    /**
     * Scanlines — horizontal CRT scan lines.
     * params: { color, alpha, step }
     *   color — line color (default "#ff9900")
     *   alpha — opacity (default 0.04)
     *   step  — pixels between lines (default 6)
     */
    scanlines(ctx, W, screenTop, H, _t, p) {
        ctx.globalAlpha = p.alpha ?? 0.04;
        ctx.fillStyle   = p.color ?? '#ff9900';
        const step = p.step ?? 6;
        for (let y = screenTop; y < screenTop + H; y += step) {
            ctx.fillRect(0, y, W, 2);
        }
    },

    /**
     * Cabinet columns — pulsing side art columns (arcade cabinet feel).
     * params: { color, alpha, width }
     *   color — column color (default "#ff9900")
     *   alpha — peak opacity (animated, default 0.03)
     *   width — column width in px (default 40)
     */
    cabinet_columns(ctx, W, screenTop, H, t, p) {
        const color = p.color ?? '#ff9900';
        const aBase = p.alpha ?? 0.03;
        const cw    = p.width ?? 40;
        const pulse = aBase + (aBase * 0.5) * Math.sin(t * 1.4);
        const colL  = ctx.createLinearGradient(0,  screenTop, cw,     screenTop);
        colL.addColorStop(0, _hexToRgba(color, pulse));
        colL.addColorStop(1, 'rgba(0,0,0,0)');
        const colR  = ctx.createLinearGradient(W,  screenTop, W - cw, screenTop);
        colR.addColorStop(0, _hexToRgba(color, pulse));
        colR.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = colL;
        ctx.fillRect(0, screenTop, cw, H);
        ctx.fillStyle = colR;
        ctx.fillRect(W - cw, screenTop, cw, H);
    },

    /**
     * Toxic fumes — rising green wisps from the bottom (dungeon / swamp feel).
     * params: { color, alpha, count }
     *   color — fume color (default "#00ff88")
     *   alpha — peak opacity (animated, default 0.06)
     *   count — number of wisp columns (default 6)
     */
    toxic_fumes(ctx, W, screenTop, H, t, p) {
        const color = p.color ?? '#00ff88';
        const aBase = p.alpha ?? 0.06;
        const n     = p.count ?? 6;
        for (let i = 0; i < n; i++) {
            const xFrac = 0.1 + (i / (n - 1 || 1)) * 0.8;
            const phase = i * 0.97;
            const yTop  = H * (0.45 + 0.15 * Math.sin(t * 0.35 + phase));
            const a     = aBase + 0.03 * Math.sin(t * 0.6 + phase);
            const wisp  = ctx.createLinearGradient(0, screenTop + yTop, 0, screenTop + H);
            wisp.addColorStop(0,   'rgba(0,0,0,0)');
            wisp.addColorStop(0.4, _hexToRgba(color, a * 0.5));
            wisp.addColorStop(1,   _hexToRgba(color, a));
            ctx.fillStyle = wisp;
            const wx = W * xFrac;
            const ww = W * 0.12;
            ctx.fillRect(wx - ww / 2, screenTop + yTop, ww, H - yTop);
        }
    },

    /**
     * Green glow — spectral energy pulse, bottom-up (minussa underworld feel).
     * params: { color, alpha, yStart }
     *   color  — glow color (default "#00ff6e")
     *   alpha  — peak opacity (animated, default 0.07)
     *   yStart — start of glow as fraction of H (default 0.55)
     */
    green_glow(ctx, W, screenTop, H, t, p) {
        const yS = p.yStart ?? 0.55;
        const a  = (p.alpha ?? 0.07) + 0.04 * Math.sin(t * 0.75);
        const g  = ctx.createLinearGradient(0, screenTop + H * yS, 0, screenTop + H);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, _hexToRgba(p.color ?? '#00ff6e', a));
        ctx.fillStyle = g;
        ctx.fillRect(0, screenTop + H * yS, W, H * (1 - yS));
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a hex colour + alpha number to a CSS rgba() string.
 * Accepts "#rrggbb" or "#rgb".
 * @param {string} hex
 * @param {number} a  — 0–1
 * @returns {string}
 */
function _hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    let r, g, b;
    if (h.length === 3) {
        r = Number.parseInt(h[0] + h[0], 16);
        g = Number.parseInt(h[1] + h[1], 16);
        b = Number.parseInt(h[2] + h[2], 16);
    } else {
        r = Number.parseInt(h.slice(0, 2), 16);
        g = Number.parseInt(h.slice(2, 4), 16);
        b = Number.parseInt(h.slice(4, 6), 16);
    }
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

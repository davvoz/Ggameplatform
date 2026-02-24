/**
 * FrozenPlanetRenderer — Frozen/Ice planet (World 2)
 *
 * Renders: ice crevasses, frozen lakes, snow banks, snowfall, cold vignette.
 */
import { PlanetRenderer } from './PlanetRenderer.js';

export class FrozenPlanetRenderer extends PlanetRenderer {

    get fxLayerOrder() {
        return { frost: 0, snowDrift: 0, crevasse: 1, crystal: 2, iceSheet: 2 };
    }

    // ── build ─────────────────────────────────────

    build(theme) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const fcfg = theme.frozenConfig;

        // Ice crevasses — smooth winding blue cracks
        this._iceCrevasses = [];
        this._iceCrevasseScrollY = 0;
        const crevasseCount = fcfg ? (fcfg.crevasseCount || 0) : 1;
        for (let c = 0; c < crevasseCount; c++) {
            let baseX;
            if (crevasseCount === 1) {
                baseX = W * 0.2 + Math.random() * W * 0.6;
            } else {
                const slot = (c + 0.5) / crevasseCount;
                baseX = W * (0.1 + slot * 0.8) + (Math.random() - 0.5) * W * 0.1;
            }
            const width = 14 + Math.random() * 18;
            const tileH = H * 3;
            const segH = 45 + Math.random() * 30;
            const segs = Math.ceil(tileH / segH);
            const points = [{ x: 0, y: 0 }];
            let cx = 0, drift = (Math.random() - 0.5) * 8;
            for (let i = 0; i < segs; i++) {
                drift += (Math.random() - 0.5) * 14;
                drift = Math.max(-25, Math.min(25, drift));
                cx += drift;
                const maxWander = W * 0.18;
                cx = Math.max(-maxWander, Math.min(maxWander, cx));
                points.push({ x: cx, y: (i + 1) * segH });
            }
            const totalCrevasseH = points[points.length - 1].y;
            const hue = 198 + Math.random() * 18;
            const sat = 50 + Math.random() * 25;
            const light = 22 + Math.random() * 14;
            this._iceCrevasses.push({ baseX, width, points, totalH: totalCrevasseH, hue, sat, light });
        }
        this._iceCrevasseSpeed = 20;

        // Edge snow banks — soft rounded mounds
        this._edgeGlaciers = [];
        const baseCount = fcfg ? fcfg.edgeN : 12;
        const count = this.quality === 'high' ? baseCount : Math.max(3, Math.round(baseCount * 0.57));
        const eR = fcfg ? fcfg.edgeReach : [25, 45];
        const eH = fcfg && fcfg.edgeHue ? fcfg.edgeHue : [195, 220];
        const eL = fcfg && fcfg.edgeLit ? fcfg.edgeLit : [30, 45];
        const eS = fcfg && fcfg.edgeSat ? fcfg.edgeSat : [20, 40];
        const positions = this._distributeEdgeElements(count, W, H);
        for (let i = 0; i < count; i++) {
            const pos = positions[i];
            const nPts = 6 + Math.floor(Math.random() * 2);
            const shape = [];
            for (let s = 0; s < nPts; s++) shape.push(0.72 + Math.random() * 0.32);
            this._edgeGlaciers.push({
                ...pos, shape,
                reach: eR[0] + Math.random() * (eR[1] - eR[0]),
                height: 30 + Math.random() * 50,
                hue: eH[0] + Math.random() * (eH[1] - eH[0]),
                sat: eS[0] + Math.random() * (eS[1] - eS[0]),
                lightness: eL[0] + Math.random() * (eL[1] - eL[0]),
                alpha: 0.65 + Math.random() * 0.3,
                hasShine: Math.random() < 0.45,
                shineHue: 195 + Math.random() * 18
            });
        }

        // Frozen lakes — large reflective ovals
        this._frozenLakes = [];
        this._frozenLakeScrollY = 0;
        const lakeCount = fcfg ? (fcfg.frozenLakes || 0) : 0;
        for (let l = 0; l < lakeCount; l++) {
            this._frozenLakes.push({
                x: W * 0.15 + Math.random() * W * 0.7,
                y: Math.random() * H * 3,
                rx: 30 + Math.random() * 45,
                ry: 15 + Math.random() * 25,
                rot: (Math.random() - 0.5) * 0.4,
                hue: 198 + Math.random() * 15,
                sat: 35 + Math.random() * 20,
                light: 28 + Math.random() * 12,
                alpha: 0.45 + Math.random() * 0.25,
                totalH: H * 3
            });
        }
        this._frozenLakeSpeed = 20;

        // Snowfall layer
        this._snowflakes = [];
        const snowfall = fcfg && fcfg.snowfall;
        if (snowfall) {
            const snowCount = this.quality === 'high'
                ? (fcfg.snowCount || 30)
                : Math.max(10, Math.round((fcfg.snowCount || 30) * 0.45));
            for (let i = 0; i < snowCount; i++) {
                this._snowflakes.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    size: 0.5 + Math.random() * 2.5,
                    speed: 12 + Math.random() * 18,
                    drift: (Math.random() - 0.5) * 8,
                    driftPhase: Math.random() * Math.PI * 2,
                    alpha: 0.2 + Math.random() * 0.5,
                    hue: 200 + Math.random() * 15,
                    twinklePhase: Math.random() * Math.PI * 2
                });
            }
        }

        this._vigRGB = fcfg ? fcfg.vigCol : '20,35,60';
    }

    // ── update ────────────────────────────────────

    update(dt) {
        // Scroll ice crevasses
        if (this._iceCrevasses && this._iceCrevasses.length > 0) {
            this._iceCrevasseScrollY += this._iceCrevasseSpeed * dt;
            if (this._iceCrevasses[0] && this._iceCrevasseScrollY >= this._iceCrevasses[0].totalH) {
                this._iceCrevasseScrollY -= this._iceCrevasses[0].totalH;
            }
        }
        // Scroll frozen lakes
        if (this._frozenLakes && this._frozenLakes.length > 0) {
            this._frozenLakeScrollY += this._frozenLakeSpeed * dt;
            if (this._frozenLakes[0] && this._frozenLakeScrollY >= this._frozenLakes[0].totalH) {
                this._frozenLakeScrollY -= this._frozenLakes[0].totalH;
            }
        }
        // Update snowflakes
        if (this._snowflakes && this._snowflakes.length > 0) {
            const W = this.canvasWidth, H = this.canvasHeight;
            const now = performance.now() * 0.001;
            for (const sf of this._snowflakes) {
                sf.y += sf.speed * dt;
                sf.x += Math.sin(sf.driftPhase + now * 0.8) * sf.drift * dt;
                if (sf.y > H + 5) { sf.y = -5; sf.x = Math.random() * W; }
                if (sf.x < -10) sf.x = W + 5;
                if (sf.x > W + 10) sf.x = -5;
            }
        }
    }

    // ── render ────────────────────────────────────

    renderBackground(ctx, time) {
        this._renderIceCrevasses(ctx);
        this._renderFrozenLakes(ctx);
    }

    renderOverlay(ctx, time) {
        const W = this.canvasWidth, H = this.canvasHeight;
        ctx.save();

        // Cold blue vignette — stronger, more distinctive
        const edgeW = W * 0.18;
        const vigRGB = this._vigRGB || '20,35,60';
        const vCol = `rgba(${vigRGB},`;
        // Left
        const lgL = ctx.createLinearGradient(0, 0, edgeW, 0);
        lgL.addColorStop(0, vCol + '0.5)');
        lgL.addColorStop(0.4, vCol + '0.18)');
        lgL.addColorStop(1, vCol + '0)');
        ctx.fillStyle = lgL; ctx.fillRect(0, 0, edgeW, H);
        // Right
        const lgR = ctx.createLinearGradient(W, 0, W - edgeW, 0);
        lgR.addColorStop(0, vCol + '0.5)');
        lgR.addColorStop(0.4, vCol + '0.18)');
        lgR.addColorStop(1, vCol + '0)');
        ctx.fillStyle = lgR; ctx.fillRect(W - edgeW, 0, edgeW, H);
        // Top cold glow
        const lgT = ctx.createLinearGradient(0, 0, 0, H * 0.08);
        lgT.addColorStop(0, vCol + '0.2)');
        lgT.addColorStop(1, vCol + '0)');
        ctx.fillStyle = lgT; ctx.fillRect(0, 0, W, H * 0.08);

        // Edge snow banks — soft rounded mounds
        if (this._edgeGlaciers) {
            for (const eg of this._edgeGlaciers) {
                let cx, cy, rx, ry;
                if (eg.side === 'left' || eg.side === 'right') {
                    const dir = eg.side === 'left' ? 1 : -1;
                    cx = eg.x + eg.reach * 0.45 * dir;
                    cy = eg.y; rx = eg.reach; ry = eg.height * 0.5;
                } else {
                    const dir = eg.side === 'top' ? 1 : -1;
                    cx = eg.x; cy = eg.y + eg.reach * 0.45 * dir;
                    rx = eg.height * 0.5; ry = eg.reach;
                }
                const n = eg.shape.length;

                // Soft shadow
                ctx.globalAlpha = eg.alpha * 0.25;
                ctx.fillStyle = 'rgba(5,10,25,0.5)';
                ctx.beginPath();
                for (let i = 0; i < n; i++) {
                    const a0 = (Math.PI * 2 / n) * i;
                    const a1 = (Math.PI * 2 / n) * ((i + 1) % n);
                    const r0x = rx * eg.shape[i] * 0.92, r0y = ry * eg.shape[i] * 0.92;
                    const r1x = rx * eg.shape[(i + 1) % n] * 0.92, r1y = ry * eg.shape[(i + 1) % n] * 0.92;
                    const px = cx + 3 + Math.cos(a0) * r0x;
                    const py = cy + 3 + Math.sin(a0) * r0y;
                    if (i === 0) ctx.moveTo(px, py);
                    const aMid = (a0 + a1) * 0.5;
                    ctx.quadraticCurveTo(
                        cx + 3 + Math.cos(aMid) * (r0x + r1x) * 0.55,
                        cy + 3 + Math.sin(aMid) * (r0y + r1y) * 0.55,
                        cx + 3 + Math.cos(a1) * r1x,
                        cy + 3 + Math.sin(a1) * r1y
                    );
                }
                ctx.closePath(); ctx.fill();

                // Snow bank body — rounded with curves
                ctx.globalAlpha = eg.alpha;
                ctx.fillStyle = `hsl(${eg.hue},${eg.sat}%,${eg.lightness}%)`;
                ctx.beginPath();
                for (let i = 0; i < n; i++) {
                    const a0 = (Math.PI * 2 / n) * i;
                    const a1 = (Math.PI * 2 / n) * ((i + 1) % n);
                    const r0x = rx * eg.shape[i], r0y = ry * eg.shape[i];
                    const r1x = rx * eg.shape[(i + 1) % n], r1y = ry * eg.shape[(i + 1) % n];
                    const px = cx + Math.cos(a0) * r0x;
                    const py = cy + Math.sin(a0) * r0y;
                    if (i === 0) ctx.moveTo(px, py);
                    const aMid = (a0 + a1) * 0.5;
                    ctx.quadraticCurveTo(
                        cx + Math.cos(aMid) * (r0x + r1x) * 0.55,
                        cy + Math.sin(aMid) * (r0y + r1y) * 0.55,
                        cx + Math.cos(a1) * r1x,
                        cy + Math.sin(a1) * r1y
                    );
                }
                ctx.closePath(); ctx.fill();

                // Snow cap highlight
                ctx.globalAlpha = eg.alpha * 0.5;
                ctx.fillStyle = `hsl(${eg.hue},${Math.max(8, eg.sat - 8)}%,${Math.min(80, eg.lightness + 16)}%)`;
                ctx.beginPath();
                ctx.ellipse(cx - rx * 0.08, cy - ry * 0.08, rx * 0.42, ry * 0.36, -0.3, 0, Math.PI * 2);
                ctx.fill();

                // Specular dot
                if (eg.hasShine) {
                    ctx.globalAlpha = eg.alpha * 0.4;
                    ctx.fillStyle = `hsl(${eg.shineHue},40%,75%)`;
                    ctx.beginPath();
                    ctx.arc(cx - rx * 0.12, cy - ry * 0.18, rx * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Snowfall
        this._renderSnowfall(ctx);

        ctx.restore();
    }

    // ── private helpers ───────────────────────────

    _renderIceCrevasses(ctx) {
        if (!this._iceCrevasses || this._iceCrevasses.length === 0) return;
        const H = this.canvasHeight;
        const scrollY = this._iceCrevasseScrollY || 0;
        ctx.save();
        for (const cr of this._iceCrevasses) {
            const pts = cr.points, totalH = cr.totalH, w = cr.width;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';

            for (const tileOff of [0, totalH]) {
                const oY = tileOff - scrollY;
                if (oY + totalH < -50 || oY > H + 50) continue;

                const trace = (dx) => {
                    ctx.beginPath();
                    ctx.moveTo(cr.baseX + pts[0].x + dx, pts[0].y + oY);
                    for (let i = 0; i < pts.length - 1; i++) {
                        const cpx = cr.baseX + (pts[i].x + pts[i + 1].x) * 0.5 + dx;
                        const cpy = (pts[i].y + pts[i + 1].y) * 0.5 + oY;
                        ctx.quadraticCurveTo(cpx, cpy,
                            cr.baseX + pts[i + 1].x + dx, pts[i + 1].y + oY);
                    }
                };

                // Bright ice wall
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = `hsl(${cr.hue},${Math.max(15, cr.sat - 15)}%,${cr.light + 18}%)`;
                ctx.lineWidth = w * 1.9;
                trace(0); ctx.stroke();
                // Dark depth shadow
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = `hsl(${cr.hue + 5},${cr.sat + 5}%,${Math.max(5, cr.light - 8)}%)`;
                ctx.lineWidth = w * 1.1;
                trace(0); ctx.stroke();
                // Main crevasse glow
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = `hsl(${cr.hue},${cr.sat}%,${cr.light}%)`;
                ctx.lineWidth = w * 0.55;
                trace(0); ctx.stroke();
                // Bright center glow
                ctx.globalAlpha = 0.3;
                ctx.strokeStyle = `hsl(${cr.hue - 5},${cr.sat + 12}%,${cr.light + 25}%)`;
                ctx.lineWidth = w * 0.14;
                trace(0); ctx.stroke();
            }
        }
        ctx.restore();
    }

    _renderFrozenLakes(ctx) {
        if (!this._frozenLakes || this._frozenLakes.length === 0) return;
        const H = this.canvasHeight;
        const scrollY = this._frozenLakeScrollY || 0;
        ctx.save();
        for (const lk of this._frozenLakes) {
            const totalH = lk.totalH;
            for (const tileOff of [0, totalH]) {
                const ly = lk.y + tileOff - scrollY;
                if (ly + lk.ry < -10 || ly - lk.ry > H + 10) continue;

                ctx.save();
                ctx.translate(lk.x, ly);
                ctx.rotate(lk.rot);

                // Dark base
                ctx.globalAlpha = lk.alpha * 0.7;
                ctx.fillStyle = `hsl(${lk.hue},${lk.sat + 8}%,${lk.light - 5}%)`;
                ctx.beginPath();
                ctx.ellipse(0, 0, lk.rx, lk.ry, 0, 0, Math.PI * 2);
                ctx.fill();
                // Lighter inner
                ctx.globalAlpha = lk.alpha * 0.55;
                ctx.fillStyle = `hsl(${lk.hue},${lk.sat}%,${lk.light + 12}%)`;
                ctx.beginPath();
                ctx.ellipse(-lk.rx * 0.08, -lk.ry * 0.08, lk.rx * 0.55, lk.ry * 0.55, 0, 0, Math.PI * 2);
                ctx.fill();
                // Bright specular streak
                ctx.globalAlpha = lk.alpha * 0.35;
                ctx.strokeStyle = `hsl(${lk.hue},${lk.sat + 10}%,${lk.light + 28}%)`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(-lk.rx * 0.4, -lk.ry * 0.1);
                ctx.quadraticCurveTo(0, -lk.ry * 0.2, lk.rx * 0.35, lk.ry * 0.0);
                ctx.stroke();
                // Edge rim
                ctx.globalAlpha = lk.alpha * 0.3;
                ctx.strokeStyle = `hsl(${lk.hue},${lk.sat - 5}%,${lk.light + 12}%)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(0, 0, lk.rx, lk.ry, 0, 0, Math.PI * 2);
                ctx.stroke();

                ctx.restore();
            }
        }
        ctx.restore();
    }

    _renderSnowfall(ctx) {
        if (!this._snowflakes || this._snowflakes.length === 0) return;
        ctx.save();
        const now = performance.now() * 0.001;
        for (const sf of this._snowflakes) {
            const twinkle = 0.5 + 0.5 * Math.sin(sf.twinklePhase + now * 2.5);
            ctx.globalAlpha = sf.alpha * twinkle;
            ctx.fillStyle = sf.size > 1.5
                ? `hsl(${sf.hue},30%,92%)`
                : `hsl(${sf.hue},25%,92%)`;
            ctx.beginPath();
            ctx.arc(sf.x, sf.y, sf.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

export default FrozenPlanetRenderer;

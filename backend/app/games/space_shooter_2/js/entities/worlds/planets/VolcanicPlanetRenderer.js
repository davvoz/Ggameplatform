/**
 * VolcanicPlanetRenderer — Volcanic planet (World 2)
 *
 * Renders: scrolling lava canyons, edge rock formations, heat vignette.
 */
import { PlanetRenderer } from './PlanetRenderer.js';

export class VolcanicPlanetRenderer extends PlanetRenderer {

    get fxLayerOrder() {
        return { ash: 0, scorched: 0, crater: 1, obsidian: 2, lavaRock: 2 };
    }

    // ── build ─────────────────────────────────────

    build(theme) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const vcfg = theme.volcanicConfig;

        // Persistent canyons — deep lava-filled cracks
        this._canyons = [];
        this._canyonScrollY = 0;
        const canyonCount = vcfg ? (vcfg.canyonCount || 0) : 1;
        for (let c = 0; c < canyonCount; c++) {
            let baseX;
            if (canyonCount === 1) {
                baseX = W * 0.2 + Math.random() * W * 0.6;
            } else {
                const slot = (c + 0.5) / canyonCount;
                baseX = W * (0.1 + slot * 0.8) + (Math.random() - 0.5) * W * 0.1;
            }
            const width = 18 + Math.random() * 22;
            const tileH = H * 3;
            const segH = 50 + Math.random() * 30;
            const segs = Math.ceil(tileH / segH);
            const points = [{ x: 0, y: 0 }];
            let cx = 0, drift = (Math.random() - 0.5) * 12;
            for (let i = 0; i < segs; i++) {
                drift += (Math.random() - 0.5) * 24;
                drift = Math.max(-35, Math.min(35, drift));
                cx += drift;
                const maxWander = W * 0.18;
                cx = Math.max(-maxWander, Math.min(maxWander, cx));
                points.push({ x: cx, y: (i + 1) * segH });
            }
            const totalCanyonH = points[points.length - 1].y;
            const lc = Math.random();
            const hue = lc < 0.5 ? 15 + Math.random() * 20 : 5 + Math.random() * 12;
            const sat = 75 + Math.random() * 20;
            const light = 30 + Math.random() * 15;
            this._canyons.push({ baseX, width, points, totalH: totalCanyonH, hue, sat, light });
        }
        this._canyonSpeed = 22;

        // Edge rock formations — angular dark ridges
        this._edgeRocks = [];
        const baseCount = vcfg ? vcfg.edgeN : 12;
        const count = this.quality === 'high' ? baseCount : Math.max(3, Math.round(baseCount * 0.57));
        const eR = vcfg ? vcfg.edgeReach : [25, 45];
        const eH = vcfg && vcfg.edgeHue ? vcfg.edgeHue : [15, 30];
        const eL = vcfg && vcfg.edgeLit ? vcfg.edgeLit : [12, 20];
        const positions = this._distributeEdgeElements(count, W, H);
        for (let i = 0; i < count; i++) {
            const pos = positions[i];
            const nPts = 5 + Math.floor(Math.random() * 3);
            const shape = [];
            for (let s = 0; s < nPts; s++) shape.push(0.4 + Math.random() * 0.65);
            this._edgeRocks.push({
                ...pos, shape,
                reach: eR[0] + Math.random() * (eR[1] - eR[0]),
                height: 25 + Math.random() * 45,
                hue: eH[0] + Math.random() * (eH[1] - eH[0]),
                sat: 10 + Math.random() * 15,
                lightness: eL[0] + Math.random() * (eL[1] - eL[0]),
                alpha: 0.7 + Math.random() * 0.25,
                hasGlow: Math.random() < 0.3,
                glowHue: 15 + Math.random() * 20
            });
        }

        this._vigRGB = vcfg ? vcfg.vigCol : '30,10,4';
    }

    // ── update ────────────────────────────────────

    update(dt) {
        if (this._canyons && this._canyons.length > 0) {
            this._canyonScrollY += this._canyonSpeed * dt;
            if (this._canyons[0] && this._canyonScrollY >= this._canyons[0].totalH) {
                this._canyonScrollY -= this._canyons[0].totalH;
            }
        }
    }

    // ── render ────────────────────────────────────

    renderBackground(ctx, time) {
        this._renderCanyons(ctx);
    }

    renderOverlay(ctx, time) {
        const W = this.canvasWidth, H = this.canvasHeight;
        ctx.save();

        // Heat/lava vignette
        this._renderEdgeVignette(ctx, this._vigRGB || '30,10,4', 0.45);

        // Edge rock formations (angular dark ridges)
        if (this._edgeRocks) {
            for (const er of this._edgeRocks) {
                let cx, cy, rx, ry;
                if (er.side === 'left' || er.side === 'right') {
                    const dir = er.side === 'left' ? 1 : -1;
                    cx = er.x + er.reach * 0.4 * dir;
                    cy = er.y; rx = er.reach; ry = er.height * 0.5;
                } else {
                    const dir = er.side === 'top' ? 1 : -1;
                    cx = er.x; cy = er.y + er.reach * 0.4 * dir;
                    rx = er.height * 0.5; ry = er.reach;
                }
                const n = er.shape.length;

                // Shadow
                ctx.globalAlpha = er.alpha * 0.35;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.beginPath();
                for (let i = 0; i < n; i++) {
                    const a = (Math.PI * 2 / n) * i;
                    const px = cx + 3 + Math.cos(a) * rx * er.shape[i] * 0.9;
                    const py = cy + 3 + Math.sin(a) * ry * er.shape[i] * 0.9;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath(); ctx.fill();

                // Rock body
                ctx.globalAlpha = er.alpha;
                ctx.fillStyle = `hsl(${er.hue},${er.sat}%,${er.lightness}%)`;
                ctx.beginPath();
                for (let i = 0; i < n; i++) {
                    const a = (Math.PI * 2 / n) * i;
                    const px = cx + Math.cos(a) * rx * er.shape[i];
                    const py = cy + Math.sin(a) * ry * er.shape[i];
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath(); ctx.fill();

                // Subtle highlight
                ctx.globalAlpha = er.alpha * 0.3;
                ctx.fillStyle = `hsl(${er.hue},${er.sat - 3}%,${er.lightness + 8}%)`;
                ctx.beginPath();
                ctx.ellipse(cx - rx * 0.1, cy - ry * 0.1, rx * 0.35, ry * 0.3, -0.3, 0, Math.PI * 2);
                ctx.fill();

                // Lava glow at base
                if (er.hasGlow) {
                    ctx.globalAlpha = er.alpha * 0.25;
                    const glowG = ctx.createRadialGradient(cx, cy + ry * 0.3, 0, cx, cy + ry * 0.3, rx * 0.5);
                    glowG.addColorStop(0, `hsla(${er.glowHue},90%,45%,0.6)`);
                    glowG.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = glowG;
                    ctx.beginPath();
                    ctx.arc(cx, cy + ry * 0.3, rx * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    // ── private helpers ───────────────────────────

    _renderCanyons(ctx) {
        if (!this._canyons || this._canyons.length === 0) return;
        const H = this.canvasHeight;
        const scrollY = this._canyonScrollY || 0;
        ctx.save();
        for (const cn of this._canyons) {
            const pts = cn.points, totalH = cn.totalH, w = cn.width;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';

            for (const tileOff of [0, totalH]) {
                const oY = scrollY - tileOff;
                if (oY + totalH < -50 || oY > H + 50) continue;

                const trace = (dx) => {
                    ctx.beginPath();
                    ctx.moveTo(cn.baseX + pts[0].x + dx, pts[0].y + oY);
                    for (let i = 0; i < pts.length - 1; i++) {
                        const nx = cn.baseX + pts[i + 1].x + dx;
                        const ny = pts[i + 1].y + oY;
                        if (i % 2 === 0) {
                            ctx.lineTo(nx, ny);
                        } else {
                            const cpx = cn.baseX + (pts[i].x + pts[i + 1].x) * 0.5 + dx;
                            const cpy = (pts[i].y + pts[i + 1].y) * 0.5 + oY;
                            ctx.quadraticCurveTo(cpx, cpy, nx, ny);
                        }
                    }
                };

                // Dark rock wall
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = 'hsl(20, 10%, 6%)';
                ctx.lineWidth = w * 2.0;
                trace(0); ctx.stroke();
                // Inner dark shadow
                ctx.globalAlpha = 0.7;
                ctx.strokeStyle = 'hsl(15, 8%, 4%)';
                ctx.lineWidth = w * 1.2;
                trace(0); ctx.stroke();
                // Lava fill
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = `hsl(${cn.hue},${cn.sat}%,${cn.light}%)`;
                ctx.lineWidth = w * 0.6;
                trace(0); ctx.stroke();
                // Bright hot center
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = `hsl(${cn.hue + 10},${cn.sat}%,${cn.light + 20}%)`;
                ctx.lineWidth = w * 0.15;
                trace(0); ctx.stroke();
            }
        }
        ctx.restore();
    }
}

export default VolcanicPlanetRenderer;

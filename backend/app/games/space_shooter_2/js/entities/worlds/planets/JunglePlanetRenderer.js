/**
 * JunglePlanetRenderer — Alien Jungle planet (World 2)
 *
 * Renders: scrolling rivers, edge tree canopy blobs, earthy vignette.
 */
import { PlanetRenderer } from './PlanetRenderer.js';

export class JunglePlanetRenderer extends PlanetRenderer {

    get fxLayerOrder() {
        return { river: 0, swamp: 0, dirt: 0, rock: 1, canopy: 2 };
    }

    // ── build ─────────────────────────────────────

    build(theme) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const jcfg = theme.jungleConfig;

        // Persistent rivers
        this._rivers = [];
        this._riverScrollY = 0;
        const riverCount = jcfg ? (jcfg.riverCount || 0) : 1;
        const rw = jcfg ? jcfg.riverW : [16, 24];
        for (let r = 0; r < riverCount; r++) {
            let baseX;
            if (riverCount === 1) {
                baseX = W * 0.25 + Math.random() * W * 0.5;
            } else {
                const slot = (r + 0.5) / riverCount;
                baseX = W * (0.1 + slot * 0.8) + (Math.random() - 0.5) * W * 0.12;
            }
            const width = rw[0] + Math.random() * (rw[1] - rw[0]);
            const tileH = H * 3;
            const segH = 60 + Math.random() * 30;
            const segs = Math.ceil(tileH / segH);
            const points = [{ x: 0, y: 0 }];
            let cx = 0, drift = (Math.random() - 0.5) * 15;
            for (let i = 0; i < segs; i++) {
                drift += (Math.random() - 0.5) * 16;
                drift = Math.max(-30, Math.min(30, drift));
                cx += drift;
                const maxWander = W * 0.2;
                cx = Math.max(-maxWander, Math.min(maxWander, cx));
                points.push({ x: cx, y: (i + 1) * segH });
            }
            const totalRiverH = points[points.length - 1].y;
            const wc = Math.random();
            const hue = wc < 0.5 ? 190 + Math.random() * 15 : 175 + Math.random() * 15;
            const sat = 28 + Math.random() * 15;
            const light = 16 + Math.random() * 8;
            this._rivers.push({ baseX, width, points, totalH: totalRiverH, hue, sat, light });
        }
        this._riverSpeed = 22;

        // Edge tree tops
        this._edgeTrees = [];
        const baseCount = jcfg ? jcfg.edgeN : 14;
        const count = this.quality === 'high' ? baseCount : Math.max(3, Math.round(baseCount * 0.57));
        const eR = jcfg ? jcfg.edgeReach : [25, 45];
        const eH = jcfg && jcfg.edgeHue ? jcfg.edgeHue : [108, 138];
        const eL = jcfg && jcfg.edgeLit ? jcfg.edgeLit : [14, 22];
        const positions = this._distributeEdgeElements(count, W, H);
        for (let i = 0; i < count; i++) {
            const pos = positions[i];
            const shape = [];
            for (let s = 0; s < 6; s++) shape.push(0.7 + Math.random() * 0.35);
            this._edgeTrees.push({
                ...pos, shape,
                reach: eR[0] + Math.random() * (eR[1] - eR[0]),
                height: 30 + Math.random() * 50,
                hue: eH[0] + Math.random() * (eH[1] - eH[0]),
                sat: 45 + Math.random() * 20,
                lightness: eL[0] + Math.random() * (eL[1] - eL[0]),
                alpha: 0.65 + Math.random() * 0.3
            });
        }

        this._vigRGB = jcfg ? jcfg.vigCol : '20,14,8';
    }

    // ── update ────────────────────────────────────

    update(dt) {
        if (this._rivers && this._rivers.length > 0) {
            this._riverScrollY += this._riverSpeed * dt;
            if (this._rivers[0] && this._riverScrollY >= this._rivers[0].totalH) {
                this._riverScrollY -= this._rivers[0].totalH;
            }
        }
    }

    // ── render ────────────────────────────────────

    renderBackground(ctx, time) {
        this._renderRivers(ctx);
    }

    renderOverlay(ctx, time) {
        ctx.save();

        // Earthy vignette
        this._renderEdgeVignette(ctx, this._vigRGB || '20,14,8', 0.35);

        // Edge tree tops (cartoon round blobs)
        if (this._edgeTrees) {
            for (const et of this._edgeTrees) {
                let cx, cy, rx, ry;
                if (et.side === 'left' || et.side === 'right') {
                    const dir = et.side === 'left' ? 1 : -1;
                    cx = et.x + et.reach * 0.45 * dir;
                    cy = et.y; rx = et.reach; ry = et.height * 0.5;
                } else {
                    const dir = et.side === 'top' ? 1 : -1;
                    cx = et.x; cy = et.y + et.reach * 0.45 * dir;
                    rx = et.height * 0.5; ry = et.reach;
                }
                const n = et.shape.length;

                // Shadow
                ctx.globalAlpha = et.alpha * 0.3;
                ctx.fillStyle = 'rgba(6,3,1,0.6)';
                ctx.beginPath();
                for (let i = 0; i < n; i++) {
                    const a = (Math.PI * 2 / n) * i;
                    const px = cx + 3 + Math.cos(a) * rx * et.shape[i] * 0.9;
                    const py = cy + 3 + Math.sin(a) * ry * et.shape[i] * 0.9;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath(); ctx.fill();

                // Main body with smooth curves
                ctx.globalAlpha = et.alpha;
                ctx.fillStyle = `hsl(${et.hue},${et.sat}%,${et.lightness}%)`;
                ctx.beginPath();
                for (let i = 0; i < n; i++) {
                    const a0 = (Math.PI * 2 / n) * i;
                    const a1 = (Math.PI * 2 / n) * ((i + 1) % n);
                    const r0x = rx * et.shape[i], r0y = ry * et.shape[i];
                    const r1x = rx * et.shape[(i + 1) % n], r1y = ry * et.shape[(i + 1) % n];
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

                // Highlight
                ctx.globalAlpha = et.alpha * 0.4;
                ctx.fillStyle = `hsl(${et.hue - 5},${et.sat + 8}%,${et.lightness + 10}%)`;
                ctx.beginPath();
                ctx.ellipse(cx - rx * 0.1, cy - ry * 0.1, rx * 0.4, ry * 0.35, -0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    // ── private helpers ───────────────────────────

    _renderRivers(ctx) {
        if (!this._rivers || this._rivers.length === 0) return;
        const H = this.canvasHeight;
        const scrollY = this._riverScrollY || 0;
        ctx.save();
        for (const rv of this._rivers) {
            const pts = rv.points, totalH = rv.totalH, w = rv.width;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';

            for (const tileOff of [0, totalH]) {
                const oY = scrollY - tileOff;
                if (oY + totalH < -50 || oY > H + 50) continue;

                const trace = (dx) => {
                    ctx.beginPath();
                    ctx.moveTo(rv.baseX + pts[0].x + dx, pts[0].y + oY);
                    for (let i = 0; i < pts.length - 1; i++) {
                        const cpx = rv.baseX + (pts[i].x + pts[i + 1].x) * 0.5 + dx;
                        const cpy = (pts[i].y + pts[i + 1].y) * 0.5 + oY;
                        ctx.quadraticCurveTo(cpx, cpy, rv.baseX + pts[i + 1].x + dx, pts[i + 1].y + oY);
                    }
                };

                // Muddy bank
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = 'hsl(30, 25%, 14%)';
                ctx.lineWidth = w * 1.7;
                trace(0); ctx.stroke();
                // Main water body
                ctx.globalAlpha = 0.85;
                ctx.strokeStyle = `hsl(${rv.hue},${rv.sat}%,${rv.light}%)`;
                ctx.lineWidth = w;
                trace(0); ctx.stroke();
                // Lighter center
                ctx.globalAlpha = 0.45;
                ctx.strokeStyle = `hsl(${rv.hue},${rv.sat + 8}%,${rv.light + 12}%)`;
                ctx.lineWidth = w * 0.35;
                trace(0.5); ctx.stroke();
                // Specular glint
                ctx.globalAlpha = 0.18;
                ctx.strokeStyle = `hsl(${rv.hue},${rv.sat + 12}%,${rv.light + 25}%)`;
                ctx.lineWidth = w * 0.1;
                trace(-w * 0.15); ctx.stroke();
            }
        }
        ctx.restore();
    }
}

export default JunglePlanetRenderer;

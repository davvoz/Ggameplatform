/**
 * ToxicPlanetRenderer — Toxic / Acid planet (World 2, Planet 6)
 *
 * Renders: scrolling acid rivers with edge bubbles, pulsing toxic blob pools,
 *          dripping edge formations with tendrils, layered toxic fog/fumes,
 *          glowing spore particles, acid rain, sickly vignette.
 */
import { PlanetRenderer } from './PlanetRenderer.js';

export class ToxicPlanetRenderer extends PlanetRenderer {

    get fxLayerOrder() {
        return { sludge: 0, pools: 0, fumes: 1, bubbles: 2, spikes: 2 };
    }

    // ── build ─────────────────────────────────────

    build(theme) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const tcfg = theme.toxicConfig;

        // ─── Acid rivers with edge bubbles ───
        this._acidRivers = [];
        this._acidRiverScrollY = 0;
        const riverCount = tcfg ? (tcfg.acidRiverCount || 1) : 1;
        const rw = tcfg ? tcfg.acidRiverW : [14, 24];
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
            const segH = 50 + Math.random() * 30;
            const segs = Math.ceil(tileH / segH);
            const points = [{ x: 0, y: 0 }];
            let cx = 0, drift = (Math.random() - 0.5) * 12;
            for (let i = 0; i < segs; i++) {
                drift += (Math.random() - 0.5) * 18;
                drift = Math.max(-30, Math.min(30, drift));
                cx += drift;
                cx = Math.max(-W * 0.2, Math.min(W * 0.2, cx));
                points.push({ x: cx, y: (i + 1) * segH });
            }
            const totalRiverH = points[points.length - 1].y;
            const hue = 90 + Math.random() * 30;
            const sat = 55 + Math.random() * 25;
            const light = 22 + Math.random() * 12;
            // Generate bubble positions along the river edges
            const bubbles = [];
            const bubbleCount = this.quality === 'high' ? 15 : 7;
            for (let b = 0; b < bubbleCount; b++) {
                bubbles.push({
                    t: Math.random(),  // position along river (0-1)
                    side: Math.random() < 0.5 ? -1 : 1,
                    offset: 0.3 + Math.random() * 0.5,
                    size: 1.5 + Math.random() * 3,
                    phase: Math.random() * Math.PI * 2
                });
            }
            this._acidRivers.push({ baseX, width, points, totalH: totalRiverH, hue, sat, light, bubbles });
        }
        this._acidRiverSpeed = 22;

        // ─── Toxic blob pools (organic irregular shapes with sub-blobs) ───
        this._toxicPools = [];
        this._toxicPoolScrollY = 0;
        const poolCount = tcfg ? (tcfg.toxicPools || 0) : 0;
        if (poolCount > 0) {
            const totalH = H * 3;
            const spacing = totalH / poolCount;
            for (let i = 0; i < poolCount; i++) {
                // Create sub-blobs for organic look
                const subCount = 2 + Math.floor(Math.random() * 3);
                const subBlobs = [];
                for (let s = 0; s < subCount; s++) {
                    subBlobs.push({
                        dx: (Math.random() - 0.5) * 20,
                        dy: (Math.random() - 0.5) * 12,
                        rx: 8 + Math.random() * 14,
                        ry: 5 + Math.random() * 10,
                        rot: (Math.random() - 0.5) * 0.6,
                        phase: Math.random() * Math.PI * 2
                    });
                }
                this._toxicPools.push({
                    x: 35 + Math.random() * (W - 70),
                    y: i * spacing + Math.random() * spacing * 0.6,
                    rx: 22 + Math.random() * 25,
                    ry: 12 + Math.random() * 16,
                    rot: Math.random() * 0.5 - 0.25,
                    alpha: 0.5 + Math.random() * 0.3,
                    hue: 95 + Math.random() * 30,
                    sat: 65 + Math.random() * 20,
                    light: 30 + Math.random() * 15,
                    pulsePhase: Math.random() * Math.PI * 2,
                    subBlobs,
                    totalH
                });
            }
            this._toxicPoolSpeed = 22;
        }

        // ─── Pool bubble particles (rising from pools) ───
        this._poolBubbles = [];
        const bubbleTotal = this.quality === 'high' ? poolCount * 4 : poolCount * 2;
        for (let i = 0; i < bubbleTotal; i++) {
            this._poolBubbles.push({
                poolIdx: Math.floor(Math.random() * Math.max(1, poolCount)),
                dx: (Math.random() - 0.5) * 30,
                dy: 0,
                size: 1 + Math.random() * 2.5,
                speed: -8 - Math.random() * 12,
                life: Math.random() * 2,
                maxLife: 1 + Math.random() * 2,
                alpha: 0.3 + Math.random() * 0.3,
                hue: 95 + Math.random() * 25
            });
        }

        // ─── Dripping edge formations (organic blobs with tendrils) ───
        this._edgeToxic = [];
        const baseCount = tcfg ? tcfg.edgeN : 12;
        const count = this.quality === 'high' ? baseCount : Math.max(3, Math.round(baseCount * 0.57));
        const eR = tcfg ? tcfg.edgeReach : [25, 45];
        const eH = tcfg && tcfg.edgeHue ? tcfg.edgeHue : [80, 120];
        const eL = tcfg && tcfg.edgeLit ? tcfg.edgeLit : [12, 22];
        const eS = tcfg && tcfg.edgeSat ? tcfg.edgeSat : [30, 55];
        const positions = this._distributeEdgeElements(count, W, H);
        for (let i = 0; i < count; i++) {
            const pos = positions[i];
            const nPts = 6 + Math.floor(Math.random() * 3);
            const shape = [];
            for (let s = 0; s < nPts; s++) shape.push(0.55 + Math.random() * 0.5);
            // Drip tendrils hanging from the formation
            const dripCount = 1 + Math.floor(Math.random() * 3);
            const drips = [];
            for (let d = 0; d < dripCount; d++) {
                drips.push({
                    angle: Math.random() * Math.PI * 2,
                    length: 8 + Math.random() * 18,
                    width: 1.5 + Math.random() * 2,
                    phase: Math.random() * Math.PI * 2
                });
            }
            this._edgeToxic.push({
                ...pos, shape, drips,
                reach: eR[0] + Math.random() * (eR[1] - eR[0]),
                height: 28 + Math.random() * 48,
                hue: eH[0] + Math.random() * (eH[1] - eH[0]),
                sat: eS[0] + Math.random() * (eS[1] - eS[0]),
                lightness: eL[0] + Math.random() * (eL[1] - eL[0]),
                alpha: 0.6 + Math.random() * 0.3,
                hasGlow: Math.random() < 0.45,
                glowHue: 100 + Math.random() * 25
            });
        }

        // ─── Layered toxic fog (drifting semi-transparent gradients) ───
        this._toxicFog = [];
        const fogCount = this.quality === 'high' ? 4 : 2;
        for (let f = 0; f < fogCount; f++) {
            this._toxicFog.push({
                x: Math.random() * W,
                y: H * 0.2 + Math.random() * H * 0.6,
                radiusX: W * 0.3 + Math.random() * W * 0.3,
                radiusY: H * 0.08 + Math.random() * H * 0.12,
                hue: 85 + Math.random() * 35,
                sat: 40 + Math.random() * 25,
                light: 20 + Math.random() * 15,
                alpha: 0.06 + Math.random() * 0.08,
                driftSpeed: (Math.random() - 0.5) * 8,
                phase: Math.random() * Math.PI * 2
            });
        }

        // ─── Acid rain + toxic spore particles ───
        this._acidRainDrops = [];
        this._toxicSpores = [];
        if (tcfg && tcfg.acidRain) {
            const rainCount = this.quality === 'high'
                ? (tcfg.acidRainCount || 30)
                : Math.max(10, Math.round((tcfg.acidRainCount || 30) * 0.45));
            for (let i = 0; i < rainCount; i++) {
                this._acidRainDrops.push({
                    x: Math.random() * W, y: Math.random() * H,
                    length: 4 + Math.random() * 10,
                    speed: 35 + Math.random() * 30,
                    drift: -3 - Math.random() * 5,
                    alpha: 0.15 + Math.random() * 0.35,
                    hue: 90 + Math.random() * 30,
                    sat: 60 + Math.random() * 20,
                    light: 40 + Math.random() * 20
                });
            }
            // Add spores (glowing drifting particles)
            const sporeCount = this.quality === 'high' ? 15 : 6;
            for (let i = 0; i < sporeCount; i++) {
                this._toxicSpores.push({
                    x: Math.random() * W, y: Math.random() * H,
                    size: 1.5 + Math.random() * 3,
                    vx: (Math.random() - 0.5) * 6,
                    vy: -2 + Math.random() * 4,
                    driftPhase: Math.random() * Math.PI * 2,
                    alpha: 0.2 + Math.random() * 0.3,
                    hue: 90 + Math.random() * 35,
                    pulsePhase: Math.random() * Math.PI * 2
                });
            }
        }

        this._vigRGB = tcfg ? tcfg.vigCol : '15,30,5';
    }

    // ── update ────────────────────────────────────

    update(dt) {
        const W = this.canvasWidth, H = this.canvasHeight;
        // Scroll acid rivers
        if (this._acidRivers && this._acidRivers.length > 0) {
            this._acidRiverScrollY += this._acidRiverSpeed * dt;
            if (this._acidRivers[0] && this._acidRiverScrollY >= this._acidRivers[0].totalH) {
                this._acidRiverScrollY -= this._acidRivers[0].totalH;
            }
        }
        // Scroll toxic pools
        if (this._toxicPools && this._toxicPools.length > 0) {
            this._toxicPoolScrollY += this._toxicPoolSpeed * dt;
            if (this._toxicPools[0] && this._toxicPoolScrollY >= this._toxicPools[0].totalH) {
                this._toxicPoolScrollY -= this._toxicPools[0].totalH;
            }
        }
        // Update pool bubbles
        if (this._poolBubbles) {
            for (const pb of this._poolBubbles) {
                pb.life += dt;
                pb.dy += pb.speed * dt;
                if (pb.life > pb.maxLife) {
                    pb.dy = 0;
                    pb.life = 0;
                    pb.dx = (Math.random() - 0.5) * 30;
                }
            }
        }
        // Update toxic fog drift
        if (this._toxicFog) {
            for (const fog of this._toxicFog) {
                fog.x += fog.driftSpeed * dt;
                if (fog.x < -fog.radiusX) fog.x = W + fog.radiusX * 0.5;
                if (fog.x > W + fog.radiusX) fog.x = -fog.radiusX * 0.5;
            }
        }
        // Update acid rain
        if (this._acidRainDrops) {
            for (const rd of this._acidRainDrops) {
                rd.y += rd.speed * dt;
                rd.x += rd.drift * dt;
                if (rd.y > H + 15) { rd.y = -rd.length - 5; rd.x = Math.random() * W; }
                if (rd.x < -15) rd.x = W + 5;
                if (rd.x > W + 15) rd.x = -5;
            }
        }
        // Update toxic spores (irregular drift)
        if (this._toxicSpores) {
            const now = performance.now() * 0.001;
            for (const sp of this._toxicSpores) {
                sp.x += sp.vx * dt + Math.sin(sp.driftPhase + now * 0.7) * 3 * dt;
                sp.y += sp.vy * dt + Math.cos(sp.driftPhase + now * 0.5) * 2 * dt;
                if (sp.x < -10) sp.x = W + 5;
                if (sp.x > W + 10) sp.x = -5;
                if (sp.y < -10) sp.y = H + 5;
                if (sp.y > H + 10) sp.y = -5;
            }
        }
    }

    // ── render ────────────────────────────────────

    renderBackground(ctx, time) {
        this._renderAcidRivers(ctx, time);
        this._renderToxicPools(ctx, time);
    }

    renderOverlay(ctx, time) {
        ctx.save();

        // Layered toxic fog (behind edges)
        this._renderToxicFog(ctx, time);

        // Sickly green vignette
        this._renderEdgeVignette(ctx, this._vigRGB || '15,30,5', 0.5);

        // Dripping edge formations
        this._renderEdgeFormations(ctx, time);

        // Pool rising bubbles
        this._renderPoolBubbles(ctx, time);

        // Acid rain + toxic spores
        this._renderAcidRain(ctx);
        this._renderToxicSpores(ctx, time);

        ctx.restore();
    }

    // ── private helpers ───────────────────────────

    _renderAcidRivers(ctx, time) {
        if (!this._acidRivers || this._acidRivers.length === 0) return;
        const H = this.canvasHeight;
        const scrollY = this._acidRiverScrollY || 0;
        const now = typeof time === 'number' ? time : performance.now() * 0.001;
        ctx.save();
        for (const rv of this._acidRivers) {
            const pts = rv.points, totalH = rv.totalH, w = rv.width;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';

            for (const tileOff of [0, totalH]) {
                const oY = tileOff - scrollY;
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

                // Layer 1 — Contaminated sludge bank (wide dark edges)
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = `hsl(${rv.hue - 15},${Math.max(15, rv.sat - 20)}%,${Math.max(6, rv.light - 10)}%)`;
                ctx.lineWidth = w * 1.7;
                trace(0); ctx.stroke();

                // Layer 2 — Main acid flow body
                ctx.globalAlpha = 0.8;
                ctx.strokeStyle = `hsl(${rv.hue},${rv.sat}%,${rv.light}%)`;
                ctx.lineWidth = w;
                trace(0); ctx.stroke();

                // Layer 3 — Bright toxic center glowing stripe
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = `hsl(${rv.hue + 8},${rv.sat + 10}%,${rv.light + 15}%)`;
                ctx.lineWidth = w * 0.35;
                trace(0.5); ctx.stroke();

                // Layer 4 — Hot radioactive center line
                ctx.globalAlpha = 0.2;
                ctx.strokeStyle = `hsl(${rv.hue + 15},${rv.sat + 15}%,${rv.light + 30}%)`;
                ctx.lineWidth = w * 0.1;
                trace(-w * 0.1); ctx.stroke();

                // ── Edge bubbles along the river ──
                if (rv.bubbles) {
                    for (const bub of rv.bubbles) {
                        const segIdx = Math.floor(bub.t * (pts.length - 1));
                        const segT = (bub.t * (pts.length - 1)) - segIdx;
                        if (segIdx >= pts.length - 1) continue;
                        const px = rv.baseX + pts[segIdx].x + (pts[segIdx + 1].x - pts[segIdx].x) * segT;
                        const py = pts[segIdx].y + (pts[segIdx + 1].y - pts[segIdx].y) * segT + oY;
                        const bobble = Math.sin(bub.phase + now * 2.5) * 2;
                        const bx = px + bub.side * (w * bub.offset) + bobble;
                        const by = py + Math.cos(bub.phase + now * 1.8) * 1.5;
                        if (by < -10 || by > H + 10) continue;

                        // Bubble glow
                        ctx.globalAlpha = 0.2;
                        ctx.fillStyle = `hsl(${rv.hue + 10},${rv.sat + 5}%,${rv.light + 20}%)`;
                        ctx.beginPath();
                        ctx.arc(bx, by, bub.size * 1.4, 0, Math.PI * 2);
                        ctx.fill();
                        // Bubble body
                        ctx.globalAlpha = 0.35;
                        ctx.fillStyle = `hsl(${rv.hue + 5},${rv.sat}%,${rv.light + 10}%)`;
                        ctx.beginPath();
                        ctx.arc(bx, by, bub.size, 0, Math.PI * 2);
                        ctx.fill();
                        // Bright highlight
                        ctx.globalAlpha = 0.25;
                        ctx.fillStyle = `hsl(${rv.hue},${rv.sat + 10}%,${rv.light + 30}%)`;
                        ctx.beginPath();
                        ctx.arc(bx - bub.size * 0.2, by - bub.size * 0.2, bub.size * 0.35, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
        ctx.restore();
    }

    _renderToxicPools(ctx, time) {
        if (!this._toxicPools || this._toxicPools.length === 0) return;
        const H = this.canvasHeight;
        const scrollY = this._toxicPoolScrollY || 0;
        const now = typeof time === 'number' ? time : performance.now() * 0.001;
        ctx.save();
        for (const tp of this._toxicPools) {
            const totalH = tp.totalH;
            for (const tileOff of [0, totalH]) {
                const ly = tp.y + tileOff - scrollY;
                if (ly + tp.ry * 2 < -10 || ly - tp.ry * 2 > H + 10) continue;

                ctx.save();
                ctx.translate(tp.x, ly);
                ctx.rotate(tp.rot);

                const pulse = 0.5 + 0.5 * Math.sin(tp.pulsePhase + now * 2);

                // Sub-blobs (organic irregular outline)
                for (const sb of tp.subBlobs) {
                    const sbPulse = 0.9 + 0.1 * Math.sin(sb.phase + now * 1.5);
                    // Dark sludge sub-blob outline
                    ctx.globalAlpha = tp.alpha * 0.35;
                    ctx.fillStyle = `hsl(${tp.hue - 10},${Math.max(15, tp.sat - 20)}%,${Math.max(5, tp.light - 12)}%)`;
                    ctx.beginPath();
                    ctx.ellipse(sb.dx, sb.dy, sb.rx * 1.2 * sbPulse, sb.ry * 1.2 * sbPulse, sb.rot, 0, Math.PI * 2);
                    ctx.fill();
                    // Sub-blob body
                    ctx.globalAlpha = tp.alpha * 0.6;
                    ctx.fillStyle = `hsl(${tp.hue},${tp.sat}%,${tp.light}%)`;
                    ctx.beginPath();
                    ctx.ellipse(sb.dx, sb.dy, sb.rx * sbPulse, sb.ry * sbPulse, sb.rot, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Main pool — dark sludge ring
                ctx.globalAlpha = tp.alpha * 0.5;
                ctx.fillStyle = `hsl(${tp.hue - 10},${Math.max(15, tp.sat - 20)}%,${Math.max(5, tp.light - 12)}%)`;
                ctx.beginPath();
                ctx.ellipse(0, 0, tp.rx * 1.3, tp.ry * 1.3, 0, 0, Math.PI * 2);
                ctx.fill();

                // Acid pool body
                ctx.globalAlpha = tp.alpha * 0.8;
                ctx.fillStyle = `hsl(${tp.hue},${tp.sat}%,${tp.light}%)`;
                ctx.beginPath();
                ctx.ellipse(0, 0, tp.rx, tp.ry, 0, 0, Math.PI * 2);
                ctx.fill();

                // Inner glow (pulsing bright center)
                ctx.globalAlpha = tp.alpha * 0.45 * pulse;
                ctx.fillStyle = `hsl(${tp.hue + 10},${tp.sat + 10}%,${Math.min(65, tp.light + 18)}%)`;
                ctx.beginPath();
                ctx.ellipse(-tp.rx * 0.1, -tp.ry * 0.08, tp.rx * 0.5, tp.ry * 0.45, -0.3, 0, Math.PI * 2);
                ctx.fill();

                // Radioactive hot-spot (animated shimmer)
                const shimmer = 0.3 + 0.7 * Math.sin(tp.pulsePhase + now * 3.5 + 1);
                ctx.globalAlpha = tp.alpha * 0.2 * shimmer;
                ctx.fillStyle = `hsl(${tp.hue + 15},${tp.sat + 15}%,${Math.min(75, tp.light + 30)}%)`;
                ctx.beginPath();
                ctx.ellipse(tp.rx * 0.12, tp.ry * 0.05, tp.rx * 0.22, tp.ry * 0.2, 0.4, 0, Math.PI * 2);
                ctx.fill();

                // Edge rim glow
                ctx.globalAlpha = tp.alpha * 0.3;
                ctx.strokeStyle = `hsl(${tp.hue + 5},${tp.sat}%,${tp.light + 10}%)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(0, 0, tp.rx * 1.1, tp.ry * 1.1, 0, 0, Math.PI * 2);
                ctx.stroke();

                ctx.restore();
            }
        }
        ctx.restore();
    }

    _renderPoolBubbles(ctx, time) {
        if (!this._poolBubbles || this._poolBubbles.length === 0) return;
        if (!this._toxicPools || this._toxicPools.length === 0) return;
        const H = this.canvasHeight;
        const scrollY = this._toxicPoolScrollY || 0;
        const now = typeof time === 'number' ? time : performance.now() * 0.001;
        ctx.save();
        for (const pb of this._poolBubbles) {
            if (pb.poolIdx >= this._toxicPools.length) continue;
            const pool = this._toxicPools[pb.poolIdx];
            const lifeFrac = pb.life / pb.maxLife;
            if (lifeFrac > 1) continue;
            const fade = lifeFrac < 0.15 ? lifeFrac / 0.15 : 1 - (lifeFrac - 0.15) / 0.85;
            for (const tileOff of [0, pool.totalH]) {
                const py = pool.y + tileOff - scrollY + pb.dy;
                const px = pool.x + pb.dx;
                if (py < -10 || py > H + 10) continue;

                ctx.globalAlpha = pb.alpha * fade * 0.6;
                // Glow
                ctx.fillStyle = `hsl(${pb.hue},70%,45%)`;
                ctx.beginPath();
                ctx.arc(px, py, pb.size * 1.5, 0, Math.PI * 2);
                ctx.fill();
                // Bubble
                ctx.globalAlpha = pb.alpha * fade;
                ctx.fillStyle = `hsl(${pb.hue},60%,55%)`;
                ctx.beginPath();
                ctx.arc(px, py, pb.size, 0, Math.PI * 2);
                ctx.fill();
                // Highlight
                ctx.globalAlpha = pb.alpha * fade * 0.5;
                ctx.fillStyle = `hsl(${pb.hue},50%,72%)`;
                ctx.beginPath();
                ctx.arc(px - pb.size * 0.2, py - pb.size * 0.25, pb.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    _renderEdgeFormations(ctx, time) {
        if (!this._edgeToxic) return;
        const now = typeof time === 'number' ? time : performance.now() * 0.001;

        for (const et of this._edgeToxic) {
            let cx, cy, rx, ry;
            if (et.side === 'left' || et.side === 'right') {
                const dir = et.side === 'left' ? 1 : -1;
                cx = et.x + et.reach * 0.42 * dir;
                cy = et.y; rx = et.reach; ry = et.height * 0.5;
            } else {
                const dir = et.side === 'top' ? 1 : -1;
                cx = et.x; cy = et.y + et.reach * 0.42 * dir;
                rx = et.height * 0.5; ry = et.reach;
            }
            const n = et.shape.length;

            const drawBlobShape = (ox, oy, scale) => {
                ctx.beginPath();
                for (let i = 0; i < n; i++) {
                    const a0 = (Math.PI * 2 / n) * i;
                    const a1 = (Math.PI * 2 / n) * ((i + 1) % n);
                    const r0x = rx * et.shape[i] * scale, r0y = ry * et.shape[i] * scale;
                    const r1x = rx * et.shape[(i + 1) % n] * scale, r1y = ry * et.shape[(i + 1) % n] * scale;
                    const px = cx + ox + Math.cos(a0) * r0x;
                    const py = cy + oy + Math.sin(a0) * r0y;
                    if (i === 0) ctx.moveTo(px, py);
                    const aMid = (a0 + a1) * 0.5;
                    ctx.quadraticCurveTo(
                        cx + ox + Math.cos(aMid) * (r0x + r1x) * 0.55,
                        cy + oy + Math.sin(aMid) * (r0y + r1y) * 0.55,
                        cx + ox + Math.cos(a1) * r1x,
                        cy + oy + Math.sin(a1) * r1y
                    );
                }
                ctx.closePath();
            };

            // Layer 1 — Dark shadow
            ctx.globalAlpha = et.alpha * 0.3;
            ctx.fillStyle = 'rgba(5,10,2,0.6)';
            drawBlobShape(3, 3, 0.92);
            ctx.fill();

            // Layer 2 — Dark sludge undercoat
            ctx.globalAlpha = et.alpha * 0.6;
            ctx.fillStyle = `hsl(${et.hue - 10},${Math.max(15, et.sat - 12)}%,${Math.max(5, et.lightness - 6)}%)`;
            drawBlobShape(0, 0, 1.04);
            ctx.fill();

            // Layer 3 — Main blob body
            ctx.globalAlpha = et.alpha;
            ctx.fillStyle = `hsl(${et.hue},${et.sat}%,${et.lightness}%)`;
            drawBlobShape(0, 0, 1);
            ctx.fill();

            // Layer 4 — Toxic glow highlight
            ctx.globalAlpha = et.alpha * 0.45;
            ctx.fillStyle = `hsl(${et.hue},${Math.min(80, et.sat + 12)}%,${Math.min(55, et.lightness + 14)}%)`;
            ctx.beginPath();
            ctx.ellipse(cx - rx * 0.08, cy - ry * 0.08, rx * 0.4, ry * 0.35, -0.3, 0, Math.PI * 2);
            ctx.fill();

            // Radial glow at base (acid drip light)
            if (et.hasGlow) {
                ctx.globalAlpha = et.alpha * 0.3;
                const glowG = ctx.createRadialGradient(cx, cy + ry * 0.25, 0, cx, cy + ry * 0.25, rx * 0.5);
                glowG.addColorStop(0, `hsla(${et.glowHue},80%,45%,0.6)`);
                glowG.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glowG;
                ctx.beginPath();
                ctx.arc(cx, cy + ry * 0.25, rx * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // ── Drip tendrils (hanging ooze from the formation) ──
            if (et.drips) {
                for (const drip of et.drips) {
                    const da = drip.angle;
                    const startX = cx + Math.cos(da) * rx * 0.6;
                    const startY = cy + Math.sin(da) * ry * 0.6;
                    const dripSway = Math.sin(drip.phase + now * 1.5) * 3;
                    const endX = startX + Math.cos(da) * drip.length * 0.5 + dripSway;
                    const endY = startY + Math.sin(da) * drip.length + Math.abs(Math.sin(da)) * drip.length * 0.3;

                    // Drip tendril body
                    ctx.globalAlpha = et.alpha * 0.6;
                    ctx.strokeStyle = `hsl(${et.hue + 5},${et.sat + 5}%,${et.lightness + 5}%)`;
                    ctx.lineWidth = drip.width;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.quadraticCurveTo(
                        (startX + endX) * 0.5 + dripSway * 0.5,
                        (startY + endY) * 0.5,
                        endX, endY
                    );
                    ctx.stroke();

                    // Drip droplet at the tip
                    const dropPulse = 0.5 + 0.5 * Math.sin(drip.phase + now * 2.5);
                    ctx.globalAlpha = et.alpha * 0.5 * dropPulse;
                    ctx.fillStyle = `hsl(${et.hue + 10},${et.sat + 10}%,${et.lightness + 12}%)`;
                    ctx.beginPath();
                    ctx.arc(endX, endY, drip.width * 0.8 + dropPulse, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    _renderToxicFog(ctx, time) {
        if (!this._toxicFog || this._toxicFog.length === 0) return;
        const now = typeof time === 'number' ? time : performance.now() * 0.001;
        ctx.save();
        for (const fog of this._toxicFog) {
            const breathe = 0.85 + 0.15 * Math.sin(fog.phase + now * 0.4);
            ctx.globalAlpha = fog.alpha * breathe;
            const grad = ctx.createRadialGradient(
                fog.x, fog.y, 0,
                fog.x, fog.y, fog.radiusX * breathe
            );
            grad.addColorStop(0, `hsla(${fog.hue},${fog.sat}%,${fog.light}%,${fog.alpha * 1.5})`);
            grad.addColorStop(0.4, `hsla(${fog.hue},${fog.sat - 10}%,${fog.light - 5}%,${fog.alpha * 0.6})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(fog.x, fog.y, fog.radiusX * breathe, fog.radiusY * breathe, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _renderAcidRain(ctx) {
        if (!this._acidRainDrops || this._acidRainDrops.length === 0) return;
        ctx.save();
        for (const rd of this._acidRainDrops) {
            // Glow around each raindrop
            ctx.globalAlpha = rd.alpha * 0.2;
            ctx.strokeStyle = `hsl(${rd.hue},${rd.sat}%,${rd.light + 15}%)`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(rd.x, rd.y);
            ctx.lineTo(rd.x + rd.drift * 0.15, rd.y + rd.length);
            ctx.stroke();
            // Sharp raindrop line
            ctx.globalAlpha = rd.alpha;
            ctx.strokeStyle = `hsl(${rd.hue},${rd.sat}%,${rd.light}%)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rd.x, rd.y);
            ctx.lineTo(rd.x + rd.drift * 0.15, rd.y + rd.length);
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderToxicSpores(ctx, time) {
        if (!this._toxicSpores || this._toxicSpores.length === 0) return;
        const now = typeof time === 'number' ? time : performance.now() * 0.001;
        ctx.save();
        for (const sp of this._toxicSpores) {
            const pulse = 0.4 + 0.6 * Math.sin(sp.pulsePhase + now * 2);
            // Outer glow
            ctx.globalAlpha = sp.alpha * 0.3 * pulse;
            const rg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.size * 3);
            rg.addColorStop(0, `hsla(${sp.hue},70%,50%,0.4)`);
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size * 3, 0, Math.PI * 2);
            ctx.fill();
            // Bright spore body
            ctx.globalAlpha = sp.alpha * pulse;
            ctx.fillStyle = `hsl(${sp.hue},65%,55%)`;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
            ctx.fill();
            // Hot center
            ctx.globalAlpha = sp.alpha * 0.6 * pulse;
            ctx.fillStyle = `hsl(${sp.hue},50%,75%)`;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size * 0.35, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

export default ToxicPlanetRenderer;

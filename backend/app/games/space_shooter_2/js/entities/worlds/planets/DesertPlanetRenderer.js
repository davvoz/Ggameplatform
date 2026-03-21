/**
 * DesertPlanetRenderer — Desert planet (World 2)
 *
 * Renders: oasis pools, sand dune edge formations, sandstorm particles, warm vignette.
 */
import { PlanetRenderer } from './PlanetRenderer.js';

export class DesertPlanetRenderer extends PlanetRenderer {

    get fxLayerOrder() {
        return { sandDune: 0, boulder: 0, oasis: 1, mesa: 2, cactus: 2 };
    }

    // ── build ─────────────────────────────────────

    build(theme) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const dcfg = theme.desertConfig;

        // Scrolling oasis pools
        this._oasisPools = [];
        this._oasisPoolScrollY = 0;
        const oasisCount = dcfg ? (dcfg.oasisPools || 0) : 0;
        if (oasisCount > 0) {
            const totalH = H * 3;
            const spacing = totalH / oasisCount;
            for (let i = 0; i < oasisCount; i++) {
                this._oasisPools.push({
                    x: 40 + Math.random() * (W - 80),
                    y: i * spacing + Math.random() * spacing * 0.6,
                    rx: 18 + Math.random() * 22,
                    ry: 10 + Math.random() * 14,
                    rot: Math.random() * 0.5 - 0.25,
                    alpha: 0.5 + Math.random() * 0.3,
                    waterHue: 185 + Math.random() * 20,
                    waterSat: 50 + Math.random() * 20,
                    waterLight: 32 + Math.random() * 12,
                    vegHue: 110 + Math.random() * 30,
                    vegSat: 45 + Math.random() * 20,
                    vegLight: 28 + Math.random() * 10,
                    totalH: totalH
                });
            }
            this._oasisPoolSpeed = 22;
        }

        // Edge sand formations — wavy dune ridges
        this._edgeDunes = [];
        const edgeN = dcfg ? dcfg.edgeN : 12;
        const edgeReach = dcfg ? dcfg.edgeReach : [25, 48];
        const edgeHue = dcfg ? dcfg.edgeHue : [30, 45];
        const edgeLit = dcfg ? dcfg.edgeLit : [28, 42];
        const edgeSat = dcfg ? dcfg.edgeSat : [45, 65];
        for (let i = 0; i < edgeN; i++) {
            const side = Math.random() < 0.6
                ? (Math.random() < 0.5 ? 'left' : 'right')
                : (Math.random() < 0.5 ? 'top' : 'bottom');
            let x, y;
            switch (side) {
                case 'left': x = 0; y = Math.random() * H; break;
                case 'right': x = W; y = Math.random() * H; break;
                case 'top': x = Math.random() * W; y = 0; break;
                case 'bottom': x = Math.random() * W; y = H; break;
            }
            const waveN = 5 + Math.floor(Math.random() * 4);
            const waves = [];
            for (let w = 0; w < waveN; w++) {
                waves.push({ amp: 0.3 + Math.random() * 0.7, phase: Math.random() * Math.PI * 2 });
            }
            this._edgeDunes.push({
                side, x, y,
                reach: edgeReach[0] + Math.random() * (edgeReach[1] - edgeReach[0]),
                height: 30 + Math.random() * 50,
                hue: edgeHue[0] + Math.random() * (edgeHue[1] - edgeHue[0]),
                sat: edgeSat[0] + Math.random() * (edgeSat[1] - edgeSat[0]),
                lightness: edgeLit[0] + Math.random() * (edgeLit[1] - edgeLit[0]),
                alpha: 0.6 + Math.random() * 0.3,
                waves,
                hasHighlight: Math.random() < 0.5
            });
        }

        // Sandstorm particles
        this._sandstormParticles = [];
        if (dcfg && dcfg.sandstorm) {
            const count = dcfg.sandstormCount || 30;
            for (let i = 0; i < count; i++) {
                this._sandstormParticles.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    size: 0.4 + Math.random() * 2.0,
                    speed: 15 + Math.random() * 25,
                    drift: 8 + Math.random() * 15,
                    driftPhase: Math.random() * Math.PI * 2,
                    alpha: 0.15 + Math.random() * 0.35,
                    hue: 35 + Math.random() * 15
                });
            }
        }

        this._vigRGB = dcfg ? dcfg.vigCol : '45,30,10';
    }

    // ── update ────────────────────────────────────

    update(dt) {
        // Scroll oasis pools
        if (this._oasisPools && this._oasisPools.length > 0) {
            this._oasisPoolScrollY += this._oasisPoolSpeed * dt;
            if (this._oasisPools[0] && this._oasisPoolScrollY >= this._oasisPools[0].totalH) {
                this._oasisPoolScrollY -= this._oasisPools[0].totalH;
            }
        }
        // Update sandstorm particles
        if (this._sandstormParticles && this._sandstormParticles.length > 0) {
            const W = this.canvasWidth, H = this.canvasHeight;
            const now = performance.now() * 0.001;
            for (const sp of this._sandstormParticles) {
                sp.y += sp.speed * dt;
                sp.x += Math.sin(sp.driftPhase + now * 0.6) * sp.drift * dt;
                if (sp.y > H + 5) { sp.y = -5; sp.x = Math.random() * W; }
                if (sp.x < -10) sp.x = W + 5;
                if (sp.x > W + 10) sp.x = -5;
            }
        }
    }

    // ── render ────────────────────────────────────

    renderBackground(ctx, time) {
        this._renderOasisPools(ctx);
    }

    renderOverlay(ctx, time) {
        const W = this.canvasWidth, H = this.canvasHeight;
        ctx.save();

        // Warm amber vignette
        this._renderEdgeVignette(ctx, this._vigRGB || '45,30,10', 0.45);

        // Edge sand dune formations — wavy bezier profiles
        if (this._edgeDunes) {
            for (const ed of this._edgeDunes) {
                ctx.save();

                if (ed.side === 'left' || ed.side === 'right') {
                    const dir = ed.side === 'left' ? 1 : -1;
                    const baseX = ed.side === 'left' ? 0 : W;
                    const halfH = ed.height * 0.5;
                    const n = ed.waves.length;

                    // Shadow
                    ctx.globalAlpha = ed.alpha * 0.25;
                    ctx.fillStyle = 'rgba(15,8,2,0.5)';
                    ctx.beginPath();
                    ctx.moveTo(baseX, ed.y - halfH);
                    for (let i = 0; i < n; i++) {
                        const t1 = (i + 0.5) / n, t2 = (i + 1) / n;
                        const y1 = ed.y - halfH + t1 * ed.height;
                        const y2 = ed.y - halfH + t2 * ed.height;
                        const r1 = ed.reach * ed.waves[i].amp * dir + 3 * dir;
                        ctx.quadraticCurveTo(baseX + r1, y1, baseX + (i % 2 === 0 ? ed.reach * 0.3 : 0) * dir + 3 * dir, y2);
                    }
                    ctx.lineTo(baseX, ed.y + halfH);
                    ctx.closePath(); ctx.fill();

                    // Main body
                    ctx.globalAlpha = ed.alpha;
                    ctx.fillStyle = `hsl(${ed.hue},${ed.sat}%,${ed.lightness}%)`;
                    ctx.beginPath();
                    ctx.moveTo(baseX, ed.y - halfH);
                    for (let i = 0; i < n; i++) {
                        const t1 = (i + 0.5) / n, t2 = (i + 1) / n;
                        const y1 = ed.y - halfH + t1 * ed.height;
                        const y2 = ed.y - halfH + t2 * ed.height;
                        const r1 = ed.reach * ed.waves[i].amp * dir;
                        ctx.quadraticCurveTo(baseX + r1, y1, baseX + (i % 2 === 0 ? ed.reach * 0.3 : 0) * dir, y2);
                    }
                    ctx.lineTo(baseX, ed.y + halfH);
                    ctx.closePath(); ctx.fill();

                    // Ridge highlight
                    if (ed.hasHighlight) {
                        ctx.globalAlpha = ed.alpha * 0.4;
                        ctx.fillStyle = `hsl(${ed.hue},${ed.sat - 5}%,${Math.min(65, ed.lightness + 12)}%)`;
                        ctx.beginPath();
                        ctx.ellipse(baseX + ed.reach * 0.2 * dir, ed.y, ed.reach * 0.2, ed.height * 0.15, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    // Top/bottom edges
                    const dir = ed.side === 'top' ? 1 : -1;
                    const baseY = ed.side === 'top' ? 0 : H;
                    const halfW = ed.height * 0.5;
                    const n = ed.waves.length;

                    ctx.globalAlpha = ed.alpha;
                    ctx.fillStyle = `hsl(${ed.hue},${ed.sat}%,${ed.lightness}%)`;
                    ctx.beginPath();
                    ctx.moveTo(ed.x - halfW, baseY);
                    for (let i = 0; i < n; i++) {
                        const t1 = (i + 0.5) / n, t2 = (i + 1) / n;
                        const x1 = ed.x - halfW + t1 * ed.height;
                        const x2 = ed.x - halfW + t2 * ed.height;
                        const r1 = ed.reach * ed.waves[i].amp * dir;
                        ctx.quadraticCurveTo(x1, baseY + r1, x2, baseY + (i % 2 === 0 ? ed.reach * 0.3 : 0) * dir);
                    }
                    ctx.lineTo(ed.x + halfW, baseY);
                    ctx.closePath(); ctx.fill();
                }

                ctx.restore();
            }
        }

        // Sandstorm
        this._renderSandstorm(ctx);

        ctx.restore();
    }

    // ── private helpers ───────────────────────────

    _renderOasisPools(ctx) {
        if (!this._oasisPools || this._oasisPools.length === 0) return;
        const H = this.canvasHeight;
        const scrollY = this._oasisPoolScrollY || 0;
        ctx.save();
        for (const op of this._oasisPools) {
            const totalH = op.totalH;
            for (const tileOff of [0, totalH]) {
                const ly = op.y + scrollY - tileOff;
                if (ly + op.ry * 1.5 < -10 || ly - op.ry * 1.5 > H + 10) continue;

                ctx.save();
                ctx.translate(op.x, ly);
                ctx.rotate(op.rot);

                // Vegetation ring
                ctx.globalAlpha = op.alpha * 0.6;
                ctx.fillStyle = `hsl(${op.vegHue},${op.vegSat}%,${op.vegLight}%)`;
                ctx.beginPath();
                ctx.ellipse(0, 0, op.rx * 1.3, op.ry * 1.3, 0, 0, Math.PI * 2);
                ctx.fill();
                // Water pool
                ctx.globalAlpha = op.alpha * 0.85;
                ctx.fillStyle = `hsl(${op.waterHue},${op.waterSat}%,${op.waterLight}%)`;
                ctx.beginPath();
                ctx.ellipse(0, 0, op.rx, op.ry, 0, 0, Math.PI * 2);
                ctx.fill();
                // Highlight
                ctx.globalAlpha = op.alpha * 0.45;
                ctx.fillStyle = `hsl(${op.waterHue},${op.waterSat + 5}%,${Math.min(70, op.waterLight + 15)}%)`;
                ctx.beginPath();
                ctx.ellipse(-op.rx * 0.12, -op.ry * 0.12, op.rx * 0.4, op.ry * 0.35, -0.3, 0, Math.PI * 2);
                ctx.fill();
                // Edge ring
                ctx.globalAlpha = op.alpha * 0.3;
                ctx.strokeStyle = `hsl(${op.vegHue},${op.vegSat}%,${op.vegLight + 10}%)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(0, 0, op.rx * 1.15, op.ry * 1.15, 0, 0, Math.PI * 2);
                ctx.stroke();

                ctx.restore();
            }
        }
        ctx.restore();
    }

    _renderSandstorm(ctx) {
        if (!this._sandstormParticles || this._sandstormParticles.length === 0) return;
        ctx.save();
        const now = performance.now() * 0.001;
        for (const sp of this._sandstormParticles) {
            ctx.globalAlpha = sp.alpha * (0.5 + 0.5 * Math.sin(sp.driftPhase + now * 1.5));
            ctx.fillStyle = `hsl(${sp.hue},50%,55%)`;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

export default DesertPlanetRenderer;

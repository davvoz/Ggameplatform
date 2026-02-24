/**
 * MechanicalPlanetRenderer — Mechanical / Factory planet (World 2, Planet 5)
 *
 * Renders: scrolling conveyor belts with chevron markings and side-rail bolts,
 *          rotating gear wheels, circuit-board traces, industrial scaffolding
 *          with cross-bracing and warning stripes, steam vents, welding sparks.
 */
import { PlanetRenderer } from './PlanetRenderer.js';

export class MechanicalPlanetRenderer extends PlanetRenderer {

    get fxLayerOrder() {
        return { gears: 0, pipes: 0, plates: 1, sparks: 2, vents: 2 };
    }

    // ── build ─────────────────────────────────────

    build(theme) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const mcfg = theme.mechanicalConfig;

        // ─── Conveyor belts (scrolling segmented bands) ───
        this._conveyors = [];
        this._conveyorScrollY = 0;
        const beltCount = mcfg ? (mcfg.pipelineCount || 1) : 1;
        const pw = mcfg && mcfg.pipeW ? mcfg.pipeW : [18, 34];
        for (let b = 0; b < beltCount; b++) {
            let baseX;
            if (beltCount === 1) {
                baseX = W * 0.25 + Math.random() * W * 0.5;
            } else {
                const slot = (b + 0.5) / beltCount;
                baseX = W * (0.1 + slot * 0.8) + (Math.random() - 0.5) * W * 0.12;
            }
            const width = pw[0] + Math.random() * (pw[1] - pw[0]);
            const tileH = H * 3;
            const segH = 35 + Math.random() * 20;
            const segs = Math.ceil(tileH / segH);
            const points = [{ x: 0, y: 0 }];
            let cx = 0, drift = (Math.random() - 0.5) * 6;
            for (let i = 0; i < segs; i++) {
                drift += (Math.random() - 0.5) * 10;
                drift = Math.max(-18, Math.min(18, drift));
                if (Math.random() < 0.3) drift = Math.round(drift / 8) * 8;
                cx += drift;
                cx = Math.max(-W * 0.18, Math.min(W * 0.18, cx));
                points.push({ x: cx, y: (i + 1) * segH });
            }
            const totalH = points[points.length - 1].y;
            const hue = 210 + Math.random() * 20;
            const sat = 8 + Math.random() * 10;
            const light = 22 + Math.random() * 10;
            const chevronGap = 12 + Math.random() * 6;
            this._conveyors.push({ baseX, width, points, totalH, hue, sat, light, chevronGap });
        }
        this._conveyorSpeed = 20;

        // ─── Gear wheels (rotating toothed mechanisms) ───
        this._gears = [];
        this._gearScrollY = 0;
        const gearCount = mcfg ? (mcfg.junctions || 0) : 0;
        if (gearCount > 0) {
            const totalH = H * 3;
            const spacing = totalH / gearCount;
            for (let g = 0; g < gearCount; g++) {
                const teeth = 6 + Math.floor(Math.random() * 6);
                this._gears.push({
                    x: 30 + Math.random() * (W - 60),
                    y: g * spacing + Math.random() * spacing * 0.6,
                    radius: 12 + Math.random() * 16,
                    teeth,
                    toothDepth: 4 + Math.random() * 5,
                    rot: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() < 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.6),
                    alpha: 0.55 + Math.random() * 0.3,
                    hue: 200 + Math.random() * 30,
                    sat: 6 + Math.random() * 12,
                    light: 25 + Math.random() * 14,
                    hasHub: Math.random() < 0.7,
                    totalH
                });
            }
            this._gearSpeed = 20;
        }

        // ─── Edge scaffolding (industrial structures with cross-bracing) ───
        this._edgeMetal = [];
        const baseCount = mcfg ? mcfg.edgeN : 12;
        const count = this.quality === 'high' ? baseCount : Math.max(3, Math.round(baseCount * 0.57));
        const eR = mcfg ? mcfg.edgeReach : [25, 45];
        const eH = mcfg && mcfg.edgeHue ? mcfg.edgeHue : [200, 225];
        const eL = mcfg && mcfg.edgeLit ? mcfg.edgeLit : [18, 28];
        const eS = mcfg && mcfg.edgeSat ? mcfg.edgeSat : [5, 15];
        const positions = this._distributeEdgeElements(count, W, H);
        for (let i = 0; i < count; i++) {
            const pos = positions[i];
            const nPts = 5 + Math.floor(Math.random() * 3);
            const shape = [];
            for (let s = 0; s < nPts; s++) shape.push(0.5 + Math.random() * 0.55);
            this._edgeMetal.push({
                ...pos, shape,
                reach: eR[0] + Math.random() * (eR[1] - eR[0]),
                height: 25 + Math.random() * 45,
                hue: eH[0] + Math.random() * (eH[1] - eH[0]),
                sat: eS[0] + Math.random() * (eS[1] - eS[0]),
                lightness: eL[0] + Math.random() * (eL[1] - eL[0]),
                alpha: 0.65 + Math.random() * 0.3,
                hasWarning: Math.random() < 0.3,
                hasGlow: Math.random() < 0.4,
                glowHue: 30 + Math.random() * 20
            });
        }

        // ─── Circuit-board traces (thin pulsing lines with nodes) ───
        this._circuits = [];
        const circuitCount = this.quality === 'high' ? 6 + Math.floor(Math.random() * 4) : 3;
        for (let c = 0; c < circuitCount; c++) {
            const branches = [];
            const numBranches = 2 + Math.floor(Math.random() * 3);
            for (let br = 0; br < numBranches; br++) {
                const segCount = 3 + Math.floor(Math.random() * 4);
                const pts = [{ x: 0, y: 0 }];
                let bx = 0, by = 0;
                for (let s = 0; s < segCount; s++) {
                    if (Math.random() < 0.5) { bx += (Math.random() - 0.5) * 40; }
                    else { by += (Math.random() - 0.5) * 40; }
                    pts.push({ x: bx, y: by });
                }
                branches.push({ points: pts, hasNode: Math.random() < 0.6 });
            }
            this._circuits.push({
                x: Math.random() * W, y: Math.random() * H,
                branches,
                hue: 185 + Math.random() * 30,
                alpha: 0.15 + Math.random() * 0.2,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }

        // ─── Steam vent particles ───
        this._steamParticles = [];
        if (mcfg && mcfg.steam) {
            const steamCount = this.quality === 'high'
                ? (mcfg.steamCount || 25)
                : Math.max(8, Math.round((mcfg.steamCount || 25) * 0.45));
            for (let i = 0; i < steamCount; i++) {
                this._steamParticles.push({
                    x: Math.random() * W, y: Math.random() * H,
                    size: 2 + Math.random() * 5,
                    speed: -10 - Math.random() * 14,
                    drift: (Math.random() - 0.5) * 10,
                    driftPhase: Math.random() * Math.PI * 2,
                    alpha: 0.08 + Math.random() * 0.18,
                    hue: 200 + Math.random() * 20,
                    life: Math.random() * 3,
                    maxLife: 2.5 + Math.random() * 3
                });
            }
        }

        // ─── Welding spark particles ───
        this._sparks = [];
        const sparkCount = this.quality === 'high' ? 12 : 5;
        for (let i = 0; i < sparkCount; i++) {
            this._sparks.push({
                x: Math.random() * W, y: Math.random() * H,
                vx: (Math.random() - 0.5) * 40,
                vy: -15 - Math.random() * 25,
                life: Math.random() * 1.2,
                maxLife: 0.6 + Math.random() * 0.8,
                size: 0.5 + Math.random() * 1.5,
                hue: 30 + Math.random() * 25
            });
        }

        this._vigRGB = mcfg ? mcfg.vigCol : '20,25,35';
    }

    // ── update ────────────────────────────────────

    update(dt) {
        const W = this.canvasWidth, H = this.canvasHeight;
        // Scroll conveyor belts
        if (this._conveyors && this._conveyors.length > 0) {
            this._conveyorScrollY += this._conveyorSpeed * dt;
            if (this._conveyors[0] && this._conveyorScrollY >= this._conveyors[0].totalH) {
                this._conveyorScrollY -= this._conveyors[0].totalH;
            }
        }
        // Scroll & rotate gears
        if (this._gears && this._gears.length > 0) {
            this._gearScrollY += this._gearSpeed * dt;
            if (this._gears[0] && this._gearScrollY >= this._gears[0].totalH) {
                this._gearScrollY -= this._gears[0].totalH;
            }
            for (const g of this._gears) g.rot += g.rotSpeed * dt;
        }
        // Update steam
        if (this._steamParticles) {
            const now = performance.now() * 0.001;
            for (const sp of this._steamParticles) {
                sp.life += dt;
                sp.y += sp.speed * dt;
                sp.x += Math.sin(sp.driftPhase + now * 0.5) * sp.drift * dt;
                sp.size += dt * 0.9;
                if (sp.y < -15 || sp.life > sp.maxLife) {
                    sp.y = H + 5 + Math.random() * 20;
                    sp.x = Math.random() * W;
                    sp.size = 2 + Math.random() * 5;
                    sp.life = 0;
                }
                if (sp.x < -15) sp.x = W + 5;
                if (sp.x > W + 15) sp.x = -5;
            }
        }
        // Update sparks
        if (this._sparks) {
            for (const sk of this._sparks) {
                sk.life += dt;
                sk.x += sk.vx * dt;
                sk.y += sk.vy * dt;
                sk.vy += 45 * dt;
                if (sk.life > sk.maxLife) {
                    sk.x = Math.random() * W;
                    sk.y = Math.random() * H;
                    sk.vx = (Math.random() - 0.5) * 40;
                    sk.vy = -15 - Math.random() * 25;
                    sk.life = 0;
                }
            }
        }
    }

    // ── render ────────────────────────────────────

    renderBackground(ctx, time) {
        this._renderCircuits(ctx, time);
        this._renderConveyors(ctx);
        this._renderGears(ctx);
    }

    renderOverlay(ctx, time) {
        ctx.save();
        this._renderEdgeVignette(ctx, this._vigRGB || '20,25,35', 0.45);
        this._renderScaffolding(ctx, time);
        this._renderSteam(ctx);
        this._renderSparks(ctx);
        ctx.restore();
    }

    // ── private helpers ───────────────────────────

    _renderConveyors(ctx) {
        if (!this._conveyors || this._conveyors.length === 0) return;
        const H = this.canvasHeight;
        const scrollY = this._conveyorScrollY || 0;
        ctx.save();
        for (const cv of this._conveyors) {
            const pts = cv.points, totalH = cv.totalH, w = cv.width;
            ctx.lineCap = 'butt'; ctx.lineJoin = 'round';

            for (const tileOff of [0, totalH]) {
                const oY = tileOff - scrollY;
                if (oY + totalH < -50 || oY > H + 50) continue;

                const trace = (dx) => {
                    ctx.beginPath();
                    ctx.moveTo(cv.baseX + pts[0].x + dx, pts[0].y + oY);
                    for (let i = 0; i < pts.length - 1; i++) {
                        const nx = cv.baseX + pts[i + 1].x + dx;
                        const ny = pts[i + 1].y + oY;
                        if (i % 3 === 0) {
                            ctx.lineTo(nx, ny);
                        } else {
                            const cpx = cv.baseX + (pts[i].x + pts[i + 1].x) * 0.5 + dx;
                            const cpy = (pts[i].y + pts[i + 1].y) * 0.5 + oY;
                            ctx.quadraticCurveTo(cpx, cpy, nx, ny);
                        }
                    }
                };

                // Layer 1 — Side-rail frame (dark outer casing)
                ctx.globalAlpha = 0.45;
                ctx.strokeStyle = `hsl(${cv.hue},${cv.sat - 3}%,${Math.max(3, cv.light - 14)}%)`;
                ctx.lineWidth = w * 1.9;
                trace(0); ctx.stroke();

                // Layer 2 — Belt surface (main visible body)
                ctx.globalAlpha = 0.75;
                ctx.strokeStyle = `hsl(${cv.hue},${cv.sat}%,${cv.light}%)`;
                ctx.lineWidth = w;
                trace(0); ctx.stroke();

                // Layer 3 — Metallic specular highlight ridge
                ctx.globalAlpha = 0.3;
                ctx.strokeStyle = `hsl(${cv.hue + 5},${cv.sat + 5}%,${cv.light + 16}%)`;
                ctx.lineWidth = w * 0.22;
                trace(-w * 0.18); ctx.stroke();

                // Layer 4 — Dark center groove
                ctx.globalAlpha = 0.22;
                ctx.strokeStyle = `hsl(${cv.hue},${cv.sat}%,${Math.max(4, cv.light - 10)}%)`;
                ctx.lineWidth = w * 0.06;
                trace(0); ctx.stroke();

                // ── Chevron segment markings (conveyor belt look) ──
                ctx.globalAlpha = 0.18;
                ctx.strokeStyle = `hsl(${cv.hue + 10},${cv.sat + 8}%,${cv.light + 20}%)`;
                ctx.lineWidth = 1;
                const gap = cv.chevronGap;
                let accDist = 0;
                for (let i = 0; i < pts.length - 1; i++) {
                    const ax = cv.baseX + pts[i].x, ay = pts[i].y + oY;
                    const bx = cv.baseX + pts[i + 1].x, by = pts[i + 1].y + oY;
                    const dx = bx - ax, dy = by - ay;
                    const segLen = Math.sqrt(dx * dx + dy * dy);
                    if (segLen < 1) { accDist += segLen; continue; }
                    const ux = dx / segLen, uy = dy / segLen;
                    const nx = -uy, ny = ux;
                    let d = gap - (accDist % gap);
                    while (d < segLen) {
                        const t = d / segLen;
                        const mx = ax + dx * t, my = ay + dy * t;
                        const hw = w * 0.35;
                        ctx.beginPath();
                        ctx.moveTo(mx - nx * hw, my - ny * hw);
                        ctx.lineTo(mx + ux * 3, my + uy * 3);
                        ctx.lineTo(mx + nx * hw, my + ny * hw);
                        ctx.stroke();
                        d += gap;
                    }
                    accDist += segLen;
                }

                // ── Side-rail bolts at wider intervals ──
                ctx.globalAlpha = 0.22;
                ctx.fillStyle = `hsl(${cv.hue},${cv.sat + 4}%,${cv.light - 4}%)`;
                const boltGap = gap * 3;
                accDist = 0;
                for (let i = 0; i < pts.length - 1; i++) {
                    const ax = cv.baseX + pts[i].x, ay = pts[i].y + oY;
                    const bx = cv.baseX + pts[i + 1].x, by = pts[i + 1].y + oY;
                    const dx = bx - ax, dy = by - ay;
                    const segLen = Math.sqrt(dx * dx + dy * dy);
                    if (segLen < 1) { accDist += segLen; continue; }
                    const nx = -dy / segLen, ny = dx / segLen;
                    let d = boltGap - (accDist % boltGap);
                    while (d < segLen) {
                        const t = d / segLen;
                        const mx = ax + dx * t, my = ay + dy * t;
                        for (const side of [-1, 1]) {
                            ctx.beginPath();
                            ctx.arc(mx + nx * w * 0.44 * side, my + ny * w * 0.44 * side, 1.3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        d += boltGap;
                    }
                    accDist += segLen;
                }
            }
        }
        ctx.restore();
    }

    _renderGears(ctx) {
        if (!this._gears || this._gears.length === 0) return;
        const H = this.canvasHeight;
        const scrollY = this._gearScrollY || 0;
        ctx.save();
        for (const g of this._gears) {
            const totalH = g.totalH;
            for (const tileOff of [0, totalH]) {
                const gy = g.y + tileOff - scrollY;
                if (gy + g.radius * 1.5 < -10 || gy - g.radius * 1.5 > H + 10) continue;

                ctx.save();
                ctx.translate(g.x, gy);
                ctx.rotate(g.rot);

                const R = g.radius, td = g.toothDepth, n = g.teeth;
                const toothW = Math.PI / n * 0.6;

                const drawGearShape = (ox, oy) => {
                    ctx.beginPath();
                    for (let i = 0; i < n; i++) {
                        const a = (Math.PI * 2 / n) * i;
                        const aHalf = a + Math.PI / n;
                        ctx.lineTo(ox + Math.cos(a - toothW) * (R + td), oy + Math.sin(a - toothW) * (R + td));
                        ctx.lineTo(ox + Math.cos(a + toothW) * (R + td), oy + Math.sin(a + toothW) * (R + td));
                        ctx.lineTo(ox + Math.cos(aHalf - toothW * 0.5) * R, oy + Math.sin(aHalf - toothW * 0.5) * R);
                        ctx.lineTo(ox + Math.cos(aHalf + toothW * 0.5) * R, oy + Math.sin(aHalf + toothW * 0.5) * R);
                    }
                    ctx.closePath();
                };

                // Shadow
                ctx.globalAlpha = g.alpha * 0.3;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                drawGearShape(3, 3);
                ctx.fill();

                // Dark metal undercoat
                ctx.globalAlpha = g.alpha * 0.6;
                ctx.fillStyle = `hsl(${g.hue},${g.sat}%,${Math.max(5, g.light - 6)}%)`;
                drawGearShape(0, 0);
                ctx.fill();

                // Gear body
                ctx.globalAlpha = g.alpha;
                ctx.fillStyle = `hsl(${g.hue},${g.sat}%,${g.light}%)`;
                drawGearShape(0, 0);
                ctx.fill();

                // Specular highlight arc
                ctx.globalAlpha = g.alpha * 0.3;
                ctx.fillStyle = `hsl(${g.hue},${g.sat + 3}%,${g.light + 14}%)`;
                ctx.beginPath();
                ctx.arc(-R * 0.12, -R * 0.12, R * 0.5, 0, Math.PI * 2);
                ctx.fill();

                // Hub (darker center circle + axle + bolts)
                if (g.hasHub) {
                    ctx.globalAlpha = g.alpha * 0.8;
                    ctx.fillStyle = `hsl(${g.hue},${g.sat + 2}%,${Math.max(6, g.light - 8)}%)`;
                    ctx.beginPath();
                    ctx.arc(0, 0, R * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                    // Axle hole
                    ctx.globalAlpha = g.alpha * 0.5;
                    ctx.fillStyle = `hsl(${g.hue},${g.sat}%,${Math.max(3, g.light - 14)}%)`;
                    ctx.beginPath();
                    ctx.arc(0, 0, R * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                    // Hub bolts
                    ctx.globalAlpha = g.alpha * 0.4;
                    ctx.fillStyle = `hsl(${g.hue},${g.sat + 5}%,${g.light + 5}%)`;
                    for (let b = 0; b < 4; b++) {
                        const ba = (Math.PI * 2 / 4) * b;
                        ctx.beginPath();
                        ctx.arc(Math.cos(ba) * R * 0.22, Math.sin(ba) * R * 0.22, 1.2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                ctx.restore();
            }
        }
        ctx.restore();
    }

    _renderScaffolding(ctx, time) {
        if (!this._edgeMetal) return;
        const now = typeof time === 'number' ? time : performance.now() * 0.001;

        for (const em of this._edgeMetal) {
            let cx, cy, rx, ry;
            if (em.side === 'left' || em.side === 'right') {
                const dir = em.side === 'left' ? 1 : -1;
                cx = em.x + em.reach * 0.4 * dir;
                cy = em.y; rx = em.reach; ry = em.height * 0.5;
            } else {
                const dir = em.side === 'top' ? 1 : -1;
                cx = em.x; cy = em.y + em.reach * 0.4 * dir;
                rx = em.height * 0.5; ry = em.reach;
            }
            const n = em.shape.length;

            const drawPoly = (ox, oy, scale) => {
                ctx.beginPath();
                for (let i = 0; i < n; i++) {
                    const a = (Math.PI * 2 / n) * i;
                    const px = cx + ox + Math.cos(a) * rx * em.shape[i] * scale;
                    const py = cy + oy + Math.sin(a) * ry * em.shape[i] * scale;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
            };

            // Layer 1: Deep shadow
            ctx.globalAlpha = em.alpha * 0.35;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            drawPoly(3, 3, 0.92);
            ctx.fill();

            // Layer 2: Dark metal undercoat
            ctx.globalAlpha = em.alpha * 0.7;
            ctx.fillStyle = `hsl(${em.hue},${em.sat}%,${Math.max(5, em.lightness - 6)}%)`;
            drawPoly(0, 0, 1.03);
            ctx.fill();

            // Layer 3: Main metal body
            ctx.globalAlpha = em.alpha;
            ctx.fillStyle = `hsl(${em.hue},${em.sat}%,${em.lightness}%)`;
            drawPoly(0, 0, 1);
            ctx.fill();

            // Layer 4: Specular highlight
            ctx.globalAlpha = em.alpha * 0.35;
            ctx.fillStyle = `hsl(${em.hue},${em.sat}%,${Math.min(50, em.lightness + 14)}%)`;
            ctx.beginPath();
            ctx.ellipse(cx - rx * 0.08, cy - ry * 0.08, rx * 0.35, ry * 0.3, -0.3, 0, Math.PI * 2);
            ctx.fill();

            // Cross-brace lines (structural detail)
            ctx.globalAlpha = em.alpha * 0.25;
            ctx.strokeStyle = `hsl(${em.hue},${em.sat}%,${Math.max(5, em.lightness - 10)}%)`;
            ctx.lineWidth = 1;
            for (let b = 0; b < Math.min(3, Math.floor(n / 2)); b++) {
                const a1 = (Math.PI * 2 / n) * b;
                const opp = (b + Math.floor(n / 2)) % n;
                const a2 = (Math.PI * 2 / n) * opp;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a1) * rx * em.shape[b] * 0.8,
                           cy + Math.sin(a1) * ry * em.shape[b] * 0.8);
                ctx.lineTo(cx + Math.cos(a2) * rx * em.shape[opp] * 0.8,
                           cy + Math.sin(a2) * ry * em.shape[opp] * 0.8);
                ctx.stroke();
            }

            // Rivet bolts at each angular vertex
            ctx.globalAlpha = em.alpha * 0.4;
            ctx.fillStyle = `hsl(${em.hue},${em.sat + 4}%,${em.lightness - 4}%)`;
            for (let i = 0; i < n; i++) {
                const a = (Math.PI * 2 / n) * i;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(a) * rx * em.shape[i] * 0.7,
                        cy + Math.sin(a) * ry * em.shape[i] * 0.7, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Warning hazard stripe plate (yellow/black)
            if (em.hasWarning) {
                ctx.save();
                ctx.globalAlpha = em.alpha * 0.45;
                ctx.translate(cx, cy);
                const pw2 = 10, ph = 6;
                ctx.fillStyle = 'hsl(50,85%,50%)';
                ctx.fillRect(-pw2 / 2, -ph / 2, pw2, ph);
                ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                for (let s = -2; s <= 3; s++) {
                    ctx.moveTo(-pw2 / 2 + s * 3.5, -ph / 2);
                    ctx.lineTo(-pw2 / 2 + s * 3.5 + ph, ph / 2);
                }
                ctx.stroke();
                ctx.restore();
            }

            // Pulsing indicator light
            if (em.hasGlow) {
                const glowX = cx - rx * 0.12;
                const glowY = cy + ry * 0.12;
                const pulse = 0.5 + 0.5 * Math.sin(now * 3 + em.glowHue);
                ctx.globalAlpha = em.alpha * 0.55 * pulse;
                const rg = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 6);
                rg.addColorStop(0, `hsla(${em.glowHue},90%,60%,0.8)`);
                rg.addColorStop(0.5, `hsla(${em.glowHue},80%,40%,0.3)`);
                rg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = rg;
                ctx.beginPath();
                ctx.arc(glowX, glowY, 6, 0, Math.PI * 2);
                ctx.fill();
                // Bright center dot
                ctx.globalAlpha = em.alpha * 0.8 * pulse;
                ctx.fillStyle = `hsl(${em.glowHue},95%,65%)`;
                ctx.beginPath();
                ctx.arc(glowX, glowY, 1.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _renderCircuits(ctx, time) {
        if (!this._circuits || this._circuits.length === 0) return;
        const now = typeof time === 'number' ? time : performance.now() * 0.001;
        ctx.save();
        ctx.lineJoin = 'round';
        for (const c of this._circuits) {
            const pulse = 0.4 + 0.6 * Math.sin(c.pulsePhase + now * 1.5);
            ctx.globalAlpha = c.alpha * pulse;
            for (const br of c.branches) {
                const pts = br.points;
                // Under-glow
                ctx.strokeStyle = `hsla(${c.hue},70%,45%,0.25)`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(c.x + pts[0].x, c.y + pts[0].y);
                for (let i = 1; i < pts.length; i++) ctx.lineTo(c.x + pts[i].x, c.y + pts[i].y);
                ctx.stroke();
                // Sharp trace line
                ctx.strokeStyle = `hsl(${c.hue},65%,50%)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(c.x + pts[0].x, c.y + pts[0].y);
                for (let i = 1; i < pts.length; i++) ctx.lineTo(c.x + pts[i].x, c.y + pts[i].y);
                ctx.stroke();
                // Terminal node
                if (br.hasNode) {
                    const last = pts[pts.length - 1];
                    ctx.fillStyle = `hsl(${c.hue},70%,55%)`;
                    ctx.beginPath();
                    ctx.arc(c.x + last.x, c.y + last.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    _renderSteam(ctx) {
        if (!this._steamParticles || this._steamParticles.length === 0) return;
        ctx.save();
        for (const sp of this._steamParticles) {
            const lifeFrac = sp.life / sp.maxLife;
            const fade = lifeFrac < 0.25 ? lifeFrac / 0.25 : 1 - (lifeFrac - 0.25) / 0.75;
            if (fade <= 0) continue;
            ctx.globalAlpha = sp.alpha * fade;
            const grad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.size);
            grad.addColorStop(0, `hsla(${sp.hue},10%,75%,${sp.alpha * fade * 0.6})`);
            grad.addColorStop(0.6, `hsla(${sp.hue},6%,65%,${sp.alpha * fade * 0.2})`);
            grad.addColorStop(1, `hsla(${sp.hue},4%,55%,0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _renderSparks(ctx) {
        if (!this._sparks || this._sparks.length === 0) return;
        ctx.save();
        for (const sk of this._sparks) {
            const lifeFrac = sk.life / sk.maxLife;
            if (lifeFrac > 1) continue;
            const fade = lifeFrac < 0.1 ? lifeFrac / 0.1 : 1 - (lifeFrac - 0.1) / 0.9;
            if (fade <= 0) continue;
            ctx.globalAlpha = 0.6 * fade;
            const rg = ctx.createRadialGradient(sk.x, sk.y, 0, sk.x, sk.y, sk.size * 3);
            rg.addColorStop(0, `hsla(${sk.hue},90%,70%,0.5)`);
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(sk.x, sk.y, sk.size * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `hsl(${sk.hue},90%,80%)`;
            ctx.beginPath();
            ctx.arc(sk.x, sk.y, sk.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

export default MechanicalPlanetRenderer;

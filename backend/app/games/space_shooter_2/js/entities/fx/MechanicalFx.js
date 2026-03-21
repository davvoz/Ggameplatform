// ═══════════════════════════════════════════════
//  Mechanical terrain FX strategy
//  SubTypes: gears · pipes · plates · sparks · vents
// ═══════════════════════════════════════════════

import { BaseFxStrategy } from './BaseFxStrategy.js';
import { drawPolygon, pickColor, generateShape } from './RenderHelpers.js';

// ── Color palettes ─────────────────────────────
const METAL_PALETTE = [
    { weight: 0.45, hue: [210, 15], sat: [8, 10],  light: [30, 12, 4] },
    { weight: 0.30, hue: [200, 20], sat: [6, 8],   light: [25, 10, 3] },
    { weight: 0.25, hue: [30, 15],  sat: [12, 10],  light: [20, 8, 3] }
];

const RUST_PALETTE = [
    { weight: 0.50, hue: [18, 12], sat: [40, 20], light: [22, 10, 3] },
    { weight: 0.50, hue: [25, 15], sat: [35, 18], light: [18, 8, 3] }
];

// ── Mechanical FX (terrain composite) ──────────
export class MechanicalFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const mc = this.config;
        const d = mc ? mc.dist : [0.30, 0.55, 0.75, 0.90];
        const roll = Math.random();

        if (roll < d[0])      this._initGears(W, H, initial);
        else if (roll < d[1]) this._initPipes(W, H, initial);
        else if (roll < d[2]) this._initPlates(W, H, initial);
        else if (roll < d[3]) this._initSparks(W, H, initial);
        else                  this._initVents(W, H, initial);
    }

    // ── Sub-type initialisers ──

    _initGears(W, H, initial) {
        this.subType = 'gears';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -60 - Math.random() * 60;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        this.size = 20 + near * 30 + Math.random() * 20;
        this.speed = 14 + near * 14 + Math.random() * 10;
        this.alpha = 0.5 + near * 0.3;
        Object.assign(this, pickColor(METAL_PALETTE, near));
        this.light = this.lightness;
        this.teeth = 6 + Math.floor(Math.random() * 6);
        this.toothDepth = 0.2 + Math.random() * 0.15;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (0.2 + Math.random() * 0.4) * (Math.random() < 0.5 ? 1 : -1);
        this.shadowOx = 3 + Math.random() * 3;
        this.shadowOy = 3 + Math.random() * 3;
        this.hasHub = Math.random() < 0.75;
        this.hubBolts = 3 + Math.floor(Math.random() * 3);
    }

    _initPipes(W, H, initial) {
        this.subType = 'pipes';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -40 - Math.random() * 50;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        this.size = 15 + near * 25 + Math.random() * 15;
        this.speed = 16 + near * 12 + Math.random() * 8;
        this.alpha = 0.45 + near * 0.3;
        Object.assign(this, pickColor(METAL_PALETTE, near));
        this.light = this.lightness;
        this.w = this.size * (1.8 + Math.random());
        this.h = this.size * (0.3 + Math.random() * 0.2);
        this.shadowOx = 2 + Math.random() * 2;
        this.shadowOy = 2 + Math.random() * 2;
        this.joints = 1 + Math.floor(Math.random() * 3);
        this.hasFlange = Math.random() < 0.5;
    }

    _initPlates(W, H, initial) {
        this.subType = 'plates';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -50 - Math.random() * 50;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        this.size = 22 + near * 35 + Math.random() * 18;
        this.speed = 15 + near * 13 + Math.random() * 9;
        this.alpha = 0.5 + near * 0.25;
        Object.assign(this, pickColor(RUST_PALETTE, near));
        this.light = this.lightness;
        this.shape = generateShape(4, 0.85, 0.1);
        this.rot = Math.random() * Math.PI * 0.25 - Math.PI * 0.125;
        this.shadowOx = 3 + Math.random() * 3;
        this.shadowOy = 3 + Math.random() * 3;
        this.hasWarning = Math.random() < 0.3;
        this.hasCrossBrace = Math.random() < 0.4;
    }

    _initSparks(W, H, initial) {
        this.subType = 'sparks';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -20 - Math.random() * 30;
        this.depthLayer = 0.7 + Math.random() * 0.3;
        this.size = 2 + Math.random() * 3;
        this.speed = 30 + Math.random() * 20;
        this.alpha = 0.7 + Math.random() * 0.3;
        this.hue = 35 + Math.random() * 15;
        this.sat = 90;
        this.light = 60 + Math.random() * 20;
        this.life = 0.4 + Math.random() * 0.6;
        this.maxLife = this.life;
        this.vx = (Math.random() - 0.5) * 30;
        this.vy = -10 - Math.random() * 15;
        this.trail = [];
        this.trailMax = 3 + Math.floor(Math.random() * 3);
    }

    _initVents(W, H, initial) {
        this.subType = 'vents';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -30 - Math.random() * 40;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        this.size = 12 + near * 20 + Math.random() * 12;
        this.speed = 18 + near * 16 + Math.random() * 12;
        this.alpha = 0.25 + near * 0.18;
        this.hue = 200 + Math.random() * 20;
        this.sat = 5 + Math.random() * 10;
        this.light = 40 + Math.random() * 18;
        this.elongation = 0.6 + Math.random() * 0.5;
        this.drift = (Math.random() - 0.5) * 6;
        this.expandRate = 0.4 + Math.random() * 0.4;
        this.life = 0;
        this.maxLife = 2 + Math.random() * 3;
    }

    // ── Update ──
    _update(dt, W, H) {
        this.y += this.speed * dt;

        switch (this.subType) {
            case 'gears':
                this.rotation += this.rotSpeed * dt;
                break;
            case 'sparks':
                this.life -= dt;
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.vy += 40 * dt;
                this.alpha = Math.max(0, (this.life / this.maxLife) * 0.9);
                // Record trail
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > this.trailMax) this.trail.shift();
                if (this.life <= 0) { this.reset(false); return; }
                break;
            case 'vents':
                this.x += this.drift * dt;
                this.size += this.expandRate * dt;
                this.life += dt;
                this.alpha *= (1 - 0.15 * dt);
                if (this.life > this.maxLife || this.alpha < 0.02) { this.reset(false); return; }
                break;
        }

        if (this._isOffBottom(this.size + 20)) this.reset(false);
    }

    // ── Render ──
    _render(ctx) {
        switch (this.subType) {
            case 'gears':  this._renderGear(ctx);   break;
            case 'pipes':  this._renderPipe(ctx);   break;
            case 'plates': this._renderPlate(ctx);   break;
            case 'sparks': this._renderSpark(ctx);   break;
            case 'vents':  this._renderVent(ctx);    break;
        }
    }

    // ── Gear (toothed wheel with hub, bolts, specular) ──
    _renderGear(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        const R = this.size * 0.5;
        const td = R * this.toothDepth;
        const n = this.teeth;
        const toothW = Math.PI / n * 0.55;

        const drawGear = (ox, oy) => {
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
                const a = (Math.PI * 2 / n) * i;
                const aH = a + Math.PI / n;
                ctx.lineTo(ox + Math.cos(a - toothW) * (R + td), oy + Math.sin(a - toothW) * (R + td));
                ctx.lineTo(ox + Math.cos(a + toothW) * (R + td), oy + Math.sin(a + toothW) * (R + td));
                ctx.lineTo(ox + Math.cos(aH - toothW * 0.4) * R, oy + Math.sin(aH - toothW * 0.4) * R);
                ctx.lineTo(ox + Math.cos(aH + toothW * 0.4) * R, oy + Math.sin(aH + toothW * 0.4) * R);
            }
            ctx.closePath();
        };

        // 1) Shadow
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        drawGear(this.shadowOx, this.shadowOy);
        ctx.fill();

        // 2) Dark undercoat
        ctx.globalAlpha = this.alpha * 0.6;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${Math.max(5, this.light - 8)}%)`;
        drawGear(0, 0);
        ctx.fill();

        // 3) Main body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light}%)`;
        drawGear(0, 0);
        ctx.fill();

        // 4) Specular highlight arc
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 3}%,${this.light + 14}%)`;
        ctx.beginPath();
        ctx.ellipse(-R * 0.12, -R * 0.15, R * 0.4, R * 0.3, -0.35, 0, Math.PI * 2);
        ctx.fill();

        // 5) Hub
        if (this.hasHub) {
            // Hub disc
            ctx.globalAlpha = this.alpha * 0.8;
            ctx.fillStyle = `hsl(${this.hue},${this.sat + 2}%,${Math.max(6, this.light - 6)}%)`;
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.38, 0, Math.PI * 2);
            ctx.fill();

            // Hub ring highlight
            ctx.globalAlpha = this.alpha * 0.25;
            ctx.strokeStyle = `hsl(${this.hue},${this.sat}%,${this.light + 10}%)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.36, 0, Math.PI * 2);
            ctx.stroke();

            // Axle hole
            ctx.globalAlpha = this.alpha * 0.55;
            ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${Math.max(3, this.light - 15)}%)`;
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.13, 0, Math.PI * 2);
            ctx.fill();

            // Hub bolts
            ctx.globalAlpha = this.alpha * 0.4;
            ctx.fillStyle = `hsl(${this.hue},${this.sat + 5}%,${this.light + 5}%)`;
            for (let b = 0; b < this.hubBolts; b++) {
                const ba = (Math.PI * 2 / this.hubBolts) * b;
                ctx.beginPath();
                ctx.arc(Math.cos(ba) * R * 0.24, Math.sin(ba) * R * 0.24, 1.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    // ── Pipe (industrial conduit with joints and flanges) ──
    _renderPipe(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const hw = this.w * 0.5, hh = this.h * 0.5;

        // 1) Shadow
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-hw + this.shadowOx, -hh + this.shadowOy, this.w, this.h);

        // 2) Dark undercoat (slightly wider)
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${Math.max(5, this.light - 10)}%)`;
        ctx.fillRect(-hw - 1, -hh - 1, this.w + 2, this.h + 2);

        // 3) Main pipe body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light}%)`;
        ctx.fillRect(-hw, -hh, this.w, this.h);

        // 4) Specular highlight stripe (horizontal)
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 3}%,${this.light + 14}%)`;
        ctx.fillRect(-hw, -hh + this.h * 0.15, this.w, this.h * 0.18);

        // 5) Dark groove line (center)
        ctx.globalAlpha = this.alpha * 0.2;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${Math.max(4, this.light - 8)}%)`;
        ctx.fillRect(-hw, -hh + this.h * 0.45, this.w, this.h * 0.1);

        // 6) Joint bands (darker raised sections)
        ctx.globalAlpha = this.alpha * 0.45;
        const jointW = this.h * 0.6;
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 2}%,${Math.max(6, this.light - 5)}%)`;
        for (let j = 0; j < this.joints; j++) {
            const jx = -hw + (this.w / (this.joints + 1)) * (j + 1) - jointW * 0.5;
            ctx.fillRect(jx, -hh - 1, jointW, this.h + 2);
            // Joint highlight
            ctx.globalAlpha = this.alpha * 0.2;
            ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light + 8}%)`;
            ctx.fillRect(jx, -hh - 1, jointW * 0.3, this.h + 2);
            ctx.fillStyle = `hsl(${this.hue},${this.sat + 2}%,${Math.max(6, this.light - 5)}%)`;
            ctx.globalAlpha = this.alpha * 0.45;
            // Joint bolts
            ctx.globalAlpha = this.alpha * 0.35;
            ctx.fillStyle = `hsl(${this.hue},${this.sat + 4}%,${this.light - 4}%)`;
            ctx.beginPath();
            ctx.arc(jx + jointW * 0.5, -hh + this.h * 0.2, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(jx + jointW * 0.5, hh - this.h * 0.2, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `hsl(${this.hue},${this.sat + 2}%,${Math.max(6, this.light - 5)}%)`;
            ctx.globalAlpha = this.alpha * 0.45;
        }

        // 7) Flanges at pipe ends
        if (this.hasFlange) {
            const fh = this.h * 0.3;
            ctx.globalAlpha = this.alpha * 0.5;
            ctx.fillStyle = `hsl(${this.hue},${this.sat + 2}%,${this.light - 3}%)`;
            ctx.fillRect(-hw - 2, -hh - fh * 0.5, 3, this.h + fh);
            ctx.fillRect(hw - 1, -hh - fh * 0.5, 3, this.h + fh);
        }

        ctx.restore();
    }

    // ── Plate (metal panel with bevels, rivets, warning stripes, cross-brace) ──
    _renderPlate(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const R = this.size;
        const hw = R * 0.5, hh = R * 0.4;

        // 1) Shadow
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(-hw + this.shadowOx, -hh + this.shadowOy, R, R * 0.8);

        // 2) Dark undercoat (bevel effect)
        ctx.globalAlpha = this.alpha * 0.6;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${Math.max(5, this.light - 8)}%)`;
        ctx.fillRect(-hw - 1, -hh - 1, R + 2, R * 0.8 + 2);

        // 3) Main plate body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light}%)`;
        ctx.fillRect(-hw, -hh, R, R * 0.8);

        // 4) Top bevel highlight
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.fillStyle = `hsl(${this.hue},${this.sat - 2}%,${this.light + 12}%)`;
        ctx.fillRect(-hw, -hh, R, R * 0.08);

        // 5) Bottom bevel shadow
        ctx.globalAlpha = this.alpha * 0.2;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${Math.max(4, this.light - 10)}%)`;
        ctx.fillRect(-hw, hh - R * 0.06, R, R * 0.06);

        // 6) Corner rivets
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 3}%,${this.light - 6}%)`;
        const rv = R * 0.06;
        const inset = R * 0.1;
        for (const ox of [-hw + inset, hw - inset]) {
            for (const oy of [-hh + inset, hh - inset]) {
                ctx.beginPath();
                ctx.arc(ox, oy, rv, 0, Math.PI * 2);
                ctx.fill();
                // Rivet highlight
                ctx.globalAlpha = this.alpha * 0.25;
                ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light + 8}%)`;
                ctx.beginPath();
                ctx.arc(ox - rv * 0.3, oy - rv * 0.3, rv * 0.35, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `hsl(${this.hue},${this.sat + 3}%,${this.light - 6}%)`;
                ctx.globalAlpha = this.alpha * 0.5;
            }
        }

        // 7) Cross-brace diagonal (structural detail)
        if (this.hasCrossBrace) {
            ctx.globalAlpha = this.alpha * 0.2;
            ctx.strokeStyle = `hsl(${this.hue},${this.sat}%,${Math.max(5, this.light - 8)}%)`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(-hw + inset, -hh + inset);
            ctx.lineTo(hw - inset, hh - inset);
            ctx.moveTo(hw - inset, -hh + inset);
            ctx.lineTo(-hw + inset, hh - inset);
            ctx.stroke();
        }

        // 8) Warning hazard stripe
        if (this.hasWarning) {
            ctx.globalAlpha = this.alpha * 0.4;
            const sw = R * 0.3, sh = R * 0.12;
            ctx.fillStyle = 'hsl(50,85%,50%)';
            ctx.fillRect(-sw * 0.5, -sh * 0.5, sw, sh);
            ctx.strokeStyle = 'rgba(0,0,0,0.55)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let s = -2; s <= 3; s++) {
                ctx.moveTo(-sw * 0.5 + s * 4, -sh * 0.5);
                ctx.lineTo(-sw * 0.5 + s * 4 + sh, sh * 0.5);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    // ── Spark (welding spark with glow halo and trail) ──
    _renderSpark(ctx) {
        const { x, y, size, alpha } = this;

        // Trail
        if (this.trail && this.trail.length > 1) {
            const lifeFrac = Math.max(0, this.life / this.maxLife);
            for (let i = 0; i < this.trail.length - 1; i++) {
                const t = i / this.trail.length;
                ctx.globalAlpha = alpha * t * 0.3 * lifeFrac;
                ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light - 10}%)`;
                ctx.beginPath();
                ctx.arc(this.trail[i].x, this.trail[i].y, size * 0.4 * t, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Outer glow halo
        ctx.globalAlpha = alpha * 0.4;
        const rg = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
        rg.addColorStop(0, `hsla(${this.hue},${this.sat}%,${this.light}%,0.5)`);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, y, size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light}%)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // White-hot center
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = `hsl(${this.hue},${Math.max(30, this.sat - 40)}%,${Math.min(95, this.light + 25)}%)`;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── Vent (expanding steam cloud with layered gradients) ──
    _renderVent(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const R = this.size;
        const eY = this.elongation;
        const lifeFrac = this.life / this.maxLife;
        const fade = lifeFrac < 0.2 ? lifeFrac / 0.2 : 1 - (lifeFrac - 0.2) / 0.8;

        // Layer 1: Outer diffuse fog
        ctx.globalAlpha = this.alpha * fade * 0.35;
        const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.3);
        g1.addColorStop(0, `hsla(${this.hue},${this.sat}%,${this.light}%,0.25)`);
        g1.addColorStop(0.5, `hsla(${this.hue},${this.sat - 2}%,${this.light - 5}%,0.1)`);
        g1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 1.3, R * eY * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Layer 2: Core steam puff
        ctx.globalAlpha = this.alpha * fade * 0.6;
        const g2 = ctx.createRadialGradient(0, -R * 0.05, 0, 0, 0, R);
        g2.addColorStop(0, `hsla(${this.hue},${this.sat + 3}%,${this.light + 8}%,0.5)`);
        g2.addColorStop(0.6, `hsla(${this.hue},${this.sat}%,${this.light}%,0.15)`);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.ellipse(0, 0, R, R * eY, 0, 0, Math.PI * 2);
        ctx.fill();

        // Layer 3: Bright inner wisp
        ctx.globalAlpha = this.alpha * fade * 0.3;
        ctx.fillStyle = `hsla(${this.hue},${Math.max(3, this.sat - 3)}%,${this.light + 15}%,0.35)`;
        ctx.beginPath();
        ctx.ellipse(-R * 0.1, -R * eY * 0.08, R * 0.35, R * eY * 0.3, -0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

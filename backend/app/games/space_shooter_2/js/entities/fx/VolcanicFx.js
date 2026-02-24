// ═══════════════════════════════════════════════
//  Volcanic terrain FX strategy
//  SubTypes: lavaRock · obsidian · ash · crater · scorched
// ═══════════════════════════════════════════════

import { BaseFxStrategy } from './BaseFxStrategy.js';
import { drawPolygon, generateShape, pickColor } from './RenderHelpers.js';

// ── Color palettes ─────────────────────────────
const LAVA_ROCK_PALETTE = [
    { weight: 0.40, hue: [20, 15], sat: [8, 10],  light: [14, 6, 5] },
    { weight: 0.30, hue: [15, 15], sat: [15, 12], light: [12, 5, 4] },
    { weight: 0.30, hue: [5, 12],  sat: [20, 18], light: [10, 4, 4] }
];

const OBSIDIAN_PALETTE = [
    { weight: 0.50, hue: [270, 30], sat: [12, 15], light: [8, 4, 4] },
    { weight: 0.50, hue: [220, 30], sat: [8, 12],  light: [6, 4, 3] }
];

const LAVA_POOL_PALETTE = [
    { weight: 0.50, hue: [20, 20], sat: [80, 15], light: [35, 15] },
    { weight: 0.50, hue: [5, 15],  sat: [75, 20], light: [28, 14] }
];

// ── Volcanic FX ────────────────────────────────
export class VolcanicFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const vc = this.config;
        const d = vc ? vc.dist : [0.35, 0.50, 0.70, 0.90];
        const roll = Math.random();

        if (roll < d[0])      this._initLavaRock(W, H, initial, vc);
        else if (roll < d[1]) this._initObsidian(W, H, initial);
        else if (roll < d[2]) this._initAsh(W, H, initial);
        else if (roll < d[3]) this._initCrater(W, H, initial, vc);
        else                  this._initScorched(W, H, initial);
    }

    // ── Sub-type initialisers ──

    _initLavaRock(W, H, initial, vc) {
        this.subType = 'lavaRock';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -80 - Math.random() * 60;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        const mul = vc ? (vc.lavaRockMul || 1) : 1;
        this.size = (18 + near * 30 + Math.random() * 20) * mul;
        this.speed = 18 + near * 14 + Math.random() * 10;
        this.alpha = 0.6 + near * 0.25 + Math.random() * 0.1;
        Object.assign(this, pickColor(LAVA_ROCK_PALETTE, near));
        this.shape = generateShape(6 + Math.floor(Math.random() * 3), 0.55, 0.5);
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpd = (Math.random() - 0.5) * 0.02;
        this.shadowOx = 3 + Math.random() * 3;
        this.shadowOy = 3 + Math.random() * 3;
        this.hasGlow = Math.random() < 0.35;
        this.glowHue = 15 + Math.random() * 25;
    }

    _initObsidian(W, H, initial) {
        this.subType = 'obsidian';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -40 - Math.random() * 30;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        this.size = 6 + near * 12 + Math.random() * 10;
        this.speed = 19 + near * 14 + Math.random() * 10;
        this.alpha = 0.65 + near * 0.2 + Math.random() * 0.12;
        Object.assign(this, pickColor(OBSIDIAN_PALETTE, near));
        this.shape = generateShape(4 + Math.floor(Math.random() * 3), 0.4, 0.7);
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpd = 0;
        this.shineAngle = Math.random() * Math.PI * 2;
    }

    _initAsh(W, H, initial) {
        this.subType = 'ash';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -45 - Math.random() * 25;
        this.size = 12 + Math.random() * 28;
        this.speed = 19 + Math.random() * 14;
        this.alpha = 0.25 + Math.random() * 0.2;
        this.elongation = 0.5 + Math.random() * 0.6;
        this.rot = Math.random() * Math.PI;
        this.ashLight = 12 + Math.random() * 10;
        this.ashWarm = Math.random() < 0.4;
    }

    _initCrater(W, H, initial, vc) {
        this.subType = 'crater';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -60 - Math.random() * 40;
        const cw = vc ? vc.craterW : [14, 28];
        this.size = cw[0] + Math.random() * (cw[1] - cw[0]);
        this.speed = 18 + Math.random() * 14;
        this.alpha = 0.55 + Math.random() * 0.35;
        this.elongation = 0.7 + Math.random() * 0.3;
        this.rot = Math.random() * Math.PI;
        const lc = pickColor(LAVA_POOL_PALETTE);
        this.lavaHue = lc.hue; this.lavaSat = lc.sat; this.lavaLight = lc.lightness;
        this.rimHue = 20 + Math.random() * 15;
        this.rimSat = 10 + Math.random() * 12;
        this.rimLight = 10 + Math.random() * 8;
    }

    _initScorched(W, H, initial) {
        this.subType = 'scorched';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -40 - Math.random() * 25;
        this.size = 10 + Math.random() * 22;
        this.speed = 19 + Math.random() * 14;
        this.alpha = 0.3 + Math.random() * 0.2;
        this.elongation = 0.45 + Math.random() * 0.55;
        this.rot = Math.random() * Math.PI;
        this.embers = [];
        const eN = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < eN; i++) {
            this.embers.push({
                ox: (Math.random() - 0.5) * this.size * 1.2,
                oy: (Math.random() - 0.5) * this.size * this.elongation * 1.2,
                r: 0.8 + Math.random() * 1.5,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    // ── Update ─────────────────────────────────
    _update(dt) {
        switch (this.subType) {
            case 'lavaRock':
                this.y += this.speed * dt;
                this.rot += this.rotSpd * dt;
                if (this._isOffBottom(20)) this.reset();
                break;
            case 'obsidian':
                this.y += this.speed * dt;
                if (this._isOffBottom(15)) this.reset();
                break;
            default: // ash, crater, scorched
                this.y += this.speed * dt;
                if (this._isOffBottom(10)) this.reset();
                break;
        }
    }

    // ── Render ─────────────────────────────────
    _render(ctx) {
        switch (this.subType) {
            case 'lavaRock':  this._renderLavaRock(ctx);  break;
            case 'obsidian':  this._renderObsidian(ctx);  break;
            case 'ash':       this._renderAsh(ctx);       break;
            case 'crater':    this._renderCrater(ctx);    break;
            case 'scorched':  this._renderScorched(ctx);  break;
        }
    }

    _renderLavaRock(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const R = this.size;
        const draw = (ox, oy, sc) => drawPolygon(ctx, ox, oy, R, sc, this.shape);

        // Shadow
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        draw(this.shadowOx, this.shadowOy, 0.92); ctx.fill();

        // Body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lightness}%)`;
        draw(0, 0, 1); ctx.fill();

        // Depth
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 3}%,${Math.max(5, this.lightness - 6)}%)`;
        ctx.beginPath();
        ctx.ellipse(R * 0.05, R * 0.12, R * 0.5, R * 0.35, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = `hsl(${this.hue},${this.sat - 3}%,${this.lightness + 10}%)`;
        ctx.beginPath();
        ctx.ellipse(-R * 0.15, -R * 0.15, R * 0.3, R * 0.22, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // Crack glow
        if (this.hasGlow) {
            ctx.globalAlpha = this.alpha * 0.55;
            ctx.strokeStyle = `hsl(${this.glowHue},80%,45%)`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-R * 0.2, -R * 0.05);
            ctx.lineTo(R * 0.05, R * 0.1);
            ctx.lineTo(R * 0.2, R * 0.0);
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderObsidian(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const R = this.size;
        const draw = (ox, oy, sc) => drawPolygon(ctx, ox, oy, R, sc, this.shape);

        // Shadow
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        draw(2, 2, 0.9); ctx.fill();

        // Body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lightness}%)`;
        draw(0, 0, 1); ctx.fill();

        // Shine
        const sa = this.shineAngle;
        const shX = Math.cos(sa) * R * 0.25;
        const shY = Math.sin(sa) * R * 0.25;
        ctx.globalAlpha = this.alpha * 0.55;
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 15}%,${this.lightness + 25}%)`;
        ctx.beginPath();
        ctx.ellipse(shX, shY, R * 0.2, R * 0.1, sa, 0, Math.PI * 2);
        ctx.fill();

        // Specular
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 5}%,${this.lightness + 35}%)`;
        ctx.beginPath();
        ctx.arc(shX * 0.6, shY * 0.6, R * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _renderAsh(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.globalAlpha = this.alpha;
        const aL = this.ashLight;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        if (this.ashWarm) {
            g.addColorStop(0, `rgba(${aL + 10},${aL + 3},${aL},0.65)`);
            g.addColorStop(0.6, `rgba(${aL + 5},${aL},${aL - 2},0.25)`);
        } else {
            g.addColorStop(0, `rgba(${aL + 4},${aL + 5},${aL + 6},0.65)`);
            g.addColorStop(0.6, `rgba(${aL},${aL + 1},${aL + 2},0.25)`);
        }
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * this.elongation, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _renderCrater(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const cS = this.size, cE = this.elongation;

        // Shadow
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.ellipse(3, 3, cS * 1.05, cS * cE * 1.05, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rim
        ctx.globalAlpha = this.alpha * 0.9;
        ctx.fillStyle = `hsl(${this.rimHue},${this.rimSat}%,${this.rimLight}%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, cS, cS * cE, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lava pool
        ctx.globalAlpha = this.alpha * 0.85;
        ctx.fillStyle = `hsl(${this.lavaHue},${this.lavaSat}%,${this.lavaLight}%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, cS * 0.68, cS * cE * 0.68, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.strokeStyle = `hsl(${this.lavaHue - 5},${this.lavaSat - 8}%,${Math.max(8, this.lavaLight - 10)}%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, cS * 0.55, cS * cE * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Highlight
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = `hsl(${this.lavaHue + 8},${this.lavaSat}%,${this.lavaLight + 14}%)`;
        ctx.beginPath();
        ctx.ellipse(-cS * 0.15, -cS * cE * 0.15, cS * 0.18, cS * cE * 0.12, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _renderScorched(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.globalAlpha = this.alpha;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        g.addColorStop(0, 'rgba(18,8,4,0.7)');
        g.addColorStop(0.5, 'rgba(12,5,2,0.4)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * this.elongation, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.embers) {
            for (const em of this.embers) {
                const pulse = 0.5 + 0.5 * Math.sin(em.phase + performance.now() * 0.003);
                ctx.globalAlpha = this.alpha * 0.4 * pulse;
                ctx.fillStyle = `hsl(${20 + Math.random() * 15},90%,${40 + pulse * 20}%)`;
                ctx.beginPath();
                ctx.arc(em.ox, em.oy, em.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

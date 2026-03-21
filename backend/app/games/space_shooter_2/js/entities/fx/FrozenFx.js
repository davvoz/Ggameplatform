// ═══════════════════════════════════════════════
//  Frozen terrain FX strategy
//  SubTypes: iceSheet · snowDrift · crystal · crevasse · frost
// ═══════════════════════════════════════════════

import { BaseFxStrategy } from './BaseFxStrategy.js';
import { drawBlob, drawPolygon, generateShape, pickColor } from './RenderHelpers.js';

// ── Color palettes ─────────────────────────────
const ICE_SHEET_PALETTE = [
    { weight: 0.40, hue: [200, 10], sat: [55, 20], light: [38, 8, 10] },
    { weight: 0.30, hue: [210, 12], sat: [60, 20], light: [30, 6, 8]  },
    { weight: 0.18, hue: [195, 10], sat: [35, 20], light: [52, 8, 10] },
    { weight: 0.12, hue: [180, 12], sat: [50, 20], light: [35, 6, 8]  }
];

const SNOW_PALETTE = [
    { weight: 0.50, hue: [205, 10], sat: [15, 15], light: [68, 10, 8] },
    { weight: 0.30, hue: [210, 10], sat: [30, 15], light: [58, 8, 8]  },
    { weight: 0.20, hue: [225, 15], sat: [20, 15], light: [62, 8, 8]  }
];

const CRYSTAL_PALETTE = [
    { weight: 0.35, hue: [190, 15], sat: [65, 20], light: [42, 8, 10] },
    { weight: 0.25, hue: [215, 15], sat: [60, 20], light: [38, 8, 10] },
    { weight: 0.20, hue: [260, 25], sat: [55, 20], light: [40, 8, 8]  },
    { weight: 0.20, hue: [175, 12], sat: [60, 20], light: [40, 8, 8]  }
];

// ── Frozen FX ──────────────────────────────────
export class FrozenFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const fc = this.config;
        const d = fc ? fc.dist : [0.30, 0.55, 0.72, 0.88];
        const roll = Math.random();

        if (roll < d[0])      this._initIceSheet(W, H, initial, fc);
        else if (roll < d[1]) this._initSnowDrift(W, H, initial);
        else if (roll < d[2]) this._initCrystal(W, H, initial, fc);
        else if (roll < d[3]) this._initCrevasse(W, H, initial, fc);
        else                  this._initFrost(W, H, initial);
    }

    // ── Sub-type initialisers ──

    _initIceSheet(W, H, initial, fc) {
        this.subType = 'iceSheet';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -100 - Math.random() * 80;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        const mul = fc ? (fc.iceSheetMul || 1) : 1;
        this.size = (25 + near * 40 + Math.random() * 25) * mul;
        this.speed = 18 + near * 16 + Math.random() * 12;
        this.alpha = 0.6 + near * 0.25 + Math.random() * 0.12;
        Object.assign(this, pickColor(ICE_SHEET_PALETTE, near));
        this.shape = generateShape(7 + Math.floor(Math.random() * 3), 0.75, 0.3);
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpd = (Math.random() - 0.5) * 0.04;
        this.shadowOx = 3 + Math.random() * 4;
        this.shadowOy = 3 + Math.random() * 4;
    }

    _initSnowDrift(W, H, initial) {
        this.subType = 'snowDrift';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -60 - Math.random() * 40;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        this.size = 18 + near * 20 + Math.random() * 25;
        this.speed = 19 + near * 14 + Math.random() * 12;
        this.alpha = 0.5 + near * 0.25 + Math.random() * 0.2;
        this.shape = generateShape(6 + Math.floor(Math.random() * 3), 0.65, 0.25);
        this.elongation = 0.45 + Math.random() * 0.3;
        this.rot = Math.random() * Math.PI;
        this.shadowOx = 2 + Math.random() * 3;
        this.shadowOy = 2 + Math.random() * 3;
        Object.assign(this, pickColor(SNOW_PALETTE, near));
    }

    _initCrystal(W, H, initial, fc) {
        this.subType = 'crystal';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -35 - Math.random() * 25;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        const mul = fc ? (fc.crystalMul || 1) : 1;
        this.size = (6 + near * 12 + Math.random() * 10) * mul;
        this.speed = 18 + near * 13 + Math.random() * 10;
        this.alpha = 0.6 + near * 0.25 + Math.random() * 0.1;
        Object.assign(this, pickColor(CRYSTAL_PALETTE, near));
        // Alternating spike shape
        this.shape = generateShape(5 + Math.floor(Math.random() * 3), 0.7, 0.5, true, 0.25, 0.3);
        this.rot = Math.random() * Math.PI * 2;
        this.shineAngle = Math.random() * Math.PI * 2;
    }

    _initCrevasse(W, H, initial, fc) {
        this.subType = 'crevasse';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -55 - Math.random() * 35;
        const cw = fc ? fc.crevasseW : [12, 26];
        this.size = cw[0] + Math.random() * (cw[1] - cw[0]);
        this.speed = 17 + Math.random() * 14;
        this.alpha = 0.6 + Math.random() * 0.3;
        this.elongation = 0.45 + Math.random() * 0.5;
        this.rot = Math.random() * Math.PI;
        this.depthHue = 210 + Math.random() * 15;
        this.depthSat = 70 + Math.random() * 20;
        this.depthLight = 15 + Math.random() * 10;
        this.rimHue = 200 + Math.random() * 12;
        this.rimSat = 40 + Math.random() * 20;
        this.rimLight = 50 + Math.random() * 15;
    }

    _initFrost(W, H, initial) {
        this.subType = 'frost';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -40 - Math.random() * 25;
        this.size = 12 + Math.random() * 24;
        this.speed = 18 + Math.random() * 14;
        this.alpha = 0.35 + Math.random() * 0.25;
        this.elongation = 0.5 + Math.random() * 0.5;
        this.rot = Math.random() * Math.PI;
        this.frostHue = 200 + Math.random() * 15;
        this.frostSat = 40 + Math.random() * 20;
        this.frostLight = 50 + Math.random() * 15;
        this.sparkles = [];
        const sN = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < sN; i++) {
            this.sparkles.push({
                ox: (Math.random() - 0.5) * this.size * 1.2,
                oy: (Math.random() - 0.5) * this.size * this.elongation * 1.2,
                r: 0.5 + Math.random() * 1.0,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    // ── Update ─────────────────────────────────
    _update(dt) {
        switch (this.subType) {
            case 'iceSheet':
                this.y += this.speed * dt;
                this.rot += this.rotSpd * dt;
                if (this._isOffBottom(20)) this.reset();
                break;
            case 'crystal':
                this.y += this.speed * dt;
                if (this._isOffBottom(15)) this.reset();
                break;
            default: // snowDrift, crevasse, frost
                this.y += this.speed * dt;
                if (this._isOffBottom(10)) this.reset();
                break;
        }
    }

    // ── Render ─────────────────────────────────
    _render(ctx) {
        switch (this.subType) {
            case 'iceSheet':  this._renderIceSheet(ctx);  break;
            case 'snowDrift': this._renderSnowDrift(ctx); break;
            case 'crystal':   this._renderCrystal(ctx);   break;
            case 'crevasse':  this._renderCrevasse(ctx);  break;
            case 'frost':     this._renderFrost(ctx);     break;
        }
    }

    _renderIceSheet(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const R = this.size;

        // Shadow
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = 'rgba(5,10,25,0.7)';
        drawBlob(ctx, this.shadowOx, this.shadowOy, R, 0.95, this.shape); ctx.fill();

        // Body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lightness}%)`;
        drawBlob(ctx, 0, 0, R, 1, this.shape); ctx.fill();

        // Depth
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = `hsl(${this.hue + 5},${this.sat}%,${Math.max(8, this.lightness - 7)}%)`;
        drawBlob(ctx, R * 0.06, R * 0.08, R, 0.55, this.shape); ctx.fill();

        // Highlight
        ctx.globalAlpha = this.alpha * 0.55;
        ctx.fillStyle = `hsl(${this.hue - 5},${this.sat + 5}%,${this.lightness + 18}%)`;
        ctx.beginPath();
        ctx.ellipse(-R * 0.15, -R * 0.15, R * 0.35, R * 0.28, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Specular
        ctx.globalAlpha = this.alpha * 0.45;
        ctx.fillStyle = `hsl(${this.hue},${Math.max(10, this.sat - 10)}%,${Math.min(92, this.lightness + 30)}%)`;
        ctx.beginPath();
        ctx.arc(-R * 0.12, -R * 0.18, R * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _renderSnowDrift(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const R = this.size;
        const e = this.elongation;

        // Shadow
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.fillStyle = 'rgba(8,12,30,0.6)';
        drawBlob(ctx, this.shadowOx, this.shadowOy, R, 0.93, this.shape, e); ctx.fill();

        // Body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lightness}%)`;
        drawBlob(ctx, 0, 0, R, 1, this.shape, e); ctx.fill();

        // Depth
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.fillStyle = `hsl(${this.hue + 5},${this.sat + 5}%,${Math.max(20, this.lightness - 12)}%)`;
        drawBlob(ctx, R * 0.04, R * e * 0.08, R, 0.5, this.shape, e); ctx.fill();

        // Highlight
        ctx.globalAlpha = this.alpha * 0.55;
        ctx.fillStyle = `hsl(${this.hue},${Math.max(5, this.sat - 8)}%,${Math.min(96, this.lightness + 12)}%)`;
        ctx.beginPath();
        ctx.ellipse(-R * 0.1, -R * e * 0.12, R * 0.32, R * e * 0.24, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Specular
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = `hsl(${this.hue},${Math.max(5, this.sat - 10)}%,${Math.min(98, this.lightness + 18)}%)`;
        ctx.beginPath();
        ctx.arc(-R * 0.08, -R * e * 0.16, R * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _renderCrystal(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const R = this.size;
        const draw = (ox, oy, sc) => drawPolygon(ctx, ox, oy, R, sc, this.shape);

        // Shadow
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = 'rgba(5,8,20,0.6)';
        draw(2, 2, 0.93); ctx.fill();

        // Body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lightness}%)`;
        draw(0, 0, 1); ctx.fill();

        // Depth
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = `hsl(${this.hue + 5},${this.sat + 3}%,${Math.max(10, this.lightness - 8)}%)`;
        ctx.beginPath();
        ctx.ellipse(R * 0.05, R * 0.12, R * 0.4, R * 0.28, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.fillStyle = `hsl(${this.hue - 5},${this.sat + 5}%,${this.lightness + 16}%)`;
        ctx.beginPath();
        ctx.ellipse(-R * 0.12, -R * 0.12, R * 0.3, R * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Specular
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = `hsl(${this.hue},${Math.max(8, this.sat - 8)}%,${Math.min(92, this.lightness + 28)}%)`;
        ctx.beginPath();
        ctx.arc(-R * 0.08, -R * 0.16, R * 0.09, 0, Math.PI * 2);
        ctx.fill();

        // Shine line
        if (R > 8) {
            ctx.globalAlpha = this.alpha * 0.35;
            ctx.strokeStyle = `hsl(${this.hue},${this.sat + 10}%,${Math.min(85, this.lightness + 22)}%)`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-R * 0.15, -R * 0.08);
            ctx.lineTo(R * 0.05, R * 0.1);
            ctx.lineTo(R * 0.2, R * 0.0);
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderCrevasse(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const S = this.size, E = this.elongation;

        // Shadow
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.fillStyle = 'rgba(5,8,20,0.5)';
        ctx.beginPath();
        ctx.ellipse(2, 2, S * 1.05, S * E * 1.05, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rim
        ctx.globalAlpha = this.alpha * 0.9;
        ctx.fillStyle = `hsl(${this.rimHue},${this.rimSat}%,${this.rimLight}%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, S, S * E, 0, 0, Math.PI * 2);
        ctx.fill();

        // Interior
        ctx.globalAlpha = this.alpha * 0.95;
        ctx.fillStyle = `hsl(${this.depthHue},${this.depthSat}%,${this.depthLight}%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, S * 0.6, S * E * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Depth ring
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.strokeStyle = `hsl(${this.depthHue},${this.depthSat}%,${Math.max(5, this.depthLight - 5)}%)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, S * 0.45, S * E * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Rim highlight
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.fillStyle = `hsl(${this.rimHue},${this.rimSat + 5}%,${Math.min(85, this.rimLight + 15)}%)`;
        ctx.beginPath();
        ctx.ellipse(-S * 0.15, -S * E * 0.15, S * 0.18, S * E * 0.12, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _renderFrost(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const fH = this.frostHue, fS = this.frostSat, fL = this.frostLight;

        // Patch
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsla(${fH},${fS}%,${fL}%,0.5)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * this.elongation, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.fillStyle = `hsla(${fH},${fS + 8}%,${fL + 10}%,0.5)`;
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.08, -this.size * this.elongation * 0.08,
            this.size * 0.55, this.size * this.elongation * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.strokeStyle = `hsl(${fH},${fS + 10}%,${fL + 15}%)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.85, this.size * this.elongation * 0.85, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Sparkles
        if (this.sparkles) {
            for (const sp of this.sparkles) {
                const pulse = 0.4 + 0.6 * Math.sin(sp.phase + performance.now() * 0.004);
                ctx.globalAlpha = this.alpha * 0.55 * pulse;
                ctx.fillStyle = `hsl(${fH},${fS}%,${Math.min(95, fL + 25)}%)`;
                ctx.beginPath();
                ctx.arc(sp.ox, sp.oy, sp.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

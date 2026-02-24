// ═══════════════════════════════════════════════
//  Jungle terrain FX strategy
//  SubTypes: canopy · rock · dirt · river · swamp
// ═══════════════════════════════════════════════

import { BaseFxStrategy } from './BaseFxStrategy.js';
import { drawBlob, drawPolygon, generateShape, pickColor } from './RenderHelpers.js';

// ── Color palettes ─────────────────────────────
const CANOPY_PALETTE = [
    { weight: 0.50, hue: [115, 25], sat: [45, 25], light: [18, 6, 8] },
    { weight: 0.28, hue: [90, 20],  sat: [45, 25], light: [20, 5, 7] },
    { weight: 0.22, hue: [145, 20], sat: [45, 25], light: [16, 5, 6] }
];

const ROCK_PALETTES = [
    { weight: 0.45, hue: [25, 15], sat: [20, 18], light: [24, 14] },
    { weight: 0.30, hue: [30, 20], sat: [8, 12],  light: [28, 16] },
    { weight: 0.25, hue: [20, 25], sat: [12, 10], light: [18, 10] }
];

const RIVER_PALETTES = [
    { weight: 0.5, hue: [190, 15], sat: [30, 15], light: [18, 8] },
    { weight: 0.5, hue: [175, 15], sat: [25, 18], light: [16, 7] }
];

const SWAMP_PALETTES = [
    { weight: 0.5, hue: [155, 25], sat: [18, 15], light: [12, 8] },
    { weight: 0.5, hue: [85, 30],  sat: [14, 14], light: [10, 7] }
];

// ── Jungle FX (terrain composite) ──────────────
export class JungleFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const jc = this.config;
        const d = jc ? jc.dist : [0.48, 0.66, 0.80, 1.0];
        const roll = Math.random();

        if (roll < d[0])      this._initCanopy(W, H, initial, jc);
        else if (roll < d[1]) this._initRock(W, H, initial);
        else if (roll < d[2]) this._initDirt(W, H, initial);
        else if (roll < d[3]) this._initRiver(W, H, initial, jc);
        else                  this._initSwamp(W, H, initial);
    }

    // ── Sub-type initialisers ──

    _initCanopy(W, H, initial, jc) {
        this.subType = 'canopy';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -100 - Math.random() * 80;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        const cMul = jc ? jc.canopyMul : 1;
        this.size = (25 + near * 40 + Math.random() * 25) * cMul;
        this.speed = 18 + near * 16 + Math.random() * 12;
        this.alpha = 0.55 + near * 0.25 + Math.random() * 0.15;
        Object.assign(this, pickColor(CANOPY_PALETTE, near));
        this.shape = generateShape(7 + Math.floor(Math.random() * 3), 0.75, 0.3);
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpd = (Math.random() - 0.5) * 0.04;
        this.shadowOx = 3 + Math.random() * 4;
        this.shadowOy = 3 + Math.random() * 4;
    }

    _initRock(W, H, initial) {
        this.subType = 'rock';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -30 - Math.random() * 20;
        // Size tier
        const tier = Math.random();
        if (tier < 0.25)      { this.size = 14 + Math.random() * 12; this.rockVariant = 'boulder'; }
        else if (tier < 0.60) { this.size = 7 + Math.random() * 8;  this.rockVariant = 'medium';  }
        else                  { this.size = 3 + Math.random() * 5;  this.rockVariant = 'pebble';  }
        this.speed = 20 + Math.random() * 18;
        this.alpha = 0.6 + Math.random() * 0.35;
        this.rot = Math.random() * Math.PI * 2;
        this.shape = generateShape(5 + Math.floor(Math.random() * 3), 0.55, 0.55);
        Object.assign(this, pickColor(ROCK_PALETTES));
        this.rockHue = this.hue; this.rockSat = this.sat; this.rockLight = this.lightness;
        this._genPebbles();
    }

    _genPebbles() {
        const count = this.rockVariant === 'boulder' ? 2 + Math.floor(Math.random() * 3)
            : this.rockVariant === 'medium' ? Math.floor(Math.random() * 2) : 0;
        this.pebbleOffsets = [];
        for (let p = 0; p < count; p++) {
            this.pebbleOffsets.push({
                ox: (Math.random() - 0.5) * this.size * 2.5,
                oy: (Math.random() - 0.5) * this.size * 1.8,
                cr: 1.5 + Math.random() * 3,
                lightD: -4 + Math.random() * 8
            });
        }
    }

    _initDirt(W, H, initial) {
        this.subType = 'dirt';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -50 - Math.random() * 30;
        this.size = 15 + Math.random() * 30;
        this.speed = 20 + Math.random() * 16;
        this.alpha = 0.3 + Math.random() * 0.25;
        this.elongation = 0.6 + Math.random() * 0.6;
        this.rot = Math.random() * Math.PI;
        this.dirtLight = Math.random() < 0.5 ? -3 : 4;
    }

    _initRiver(W, H, initial, jc) {
        this.subType = 'river';
        this.x = W * 0.15 + Math.random() * W * 0.7;
        this.y = initial ? Math.random() * H : -500 - Math.random() * 200;
        this.speed = 18 + Math.random() * 14;
        this.alpha = 0.7 + Math.random() * 0.25;
        const rw = jc ? jc.riverW : [14, 24];
        this.width = rw[0] + Math.random() * (rw[1] - rw[0]);
        this._genRiverCurves();
        const rc = pickColor(RIVER_PALETTES);
        this.riverHue = rc.hue; this.riverSat = rc.sat; this.riverLight = rc.lightness;
    }

    _genRiverCurves() {
        this.curves = [];
        let cx = 0;
        const segs = 6 + Math.floor(Math.random() * 5);
        const segH = 80 + Math.random() * 40;
        let drift = (Math.random() - 0.5) * 20;
        for (let i = 0; i < segs; i++) {
            drift += (Math.random() - 0.5) * 22;
            drift = Math.max(-40, Math.min(40, drift));
            const cpx = cx + drift * 0.6;
            cx += drift;
            cx = Math.max(-this.canvasWidth * 0.3, Math.min(this.canvasWidth * 0.3, cx));
            this.curves.push({ cpx, cpy: (i + 0.5) * segH, dx: cx, dy: (i + 1) * segH });
        }
        this.totalH = segs * segH + 30;
    }

    _initSwamp(W, H, initial) {
        this.subType = 'swamp';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -60 - Math.random() * 40;
        this.size = 18 + Math.random() * 35;
        this.speed = 18 + Math.random() * 14;
        this.alpha = 0.45 + Math.random() * 0.3;
        this.elongation = 0.4 + Math.random() * 0.5;
        this.rot = Math.random() * Math.PI;
        const sc = pickColor(SWAMP_PALETTES);
        this.swampHue = sc.hue; this.swampSat = sc.sat; this.swampLight = sc.lightness;
    }

    // ── Update ─────────────────────────────────
    _update(dt) {
        switch (this.subType) {
            case 'canopy':
                this.y += this.speed * dt;
                this.rot += this.rotSpd * dt;
                if (this._isOffBottom(20)) this.reset();
                break;
            case 'river':
                this.y += this.speed * dt;
                if (this.y > this.canvasHeight + this.totalH + 20) this.reset();
                break;
            default: // rock, dirt, swamp
                this.y += this.speed * dt;
                if (this._isOffBottom(10)) this.reset();
                break;
        }
    }

    // ── Render ─────────────────────────────────
    _render(ctx) {
        switch (this.subType) {
            case 'canopy': this._renderCanopy(ctx); break;
            case 'rock':   this._renderRock(ctx);   break;
            case 'dirt':   this._renderDirt(ctx);   break;
            case 'river':  this._renderRiver(ctx);  break;
            case 'swamp':  this._renderSwamp(ctx);  break;
        }
    }

    _renderCanopy(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const R = this.size;
        const draw = (ox, oy, sc) => { drawBlob(ctx, ox, oy, R, sc, this.shape); ctx.fill(); };

        // Shadow
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = 'rgba(8,5,2,0.7)';
        drawBlob(ctx, this.shadowOx, this.shadowOy, R, 0.95, this.shape); ctx.fill();

        // Body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lightness}%)`;
        drawBlob(ctx, 0, 0, R, 1, this.shape); ctx.fill();

        // Inner depth
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = `hsl(${this.hue + 5},${this.sat}%,${Math.max(6, this.lightness - 5)}%)`;
        drawBlob(ctx, R * 0.06, R * 0.08, R, 0.55, this.shape); ctx.fill();

        // Highlight
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.fillStyle = `hsl(${this.hue - 5},${this.sat + 8}%,${this.lightness + 12}%)`;
        ctx.beginPath();
        ctx.ellipse(-R * 0.15, -R * 0.15, R * 0.35, R * 0.28, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Specular
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 10}%,${this.lightness + 22}%)`;
        ctx.beginPath();
        ctx.arc(-R * 0.12, -R * 0.18, R * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _renderRock(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const rs = this.size;
        const draw = (ox, oy, sc) => { drawPolygon(ctx, ox, oy, rs, sc, this.shape); };

        // Pebbles (behind)
        if (this.pebbleOffsets) {
            for (const pb of this.pebbleOffsets) {
                ctx.globalAlpha = this.alpha * 0.7;
                ctx.fillStyle = `hsl(${this.rockHue},${this.rockSat}%,${this.rockLight + pb.lightD}%)`;
                ctx.beginPath(); ctx.arc(pb.ox, pb.oy, pb.cr, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = this.alpha * 0.3;
                ctx.fillStyle = `hsl(${this.rockHue},${this.rockSat - 3}%,${this.rockLight + pb.lightD + 12}%)`;
                ctx.beginPath(); ctx.arc(pb.ox - pb.cr * 0.25, pb.oy - pb.cr * 0.3, pb.cr * 0.45, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Shadow
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = 'rgba(6,3,1,0.6)';
        draw(3, 3, 0.95); ctx.fill();

        // Body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.rockHue},${this.rockSat}%,${this.rockLight}%)`;
        draw(0, 0, 1); ctx.fill();

        // Depth
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.fillStyle = `hsl(${this.rockHue},${this.rockSat + 5}%,${Math.max(8, this.rockLight - 8)}%)`;
        ctx.beginPath();
        ctx.ellipse(rs * 0.05, rs * 0.15, rs * 0.55, rs * 0.35, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.fillStyle = `hsl(${this.rockHue},${this.rockSat - 5}%,${this.rockLight + 14}%)`;
        ctx.beginPath();
        ctx.ellipse(-rs * 0.18, -rs * 0.18, rs * 0.38, rs * 0.26, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // Specular
        if (rs > 6) {
            ctx.globalAlpha = this.alpha * 0.35;
            ctx.fillStyle = `hsl(${this.rockHue},${this.rockSat - 8}%,${this.rockLight + 22}%)`;
            ctx.beginPath(); ctx.arc(-rs * 0.12, -rs * 0.22, rs * 0.12, 0, Math.PI * 2); ctx.fill();
        }

        // Crack line
        if (rs > 10) {
            ctx.globalAlpha = this.alpha * 0.3;
            ctx.strokeStyle = `hsl(${this.rockHue},${this.rockSat + 5}%,${Math.max(6, this.rockLight - 10)}%)`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-rs * 0.15, -rs * 0.1);
            ctx.lineTo(rs * 0.1, rs * 0.12);
            ctx.lineTo(rs * 0.25, rs * 0.05);
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderDirt(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.globalAlpha = this.alpha;
        const dl = this.dirtLight || 0;
        const baseR = 31 + dl * 3, baseG = 21 + dl * 2, baseB = 12 + dl;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        g.addColorStop(0, `rgba(${baseR},${baseG},${baseB},0.7)`);
        g.addColorStop(0.6, `rgba(${baseR},${baseG},${baseB},0.3)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * this.elongation, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _renderRiver(ctx) {
        const rH = this.riverHue || 192, rS = this.riverSat || 35, rL = this.riverLight || 20;
        const w = this.width;

        const trace = (ox, oy) => {
            ctx.beginPath();
            ctx.moveTo(this.x + ox, this.y + oy);
            for (const c of this.curves) {
                ctx.quadraticCurveTo(
                    this.x + c.cpx + ox, this.y + c.cpy + oy,
                    this.x + c.dx + ox, this.y + c.dy + oy
                );
            }
        };

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Bank
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.strokeStyle = 'hsl(30, 25%, 14%)';
        ctx.lineWidth = w * 1.6;
        trace(0, 0); ctx.stroke();

        // Water body
        ctx.globalAlpha = this.alpha;
        ctx.strokeStyle = `hsl(${rH},${rS}%,${rL}%)`;
        ctx.lineWidth = w;
        trace(0, 0); ctx.stroke();

        // Surface
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.strokeStyle = `hsl(${rH},${rS + 8}%,${rL + 12}%)`;
        ctx.lineWidth = w * 0.35;
        trace(0.5, 0); ctx.stroke();

        // Glints
        ctx.globalAlpha = this.alpha * 0.2;
        ctx.strokeStyle = `hsl(${rH},${rS + 12}%,${rL + 25}%)`;
        ctx.lineWidth = w * 0.12;
        trace(-w * 0.15, 0); ctx.stroke();
    }

    _renderSwamp(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const h = this.swampHue, s = this.swampSat, l = this.swampLight;

        ctx.globalAlpha = this.alpha;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        g.addColorStop(0, `hsla(${h},${s}%,${l + 4}%,0.75)`);
        g.addColorStop(0.5, `hsla(${h},${s}%,${l}%,0.5)`);
        g.addColorStop(0.85, `hsla(${h},${s - 5}%,${l - 3}%,0.2)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * this.elongation, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = `hsla(${h},${s + 10}%,${l + 15}%,0.5)`;
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.15, -this.size * this.elongation * 0.15,
            this.size * 0.28, this.size * this.elongation * 0.18, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Mud ring
        ctx.globalAlpha = this.alpha * 0.25;
        ctx.strokeStyle = 'hsl(30, 20%, 14%)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.9, this.size * this.elongation * 0.9, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    
}

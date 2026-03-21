// ═══════════════════════════════════════════════
//  Desert terrain FX strategy
//
//  Follows the same structural pattern as JungleFx:
//
//  sandMass  (~45%) — Big organic sand blobs (= jungle canopy)
//                     drawBlob, depth-based parallax, dominant visual
//  sandPatch (~20%) — Subtle radial gradient ground texture (= jungle dirt)
//                     Fixed speed, very subtle, fills visual gaps
//  rock      (~20%) — Desert boulders (= jungle rock)
//                     Polygon shapes, fixed speed, pebble scatter
//  oasis     (~10%) — Water pool + vegetation + palms
//                     Fixed speed, rare accent
//  cactus    (~5%)  — Green vertical accent
//                     Fixed speed, rare
//
//  KEY DESIGN RULE (learned from jungle):
//    Only the dominant type (sandMass) has depth-based speed.
//    All other types use FIXED speed ranges → no chaotic speeds.
// ═══════════════════════════════════════════════

import { BaseFxStrategy } from './BaseFxStrategy.js';
import { drawBlob, drawPolygon, generateShape, pickColor, roundRect } from './RenderHelpers.js';

// ── Color palettes ─────────────────────────────
// sandMass — warm sand tones, depth-influenced lightness
const SAND_MASS_PALETTE = [
    { weight: 0.45, hue: [35, 10],  sat: [40, 18], light: [22, 6, 8] },
    { weight: 0.30, hue: [28, 10],  sat: [38, 15], light: [20, 5, 7] },
    { weight: 0.25, hue: [42, 10],  sat: [35, 18], light: [18, 5, 6] }
];

// rock — darker, brown/grey desert stone
const ROCK_PALETTE = [
    { weight: 0.45, hue: [22, 15], sat: [22, 18], light: [24, 14] },
    { weight: 0.30, hue: [28, 20], sat: [10, 14], light: [28, 16] },
    { weight: 0.25, hue: [18, 15], sat: [14, 12], light: [20, 10] }
];

// ── Desert FX ──────────────────────────────────
export class DesertFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const dc = this.config;
        // dist = [sandMass, sandPatch, rock, oasis] — remainder = cactus
        const d = dc ? dc.dist : [0.45, 0.65, 0.85, 0.95];
        const roll = Math.random();

        if (roll < d[0])      this._initSandMass(W, H, initial, dc);
        else if (roll < d[1]) this._initSandPatch(W, H, initial);
        else if (roll < d[2]) this._initRock(W, H, initial);
        else if (roll < d[3]) this._initOasis(W, H, initial);
        else                  this._initCactus(W, H, initial);
    }

    // ═══════════════════════════════════════════
    //  sandMass — dominant element (like jungle canopy)
    //  Big organic sand blobs, depth-based parallax
    // ═══════════════════════════════════════════
    _initSandMass(W, H, initial, dc) {
        this.subType = 'sandMass';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -100 - Math.random() * 80;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        const sMul = dc ? (dc.sandMul || 1) : 1;
        // Size scales with depth — like canopy (25-90px)
        this.size = (25 + near * 40 + Math.random() * 25) * sMul;
        // Speed with depth parallax — exactly like canopy
        this.speed = 18 + near * 16 + Math.random() * 12;
        this.alpha = 0.55 + near * 0.25 + Math.random() * 0.15;
        Object.assign(this, pickColor(SAND_MASS_PALETTE, near));
        // Organic blob shape — like canopy (7-9 vertices)
        this.shape = generateShape(7 + Math.floor(Math.random() * 3), 0.75, 0.3);
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpd = (Math.random() - 0.5) * 0.03;
        this.shadowOx = 3 + Math.random() * 4;
        this.shadowOy = 3 + Math.random() * 4;
    }

    // ═══════════════════════════════════════════
    //  sandPatch — subtle ground texture (like jungle dirt)
    //  Radial gradient, fixed speed, very subtle
    // ═══════════════════════════════════════════
    _initSandPatch(W, H, initial) {
        this.subType = 'sandPatch';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -50 - Math.random() * 30;
        this.size = 15 + Math.random() * 30;
        // Fixed speed — no depth variation (like jungle dirt)
        this.speed = 20 + Math.random() * 16;
        this.alpha = 0.25 + Math.random() * 0.25;
        this.elongation = 0.6 + Math.random() * 0.6;
        this.rot = Math.random() * Math.PI;
        // Warm/cool sand variation
        this.sandWarm = Math.random() < 0.5 ? 3 : -2;
    }

    // ═══════════════════════════════════════════
    //  rock — desert boulders (like jungle rock)
    //  Polygon shapes, fixed speed, pebble scatter
    // ═══════════════════════════════════════════
    _initRock(W, H, initial) {
        this.subType = 'rock';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -30 - Math.random() * 20;
        // Size tier — exactly like jungle rock
        const tier = Math.random();
        if (tier < 0.25)      { this.size = 14 + Math.random() * 12; this.rockVariant = 'boulder'; }
        else if (tier < 0.60) { this.size = 7 + Math.random() * 8;  this.rockVariant = 'medium';  }
        else                  { this.size = 3 + Math.random() * 5;  this.rockVariant = 'pebble';  }
        // Fixed speed — no depth variation (like jungle rock)
        this.speed = 20 + Math.random() * 18;
        this.alpha = 0.6 + Math.random() * 0.35;
        this.rot = Math.random() * Math.PI * 2;
        this.shape = generateShape(5 + Math.floor(Math.random() * 3), 0.55, 0.55);
        Object.assign(this, pickColor(ROCK_PALETTE));
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

    // ═══════════════════════════════════════════
    //  oasis — water pool + vegetation (like jungle swamp)
    //  Fixed speed, rare accent
    // ═══════════════════════════════════════════
    _initOasis(W, H, initial) {
        this.subType = 'oasis';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -60 - Math.random() * 40;
        this.size = 18 + Math.random() * 30;
        this.elongation = 0.5 + Math.random() * 0.4;
        // Fixed speed (like jungle swamp)
        this.speed = 18 + Math.random() * 14;
        this.alpha = 0.5 + Math.random() * 0.3;
        this.rot = Math.random() * Math.PI;
        // Water colors
        this.waterHue = 188 + Math.random() * 18;
        this.waterSat = 35 + Math.random() * 18;
        this.waterLight = 18 + Math.random() * 10;
        // Vegetation ring
        this.vegHue = 105 + Math.random() * 25;
        this.vegSat = 30 + Math.random() * 15;
        this.vegLight = 16 + Math.random() * 8;
        // Palm trees (1-2)
        this.palms = [];
        const palmN = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < palmN; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = this.size * (0.85 + Math.random() * 0.35);
            this.palms.push({
                ox: Math.cos(angle) * dist,
                oy: Math.sin(angle) * dist * this.elongation,
                height: 6 + Math.random() * 8,
                crownR: 3 + Math.random() * 3,
                lean: (Math.random() - 0.5) * 0.35
            });
        }
    }

    // ═══════════════════════════════════════════
    //  cactus — green vertical accent
    //  Fixed speed, rare
    // ═══════════════════════════════════════════
    _initCactus(W, H, initial) {
        this.subType = 'cactus';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -40 - Math.random() * 25;
        this.trunkH = 10 + Math.random() * 14;
        this.trunkW = 3 + Math.random() * 3;
        this.size = this.trunkH;
        // Fixed speed
        this.speed = 20 + Math.random() * 14;
        this.alpha = 0.55 + Math.random() * 0.3;
        this.hue = 108 + Math.random() * 22;
        this.sat = 40 + Math.random() * 18;
        this.lightness = 22 + Math.random() * 10;
        this.arms = [];
        const armN = Math.floor(Math.random() * 3);
        for (let i = 0; i < armN; i++) {
            this.arms.push({
                y: this.trunkH * (0.3 + Math.random() * 0.4),
                len: 4 + Math.random() * 5,
                dir: Math.random() < 0.5 ? -1 : 1,
                w: this.trunkW * (0.6 + Math.random() * 0.3),
                upLen: 3 + Math.random() * 5
            });
        }
    }

    // ── Update ─────────────────────────────────
    _update(dt) {
        if (this.subType === 'sandMass') {
            this.y += this.speed * dt;
            this.rot += this.rotSpd * dt;
        } else {
            this.y += this.speed * dt;
        }
        if (this._isOffBottom(20)) this.reset();
    }

    // ── Render ─────────────────────────────────
    _render(ctx) {
        switch (this.subType) {
            case 'sandMass':  this._renderSandMass(ctx);  break;
            case 'sandPatch': this._renderSandPatch(ctx); break;
            case 'rock':      this._renderRock(ctx);      break;
            case 'oasis':     this._renderOasis(ctx);     break;
            case 'cactus':    this._renderCactus(ctx);    break;
        }
    }

    // ── Sand Mass (like canopy) ────────────────
    _renderSandMass(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const R = this.size;

        // Shadow
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = 'rgba(12,8,2,0.7)';
        drawBlob(ctx, this.shadowOx, this.shadowOy, R, 0.95, this.shape);
        ctx.fill();

        // Body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lightness}%)`;
        drawBlob(ctx, 0, 0, R, 1, this.shape);
        ctx.fill();

        // Inner depth (darker center)
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = `hsl(${this.hue + 5},${this.sat}%,${Math.max(6, this.lightness - 5)}%)`;
        drawBlob(ctx, R * 0.06, R * 0.08, R, 0.55, this.shape);
        ctx.fill();

        // Highlight
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.fillStyle = `hsl(${this.hue - 3},${this.sat + 6}%,${this.lightness + 12}%)`;
        ctx.beginPath();
        ctx.ellipse(-R * 0.15, -R * 0.15, R * 0.35, R * 0.28, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Specular
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 8}%,${this.lightness + 22}%)`;
        ctx.beginPath();
        ctx.arc(-R * 0.12, -R * 0.18, R * 0.12, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ── Sand Patch (like dirt) ─────────────────
    _renderSandPatch(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.globalAlpha = this.alpha;
        const sw = this.sandWarm || 0;
        const baseR = 36 + sw * 3, baseG = 28 + sw * 2, baseB = 16 + sw;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        g.addColorStop(0,   `rgba(${baseR},${baseG},${baseB},0.7)`);
        g.addColorStop(0.6, `rgba(${baseR},${baseG},${baseB},0.3)`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * this.elongation, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ── Rock (like jungle rock) ────────────────
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
        ctx.fillStyle = 'rgba(8,4,1,0.6)';
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

    // ── Oasis (like swamp + palms) ─────────────
    _renderOasis(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        const h = this.waterHue, s = this.waterSat, l = this.waterLight;
        const sz = this.size, el = this.elongation;

        // Vegetation ring — radial gradient like swamp
        ctx.globalAlpha = this.alpha * 0.7;
        const gv = ctx.createRadialGradient(0, 0, sz * 0.5, 0, 0, sz * 1.2);
        gv.addColorStop(0, `hsla(${this.vegHue},${this.vegSat}%,${this.vegLight + 3}%,0.6)`);
        gv.addColorStop(0.7, `hsla(${this.vegHue},${this.vegSat}%,${this.vegLight}%,0.3)`);
        gv.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gv;
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 1.2, sz * el * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Water pool — radial gradient like swamp inner
        ctx.globalAlpha = this.alpha;
        const gw = ctx.createRadialGradient(0, 0, 0, 0, 0, sz);
        gw.addColorStop(0, `hsla(${h},${s}%,${l + 4}%,0.8)`);
        gw.addColorStop(0.5, `hsla(${h},${s}%,${l}%,0.6)`);
        gw.addColorStop(0.85, `hsla(${h},${s - 5}%,${l - 3}%,0.25)`);
        gw.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gw;
        ctx.beginPath();
        ctx.ellipse(0, 0, sz, sz * el, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = `hsla(${h},${s + 10}%,${l + 15}%,0.5)`;
        ctx.beginPath();
        ctx.ellipse(-sz * 0.15, -sz * el * 0.15,
            sz * 0.28, sz * el * 0.18, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Edge ring stroke (like swamp mud ring)
        ctx.globalAlpha = this.alpha * 0.25;
        ctx.strokeStyle = `hsl(${this.vegHue},${this.vegSat}%,${this.vegLight + 6}%)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 0.9, sz * el * 0.9, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // Palm trees (drawn un-rotated for upright trunks)
        ctx.save();
        ctx.translate(this.x, this.y);
        for (const p of this.palms) {
            // Trunk
            ctx.globalAlpha = this.alpha * 0.75;
            ctx.strokeStyle = 'hsl(25,35%,22%)';
            ctx.lineWidth = p.crownR * 0.35;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.ox, p.oy);
            ctx.lineTo(p.ox + p.lean * p.height, p.oy - p.height);
            ctx.stroke();

            // Crown
            const crX = p.ox + p.lean * p.height;
            const crY = p.oy - p.height;
            ctx.globalAlpha = this.alpha * 0.7;
            ctx.fillStyle = `hsl(${this.vegHue + 10},${this.vegSat + 8}%,${this.vegLight + 6}%)`;
            ctx.beginPath();
            ctx.arc(crX, crY, p.crownR, 0, Math.PI * 2);
            ctx.fill();

            // Crown highlight
            ctx.globalAlpha = this.alpha * 0.35;
            ctx.fillStyle = `hsl(${this.vegHue + 15},${this.vegSat + 5}%,${this.vegLight + 14}%)`;
            ctx.beginPath();
            ctx.arc(crX - p.crownR * 0.2, crY - p.crownR * 0.2, p.crownR * 0.45, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // ── Cactus ─────────────────────────────────
    _renderCactus(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const cH = this.trunkH, cW = this.trunkW;

        // Shadow
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.fillStyle = 'rgba(12,6,2,0.5)';
        roundRect(ctx, -cW * 0.5 + 2, -cH + 2, cW, cH, cW * 0.3);
        ctx.fill();

        // Trunk body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lightness}%)`;
        roundRect(ctx, -cW * 0.5, -cH, cW, cH, cW * 0.3);
        ctx.fill();

        // Trunk highlight stripe
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = `hsl(${this.hue + 5},${this.sat + 5}%,${Math.min(55, this.lightness + 10)}%)`;
        roundRect(ctx, -cW * 0.45, -cH + cH * 0.1, cW * 0.35, cH * 0.7, cW * 0.15);
        ctx.fill();

        // Arms
        for (const arm of this.arms) {
            const armY = -cH + arm.y;
            const armX = arm.dir > 0 ? cW * 0.5 : -cW * 0.5 - arm.len;

            // Horizontal segment
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lightness}%)`;
            roundRect(ctx, armX, armY - arm.w * 0.5, arm.len, arm.w, arm.w * 0.3);
            ctx.fill();

            // Vertical up segment
            const upX = arm.dir > 0 ? cW * 0.5 + arm.len - arm.w : -cW * 0.5 - arm.len;
            roundRect(ctx, upX, armY - arm.w * 0.5 - arm.upLen, arm.w, arm.upLen, arm.w * 0.3);
            ctx.fill();

            // Arm highlight
            ctx.globalAlpha = this.alpha * 0.35;
            ctx.fillStyle = `hsl(${this.hue + 5},${this.sat + 5}%,${Math.min(50, this.lightness + 8)}%)`;
            roundRect(ctx, armX + arm.len * 0.05, armY - arm.w * 0.35, arm.len * 0.3, arm.w * 0.5, arm.w * 0.15);
            ctx.fill();
        }

        // Specular dot
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.fillStyle = `hsl(${this.hue},${Math.max(10, this.sat - 10)}%,${Math.min(55, this.lightness + 16)}%)`;
        ctx.beginPath();
        ctx.arc(0, -cH * 0.65, cW * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ═══════════════════════════════════════════════
//  Glitch terrain FX strategy — World 3: Simulation Break
//
//  Follows the same structural pattern as DesertFx / JungleFx:
//
//  glitchBlock (~35%) — Dominant: corrupted rectangular blocks, depth-based parallax
//  dataStream  (~20%) — Scrolling vertical code/data lines
//  brokenPoly  (~20%) — Fragmented polygons floating
//  pixelNoise  (~15%) — Small square pixel artifacts
//  codeFragment(~10%) — Rare: floating text-like structures
//
//  KEY DESIGN RULE:
//    Only the dominant type (glitchBlock) has depth-based speed.
//    All other types use FIXED speed ranges.
// ═══════════════════════════════════════════════

import { BaseFxStrategy } from './BaseFxStrategy.js';
import { drawPolygon, generateShape } from './RenderHelpers.js';

// ── Color palettes ─────────────────────────────
const GLITCH_BLOCK_PALETTE = [
    { weight: 0.35, hue: [180, 30], sat: [50, 30], light: [14, 8, 6] },
    { weight: 0.3, hue: [280, 40], sat: [40, 25], light: [12, 6, 5] },
    { weight: 0.2, hue: [120, 30], sat: [60, 20], light: [10, 6, 4] },
    { weight: 0.15, hue: [0, 20],   sat: [70, 20], light: [16, 6, 5] }
];

const BROKEN_POLY_PALETTE = [
    { weight: 0.4, hue: [170, 30], sat: [35, 25], light: [20, 12] },
    { weight: 0.35, hue: [270, 30], sat: [30, 20], light: [18, 10] },
    { weight: 0.25, hue: [90, 30],  sat: [45, 20], light: [16, 8] }
];

function _pickColor(palette, depth) {
    let total = 0;
    for (const p of palette) total += p.weight;
    let r = Math.random() * total;
    let picked = palette[0];
    for (const p of palette) {
        r -= p.weight;
        if (r <= 0) { picked = p; break; }
    }
    const hue = picked.hue[0] + Math.random() * picked.hue[1];
    const sat = picked.sat[0] + Math.random() * picked.sat[1];
    let lightness;
    if (picked.light.length === 3) {
        lightness = picked.light[0] + (depth || 0) * picked.light[1] + Math.random() * picked.light[2];
    } else {
        lightness = picked.light[0] + Math.random() * picked.light[1];
    }
    return { hue, sat, lightness };
}

// ── Glitch FX ──────────────────────────────────
export class GlitchFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const gc = this.config;
        const d = gc ? gc.dist : [0.35, 0.55, 0.75, 0.9];
        const roll = Math.random();

        if (roll < d[0])      this._initGlitchBlock(W, H, initial, gc);
        else if (roll < d[1]) this._initDataStream(W, H, initial);
        else if (roll < d[2]) this._initBrokenPoly(W, H, initial);
        else if (roll < d[3]) this._initPixelNoise(W, H, initial);
        else                  this._initCodeFragment(W, H, initial);
    }

    // ═══════════════════════════════════════════
    //  glitchBlock — dominant element
    //  Corrupted rectangular blocks, depth-based parallax
    // ═══════════════════════════════════════════
    _initGlitchBlock(W, H, initial, gc) {
        this.subType = 'glitchBlock';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -80 - Math.random() * 60;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        const gMul = gc ? (gc.glitchMul || 1) : 1;
        this.bw = (15 + near * 30 + Math.random() * 20) * gMul;
        this.bh = (8 + near * 15 + Math.random() * 12) * gMul;
        this.size = Math.max(this.bw, this.bh);
        this.speed = 18 + near * 16 + Math.random() * 12;
        this.alpha = 0.45 + near * 0.3 + Math.random() * 0.15;
        Object.assign(this, _pickColor(GLITCH_BLOCK_PALETTE, near));
        this.glitchPhase = Math.random() * Math.PI * 2;
        this.glitchFreq = 2 + Math.random() * 4;
        this.scanlineGap = 2 + Math.floor(Math.random() * 3);
        this.hasBorder = Math.random() < 0.6;
    }

    // ═══════════════════════════════════════════
    //  dataStream — scrolling vertical data lines
    // ═══════════════════════════════════════════
    _initDataStream(W, H, initial) {
        this.subType = 'dataStream';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -40 - Math.random() * 30;
        this.streamLen = 20 + Math.random() * 50;
        this.size = this.streamLen;
        this.streamW = 1 + Math.random() * 2;
        this.speed = 25 + Math.random() * 20;
        this.alpha = 0.2 + Math.random() * 0.3;
        this.streamHue = Math.random() < 0.5 ? (120 + Math.random() * 30) : (180 + Math.random() * 30);
        this.segments = 3 + Math.floor(Math.random() * 5);
    }

    // ═══════════════════════════════════════════
    //  brokenPoly — fragmented polygons
    // ═══════════════════════════════════════════
    _initBrokenPoly(W, H, initial) {
        this.subType = 'brokenPoly';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -30 - Math.random() * 20;
        this.size = 8 + Math.random() * 18;
        this.speed = 20 + Math.random() * 18;
        this.alpha = 0.4 + Math.random() * 0.35;
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpd = (Math.random() - 0.5) * 1.5;
        this.shape = generateShape(3 + Math.floor(Math.random() * 4), 0.5, 0.5);
        Object.assign(this, _pickColor(BROKEN_POLY_PALETTE));
        this.wireframe = Math.random() < 0.4;
    }

    // ═══════════════════════════════════════════
    //  pixelNoise — small square pixel artifacts
    // ═══════════════════════════════════════════
    _initPixelNoise(W, H, initial) {
        this.subType = 'pixelNoise';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -10 - Math.random() * 10;
        this.size = 2 + Math.random() * 5;
        this.speed = 15 + Math.random() * 25;
        this.alpha = 0.15 + Math.random() * 0.35;
        this.pixelHue = [0, 120, 180, 270, 300][Math.floor(Math.random() * 5)];
        this.pixelSat = 60 + Math.random() * 30;
        this.flickerRate = 4 + Math.random() * 8;
    }

    // ═══════════════════════════════════════════
    //  codeFragment — floating text-like structures
    // ═══════════════════════════════════════════
    _initCodeFragment(W, H, initial) {
        this.subType = 'codeFragment';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -30 - Math.random() * 20;
        this.size = 12 + Math.random() * 20;
        this.speed = 16 + Math.random() * 14;
        this.alpha = 0.25 + Math.random() * 0.3;
        this.lineCount = 2 + Math.floor(Math.random() * 4);
        this.lineWidths = [];
        for (let i = 0; i < this.lineCount; i++) {
            this.lineWidths.push(8 + Math.random() * 25);
        }
        this.fragHue = Math.random() < 0.5 ? 120 : 180;
    }

    // ═══════════════════════════════════════════
    //  _update
    // ═══════════════════════════════════════════
    _update(dt, W, H, time) {
        this.y += this.speed * dt;

        if (this.subType === 'glitchBlock') {
            // Slight horizontal jitter
            this.x += Math.sin(time * this.glitchFreq + this.glitchPhase) * 0.5;
        }

        if (this._isOffBottom(20)) this.reset();
    }

    // ═══════════════════════════════════════════
    //  _render
    // ═══════════════════════════════════════════
    _render(ctx, W, H) {
        switch (this.subType) {
            case 'glitchBlock':   this._renderGlitchBlock(ctx); break;
            case 'dataStream':    this._renderDataStream(ctx); break;
            case 'brokenPoly':    this._renderBrokenPoly(ctx); break;
            case 'pixelNoise':    this._renderPixelNoise(ctx); break;
            case 'codeFragment':  this._renderCodeFragment(ctx); break;
        }
    }

    _renderGlitchBlock(ctx) {
        const x = this.x - this.bw / 2;
        const y = this.y - this.bh / 2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + 2, y + 2, this.bw, this.bh);

        // Main block
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lightness}%)`;
        ctx.fillRect(x, y, this.bw, this.bh);

        // Scanlines
        ctx.fillStyle = `hsla(${this.hue},${this.sat}%,${Math.min(80, this.lightness + 15)}%,0.3)`;
        for (let sy = 0; sy < this.bh; sy += this.scanlineGap * 2) {
            ctx.fillRect(x, y + sy, this.bw, 1);
        }

        // Border
        if (this.hasBorder) {
            ctx.strokeStyle = `hsla(${this.hue},${this.sat + 10}%,${Math.min(80, this.lightness + 20)}%,0.5)`;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, this.bw, this.bh);
        }
    }

    _renderDataStream(ctx) {
        const segH = this.streamLen / this.segments;
        ctx.strokeStyle = `hsla(${this.streamHue},70%,50%,0.7)`;
        ctx.lineWidth = this.streamW;

        for (let i = 0; i < this.segments; i++) {
            const sy = this.y + i * segH;
            const gap = (i % 2 === 0) ? 0 : segH * 0.3;
            ctx.beginPath();
            ctx.moveTo(this.x, sy + gap);
            ctx.lineTo(this.x, sy + segH - gap * 0.5);
            ctx.stroke();
        }

        // Glow dot at tip
        ctx.fillStyle = `hsla(${this.streamHue},80%,70%,0.8)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.streamW + 1, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderBrokenPoly(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);

        if (this.wireframe) {
            drawPolygon(ctx, 0, 0, this.size, 1, this.shape);
            ctx.strokeStyle = `hsla(${this.hue},${this.sat}%,${this.lightness + 15}%,0.8)`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            drawPolygon(ctx, 0, 0, this.size, 1, this.shape);
            ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.lightness}%)`;
            ctx.fill();
            ctx.strokeStyle = `hsla(${this.hue},${this.sat}%,${this.lightness + 20}%,0.4)`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    _renderPixelNoise(ctx) {
        const time = performance.now() * 0.001;
        const flicker = Math.sin(time * this.flickerRate) > 0 ? 1 : 0.3;
        ctx.globalAlpha *= flicker;
        ctx.fillStyle = `hsl(${this.pixelHue},${this.pixelSat}%,55%)`;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }

    _renderCodeFragment(ctx) {
        const lineH = 3;
        const gap = 2;
        for (let i = 0; i < this.lineCount; i++) {
            const ly = this.y + i * (lineH + gap);
            const lw = this.lineWidths[i];
            ctx.fillStyle = `hsla(${this.fragHue},60%,45%,0.6)`;
            ctx.fillRect(this.x, ly, lw, lineH);
        }
    }
}

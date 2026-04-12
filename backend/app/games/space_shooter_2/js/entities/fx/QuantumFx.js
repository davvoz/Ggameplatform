// ═══════════════════════════════════════════════
//  Quantum FX strategy — World 4: Quantum Realm
//
//  quantumField (~35%) — Dominant: shimmering probability cloud blobs,
//                         depth-based parallax, semi-transparent, wave-like edges
//  feynmanLine  (~20%) — Wavy/straight/dashed propagator lines between points
//  particleTrail(~20%) — Accelerated particle streaks with colored glow
//  decayProduct (~15%) — Expanding ring + fragment bursts (particle decay)
//  vacuumBubble (~10%) — Rare: bubble-like vacuum fluctuation spheres
//
//  KEY DESIGN RULE:
//    Only the dominant type (quantumField) has depth-based speed.
//    All other types use FIXED speed ranges.
// ═══════════════════════════════════════════════

import { BaseFxStrategy } from './BaseFxStrategy.js';

// ── Color palettes ─────────────────────────────
const QUANTUM_FIELD_PALETTE = [
    { weight: 0.3, hue: [220, 40], sat: [45, 30], light: [14, 8, 6] },   // Blue quantum
    { weight: 0.25, hue: [280, 35], sat: [40, 25], light: [12, 7, 5] },   // Violet Higgs
    { weight: 0.25, hue: [170, 30], sat: [50, 20], light: [10, 6, 4] },   // Teal lepton
    { weight: 0.2, hue: [40, 30], sat: [60, 20], light: [16, 6, 5] }    // Gold boson
];

const PARTICLE_TRAIL_COLORS = ['#4488ff', '#ff4488', '#44ff88', '#ffdd44', '#aa66ff', '#ff8844'];

const FEYNMAN_STYLES = ['straight', 'wavy', 'dashed'];

function _pickFieldColor(depth) {
    let total = 0;
    for (const p of QUANTUM_FIELD_PALETTE) total += p.weight;
    let r = Math.random() * total;
    let picked = QUANTUM_FIELD_PALETTE[0];
    for (const p of QUANTUM_FIELD_PALETTE) {
        r -= p.weight;
        if (r <= 0) { picked = p; break; }
    }
    const hue = picked.hue[0] + Math.random() * picked.hue[1];
    const sat = picked.sat[0] + Math.random() * picked.sat[1];
    const lightness = picked.light[0] + (depth || 0) * picked.light[1] + Math.random() * picked.light[2];
    return { hue, sat, lightness };
}

// ── Quantum FX ─────────────────────────────────
export class QuantumFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const qc = this.config;
        const d = qc ? qc.dist : [0.35, 0.55, 0.75, 0.9];
        const roll = Math.random();

        if (roll < d[0]) this._initQuantumField(W, H, initial, qc);
        else if (roll < d[1]) this._initFeynmanLine(W, H, initial);
        else if (roll < d[2]) this._initParticleTrail(W, H, initial);
        else if (roll < d[3]) this._initDecayProduct(W, H, initial);
        else this._initVacuumBubble(W, H, initial);
    }

    // ═══════════════════════════════════════════
    //  quantumField — dominant element
    //  Probability cloud blobs with wave-like edges
    // ═══════════════════════════════════════════
    _initQuantumField(W, H, initial, qc) {
        this.subType = 'quantumField';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -60 - Math.random() * 50;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        const eMul = qc ? (qc.energyMul || 1) : 1;
        this.blobRadius = (12 + near * 20 + Math.random() * 15) * eMul;
        this.size = this.blobRadius * 2;
        this.speed = 14 + near * 14 + Math.random() * 10;
        this.alpha = 0.3 + near * 0.25 + Math.random() * 0.15;
        Object.assign(this, _pickFieldColor(near));
        this.wavePhase = Math.random() * Math.PI * 2;
        this.waveFreq = 2 + Math.random() * 3;
        this.waveAmp = 3 + Math.random() * 5;
        this.drift = (Math.random() - 0.5) * 8;
    }

    _initFeynmanLine(W, H, initial) {
        this.subType = 'feynmanLine';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -30 - Math.random() * 20;
        this.lineLen = 30 + Math.random() * 60;
        this.size = this.lineLen;
        this.angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        this.speed = 18 + Math.random() * 15;
        this.alpha = 0.15 + Math.random() * 0.25;
        this.lineStyle = FEYNMAN_STYLES[Math.floor(Math.random() * 3)];
        this.lineHue = 200 + Math.random() * 120;
        this.lineWidth = 0.8 + Math.random() * 1.2;
        this.segments = 8 + Math.floor(Math.random() * 8);
    }

    _initParticleTrail(W, H, initial) {
        this.subType = 'particleTrail';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -20 - Math.random() * 15;
        this.size = 2 + Math.random() * 3;
        this.trailLen = 5 + Math.floor(Math.random() * 8);
        this.speed = 40 + Math.random() * 50;
        this.alpha = 0.4 + Math.random() * 0.3;
        this.trailColor = PARTICLE_TRAIL_COLORS[Math.floor(Math.random() * PARTICLE_TRAIL_COLORS.length)];
        this.vx = (Math.random() - 0.5) * 15;
        this.trailPoints = [];
        this.curvature = (Math.random() - 0.5) * 2; // magnetic field curvature
    }

    _initDecayProduct(W, H, initial) {
        this.subType = 'decayProduct';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -40 - Math.random() * 30;
        this.size = 15 + Math.random() * 20;
        this.speed = 12 + Math.random() * 10;
        this.alpha = 0.35 + Math.random() * 0.3;
        this.ringPhase = 0;
        this.ringSpeed = 1 + Math.random() * 2;
        this.maxRingRadius = this.size;
        this.fragments = [];
        const fragCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < fragCount; i++) {
            this.fragments.push({
                angle: (Math.PI * 2 / fragCount) * i + Math.random() * 0.3,
                speed: 8 + Math.random() * 12,
                size: 1 + Math.random() * 2,
                dist: 0
            });
        }
        this.decayHue = 180 + Math.random() * 140;
    }

    _initVacuumBubble(W, H, initial) {
        this.subType = 'vacuumBubble';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -50 - Math.random() * 40;
        this.bubbleRadius = 10 + Math.random() * 20;
        this.size = this.bubbleRadius * 2;
        this.speed = 6 + Math.random() * 8;
        this.alpha = 0.15 + Math.random() * 0.2;
        this.breathPhase = Math.random() * Math.PI * 2;
        this.breathSpeed = 0.8 + Math.random() * 1.5;
        this.breathAmp = 0.15 + Math.random() * 0.15;
        this.bubbleHue = 240 + Math.random() * 80;
        this.drift = (Math.random() - 0.5) * 6;
        this.shimmerPhase = Math.random() * Math.PI * 2;
    }

    // ═══════════════════════════════════════════
    //  UPDATE
    // ═══════════════════════════════════════════
    _update(dt, W, H, time) {
        this.y += this.speed * dt;

        switch (this.subType) {
            case 'quantumField':
                this.wavePhase += this.waveFreq * dt;
                this.x += this.drift * dt;
                if (this._isOffBottom(this.size)) this._init(false);
                break;

            case 'feynmanLine':
                if (this._isOffBottom(this.size)) this._init(false);
                break;

            case 'particleTrail':
                this.updateTrailPosition(dt, W, H);
                break;

            case 'decayProduct':
                this.updateRingPhase(dt);
                break;

            case 'vacuumBubble':
                this.breathPhase += this.breathSpeed * dt;
                this.shimmerPhase += dt * 3;
                this.x += this.drift * dt;
                if (this._isOffBottom(this.size)) this._init(false);
                break;
        }


    }
    updateRingPhase(dt) {
        this.ringPhase += this.ringSpeed * dt;
        for (const f of this.fragments) {
            f.dist = Math.min(this.maxRingRadius, f.dist + f.speed * dt);
        }
        if (this.ringPhase > Math.PI * 2) {
            this.ringPhase = 0;
            for (const f of this.fragments) f.dist = 0;
        }
        if (this._isOffBottom(this.size)) this._init(false);
    }

    updateTrailPosition(dt, W) {
        this.x += this.vx * dt;
        this.vx += this.curvature * dt; // magnetic curvature
        this.trailPoints.unshift({ x: this.x, y: this.y });
        if (this.trailPoints.length > this.trailLen) this.trailPoints.pop();
        if (this._isOffBottom() || this.x < -20 || this.x > W + 20) this._init(false);
    }
    // ═══════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════
    _render(ctx, W, H) {
        switch (this.subType) {
            case 'quantumField': this._renderQuantumField(ctx); break;
            case 'feynmanLine': this._renderFeynmanLine(ctx); break;
            case 'particleTrail': this._renderParticleTrail(ctx); break;
            case 'decayProduct': this._renderDecayProduct(ctx); break;
            case 'vacuumBubble': this._renderVacuumBubble(ctx); break;
        }
    }

    _renderQuantumField(ctx) {
        const wave = Math.sin(this.wavePhase) * this.waveAmp;
        const r = this.blobRadius + wave;
        const col = `hsl(${this.hue}, ${this.sat}%, ${this.lightness}%)`;
        // Probability cloud - soft radial gradient blob
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
        grad.addColorStop(0, col);
        grad.addColorStop(0.5, `hsla(${this.hue}, ${this.sat}%, ${this.lightness}%, 0.3)`);
        grad.addColorStop(1, `hsla(${this.hue}, ${this.sat}%, ${this.lightness}%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        // Wave-edge circle (probability cloud boundary)
        const steps = 24;
        for (let i = 0; i <= steps; i++) {
            const a = (Math.PI * 2 / steps) * i;
            const wobble = r + Math.sin(a * 3 + this.wavePhase) * (this.waveAmp * 0.5);
            const px = this.x + Math.cos(a) * wobble;
            const py = this.y + Math.sin(a) * wobble;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    _renderFeynmanLine(ctx) {
        const col = `hsl(${this.lineHue}, 50%, 50%)`;
        ctx.strokeStyle = col;
        ctx.lineWidth = this.lineWidth;

        if (this.lineStyle === 'wavy') {
            ctx.beginPath();
            for (let i = 0; i <= this.segments; i++) {
                const t = i / this.segments;
                const px = this.x + Math.cos(this.angle) * this.lineLen * t;
                const py = this.y + Math.sin(this.angle) * this.lineLen * t;
                const perp = Math.sin(t * Math.PI * 4) * 5;
                const nx = -Math.sin(this.angle), ny = Math.cos(this.angle);
                const fx = px + nx * perp;
                const fy = py + ny * perp;
                if (i === 0) ctx.moveTo(fx, fy);
                else ctx.lineTo(fx, fy);
            }
            ctx.stroke();
        } else if (this.lineStyle === 'dashed') {
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(this.angle) * this.lineLen,
                this.y + Math.sin(this.angle) * this.lineLen
            );
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // Straight with arrow
            const ex = this.x + Math.cos(this.angle) * this.lineLen;
            const ey = this.y + Math.sin(this.angle) * this.lineLen;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            // Arrow tip
            const arrowSize = 4;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(
                ex - Math.cos(this.angle - 0.4) * arrowSize,
                ey - Math.sin(this.angle - 0.4) * arrowSize
            );
            ctx.lineTo(
                ex - Math.cos(this.angle + 0.4) * arrowSize,
                ey - Math.sin(this.angle + 0.4) * arrowSize
            );
            ctx.closePath();
            ctx.fill();
        }

        // Vertex dots at endpoints
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderParticleTrail(ctx) {
        // Trail
        if (this.trailPoints.length > 1) {
            for (let i = 1; i < this.trailPoints.length; i++) {
                const fade = 1 - i / this.trailPoints.length;
                ctx.globalAlpha = this.alpha * fade * 0.6;
                ctx.fillStyle = this.trailColor;
                ctx.beginPath();
                ctx.arc(this.trailPoints[i].x, this.trailPoints[i].y, this.size * fade, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Head
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.trailColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderDecayProduct(ctx) {
        const progress = this.ringPhase / (Math.PI * 2);
        // Expanding ring
        ctx.globalAlpha = this.alpha * (1 - progress * 0.7);
        ctx.strokeStyle = `hsl(${this.decayHue}, 50%, 50%)`;
        ctx.lineWidth = 1.5 * (1 - progress);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.maxRingRadius * progress, 0, Math.PI * 2);
        ctx.stroke();
        // Center flash
        if (progress < 0.15) {
            ctx.globalAlpha = this.alpha * 0.6;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3 * (1 - progress / 0.15), 0, Math.PI * 2);
            ctx.fill();
        }
        // Fragments flying out
        for (const f of this.fragments) {
            if (f.dist < 1) continue;
            const fx = this.x + Math.cos(f.angle) * f.dist;
            const fy = this.y + Math.sin(f.angle) * f.dist;
            ctx.globalAlpha = this.alpha * (1 - f.dist / this.maxRingRadius);
            ctx.fillStyle = `hsl(${this.decayHue}, 60%, 60%)`;
            ctx.beginPath();
            ctx.arc(fx, fy, f.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _renderVacuumBubble(ctx) {
        const breath = 1 + Math.sin(this.breathPhase) * this.breathAmp;
        const r = this.bubbleRadius * breath;
        const shimmer = 0.5 + 0.5 * Math.sin(this.shimmerPhase);
        // Outer bubble membrane
        ctx.strokeStyle = `hsla(${this.bubbleHue}, 40%, 50%, ${0.2 + shimmer * 0.15})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.stroke();
        // Inner glow
        const innerGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
        innerGrad.addColorStop(0, `hsla(${this.bubbleHue}, 50%, 60%, 0.08)`);
        innerGrad.addColorStop(0.7, `hsla(${this.bubbleHue}, 40%, 40%, 0.03)`);
        innerGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.globalAlpha = this.alpha * 0.3 * shimmer;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x - r * 0.3, this.y - r * 0.3, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }
}

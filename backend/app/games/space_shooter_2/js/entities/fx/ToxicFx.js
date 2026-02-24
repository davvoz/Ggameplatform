// ═══════════════════════════════════════════════
//  Toxic terrain FX strategy
//  SubTypes: sludge · bubbles · fumes · pools · moss
//  Aesthetic: blobby, smoky, swampy
// ═══════════════════════════════════════════════

import { BaseFxStrategy } from './BaseFxStrategy.js';
import { drawBlob, pickColor, generateShape } from './RenderHelpers.js';

// ── Color palettes (murky swamp tones) ─────────
const SLUDGE_PALETTE = [
    { weight: 0.40, hue: [80, 20],  sat: [35, 18], light: [12, 7, 3] },
    { weight: 0.35, hue: [65, 25],  sat: [28, 15], light: [10, 6, 2] },
    { weight: 0.25, hue: [45, 20],  sat: [25, 12], light: [9, 5, 2] }
];

const ACID_PALETTE = [
    { weight: 0.50, hue: [95, 25],  sat: [55, 25], light: [30, 12, 4] },
    { weight: 0.50, hue: [110, 20], sat: [45, 20], light: [25, 10, 4] }
];

const FUMES_PALETTE = [
    { weight: 0.40, hue: [80, 35],  sat: [12, 10], light: [20, 10, 3] },
    { weight: 0.35, hue: [55, 30],  sat: [10, 8],  light: [16, 8, 3] },
    { weight: 0.25, hue: [100, 25], sat: [8, 8],   light: [14, 6, 2] }
];

const MOSS_PALETTE = [
    { weight: 0.45, hue: [90, 25],  sat: [30, 18], light: [16, 8, 3] },
    { weight: 0.30, hue: [70, 20],  sat: [25, 14], light: [13, 6, 2] },
    { weight: 0.25, hue: [110, 20], sat: [22, 12], light: [11, 5, 2] }
];

// ── Toxic FX (terrain composite) ───────────────
export class ToxicFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const tc = this.config;
        const d = tc ? tc.dist : [0.28, 0.50, 0.72, 0.88];
        const roll = Math.random();

        if (roll < d[0])      this._initSludge(W, H, initial);
        else if (roll < d[1]) this._initBubbles(W, H, initial);
        else if (roll < d[2]) this._initFumes(W, H, initial);
        else if (roll < d[3]) this._initPools(W, H, initial);
        else                  this._initMoss(W, H, initial);
    }

    // ── Sub-type initialisers ──

    _initSludge(W, H, initial) {
        this.subType = 'sludge';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -80 - Math.random() * 60;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        this.size = 25 + near * 35 + Math.random() * 20;
        this.speed = 12 + near * 12 + Math.random() * 8;
        this.alpha = 0.5 + near * 0.3;
        Object.assign(this, pickColor(SLUDGE_PALETTE, near));
        this.light = this.lightness;
        this.shape = generateShape(7 + Math.floor(Math.random() * 3), 0.6, 0.4);
        this.shadowOx = 3 + Math.random() * 3;
        this.shadowOy = 3 + Math.random() * 3;
        this.elongY = 0.55 + Math.random() * 0.25;
        this.dripCount = 1 + Math.floor(Math.random() * 3);
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.6 + Math.random() * 0.5;
        // Sub-blobs orbiting the main body
        this.subBlobs = [];
        const sbc = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < sbc; i++) {
            this.subBlobs.push({
                angle: Math.random() * Math.PI * 2,
                dist: 0.55 + Math.random() * 0.35,
                r: 0.15 + Math.random() * 0.2,
                shape: generateShape(5 + Math.floor(Math.random() * 2), 0.65, 0.35),
                orbitSpeed: (0.15 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1)
            });
        }
    }

    _initBubbles(W, H, initial) {
        this.subType = 'bubbles';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -20 - Math.random() * 30;
        this.depthLayer = 0.5 + Math.random() * 0.5;
        const near = this.depthLayer;
        this.size = 4 + near * 8 + Math.random() * 5;
        this.speed = 18 + near * 12 + Math.random() * 8;
        this.alpha = 0.4 + near * 0.3;
        Object.assign(this, pickColor(ACID_PALETTE, near));
        this.light = this.lightness;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 1.2 + Math.random() * 1.5;
        this.wobbleAmp = 5 + Math.random() * 8;
        this.life = 0;
        this.maxLife = 2 + Math.random() * 3.5;
        // Bloated shape with organic distortion
        this.blobShape = generateShape(6, 0.85, 0.15);
        this.squash = 0.85 + Math.random() * 0.3;
        this.innerGas = Math.random() < 0.5;
    }

    _initFumes(W, H, initial) {
        this.subType = 'fumes';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -40 - Math.random() * 60;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        this.size = 22 + near * 35 + Math.random() * 20;
        this.speed = 8 + near * 8 + Math.random() * 6;
        this.alpha = 0.18 + near * 0.14;
        Object.assign(this, pickColor(FUMES_PALETTE, near));
        this.light = this.lightness;
        this.drift = (Math.random() - 0.5) * 6;
        this.expandRate = 0.8 + Math.random() * 0.8;
        this.swirl = Math.random() * Math.PI * 2;
        this.swirlSpeed = 0.25 + Math.random() * 0.35;
        this.life = 0;
        this.maxLife = 4 + Math.random() * 5;
        this.elongation = 0.6 + Math.random() * 0.5;
        // Multiple cloud puffs composing the fume
        this.puffs = [];
        const pc = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < pc; i++) {
            this.puffs.push({
                ox: (Math.random() - 0.5) * 0.6,
                oy: (Math.random() - 0.5) * 0.4,
                scale: 0.4 + Math.random() * 0.4,
                phase: Math.random() * Math.PI * 2,
                breathSpeed: 0.3 + Math.random() * 0.4
            });
        }
    }

    _initPools(W, H, initial) {
        this.subType = 'pools';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -60 - Math.random() * 50;
        this.depthLayer = Math.random() * 0.6;
        const near = this.depthLayer;
        this.size = 30 + near * 45 + Math.random() * 25;
        this.speed = 10 + near * 8 + Math.random() * 5;
        this.alpha = 0.45 + near * 0.2;
        Object.assign(this, pickColor(ACID_PALETTE, near));
        this.light = this.lightness;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.8 + Math.random() * 1.2;
        this.blobShape = generateShape(8, 0.75, 0.25);
        this.elongY = 0.3 + Math.random() * 0.1;
        // Surface gas bubbles
        this.bubbleCount = 3 + Math.floor(Math.random() * 4);
        this.bubbles = [];
        for (let i = 0; i < this.bubbleCount; i++) {
            this.bubbles.push({
                ox: (Math.random() - 0.5) * this.size * 1.4,
                phase: Math.random() * Math.PI * 2,
                speed: 1.0 + Math.random() * 2,
                r: 1.2 + Math.random() * 2.5
            });
        }
        // Fog wisps rising from pool
        this.hasFog = Math.random() < 0.6;
        this.fogPhase = Math.random() * Math.PI * 2;
        this.fogSpeed = 0.4 + Math.random() * 0.3;
    }

    _initMoss(W, H, initial) {
        this.subType = 'moss';
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -70 - Math.random() * 50;
        this.depthLayer = Math.random();
        const near = this.depthLayer;
        this.size = 18 + near * 30 + Math.random() * 18;
        this.speed = 11 + near * 11 + Math.random() * 7;
        this.alpha = 0.5 + near * 0.25;
        Object.assign(this, pickColor(MOSS_PALETTE, near));
        this.light = this.lightness;
        this.shadowOx = 2 + Math.random() * 3;
        this.shadowOy = 2 + Math.random() * 3;
        // Core blob
        this.shape = generateShape(7 + Math.floor(Math.random() * 3), 0.6, 0.4);
        this.elongY = 0.65 + Math.random() * 0.3;
        // Satellite clumps (smaller blobs clinging to the main one)
        this.clumps = [];
        const cc = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < cc; i++) {
            this.clumps.push({
                angle: Math.random() * Math.PI * 2,
                dist: 0.6 + Math.random() * 0.3,
                r: 0.2 + Math.random() * 0.2,
                shape: generateShape(5, 0.6, 0.35),
                elongY: 0.6 + Math.random() * 0.4
            });
        }
        // Hanging tendrils
        this.tendrilCount = 1 + Math.floor(Math.random() * 3);
        // Spore glow
        this.hasSpores = Math.random() < 0.4;
        this.sporePhase = Math.random() * Math.PI * 2;
        this.sporeSpeed = 1.0 + Math.random() * 1.5;
    }

    // ── Update ──
    _update(dt, W, H, time) {
        this.y += this.speed * dt;

        switch (this.subType) {
            case 'sludge':
                this.wobblePhase += this.wobbleSpeed * dt;
                for (const sb of this.subBlobs) sb.angle += sb.orbitSpeed * dt;
                break;
            case 'bubbles':
                this.wobble += this.wobbleSpeed * dt;
                this.x += Math.sin(this.wobble) * this.wobbleAmp * dt;
                this.life += dt;
                if (this.life > this.maxLife) { this.reset(false); return; }
                break;
            case 'fumes':
                this.x += this.drift * dt;
                this.size += this.expandRate * dt;
                this.swirl += this.swirlSpeed * dt;
                this.life += dt;
                this.alpha *= (1 - 0.06 * dt);
                for (const p of this.puffs) p.phase += p.breathSpeed * dt;
                if (this.life > this.maxLife || this.alpha < 0.02) { this.reset(false); return; }
                break;
            case 'pools':
                this.pulsePhase += this.pulseSpeed * dt;
                this.fogPhase += this.fogSpeed * dt;
                for (const b of this.bubbles) b.phase += b.speed * dt;
                break;
            case 'moss':
                if (this.hasSpores) this.sporePhase += this.sporeSpeed * dt;
                break;
        }

        if (this._isOffBottom(this.size + 20)) this.reset(false);
    }

    // ── Render ──
    _render(ctx) {
        switch (this.subType) {
            case 'sludge': this._renderSludge(ctx); break;
            case 'bubbles': this._renderBubble(ctx); break;
            case 'fumes':   this._renderFumes(ctx);  break;
            case 'pools':   this._renderPool(ctx);   break;
            case 'moss':    this._renderMoss(ctx);    break;
        }
    }

    // ═════════════════════════════════════════════
    //  SLUDGE — viscous blob with sub-blobs, drips, organic wobble
    // ═════════════════════════════════════════════
    _renderSludge(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const R = this.size;
        const wobble = Math.sin(this.wobblePhase) * 0.06;

        // 1) Shadow blob
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        drawBlob(ctx, this.shadowOx, this.shadowOy, R * 0.95, 1.0 + wobble, this.shape, this.elongY);
        ctx.fill();

        // 2) Dark undercoat (slightly larger, darker)
        ctx.globalAlpha = this.alpha * 0.55;
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 5}%,${Math.max(3, this.light - 6)}%)`;
        drawBlob(ctx, 0, 0, R * 1.06, 1.0 - wobble * 0.5, this.shape, this.elongY);
        ctx.fill();

        // 3) Main body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light}%)`;
        drawBlob(ctx, 0, 0, R, 1.0 + wobble, this.shape, this.elongY);
        ctx.fill();

        // 4) Depth gradient (darker bottom)
        ctx.globalAlpha = this.alpha * 0.35;
        const dg = ctx.createLinearGradient(0, -R * 0.4, 0, R * 0.5);
        dg.addColorStop(0, 'rgba(0,0,0,0)');
        dg.addColorStop(1, `hsla(${this.hue},${this.sat}%,${Math.max(2, this.light - 10)}%,0.55)`);
        ctx.fillStyle = dg;
        drawBlob(ctx, 0, 0, R * 0.98, 1.0 + wobble, this.shape, this.elongY);
        ctx.fill();

        // 5) Top-left specular highlight
        ctx.globalAlpha = this.alpha * 0.25;
        ctx.fillStyle = `hsl(${this.hue},${Math.max(5, this.sat - 8)}%,${this.light + 12}%)`;
        ctx.beginPath();
        ctx.ellipse(-R * 0.18, -R * this.elongY * 0.22, R * 0.28, R * this.elongY * 0.18, -0.35, 0, Math.PI * 2);
        ctx.fill();

        // 6) Toxic sheen (inner green glow)
        ctx.globalAlpha = this.alpha * 0.14;
        const sg = ctx.createRadialGradient(0, 0, R * 0.08, 0, 0, R * 0.65);
        sg.addColorStop(0, `hsla(${this.hue + 12},${this.sat + 20}%,${this.light + 18}%,0.4)`);
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // 7) Sub-blobs (small orbiting sludge clumps)
        for (const sb of this.subBlobs) {
            const bx = Math.cos(sb.angle) * R * sb.dist;
            const by = Math.sin(sb.angle) * R * sb.dist * this.elongY;
            const br = R * sb.r;
            // Sub-blob dark
            ctx.globalAlpha = this.alpha * 0.5;
            ctx.fillStyle = `hsl(${this.hue},${this.sat + 3}%,${Math.max(3, this.light - 4)}%)`;
            drawBlob(ctx, bx, by, br * 1.05, 1.0, sb.shape, 0.8);
            ctx.fill();
            // Sub-blob body
            ctx.globalAlpha = this.alpha * 0.75;
            ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light + 2}%)`;
            drawBlob(ctx, bx, by, br, 1.0, sb.shape, 0.8);
            ctx.fill();
            // Sub-blob highlight
            ctx.globalAlpha = this.alpha * 0.18;
            ctx.fillStyle = `hsl(${this.hue},${this.sat - 5}%,${this.light + 10}%)`;
            ctx.beginPath();
            ctx.ellipse(bx - br * 0.2, by - br * 0.2, br * 0.3, br * 0.2, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // 8) Drip tendrils
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 3}%,${this.light - 2}%)`;
        for (let d = 0; d < this.dripCount; d++) {
            const dx = (d - (this.dripCount - 1) * 0.5) * R * 0.3;
            const dw = R * 0.06 + R * 0.02 * Math.sin(this.wobblePhase + d);
            const dh = R * (0.2 + 0.08 * Math.sin(this.wobblePhase * 0.7 + d * 1.5));
            ctx.globalAlpha = this.alpha * 0.45;
            ctx.beginPath();
            ctx.moveTo(dx - dw, R * this.elongY * 0.35);
            ctx.quadraticCurveTo(dx - dw * 0.3, R * this.elongY * 0.35 + dh * 0.7, dx, R * this.elongY * 0.35 + dh);
            ctx.quadraticCurveTo(dx + dw * 0.3, R * this.elongY * 0.35 + dh * 0.7, dx + dw, R * this.elongY * 0.35);
            ctx.fill();
            // Droplet at tip
            ctx.globalAlpha = this.alpha * 0.4;
            ctx.beginPath();
            ctx.arc(dx, R * this.elongY * 0.35 + dh + dw * 0.6, dw * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // ═════════════════════════════════════════════
    //  BUBBLE — bloated swamp-gas bubble, organic shape, murky interior
    // ═════════════════════════════════════════════
    _renderBubble(ctx) {
        const { x, y, size, alpha } = this;
        const lifeFrac = this.life / this.maxLife;
        // Pop phase: bloat + fade at end of life
        const popScale = lifeFrac > 0.82 ? 1 + (lifeFrac - 0.82) / 0.18 * 0.6 : 1;
        const popAlpha = lifeFrac > 0.82 ? 1 - (lifeFrac - 0.82) / 0.18 : 1;
        const R = size * popScale;

        ctx.save();
        ctx.translate(x, y);

        // 1) Murky gas haze around bubble
        ctx.globalAlpha = alpha * 0.12 * popAlpha;
        const hz = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 2.5);
        hz.addColorStop(0, `hsla(${this.hue},${this.sat - 15}%,${this.light - 8}%,0.2)`);
        hz.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hz;
        ctx.beginPath();
        ctx.arc(0, 0, R * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 2) Bubble body — blobby organic shape
        ctx.globalAlpha = alpha * 0.45 * popAlpha;
        const bg = ctx.createRadialGradient(-R * 0.15, -R * 0.15, R * 0.05, 0, 0, R);
        bg.addColorStop(0, `hsla(${this.hue},${this.sat - 10}%,${this.light + 20}%,0.25)`);
        bg.addColorStop(0.4, `hsla(${this.hue},${this.sat}%,${this.light + 5}%,0.15)`);
        bg.addColorStop(0.8, `hsla(${this.hue},${this.sat + 5}%,${this.light - 3}%,0.08)`);
        bg.addColorStop(1, `hsla(${this.hue},${this.sat}%,${this.light - 8}%,0.04)`);
        ctx.fillStyle = bg;
        drawBlob(ctx, 0, 0, R, 1.0, this.blobShape, this.squash);
        ctx.fill();

        // 3) Membrane rim (semi-thick organic stroke)
        ctx.globalAlpha = alpha * 0.5 * popAlpha;
        ctx.strokeStyle = `hsl(${this.hue},${this.sat + 5}%,${this.light + 3}%)`;
        ctx.lineWidth = 1.0 + R * 0.04;
        drawBlob(ctx, 0, 0, R, 1.0, this.blobShape, this.squash);
        ctx.stroke();

        // 4) Bottom membrane thickening (surface tension)
        ctx.globalAlpha = alpha * 0.3 * popAlpha;
        ctx.strokeStyle = `hsl(${this.hue},${this.sat + 10}%,${Math.max(5, this.light - 6)}%)`;
        ctx.lineWidth = 1.5 + R * 0.03;
        ctx.beginPath();
        ctx.ellipse(0, R * 0.1, R * 0.6, R * this.squash * 0.35, 0, 0, Math.PI);
        ctx.stroke();

        // 5) Specular highlight (crescent top-left)
        ctx.globalAlpha = alpha * 0.5 * popAlpha;
        ctx.fillStyle = `hsla(${this.hue},${Math.max(8, this.sat - 20)}%,${Math.min(88, this.light + 32)}%,0.55)`;
        ctx.beginPath();
        ctx.ellipse(-R * 0.25, -R * this.squash * 0.28, R * 0.22, R * 0.12, -0.5, 0, Math.PI * 2);
        ctx.fill();

        // 6) Inner gas swirl (murky interior)
        if (this.innerGas) {
            ctx.globalAlpha = alpha * 0.15 * popAlpha;
            const ig = ctx.createRadialGradient(R * 0.1, R * 0.05, 0, 0, 0, R * 0.6);
            ig.addColorStop(0, `hsla(${this.hue + 15},${this.sat + 10}%,${this.light - 5}%,0.3)`);
            ig.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = ig;
            ctx.beginPath();
            ctx.ellipse(R * 0.08, R * 0.05, R * 0.4, R * this.squash * 0.35, 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 7) Tiny secondary highlight dot
        ctx.globalAlpha = alpha * 0.3 * popAlpha;
        ctx.fillStyle = `hsla(${this.hue},${this.sat - 10}%,${this.light + 28}%,0.5)`;
        ctx.beginPath();
        ctx.arc(-R * 0.08, -R * this.squash * 0.42, R * 0.06, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ═════════════════════════════════════════════
    //  FUMES — thick swamp miasma with multiple puff layers
    // ═════════════════════════════════════════════
    _renderFumes(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const R = this.size;
        const eY = this.elongation;
        const lifeFrac = this.life / this.maxLife;
        const fade = lifeFrac < 0.12 ? lifeFrac / 0.12 : 1 - Math.pow((lifeFrac - 0.12) / 0.88, 0.6);

        // 1) Outermost diffuse haze
        ctx.globalAlpha = this.alpha * fade * 0.25;
        const g0 = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.6);
        g0.addColorStop(0, `hsla(${this.hue},${this.sat}%,${this.light}%,0.15)`);
        g0.addColorStop(0.4, `hsla(${this.hue},${this.sat - 3}%,${this.light - 3}%,0.06)`);
        g0.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g0;
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 1.6, R * eY * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2) Multiple puff layers (organic cloud clumps)
        for (const p of this.puffs) {
            const px = p.ox * R;
            const py = p.oy * R;
            const pr = R * p.scale * (0.9 + 0.1 * Math.sin(p.phase));
            const sx = Math.cos(this.swirl + p.phase) * R * 0.08;
            const sy = Math.sin(this.swirl + p.phase) * R * 0.05;

            ctx.globalAlpha = this.alpha * fade * 0.4;
            const gp = ctx.createRadialGradient(px + sx, py + sy, 0, px + sx, py + sy, pr);
            gp.addColorStop(0, `hsla(${this.hue},${this.sat + 4}%,${this.light + 4}%,0.35)`);
            gp.addColorStop(0.45, `hsla(${this.hue},${this.sat + 1}%,${this.light + 1}%,0.15)`);
            gp.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gp;
            ctx.beginPath();
            ctx.ellipse(px + sx, py + sy, pr, pr * eY * 0.85, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3) Core dense swirl
        const sx = Math.cos(this.swirl) * R * 0.1;
        const sy = Math.sin(this.swirl) * R * 0.06;
        ctx.globalAlpha = this.alpha * fade * 0.45;
        const g3 = ctx.createRadialGradient(-sx, -sy, 0, 0, 0, R * 0.55);
        g3.addColorStop(0, `hsla(${this.hue + 5},${this.sat + 8}%,${this.light + 5}%,0.45)`);
        g3.addColorStop(0.6, `hsla(${this.hue},${this.sat + 2}%,${this.light}%,0.12)`);
        g3.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g3;
        ctx.beginPath();
        ctx.ellipse(-sx, -sy, R * 0.55, R * eY * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4) Inner murky wisps
        ctx.globalAlpha = this.alpha * fade * 0.18;
        ctx.fillStyle = `hsla(${this.hue + 8},${this.sat + 8}%,${this.light + 10}%,0.3)`;
        ctx.beginPath();
        ctx.ellipse(R * 0.12, -R * eY * 0.08, R * 0.18, R * eY * 0.12, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-R * 0.15, R * eY * 0.06, R * 0.12, R * eY * 0.09, -0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ═════════════════════════════════════════════
    //  POOL — stagnant swamp puddle, blobby edge, surface bubbles, rising fog
    // ═════════════════════════════════════════════
    _renderPool(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const R = this.size;
        const pulse = 0.6 + 0.4 * Math.sin(this.pulsePhase);

        // 1) Outer toxic glow/stain
        ctx.globalAlpha = this.alpha * 0.18 * pulse;
        const ag = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, R * 1.8);
        ag.addColorStop(0, `hsla(${this.hue},${this.sat + 10}%,${this.light + 6}%,0.25)`);
        ag.addColorStop(0.5, `hsla(${this.hue},${this.sat}%,${this.light - 4}%,0.06)`);
        ag.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 1.8, R * this.elongY * 1.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2) Shadow
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        drawBlob(ctx, 2, 2, R * 1.15, 1.0, this.blobShape, this.elongY);
        ctx.fill();

        // 3) Main pool body (blobby shape instead of perfect ellipse)
        ctx.globalAlpha = this.alpha * 0.7;
        const pg = ctx.createRadialGradient(0, -R * 0.03, R * 0.15, 0, 0, R * 1.2);
        pg.addColorStop(0, `hsla(${this.hue},${this.sat + 10}%,${this.light + 6}%,0.75)`);
        pg.addColorStop(0.5, `hsla(${this.hue},${this.sat}%,${this.light}%,0.55)`);
        pg.addColorStop(1, `hsla(${this.hue},${this.sat - 5}%,${Math.max(4, this.light - 8)}%,0.35)`);
        ctx.fillStyle = pg;
        drawBlob(ctx, 0, 0, R * 1.15, 1.0, this.blobShape, this.elongY);
        ctx.fill();

        // 4) Murky depth overlay
        ctx.globalAlpha = this.alpha * 0.2;
        const mg = ctx.createLinearGradient(0, -R * this.elongY * 0.3, 0, R * this.elongY * 0.4);
        mg.addColorStop(0, 'rgba(0,0,0,0)');
        mg.addColorStop(1, `hsla(${this.hue - 10},${this.sat + 5}%,${Math.max(3, this.light - 12)}%,0.5)`);
        ctx.fillStyle = mg;
        drawBlob(ctx, 0, 0, R * 1.1, 1.0, this.blobShape, this.elongY);
        ctx.fill();

        // 5) Caustic highlight (shifting bright spot)
        ctx.globalAlpha = this.alpha * 0.22 * pulse;
        ctx.fillStyle = `hsla(${this.hue},${this.sat + 18}%,${this.light + 18}%,0.45)`;
        ctx.beginPath();
        const cx = R * 0.15 * Math.sin(this.pulsePhase * 0.3);
        ctx.ellipse(cx, -R * this.elongY * 0.05, R * 0.3, R * this.elongY * 0.25, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // 6) Surface gas bubbles
        for (const b of this.bubbles) {
            const bScale = 0.5 + 0.5 * Math.sin(b.phase);
            const by = -R * this.elongY * 0.03 + Math.sin(b.phase * 0.6) * R * this.elongY * 0.08;
            // Bubble body
            ctx.globalAlpha = this.alpha * 0.35 * bScale;
            ctx.fillStyle = `hsla(${this.hue},${this.sat + 8}%,${this.light + 10}%,0.45)`;
            ctx.beginPath();
            ctx.arc(b.ox, by, b.r * bScale, 0, Math.PI * 2);
            ctx.fill();
            // Bubble highlight
            ctx.globalAlpha = this.alpha * 0.2 * bScale;
            ctx.fillStyle = `hsla(${this.hue},${this.sat - 5}%,${this.light + 25}%,0.4)`;
            ctx.beginPath();
            ctx.arc(b.ox - b.r * 0.25, by - b.r * 0.25, b.r * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }

        // 7) Rising fog wisps from pool surface
        if (this.hasFog) {
            const fx = Math.sin(this.fogPhase) * R * 0.2;
            const fy = -R * this.elongY * 0.3;
            const fr = R * 0.3;
            ctx.globalAlpha = this.alpha * 0.15 * (0.5 + 0.5 * Math.sin(this.fogPhase * 1.3));
            const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
            fg.addColorStop(0, `hsla(${this.hue},${this.sat - 5}%,${this.light + 8}%,0.25)`);
            fg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.ellipse(fx, fy, fr, fr * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            // Second wisp
            const fx2 = -Math.sin(this.fogPhase * 0.7 + 1) * R * 0.25;
            const fy2 = -R * this.elongY * 0.4;
            ctx.globalAlpha = this.alpha * 0.1;
            ctx.beginPath();
            ctx.ellipse(fx2, fy2, fr * 0.6, fr * 0.4, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // ═════════════════════════════════════════════
    //  MOSS — floating algae/moss clumps with satellite blobs, tendrils, spore glow
    // ═════════════════════════════════════════════
    _renderMoss(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const R = this.size;

        // 1) Shadow
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        drawBlob(ctx, this.shadowOx, this.shadowOy, R * 0.92, 1.0, this.shape, this.elongY);
        ctx.fill();

        // 2) Dark undercoat
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 4}%,${Math.max(3, this.light - 5)}%)`;
        drawBlob(ctx, 0, 0, R * 1.05, 1.0, this.shape, this.elongY);
        ctx.fill();

        // 3) Main body
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light}%)`;
        drawBlob(ctx, 0, 0, R, 1.0, this.shape, this.elongY);
        ctx.fill();

        // 4) Depth gradient (bottom darker)
        ctx.globalAlpha = this.alpha * 0.3;
        const dg = ctx.createLinearGradient(0, -R * 0.35, 0, R * 0.45);
        dg.addColorStop(0, 'rgba(0,0,0,0)');
        dg.addColorStop(1, `hsla(${this.hue},${this.sat}%,${Math.max(2, this.light - 8)}%,0.5)`);
        ctx.fillStyle = dg;
        drawBlob(ctx, 0, 0, R * 0.97, 1.0, this.shape, this.elongY);
        ctx.fill();

        // 5) Highlight
        ctx.globalAlpha = this.alpha * 0.22;
        ctx.fillStyle = `hsl(${this.hue},${Math.max(5, this.sat - 6)}%,${this.light + 11}%)`;
        ctx.beginPath();
        ctx.ellipse(-R * 0.14, -R * this.elongY * 0.18, R * 0.25, R * this.elongY * 0.16, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // 6) Satellite clumps (smaller blobs clinging around)
        for (const c of this.clumps) {
            const cx = Math.cos(c.angle) * R * c.dist;
            const cy = Math.sin(c.angle) * R * c.dist * this.elongY;
            const cr = R * c.r;
            // Clump dark
            ctx.globalAlpha = this.alpha * 0.45;
            ctx.fillStyle = `hsl(${this.hue + 5},${this.sat + 3}%,${Math.max(3, this.light - 3)}%)`;
            drawBlob(ctx, cx, cy, cr * 1.04, 1.0, c.shape, c.elongY);
            ctx.fill();
            // Clump body
            ctx.globalAlpha = this.alpha * 0.7;
            ctx.fillStyle = `hsl(${this.hue + 5},${this.sat + 2}%,${this.light + 2}%)`;
            drawBlob(ctx, cx, cy, cr, 1.0, c.shape, c.elongY);
            ctx.fill();
            // Clump highlight
            ctx.globalAlpha = this.alpha * 0.15;
            ctx.fillStyle = `hsl(${this.hue},${this.sat - 3}%,${this.light + 9}%)`;
            ctx.beginPath();
            ctx.ellipse(cx - cr * 0.2, cy - cr * 0.2, cr * 0.25, cr * 0.15, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // 7) Hanging tendrils (slimy organic strings)
        ctx.fillStyle = `hsl(${this.hue},${this.sat + 4}%,${this.light - 2}%)`;
        for (let t = 0; t < this.tendrilCount; t++) {
            const tx = (t - (this.tendrilCount - 1) * 0.5) * R * 0.35;
            const tw = R * 0.04;
            const th = R * (0.3 + t * 0.1);
            ctx.globalAlpha = this.alpha * 0.4;
            ctx.beginPath();
            ctx.moveTo(tx - tw, R * this.elongY * 0.35);
            ctx.quadraticCurveTo(tx - tw * 1.5, R * this.elongY * 0.35 + th * 0.5, tx, R * this.elongY * 0.35 + th);
            ctx.quadraticCurveTo(tx + tw * 1.5, R * this.elongY * 0.35 + th * 0.5, tx + tw, R * this.elongY * 0.35);
            ctx.fill();
        }

        // 8) Spore glow (pulsing faint bioluminescence)
        if (this.hasSpores) {
            const sp = 0.4 + 0.6 * Math.sin(this.sporePhase);
            ctx.globalAlpha = this.alpha * 0.2 * sp;
            const spg = ctx.createRadialGradient(0, 0, R * 0.05, 0, 0, R * 0.5);
            spg.addColorStop(0, `hsla(${this.hue + 20},${this.sat + 25}%,${this.light + 22}%,0.5)`);
            spg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = spg;
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

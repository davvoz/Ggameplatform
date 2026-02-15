/**
 * AudioVisualizer — Space-themed audio-reactive background for UI screens.
 * 
 * Layers:
 *  1. Deep space gradient base (shifts hue with audio)
 *  2. Star field (twinkle responds to treble)
 *  3. Nebula clouds (drift & breathe with bass/mid)
 *  4. Perspective warp grid (pulses on bass beats)
 *  5. Scan line sweep (subtle sci-fi overlay)
 */
export default class AudioVisualizer {
    constructor(soundManager) {
        this.sound = soundManager;
        this.canvas = null;
        this.ctx = null;
        this.running = false;
        this.rafId = null;
        this.time = 0;
        this.stars = [];
        this.nebulae = [];
        this.warpLines = [];
        this.prevBass = 0;
        this.beatPulse = 0;   // 0→1 on beat, decays
        this._boundLoop = this._loop.bind(this);

        this._createCanvas();
    }

    _createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'audio-viz-canvas';
        this.canvas.style.cssText = `
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 0;
        `;
        this.ctx = this.canvas.getContext('2d');
    }

    start(screenElement) {
        if (this.running) this.stop();

        if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
        screenElement.insertBefore(this.canvas, screenElement.firstChild);

        this._resize();
        this._resizeHandler = () => this._resize();
        window.addEventListener('resize', this._resizeHandler);

        this._initStars();
        this._initNebulae();
        this._initWarpLines();

        this.running = true;
        this.time = 0;
        this.beatPulse = 0;
        this.prevBass = 0;
        this._loop();
    }

    stop() {
        this.running = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }

    _resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.w = w;
        this.h = h;
    }

    /* ── Initialization ── */

    _initStars() {
        this.stars = [];
        const count = Math.min(90, Math.floor((this.w * this.h) / 4000));
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.w,
                y: Math.random() * this.h,
                size: 0.4 + Math.random() * 1.6,
                baseAlpha: 0.25 + Math.random() * 0.55,
                twinkleSpeed: 1.5 + Math.random() * 3,
                phase: Math.random() * Math.PI * 2,
                // Brighter stars are slightly blue-white
                hue: 200 + Math.random() * 40,
                sat: 10 + Math.random() * 40
            });
        }
    }

    _initNebulae() {
        this.nebulae = [];
        // 3 nebula clouds at fixed positions with slow drift
        const presets = [
            { rx: 0.25, ry: 0.35, hue: 220, radius: 0.30 },  // blue
            { rx: 0.70, ry: 0.55, hue: 270, radius: 0.28 },  // purple
            { rx: 0.50, ry: 0.75, hue: 200, radius: 0.22 },  // cyan-blue
        ];
        for (const p of presets) {
            this.nebulae.push({
                baseX: p.rx, baseY: p.ry,
                hue: p.hue,
                radius: p.radius,
                driftPhaseX: Math.random() * Math.PI * 2,
                driftPhaseY: Math.random() * Math.PI * 2,
                breathPhase: Math.random() * Math.PI * 2
            });
        }
    }

    _initWarpLines() {
        this.warpLines = [];
        // Pre-create 24 radial warp lines from center
        for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
            this.warpLines.push({
                angle,
                length: 0.15 + Math.random() * 0.25,  // fraction of screen diagonal
                width: 0.5 + Math.random() * 1.0,
                alpha: 0.06 + Math.random() * 0.08
            });
        }
    }

    /* ── Main Loop ── */

    _loop() {
        if (!this.running) return;
        this.rafId = requestAnimationFrame(this._boundLoop);

        const dt = 1 / 60;
        this.time += dt;

        const levels = this.sound.getAudioLevels();
        const { bass, mid, treble } = levels;

        // Beat detection — simple onset
        if (bass > 0.5 && bass - this.prevBass > 0.1) {
            this.beatPulse = Math.min(1, this.beatPulse + 0.6);
        }
        this.prevBass = bass;
        this.beatPulse = Math.max(0, this.beatPulse - dt * 2.5);

        this._draw(bass, mid, treble, dt);
    }

    /* ── Render ── */

    _draw(bass, mid, treble, dt) {
        const ctx = this.ctx;
        const w = this.w;
        const h = this.h;
        if (!w || !h) return;

        // 1. Deep space base
        this._drawSpaceBase(ctx, w, h, bass, mid, treble);

        // 2. Nebula clouds
        this._drawNebulae(ctx, w, h, bass, mid);

        // 3. Perspective grid
        this._drawGrid(ctx, w, h, bass);

        // 4. Warp lines (on beats)
        this._drawWarpLines(ctx, w, h);

        // 5. Stars
        this._drawStars(ctx, w, h, treble);

        // 6. Scan line
        this._drawScanLine(ctx, w, h);

        // 7. Vignette
        this._drawVignette(ctx, w, h);
    }

    /* ─── Layer 1: Space Base ─── */
    _drawSpaceBase(ctx, w, h, bass, mid, treble) {
        // Very dark blue-black that subtly shifts
        const r = Math.floor(4 + treble * 8);
        const g = Math.floor(4 + mid * 6);
        const b = Math.floor(14 + bass * 16);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, w, h);
    }

    /* ─── Layer 2: Nebula Clouds ─── */
    _drawNebulae(ctx, w, h, bass, mid) {
        const t = this.time;
        ctx.save();
        for (const n of this.nebulae) {
            // Slow drift
            const dx = Math.sin(t * 0.15 + n.driftPhaseX) * w * 0.04;
            const dy = Math.cos(t * 0.12 + n.driftPhaseY) * h * 0.03;
            const cx = n.baseX * w + dx;
            const cy = n.baseY * h + dy;

            // Breathing radius
            const breathe = 1 + 0.08 * Math.sin(t * 0.6 + n.breathPhase) + bass * 0.12;
            const radius = n.radius * Math.min(w, h) * breathe;

            const alpha = 0.04 + mid * 0.04 + bass * 0.03;

            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            grd.addColorStop(0, `hsla(${n.hue}, 60%, 35%, ${alpha})`);
            grd.addColorStop(0.4, `hsla(${n.hue + 15}, 50%, 25%, ${alpha * 0.5})`);
            grd.addColorStop(1, 'hsla(0, 0%, 0%, 0)');

            ctx.fillStyle = grd;
            ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
        }
        ctx.restore();
    }

    /* ─── Layer 3: Perspective Grid ─── */
    _drawGrid(ctx, w, h, bass) {
        const cx = w / 2;
        const horizon = h * 0.48;
        const gridAlpha = 0.025 + bass * 0.035 + this.beatPulse * 0.04;

        ctx.save();
        ctx.strokeStyle = `rgba(68, 136, 255, ${gridAlpha})`;
        ctx.lineWidth = 0.5;

        // Horizontal lines with perspective spacing
        const lineCount = 12;
        for (let i = 1; i <= lineCount; i++) {
            const t = i / lineCount;
            const perspective = t * t; // quadratic for perspective
            const y = horizon + perspective * (h - horizon) * 0.95;
            const spread = 0.3 + perspective * 0.7;
            const x1 = cx - w * spread * 0.55;
            const x2 = cx + w * spread * 0.55;

            ctx.globalAlpha = gridAlpha * (0.3 + perspective * 0.7);
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
        }

        // Vertical converging lines
        const vLines = 9;
        for (let i = 0; i < vLines; i++) {
            const frac = (i / (vLines - 1)) - 0.5; // -0.5 to 0.5
            const bottomX = cx + frac * w * 0.9;
            const topX = cx + frac * w * 0.08;

            ctx.globalAlpha = gridAlpha * (0.4 + (1 - Math.abs(frac) * 2) * 0.6);
            ctx.beginPath();
            ctx.moveTo(topX, horizon);
            ctx.lineTo(bottomX, h);
            ctx.stroke();
        }

        ctx.restore();
    }

    /* ─── Layer 4: Warp Speed Lines ─── */
    _drawWarpLines(ctx, w, h) {
        if (this.beatPulse < 0.01) return;

        const cx = w / 2;
        const cy = h * 0.45;
        const diag = Math.sqrt(w * w + h * h);

        ctx.save();
        ctx.lineCap = 'round';

        for (const wl of this.warpLines) {
            const cos = Math.cos(wl.angle);
            const sin = Math.sin(wl.angle);
            const startDist = diag * 0.06;
            const endDist = startDist + diag * wl.length * (0.5 + this.beatPulse * 0.5);

            const x1 = cx + cos * startDist;
            const y1 = cy + sin * startDist;
            const x2 = cx + cos * endDist;
            const y2 = cy + sin * endDist;

            ctx.globalAlpha = wl.alpha * this.beatPulse;
            ctx.strokeStyle = `rgba(120, 170, 255, 1)`;
            ctx.lineWidth = wl.width * (0.5 + this.beatPulse * 0.5);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /* ─── Layer 5: Star Field ─── */
    _drawStars(ctx, w, h, treble) {
        const t = this.time;

        ctx.save();
        for (const s of this.stars) {
            // Twinkle driven by treble + individual phase
            const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.phase);
            const audioBoost = 1 + treble * 0.8;
            const alpha = s.baseAlpha * twinkle * audioBoost;

            if (alpha < 0.05) continue;

            const size = s.size * (1 + treble * 0.3 + this.beatPulse * 0.4);

            ctx.globalAlpha = alpha;

            // Core dot
            ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, 90%, 1)`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Tiny cross-shaped glow for brighter stars
            if (s.size > 1.2 && alpha > 0.3) {
                ctx.globalAlpha = alpha * 0.25;
                ctx.strokeStyle = `hsla(${s.hue}, 30%, 80%, 1)`;
                ctx.lineWidth = 0.4;
                const arm = size * 3;
                ctx.beginPath();
                ctx.moveTo(s.x - arm, s.y);
                ctx.lineTo(s.x + arm, s.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(s.x, s.y - arm);
                ctx.lineTo(s.x, s.y + arm);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    /* ─── Layer 6: Scan Line ─── */
    _drawScanLine(ctx, w, h) {
        // Thin horizontal line sweeps down slowly
        const period = 6; // seconds per full sweep
        const scanY = ((this.time % period) / period) * (h + 20) - 10;

        ctx.save();
        const grd = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
        grd.addColorStop(0, 'rgba(68, 136, 255, 0)');
        grd.addColorStop(0.5, 'rgba(68, 136, 255, 0.04)');
        grd.addColorStop(1, 'rgba(68, 136, 255, 0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, scanY - 8, w, 16);
        ctx.restore();
    }

    /* ─── Layer 7: Vignette ─── */
    _drawVignette(ctx, w, h) {
        const cx = w / 2;
        const cy = h / 2;
        const grd = ctx.createRadialGradient(cx, cy, w * 0.22, cx, cy, w * 0.75);
        grd.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grd.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
    }
}

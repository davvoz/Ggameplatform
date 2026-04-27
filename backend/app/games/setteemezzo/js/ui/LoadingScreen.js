/**
 * LoadingScreen — animated canvas loading overlay.
 *
 * Lifecycle:
 *   start()           → begins the internal rAF loop
 *   setProgress(p, s) → updates the progress bar and status label
 *   setCroupier(c)    → injects the Croupier once loaded; plays 'happy' anim
 *   stop()            → waits for ≥ MIN_LOOPS of the happy animation,
 *                       then fades out; returns Promise<void>
 *   destroy()         → cancels any pending rAF (call after stop resolves)
 *
 * Single responsibility: visual loading feedback only.
 * No game-logic coupling beyond the Croupier draw/update contract.
 */

// Happy animation: 15 frames × 120 ms = 1800 ms per loop
const HAPPY_LOOP_MS  = 15 * 120;
const MIN_LOOPS      = 2;
const MIN_CROUPIER_MS = HAPPY_LOOP_MS * MIN_LOOPS; // 3600 ms
const FADE_DURATION  = 1400; // ms

export class LoadingScreen {
    // Canvas
    #ctx;
    #w;
    #h;

    // Loop control
    #rafId       = null;
    #running     = false;
    #lastTime    = null;

    // Progress state
    #progress = 0;
    #status   = 'Loading\u2026';

    // Croupier
    #croupier        = null;
    #croupierReadyAt = null; // performance.now() when croupier was injected

    // Stop handshake
    #stopRequested = false;
    #stopResolve   = null;

    /** @param {HTMLCanvasElement} canvas */
    constructor(canvas) {
        this.#ctx = canvas.getContext('2d');
        this.#w   = canvas.width;
        this.#h   = canvas.height;
    }

    /** Begin the animation loop. Draw a first static frame immediately. */
    start() {
        this.#running  = true;
        this.#lastTime = performance.now();
        this.#drawUI(this.#progress, this.#status, 1);
        this.#rafId = requestAnimationFrame((t) => this.#loop(t));
    }

    /**
     * @param {number} progress - 0..1
     * @param {string} status
     */
    setProgress(progress, status) {
        this.#progress = progress;
        this.#status   = status;
    }

    /**
     * Inject the Croupier once its assets are loaded.
     * Immediately switches it to the 'happy' animation.
     * @param {import('../entities/Croupier.js').Croupier} croupier
     */
    setCroupier(croupier) {
        if (this.#croupier) return; // idempotent
        this.#croupier        = croupier;
        this.#croupierReadyAt = performance.now();
        croupier.play('happy');
    }

    /**
     * Request stop. Waits until ≥ MIN_LOOPS of the happy animation have
     * elapsed since setCroupier() was called, then fades out.
     * @returns {Promise<void>}
     */
    stop() {
        this.#stopRequested = true;
        return new Promise((resolve) => {
            this.#stopResolve = resolve;
        });
    }

    /** Cancel any pending rAF. Call after the stop() Promise resolves. */
    destroy() {
        if (this.#rafId !== null) {
            cancelAnimationFrame(this.#rafId);
            this.#rafId = null;
        }
        this.#running = false;
    }

    // ── Private ───────────────────────────────────────────────

    #loop(now) {
        if (!this.#running) return;

        const dt = now - this.#lastTime;
        this.#lastTime = now;

        if (this.#croupier) {
            this.#croupier.update(dt);
        }

        this.#drawUI(this.#progress, this.#status, 1);

        if (this.#stopRequested && this.#minLoopsMet(now)) {
            this.#startFadeOut();
            return;
        }

        this.#rafId = requestAnimationFrame((t) => this.#loop(t));
    }

    #minLoopsMet(now) {
        if (!this.#croupierReadyAt) return false;
        return (now - this.#croupierReadyAt) >= MIN_CROUPIER_MS;
    }

    #startFadeOut() {
        const fadeStart = performance.now();

        const step = (now) => {
            const t  = Math.min((now - fadeStart) / FADE_DURATION, 1);
            const dt = now - this.#lastTime;
            this.#lastTime = now;

            if (this.#croupier) this.#croupier.update(dt);
            this.#drawUI(this.#progress, this.#status, 1 - t);

            if (t < 1) {
                this.#rafId = requestAnimationFrame(step);
            } else {
                this.#running = false;
                this.#ctx.clearRect(0, 0, this.#w, this.#h);
                this.#stopResolve?.();
            }
        };

        this.#rafId = requestAnimationFrame(step);
    }

    /**
     * Composite one full loading frame onto the canvas.
     * @param {number} progress - 0..1
     * @param {string} status
     * @param {number} alpha    - overall opacity (1 = opaque, 0 = invisible)
     */
    #drawUI(progress, status, alpha) {
        const ctx = this.#ctx;
        const w   = this.#w;
        const h   = this.#h;

        ctx.save();
        ctx.globalAlpha = alpha;

        // ── 1. Solid dark background ───────────────────────────
        ctx.fillStyle = '#0a0414';
        ctx.fillRect(0, 0, w, h);

        // ── 2. Croupier (happy) as full-bleed background ───────
        if (this.#croupier?.loaded) {
            this.#croupier.draw(ctx);
        }

        // ── 3. Dark gradient overlay so UI stays readable ──────
        const overlay = ctx.createLinearGradient(0, 0, 0, h);
        overlay.addColorStop(0,   'rgba(6,2,18,0.30)');
        overlay.addColorStop(0.45,'rgba(6,2,18,0.10)');
        overlay.addColorStop(0.72,'rgba(6,2,18,0.65)');
        overlay.addColorStop(1,   'rgba(6,2,18,0.88)');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, w, h);

        // ── 4. Logo ────────────────────────────────────────────
        const logoY  = h * 0.36;
        const fsize  = Math.round(w * 0.115);
        const lineH  = Math.round(w * 0.078);

        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = `bold ${fsize}px 'Press Start 2P', monospace`;

        // Drop shadow
        ctx.shadowColor  = 'rgba(200,100,0,0.8)';
        ctx.shadowBlur   = 22;

        // Outline
        ctx.strokeStyle = '#5a2400';
        ctx.lineWidth   = 7;
        ctx.strokeText('SETTE',   w / 2, logoY - lineH);
        ctx.strokeText('e MEZZO', w / 2, logoY + lineH);

        // Gold fill
        const tg = ctx.createLinearGradient(0, logoY - lineH - fsize / 2, 0, logoY + lineH + fsize / 2);
        tg.addColorStop(0,    '#fff4a0');
        tg.addColorStop(0.45, '#f0a500');
        tg.addColorStop(1,    '#a85000');
        ctx.fillStyle = tg;
        ctx.fillText('SETTE',   w / 2, logoY - lineH);
        ctx.fillText('e MEZZO', w / 2, logoY + lineH);

        ctx.shadowBlur = 0;

        // ── 5. Progress bar ────────────────────────────────────
        const barW  = w * 0.72;
        const barH  = 14;
        const barX  = (w - barW) / 2;
        const barY  = h * 0.74;
        const r     = barH / 2;

        // Track
        ctx.fillStyle   = 'rgba(255,255,255,0.08)';
        this.#rrect(ctx, barX, barY, barW, barH, r);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.lineWidth   = 1.5;
        this.#rrect(ctx, barX, barY, barW, barH, r);
        ctx.stroke();

        // Fill
        if (progress > 0) {
            const fillW = Math.max(barH, barW * Math.min(progress, 1));
            const bg    = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
            bg.addColorStop(0, '#f0a500');
            bg.addColorStop(1, '#ffe97a');
            ctx.fillStyle   = bg;
            ctx.shadowColor = 'rgba(240,165,0,0.85)';
            ctx.shadowBlur  = 12;
            this.#rrect(ctx, barX, barY, fillW, barH, r);
            ctx.fill();
            ctx.shadowBlur  = 0;
        }

        // ── 6. Percentage label ────────────────────────────────
        ctx.font      = `${Math.round(w * 0.042)}px 'Press Start 2P', monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText(`${Math.round(progress * 100)}%`, w / 2, barY + barH + 22);

        // ── 7. Status text ─────────────────────────────────────
        ctx.font      = `${Math.round(w * 0.034)}px 'Press Start 2P', monospace`;
        ctx.fillStyle = 'rgba(255,220,120,0.80)';
        ctx.fillText(status, w / 2, barY + barH + 50);

        ctx.restore();
    }

    /** Polyfill-safe rounded-rect path. */
    #rrect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y,     x + w, y + r,     r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x,     y + h, x,       y + h - r, r);
        ctx.lineTo(x,    y + r);
        ctx.arcTo(x,     y,     x + r,   y,         r);
        ctx.closePath();
    }
}

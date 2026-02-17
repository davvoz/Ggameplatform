/**
 * PostProcessing - Visual effects layer (vignette, screen shake, flash, CRT)
 */
class PostProcessing {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;

        // Flash overlay
        this.flashColor = { r: 255, g: 255, b: 255 };
        this.flashAlpha = 0;
        this.flashDecay = 3;

        // Performance mode
        this.quality = 'high'; // high, medium, low

        // Cached vignette gradient (re-created on resize)
        this._vignetteGrad = null;
        this._vignetteW = 0;
        this._vignetteH = 0;
    }

    setQuality(quality) {
        this.quality = quality;
    }

    shake(intensity = 8, duration = 0.2) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    flash(color = { r: 255, g: 255, b: 255 }, alpha = 0.3) {
        this.flashColor = color;
        this.flashAlpha = alpha;
    }

    update(dt) {
        // Screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer <= 0) {
                this.shakeIntensity = 0;
                this.canvas.style.transform = '';
            } else {
                const t = this.shakeTimer / this.shakeDuration;
                const intensity = this.shakeIntensity * t;
                const x = (Math.random() - 0.5) * 2 * intensity;
                const y = (Math.random() - 0.5) * 2 * intensity;
                this.canvas.style.transform = `translate(${x}px, ${y}px)`;
            }
        }

        // Flash decay
        if (this.flashAlpha > 0) {
            this.flashAlpha -= this.flashDecay * dt;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }
    }

    render(ctx) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Flash overlay
        if (this.flashAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillStyle = `rgb(${this.flashColor.r},${this.flashColor.g},${this.flashColor.b})`;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        if (this.quality === 'low') return;

        // Vignette (cached gradient — only recreated on resize)
        if (!this._vignetteGrad || this._vignetteW !== w || this._vignetteH !== h) {
            this._vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
            this._vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
            this._vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
            this._vignetteW = w;
            this._vignetteH = h;
        }
        ctx.fillStyle = this._vignetteGrad;
        ctx.fillRect(0, 0, w, h);

        if (this.quality === 'medium') return;

        // Scanlines (subtle)
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.fillStyle = '#000';
        for (let y = 0; y < h; y += 4) {
            ctx.fillRect(0, y, w, 1);
        }
        ctx.restore();
    }
}

export default PostProcessing;

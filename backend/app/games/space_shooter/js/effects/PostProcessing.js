/**
 * PostProcessing - Effetti post-processing per il canvas
 */
class PostProcessing {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Offscreen canvas per effetti
        this.bufferCanvas = document.createElement('canvas');
        this.bufferCtx = this.bufferCanvas.getContext('2d');
        
        // Settings
        this.bloomEnabled = true;
        this.bloomIntensity = 0.3;
        this.vignetteEnabled = true;
        this.vignetteIntensity = 0.4;
        this.scanLinesEnabled = true;
        this.scanLinesOpacity = 0.05;
        this.chromaticAberrationEnabled = false;
        this.chromaticAberrationAmount = 2;
        this.crtEnabled = true;
        
        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        
        // Flash effect
        this.flashColor = null;
        this.flashDuration = 0;
        this.flashTimer = 0;
        
        this.resize();
    }
    resize() {
        this.bufferCanvas.width = this.canvas.width;
        this.bufferCanvas.height = this.canvas.height;
        this.createVignetteGradient();
    }

    createVignetteGradient() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.sqrt(cx * cx + cy * cy);
        
        this.vignetteGradient = this.ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
        this.vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        this.vignetteGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
        this.vignetteGradient.addColorStop(1, `rgba(0, 0, 0, ${this.vignetteIntensity})`);
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    flash(color, duration) {
        this.flashColor = color;
        this.flashDuration = duration;
        this.flashTimer = duration;
    }

    update(deltaTime) {
        // Update shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= deltaTime;
        }
        
        // Update flash
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
        }
    }

    applyEffects(ctx, time) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Apply screen shake via CSS transform (no rendering artifacts)
        if (this.shakeTimer > 0) {
            const progress = this.shakeTimer / this.shakeDuration;
            const intensity = this.shakeIntensity * progress;
            const offsetX = (Math.random() - 0.5) * intensity * 2;
            const offsetY = (Math.random() - 0.5) * intensity * 2;
            this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        } else {
            this.canvas.style.transform = '';
        }
        
        // Scanlines
        if (this.scanLinesEnabled) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.scanLinesOpacity})`;
            for (let y = 0; y < h; y += 3) {
                ctx.fillRect(0, y, w, 1);
            }
        }
        
        // Vignette
        if (this.vignetteEnabled) {
            ctx.fillStyle = this.vignetteGradient;
            ctx.fillRect(0, 0, w, h);
        }
        
        // Screen flash
        if (this.flashTimer > 0 && this.flashColor) {
            const alpha = (this.flashTimer / this.flashDuration) * 0.5;
            ctx.fillStyle = `rgba(${this.flashColor.r}, ${this.flashColor.g}, ${this.flashColor.b}, ${alpha})`;
            ctx.fillRect(0, 0, w, h);
        }
        
        // CRT curvature effect (subtle)
        if (this.crtEnabled) {
            this.applyCRTEffect(ctx, w, h);
        }
    }

    applyCRTEffect(ctx, w, h) {
        // Subtle corner darkening
        const cornerGradient = ctx.createRadialGradient(
            w / 2, h / 2, Math.min(w, h) * 0.4,
            w / 2, h / 2, Math.max(w, h) * 0.8
        );
        cornerGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        cornerGradient.addColorStop(1, 'rgba(0, 0, 20, 0.15)');
        ctx.fillStyle = cornerGradient;
        ctx.fillRect(0, 0, w, h);
    }

    // Glow/bloom effect for a specific region
    applyGlow(ctx, x, y, radius, color, intensity = 1) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.5 * intensity})`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.2 * intensity})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

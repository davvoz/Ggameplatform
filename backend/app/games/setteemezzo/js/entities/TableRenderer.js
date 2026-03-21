/**
 * Renders table overlay on top of the croupier background.
 * Minimal, transparent overlay — the croupier IS the background.
 * Just a soft felt vignette in the lower portion for card readability.
 */
export class TableRenderer {
    #width;
    #height;
    #cachedBg = null;

    constructor(width, height) {
        this.#width = width;
        this.#height = height;
    }

    invalidate() {
        this.#cachedBg = null;
    }

    draw(ctx) {
        if (!this.#cachedBg) {
            this.#cachedBg = this.#buildBackground();
        }
        ctx.drawImage(this.#cachedBg, 0, 0);
    }

    #buildBackground() {
        const offscreen = document.createElement('canvas');
        offscreen.width = this.#width;
        offscreen.height = this.#height;
        const ctx = offscreen.getContext('2d');

        const w = this.#width;
        const h = this.#height;

        // Soft gradient fade from transparent to dark felt — starts at 45%, solid by 58%
        const fadeGrad = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.58);
        fadeGrad.addColorStop(0, 'rgba(10,40,18,0)');
        fadeGrad.addColorStop(0.5, 'rgba(14,55,28,0.6)');
        fadeGrad.addColorStop(1, 'rgba(14,55,28,0.88)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, h * 0.42, w, h * 0.16);

        // Lower felt body
        const feltGrad = ctx.createLinearGradient(0, h * 0.56, 0, h);
        feltGrad.addColorStop(0, 'rgba(14,55,28,0.88)');
        feltGrad.addColorStop(0.4, 'rgba(12,48,24,0.92)');
        feltGrad.addColorStop(1, 'rgba(8,34,16,0.95)');
        ctx.fillStyle = feltGrad;
        ctx.fillRect(0, h * 0.56, w, h * 0.44);

        // Subtle felt texture
        ctx.fillStyle = 'rgba(0,0,0,0.025)';
        for (let i = 0; i < 150; i++) {
            const fx = Math.random() * w;
            const fy = h * 0.55 + Math.random() * h * 0.45;
            ctx.fillRect(fx, fy, 1, 1);
        }

        // Soft golden spotlight on play area
        const spotGrad = ctx.createRadialGradient(w / 2, h * 0.72, 10, w / 2, h * 0.72, w * 0.45);
        spotGrad.addColorStop(0, 'rgba(212,175,55,0.04)');
        spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, h * 0.55, w, h * 0.45);

        // Bottom edge vignette
        const vignette = ctx.createLinearGradient(0, h * 0.88, 0, h);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, h * 0.88, w, h * 0.12);

        return offscreen;
    }
}

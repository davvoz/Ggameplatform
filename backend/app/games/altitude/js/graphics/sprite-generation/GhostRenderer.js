import { BaseEnemyRenderer } from './BaseEnemyRenderer.js';

const BODY_RADIUS = 14;
const RAGGED_POINTS = [14, 7, 0, -7, -14];
const WAIL_THRESHOLD = 0.3;

export class GhostRenderer extends BaseEnemyRenderer {
    draw(ctx, phase) {
        const bob = Math.sin(phase) * 5;
        const alpha = 0.55 + Math.sin(phase * 2) * 0.2;
        const wail = Math.abs(Math.sin(phase));

        ctx.globalAlpha = alpha;
        this.#drawGlow(ctx, bob);
        this.#drawBody(ctx, bob);
        this.#drawFace(ctx, bob, alpha, wail);
        ctx.globalAlpha = 1;
    }

    #drawGlow(ctx, bob) {
        const glow = ctx.createRadialGradient(0, bob - 4, 2, 0, bob - 4, 22);
        glow.addColorStop(0, 'rgba(100,160,255,0.35)');
        glow.addColorStop(1, 'rgba(0,0,80,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, bob - 4, 22, 0, Math.PI * 2);
        ctx.fill();
    }

    #drawBody(ctx, bob) {
        const bodyGrad = ctx.createLinearGradient(0, bob - 16, 0, bob + 14);
        bodyGrad.addColorStop(0, '#cce0ff');
        bodyGrad.addColorStop(0.5, '#88aaee');
        bodyGrad.addColorStop(1, '#3355aa');
        ctx.fillStyle = bodyGrad;

        ctx.beginPath();
        ctx.arc(0, bob - 4, BODY_RADIUS, Math.PI, 0);
        ctx.lineTo(BODY_RADIUS, bob + 10);
        for (let i = 0; i < RAGGED_POINTS.length; i++) {
            const wy = bob + 10 + (i % 2 === 0 ? 7 : 0);
            ctx.lineTo(RAGGED_POINTS[i], wy);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.ellipse(-3, bob - 10, 5, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    #drawFace(ctx, bob, alpha, wail) {
        this.#drawEyes(ctx, bob, alpha);
        this.#drawMouth(ctx, bob, wail);
    }

    #drawEyes(ctx, bob, alpha) {
        ctx.fillStyle = '#000033';
        ctx.beginPath();
        ctx.ellipse(-5, bob - 5, 3.5, 5.5, 0, 0, Math.PI * 2);
        ctx.ellipse(5, bob - 5, 3.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(80,180,255,${0.6 + alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(-5, bob - 5, 2, 0, Math.PI * 2);
        ctx.arc(5, bob - 5, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    #drawMouth(ctx, bob, wail) {
        const mouthH = 2 + wail * 6;
        ctx.fillStyle = '#000033';
        ctx.beginPath();
        ctx.ellipse(0, bob + 4, 8, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();

        if (wail > WAIL_THRESHOLD) {
            ctx.fillStyle = 'rgba(200,230,255,0.9)';
            for (let t = -2; t <= 2; t++) {
                ctx.beginPath();
                ctx.moveTo(t * 2.5, bob + 4 - mouthH + 1);
                ctx.lineTo(t * 2.5 - 1.2, bob + 4 - mouthH + 4);
                ctx.lineTo(t * 2.5 + 1.2, bob + 4 - mouthH + 4);
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}

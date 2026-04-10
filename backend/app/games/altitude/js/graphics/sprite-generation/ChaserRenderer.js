import { BaseEnemyRenderer } from './BaseEnemyRenderer.js';

export class ChaserRenderer extends BaseEnemyRenderer {
    draw(ctx, phase) {
        const pulse = 1 + Math.sin(phase * 2) * 0.08;
        this.#drawTrail(ctx, pulse);
        this.#drawBody(ctx, pulse);
        this.#drawFins(ctx, pulse);
        this.#drawEye(ctx, pulse);
    }

    #drawTrail(ctx, s) {
        ctx.fillStyle = 'rgba(255,80,0,0.12)';
        ctx.beginPath();
        ctx.moveTo(0, -10 * s);
        ctx.lineTo(-16 * s, 14 * s);
        ctx.lineTo(16 * s, 14 * s);
        ctx.closePath();
        ctx.fill();
    }

    #drawBody(ctx, s) {
        const grad = ctx.createLinearGradient(0, -14 * s, 0, 14 * s);
        grad.addColorStop(0, '#ff6600');
        grad.addColorStop(1, '#991100');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -13 * s);
        ctx.lineTo(-11 * s, 5 * s);
        ctx.lineTo(-6 * s, 13 * s);
        ctx.lineTo(6 * s, 13 * s);
        ctx.lineTo(11 * s, 5 * s);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ff9944';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -13 * s);
        ctx.lineTo(0, 7 * s);
        ctx.stroke();
    }

    #drawFins(ctx, s) {
        ctx.fillStyle = '#cc3300';
        ctx.beginPath();
        ctx.moveTo(-11 * s, 5 * s);
        ctx.lineTo(-18 * s, 0);
        ctx.lineTo(-8 * s, -2 * s);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(11 * s, 5 * s);
        ctx.lineTo(18 * s, 0);
        ctx.lineTo(8 * s, -2 * s);
        ctx.closePath();
        ctx.fill();
    }

    #drawEye(ctx, s) {
        ctx.fillStyle = '#ffeecc';
        ctx.beginPath();
        ctx.ellipse(0, 1 * s, 5.5, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.ellipse(0, 1 * s, 3.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(0, 1 * s, 1, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.ellipse(-1.5, -0.5 * s, 1, 1.5, -0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

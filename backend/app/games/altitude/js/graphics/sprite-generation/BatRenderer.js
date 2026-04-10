import { BaseEnemyRenderer } from './BaseEnemyRenderer.js';

export class BatRenderer extends BaseEnemyRenderer {
    draw(ctx, phase) {
        const flap = Math.sin(phase);
        const wingTipY = flap * 14;
        const midY = flap * 7;
        this.#drawWings(ctx, wingTipY, midY);
        this.#drawBody(ctx);
        this.#drawEars(ctx);
        this.#drawEyes(ctx);
        this.#drawFangs(ctx);
    }

    #drawWings(ctx, wingTipY, midY) {
        this.#drawWing(ctx, -1, wingTipY, midY);
        this.#drawWing(ctx, 1, wingTipY, midY);
    }

    #drawWing(ctx, side, wingTipY, midY) {
        const shoulderX = side * 4;
        const tipX = side * 20;
        const midCtrlX = side * 10;
        const trailCtrlX = side * 13;

        ctx.fillStyle = '#3a1a6e';
        ctx.beginPath();
        ctx.moveTo(shoulderX, 2);
        ctx.quadraticCurveTo(midCtrlX, midY - 4, tipX, wingTipY);
        ctx.quadraticCurveTo(trailCtrlX, wingTipY + 8, shoulderX, 10);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#6633bb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(shoulderX, 2);
        ctx.quadraticCurveTo(midCtrlX, midY - 4, tipX, wingTipY);
        ctx.stroke();
    }

    #drawBody(ctx) {
        ctx.fillStyle = '#1a0a2e';
        ctx.beginPath();
        ctx.ellipse(0, 2, 7, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#5522aa';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    #drawEars(ctx) {
        ctx.fillStyle = '#1a0a2e';
        ctx.beginPath();
        ctx.moveTo(-5, -8); ctx.lineTo(-9, -20); ctx.lineTo(-1, -10);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(5, -8); ctx.lineTo(9, -20); ctx.lineTo(1, -10);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#cc44aa';
        ctx.beginPath();
        ctx.moveTo(-5, -10); ctx.lineTo(-8, -18); ctx.lineTo(-2, -11);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(5, -10); ctx.lineTo(8, -18); ctx.lineTo(2, -11);
        ctx.closePath();
        ctx.fill();
    }

    #drawEyes(ctx) {
        ctx.fillStyle = 'rgba(255,0,0,0.25)';
        ctx.beginPath();
        ctx.arc(-4, -2, 6, 0, Math.PI * 2);
        ctx.arc(4, -2, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffcccc';
        ctx.beginPath();
        ctx.arc(-4, -2, 3.5, 0, Math.PI * 2);
        ctx.arc(4, -2, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-4, -2, 2, 0, Math.PI * 2);
        ctx.arc(4, -2, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(-4, -2, 0.7, 2, 0, 0, Math.PI * 2);
        ctx.ellipse(4, -2, 0.7, 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    #drawFangs(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-4, 7); ctx.lineTo(-2.5, 13); ctx.lineTo(-1, 7);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(1, 7); ctx.lineTo(2.5, 13); ctx.lineTo(4, 7);
        ctx.closePath();
        ctx.fill();
    }
}

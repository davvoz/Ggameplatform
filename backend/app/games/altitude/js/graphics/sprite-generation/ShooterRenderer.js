import { BaseEnemyRenderer } from './BaseEnemyRenderer.js';

const HEX_SIDES = 6;
const OUTER_RADIUS = 15;
const INNER_RADIUS = 9;

export class ShooterRenderer extends BaseEnemyRenderer {
    draw(ctx, phase) {
        const cannonAngle = Math.sin(phase) * 0.35;
        const charge = (Math.sin(phase * 2) + 1) / 2;
        this.#drawShell(ctx);
        this.#drawTargetingEye(ctx, charge);
        this.#drawCannon(ctx, cannonAngle, charge);
        this.#drawVents(ctx);
    }

    #drawShell(ctx) {
        const grad = ctx.createLinearGradient(0, -16, 0, 16);
        grad.addColorStop(0, '#aa55ff');
        grad.addColorStop(1, '#440088');
        ctx.fillStyle = grad;
        this.#drawHexagon(ctx, OUTER_RADIUS);
        ctx.fill();

        ctx.strokeStyle = '#cc88ff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#22003a';
        this.#drawHexagon(ctx, INNER_RADIUS);
        ctx.fill();
    }

    #drawHexagon(ctx, radius) {
        ctx.beginPath();
        for (let i = 0; i < HEX_SIDES; i++) {
            const a = (i / HEX_SIDES) * Math.PI * 2 - Math.PI / 6;
            const x = Math.cos(a) * radius;
            const y = Math.sin(a) * radius;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
    }

    #drawTargetingEye(ctx, charge) {
        const eyeR = 3.5 + charge * 2;

        ctx.fillStyle = `rgba(255,0,200,${0.3 + charge * 0.4})`;
        ctx.beginPath();
        ctx.arc(0, -1, eyeR + 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff00cc';
        ctx.beginPath();
        ctx.arc(0, -1, eyeR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1, -2, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    #drawCannon(ctx, cannonAngle, charge) {
        ctx.save();
        ctx.rotate(cannonAngle);

        ctx.fillStyle = '#6600aa';
        ctx.beginPath();
        ctx.roundRect(-5, 11, 10, 6, 2);
        ctx.fill();

        ctx.fillStyle = '#330055';
        ctx.beginPath();
        ctx.roundRect(-3.5, 14, 7, 10, 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255,0,200,${charge * 0.8})`;
        ctx.beginPath();
        ctx.arc(0, 24, 4 * charge, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    #drawVents(ctx) {
        ctx.strokeStyle = '#9933ff';
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i += 2) {
            ctx.beginPath();
            ctx.moveTo(i * 10, 3);
            ctx.lineTo(i * 14, 3);
            ctx.moveTo(i * 10, 7);
            ctx.lineTo(i * 13, 7);
            ctx.stroke();
        }
    }
}

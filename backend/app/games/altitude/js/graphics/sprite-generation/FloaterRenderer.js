import { BaseEnemyRenderer } from './BaseEnemyRenderer.js';
import { COLORS } from '../../config/Constants.js';

const TENTACLE_DEFS = [
    { baseLen: 16, curl: 0.35 },
    { baseLen: 9, curl: 0.2 },
    { baseLen: 13, curl: 0.45 },
    { baseLen: 7, curl: 0.15 },
    { baseLen: 18, curl: 0.3 },
    { baseLen: 11, curl: 0.4 },
];

const BODY_RADIUS = 12;
const CORE_RADIUS = 6;
const GLOW_RADIUS = 17;
const ROOT_OFFSET = 10;

export class FloaterRenderer extends BaseEnemyRenderer {
    draw(ctx, phase) {
        const extend = Math.sin(phase);
        this.#drawTentacles(ctx, extend);
        this.#drawGlowAndBody(ctx, extend);
        this.#drawFace(ctx);
    }

    #drawTentacles(ctx, extend) {
        ctx.lineCap = 'round';
        for (let i = 0; i < TENTACLE_DEFS.length; i++) {
            const { baseLen, curl } = TENTACLE_DEFS[i];
            const angle = (i / TENTACLE_DEFS.length) * Math.PI * 2;
            const alt = (i % 2 === 0) ? extend : -extend;
            const len = baseLen + alt * (baseLen * 0.45);
            const rootX = Math.cos(angle) * ROOT_OFFSET;
            const rootY = Math.sin(angle) * ROOT_OFFSET;
            const tipX = Math.cos(angle + alt * curl) * (ROOT_OFFSET + len);
            const tipY = Math.sin(angle + alt * curl) * (ROOT_OFFSET + len);
            const cpX = Math.cos(angle + curl * 0.6) * (ROOT_OFFSET + len * 0.5);
            const cpY = Math.sin(angle + curl * 0.6) * (ROOT_OFFSET + len * 0.5);

            ctx.strokeStyle = COLORS.ENEMY_PRIMARY;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(rootX, rootY);
            ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
            ctx.stroke();

            ctx.fillStyle = COLORS.ENEMY_PRIMARY;
            ctx.beginPath();
            ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    #drawGlowAndBody(ctx, extend) {
        const pulse = 1 + extend * 0.06;

        ctx.fillStyle = 'rgba(255,0,60,0.15)';
        ctx.beginPath();
        ctx.arc(0, 0, GLOW_RADIUS * pulse, 0, Math.PI * 2);
        ctx.fill();

        const grad = ctx.createRadialGradient(0, -3, 2, 0, 0, BODY_RADIUS);
        grad.addColorStop(0, COLORS.ENEMY_SECONDARY);
        grad.addColorStop(1, COLORS.ENEMY_PRIMARY);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, BODY_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a0010';
        ctx.beginPath();
        ctx.arc(0, 0, CORE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    #drawFace(ctx) {
        ctx.fillStyle = '#ffdddd';
        ctx.beginPath();
        ctx.ellipse(-3.5, -1, 3, 4, -0.2, 0, Math.PI * 2);
        ctx.ellipse(3.5, -1, 3, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-3.5, -0.5, 1.8, 0, Math.PI * 2);
        ctx.arc(3.5, -0.5, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(-3.5, -0.5, 0.7, 1.8, 0, 0, Math.PI * 2);
        ctx.ellipse(3.5, -0.5, 0.7, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-7, -5.5);
        ctx.lineTo(-1, -4);
        ctx.moveTo(7, -5.5);
        ctx.lineTo(1, -4);
        ctx.stroke();

        ctx.strokeStyle = '#ff0040';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4.5, 4.5);
        ctx.lineTo(-2.5, 7.5);
        ctx.lineTo(-0.5, 4.5);
        ctx.lineTo(1.5, 7.5);
        ctx.lineTo(3.5, 4.5);
        ctx.lineTo(5, 7.5);
        ctx.stroke();
    }
}

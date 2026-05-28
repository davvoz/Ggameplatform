import { GameConfig, RED_NUMBERS } from '../config/GameConfig.js';

const L = GameConfig.LAYOUT;
const C = GameConfig.COLOR;

/**
 * Draws the wheel (rim + sectors + ball + center hub) with a vertical squash
 * to simulate top-down perspective. No physics here — read-only render.
 */
export class WheelRenderer {
    constructor(dataRegistry) {
        this._order = dataRegistry.getWheelOrder();
        this._sectorAngle = (2 * Math.PI) / this._order.length;
    }

    draw(ctx, wheelAngle, ballAngle, ballRadiusFactor, highlightNumber) {
        ctx.save();
        ctx.translate(L.WHEEL_CX, L.WHEEL_CY);
        ctx.scale(1, L.WHEEL_TILT_Y);

        // Shadow
        ctx.fillStyle = C.SHADOW;
        ctx.beginPath();
        ctx.ellipse(0, 16, L.WHEEL_R_OUTER + 8, L.WHEEL_R_OUTER + 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer rim (gold)
        this._gradientFillCircle(ctx, L.WHEEL_R_OUTER + 8, [C.WHEEL_RIM_LT, C.WHEEL_RIM]);
        this._gradientFillCircle(ctx, L.WHEEL_R_OUTER, [C.GOLD_BRIGHT, C.GOLD]);

        // Sectors
        this._drawSectors(ctx, wheelAngle, highlightNumber);

        // Inner hub
        this._gradientFillCircle(ctx, L.WHEEL_R_INNER, [C.GOLD_BRIGHT, C.WHEEL_RIM]);
        this._gradientFillCircle(ctx, L.WHEEL_R_INNER - 14, [C.BLACK, '#000']);
        ctx.fillStyle = C.GOLD_BRIGHT;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Ball
        const r = L.WHEEL_R_INNER + (L.WHEEL_R_OUTER - L.WHEEL_R_INNER) * ballRadiusFactor;
        const bx = Math.cos(ballAngle) * r;
        const by = Math.sin(ballAngle) * r;
        ctx.fillStyle = C.SHADOW;
        ctx.beginPath();
        ctx.arc(bx + 1, by + 2, 6, 0, Math.PI * 2);
        ctx.fill();
        const grad = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 6);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, C.BALL);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _drawSectors(ctx, wheelAngle, highlightNumber) {
        const rOuter = L.WHEEL_R_OUTER - 4;
        const rInner = L.WHEEL_R_INNER + 2;
        const half = this._sectorAngle / 2;
        for (let i = 0; i < this._order.length; i++) {
            const n = this._order[i];
            const baseAngle = wheelAngle + i * this._sectorAngle;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, rOuter, baseAngle - half, baseAngle + half);
            ctx.closePath();
            ctx.fillStyle = this._sectorColor(n);
            ctx.fill();
            if (n === highlightNumber) {
                ctx.strokeStyle = C.GOLD_BRIGHT;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            // Number label
            ctx.save();
            ctx.rotate(baseAngle);
            ctx.translate((rOuter + rInner) / 2, 0);
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = C.IVORY;
            ctx.font = 'bold 11px system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(n), 0, 0);
            ctx.restore();
        }
        // Inner punch-out
        ctx.beginPath();
        ctx.arc(0, 0, rInner, 0, Math.PI * 2);
        ctx.fillStyle = C.WHEEL_RIM;
        ctx.fill();
    }

    _sectorColor(n) {
        if (n === 0) return C.GREEN;
        return RED_NUMBERS.has(n) ? C.RED : C.BLACK;
    }

    _gradientFillCircle(ctx, radius, colors) {
        const grad = ctx.createRadialGradient(0, -radius * 0.4, radius * 0.1, 0, 0, radius);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

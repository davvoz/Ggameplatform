import { BaseSpriteDrawer } from './BaseSpriteDrawer.js';
import { COLORS } from '../../config/Constants.js';

const SIZE = 64;
const FRAME_COUNT = 8;
const HEX_SIDES = 6;

export class ShieldSpriteDrawer extends BaseSpriteDrawer {
    generate() {
        const canvas = this.createCanvas(SIZE * FRAME_COUNT, SIZE);
        const ctx = canvas.getContext('2d');

        for (let i = 0; i < FRAME_COUNT; i++) {
            const phase = (i / FRAME_COUNT) * Math.PI * 2;
            this.#drawShieldFrame(ctx, i * SIZE, 0, phase);
        }

        return { canvas, frameSize: SIZE, frames: FRAME_COUNT };
    }

    #drawShieldFrame(ctx, ox, oy, phase) {
        const radius = SIZE / 2 - 4;
        const alpha = 0.3 + Math.sin(phase * 2) * 0.2;

        ctx.save();
        ctx.translate(ox + SIZE / 2, oy + SIZE / 2);
        ctx.rotate(phase / 2);

        ctx.fillStyle = `rgba(0, 255, 238, ${alpha})`;
        ctx.strokeStyle = COLORS.NEON_CYAN;
        ctx.lineWidth = 2;

        ctx.beginPath();
        for (let i = 0; i < HEX_SIDES; i++) {
            const angle = (i / HEX_SIDES) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

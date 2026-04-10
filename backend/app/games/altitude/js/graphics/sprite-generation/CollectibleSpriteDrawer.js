import { BaseSpriteDrawer } from './BaseSpriteDrawer.js';
import { COLORS } from '../../config/Constants.js';

const SIZE = 32;
const FRAME_COUNT = 6;
const TYPES = ['coin', 'gem', 'diamond', 'star'];

export class CollectibleSpriteDrawer extends BaseSpriteDrawer {
    generate() {
        const canvas = this.createCanvas(SIZE * FRAME_COUNT, SIZE * TYPES.length);
        const ctx = canvas.getContext('2d');

        TYPES.forEach((type, row) => {
            for (let frame = 0; frame < FRAME_COUNT; frame++) {
                this.#drawCollectible(ctx, frame * SIZE, row * SIZE, type, frame / FRAME_COUNT);
            }
        });

        return { canvas, frameSize: SIZE, frames: FRAME_COUNT, types: TYPES };
    }

    #drawCollectible(ctx, ox, oy, type, t) {
        const phase = t * Math.PI * 2;
        const scaleX = Math.cos(phase) * 0.3 + 0.7;

        ctx.save();
        ctx.translate(ox + SIZE / 2, oy + SIZE / 2);
        ctx.scale(scaleX, 1);

        if (type === 'coin') this.#drawCoin(ctx);
        else if (type === 'gem') this.#drawGem(ctx);
        else if (type === 'diamond') this.#drawDiamond(ctx);
        else if (type === 'star') this.#drawStar(ctx, phase);

        ctx.restore();
    }

    #drawCoin(ctx) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
    }

    #drawGem(ctx) {
        ctx.fillStyle = COLORS.GEM_CYAN;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(8, -2);
        ctx.lineTo(5, 10);
        ctx.lineTo(-5, 10);
        ctx.lineTo(-8, -2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(4, -2);
        ctx.lineTo(0, 0);
        ctx.lineTo(-4, -2);
        ctx.closePath();
        ctx.fill();
    }

    #drawDiamond(ctx) {
        ctx.fillStyle = COLORS.GEM_PURPLE;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(10, -4);
        ctx.lineTo(6, 12);
        ctx.lineTo(-6, 12);
        ctx.lineTo(-10, -4);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(0, 0);
        ctx.lineTo(6, 12);
        ctx.moveTo(0, 0);
        ctx.lineTo(-6, 12);
        ctx.stroke();
    }

    #drawStar(ctx, phase) {
        const glow = 0.7 + Math.sin(phase * 2) * 0.3;
        ctx.fillStyle = COLORS.NEON_YELLOW;
        ctx.globalAlpha = glow;

        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? 12 : 5;
            const angle = (i * Math.PI / 5) - Math.PI / 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}

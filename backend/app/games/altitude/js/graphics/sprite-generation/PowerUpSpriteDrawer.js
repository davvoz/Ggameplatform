import { BaseSpriteDrawer } from './BaseSpriteDrawer.js';
import { ColorUtils } from './ColorUtils.js';
import { POWERUP_TYPES } from '../../config/Constants.js';

const SIZE = 40;
const FRAME_COUNT = 4;

export class PowerUpSpriteDrawer extends BaseSpriteDrawer {
    generate() {
        const types = Object.keys(POWERUP_TYPES);
        const canvas = this.createCanvas(SIZE * FRAME_COUNT, SIZE * types.length);
        const ctx = canvas.getContext('2d');

        types.forEach((type, row) => {
            const powerUp = POWERUP_TYPES[type];
            for (let frame = 0; frame < FRAME_COUNT; frame++) {
                this.#drawPowerUp(ctx, frame * SIZE, row * SIZE, powerUp, frame / FRAME_COUNT);
            }
        });

        return { canvas, frameSize: SIZE, frames: FRAME_COUNT, types };
    }

    #drawPowerUp(ctx, ox, oy, powerUp, t) {
        const phase = t * Math.PI * 2;
        const pulse = 1 + Math.sin(phase) * 0.1;
        const glow = 0.3 + Math.sin(phase * 2) * 0.2;

        ctx.save();
        ctx.translate(ox + SIZE / 2, oy + SIZE / 2);
        ctx.scale(pulse, pulse);

        this.#drawGlow(ctx, powerUp.color, glow);
        this.#drawBox(ctx, powerUp.color);
        this.#drawIcon(ctx, powerUp.icon);

        ctx.restore();
    }

    #drawGlow(ctx, color, glow) {
        ctx.fillStyle = color;
        ctx.globalAlpha = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    #drawBox(ctx, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-14, -14, 28, 28, 6);
        ctx.fill();

        ctx.fillStyle = ColorUtils.darken(color, 0.3);
        ctx.beginPath();
        ctx.roundRect(-10, -10, 20, 20, 4);
        ctx.fill();
    }

    #drawIcon(ctx, icon) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, 0, 1);
    }
}

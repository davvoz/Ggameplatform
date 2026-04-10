import { BaseSpriteDrawer } from './BaseSpriteDrawer.js';
import { ColorUtils } from './ColorUtils.js';
import { COLORS } from '../../config/Constants.js';

const WIDTH = 80;
const HEIGHT = 16;
const TYPES = ['normal', 'fragile', 'moving', 'bouncy', 'cloud', 'deadly'];
const CORNER_RADIUS = 4;
const INSET = 2;

const TYPE_COLORS = {
    normal: () => COLORS.PLATFORM_NORMAL,
    fragile: () => COLORS.PLATFORM_FRAGILE,
    moving: () => COLORS.PLATFORM_MOVING,
    bouncy: () => COLORS.PLATFORM_BOUNCY,
    cloud: () => COLORS.PLATFORM_CLOUD,
    deadly: () => COLORS.PLATFORM_DEADLY,
};

export class PlatformSpriteDrawer extends BaseSpriteDrawer {
    generate() {
        const canvas = this.createCanvas(WIDTH * TYPES.length, HEIGHT * 2);
        const ctx = canvas.getContext('2d');

        TYPES.forEach((type, i) => {
            const ox = i * WIDTH;
            const color = TYPE_COLORS[type]();
            this.#drawPlatform(ctx, ox, 0, color, type, false);
            this.#drawPlatform(ctx, ox, HEIGHT, color, type, true);
        });

        return { canvas, width: WIDTH, height: HEIGHT, types: TYPES };
    }

    #drawPlatform(ctx, ox, oy, color, type, cracked) {
        ctx.save();
        this.#drawBase(ctx, ox, oy, color);
        this.#drawHighlight(ctx, ox, oy, color);
        this.#drawDecoration(ctx, type, ox, oy);
        if (cracked) this.#drawCracks(ctx, ox, oy, color);
        ctx.restore();
    }

    #drawBase(ctx, ox, oy, color) {
        const gradient = ctx.createLinearGradient(ox, oy, ox, oy + HEIGHT);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, ColorUtils.darken(color, 0.3));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(ox + INSET, oy + INSET, WIDTH - INSET * 2, HEIGHT - INSET * 2, CORNER_RADIUS);
        ctx.fill();
    }

    #drawHighlight(ctx, ox, oy, color) {
        ctx.fillStyle = ColorUtils.lighten(color, 0.3);
        ctx.beginPath();
        ctx.roundRect(ox + 4, oy + INSET, WIDTH - 8, 3, 2);
        ctx.fill();
    }

    #drawDecoration(ctx, type, ox, oy) {
        if (type === 'bouncy') this.#drawBouncySprings(ctx, ox, oy);
        else if (type === 'deadly') this.#drawDeadlyStripes(ctx, ox, oy);
        else if (type === 'cloud') this.#drawCloudPuffs(ctx, ox, oy);
    }

    #drawBouncySprings(ctx, ox, oy) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const sx = ox + 15 + i * 25;
            ctx.beginPath();
            ctx.moveTo(sx, oy + HEIGHT - 3);
            ctx.bezierCurveTo(sx - 5, oy + HEIGHT - 8, sx + 5, oy + HEIGHT - 8, sx, oy + HEIGHT - 3);
            ctx.stroke();
        }
    }

    #drawDeadlyStripes(ctx, ox, oy) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(ox + INSET, oy + INSET, WIDTH - INSET * 2, HEIGHT - INSET * 2, CORNER_RADIUS);
        ctx.clip();
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 5;
        for (let s = -HEIGHT; s < WIDTH + HEIGHT; s += 10) {
            ctx.beginPath();
            ctx.moveTo(ox + s, oy);
            ctx.lineTo(ox + s + HEIGHT, oy + HEIGHT);
            ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = 'rgba(255,0,60,0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(ox + INSET, oy + INSET, WIDTH - INSET * 2, HEIGHT - INSET * 2, CORNER_RADIUS);
        ctx.stroke();
    }

    #drawCloudPuffs(ctx, ox, oy) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        const puffs = [[15, 4], [30, 2], [50, 4], [65, 3]];
        puffs.forEach(([px, py]) => {
            ctx.beginPath();
            ctx.arc(ox + px, oy + py, 8, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    #drawCracks(ctx, ox, oy, color) {
        ctx.strokeStyle = ColorUtils.darken(color, 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox + WIDTH / 2 - 10, oy + 4);
        ctx.lineTo(ox + WIDTH / 2, oy + HEIGHT / 2);
        ctx.lineTo(ox + WIDTH / 2 + 8, oy + HEIGHT - 4);
        ctx.moveTo(ox + WIDTH / 2 - 5, oy + HEIGHT / 2);
        ctx.lineTo(ox + WIDTH / 2 + 12, oy + HEIGHT / 2 - 2);
        ctx.stroke();
    }
}

import { Ink } from '../../config/Palette.js';
import { STORM_ART } from '../art/SceneryArt.js';
import { drawBolt, drawStormFace } from '../art/StormFace.js';

/**
 * The villain of the game. Its grey wash covers the world, and a big angry
 * cloud with eyes stares at the blob: it always peeks in from the left, so the
 * player always knows who is chasing them.
 */

const WAVE_POINTS = 14;
const RAIN_STREAKS = 46;
const HEAD_HEIGHT_SHARE = 0.62;
const MIN_VISIBLE_SHARE = 0.34;
const CLOSE_GAP = 24;

function hash(index) {
    return (Math.imul(index + 1, 2654435761) >>> 0) / 4294967296;
}

export class StormLayer {
    #head;

    /** @param {import('../art/Bake.js').Sprite} head */
    constructor(head) {
        this.#head = head;
    }

    draw(ctx, { sim, camera, time, runnerX, runnerY }) {
        const { height } = camera;
        const edge = camera.sx(sim.storm.x);

        if (edge > -height * 0.1) {
            this.#wash(ctx, edge, height, time);
            this.#rain(ctx, edge, height, time);
        }

        const scale = (height * HEAD_HEIGHT_SHARE) / STORM_ART.height;
        const headWidth = STORM_ART.width * scale;
        const rightSide = Math.max(edge + headWidth * 0.12, headWidth * MIN_VISIBLE_SHARE);
        const bob = Math.sin(time * 2) * height * 0.012;
        const danger = Math.max(0, 1 - sim.gap / CLOSE_GAP);

        const { canvas } = this.#head;
        ctx.drawImage(canvas, rightSide - headWidth, -height * 0.04 + bob, headWidth, STORM_ART.height * scale);
        drawStormFace(ctx, {
            rightSide, top: bob, scale, danger, targetX: camera.sx(runnerX), targetY: camera.sy(runnerY),
        });
        if (danger > 0.5 && Math.floor(time * 3) % 3 === 0) {
            drawBolt(ctx, rightSide - scale * 90, height * 0.54, height * 0.08, scale * 3);
        }
    }

    #waveX(edge, height, y, time) {
        return edge + Math.sin(y / (height * 0.14) + time * 2.4) * height * 0.02;
    }

    #wash(ctx, edge, height, time) {
        ctx.fillStyle = Ink.storm;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let i = 0; i <= WAVE_POINTS; i++) {
            const y = (i / WAVE_POINTS) * height;
            ctx.lineTo(this.#waveX(edge, height, y, time), y);
        }
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
    }

    #rain(ctx, edge, height, time) {
        const reach = edge + height * 0.08;
        if (reach <= 0) return;

        ctx.strokeStyle = Ink.rain;
        ctx.lineWidth = Math.max(1.5, height * 0.005);
        ctx.lineCap = 'round';
        ctx.beginPath();
        const length = height * 0.06;
        for (let i = 0; i < RAIN_STREAKS; i++) {
            const x = reach * ((hash(i) + time * 0.04) % 1);
            const y = (((hash(i * 7) + time * (1.1 + hash(i) * 0.5)) % 1) * height * 1.1) - length;
            ctx.moveTo(x, y);
            ctx.lineTo(x - length * 0.22, y + length);
        }
        ctx.stroke();
    }
}

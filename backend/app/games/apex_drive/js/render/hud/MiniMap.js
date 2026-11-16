import { makeCanvas } from '../canvas.js';
import { CORNER } from '../ui/widgets.js';

/**
 * The whole track seen from above, in the top right corner, with the car on
 * it. The plan comes from the track itself (sim/Track.js), so it is the
 * road being driven. The map is painted once; each frame adds the cars:
 * the rivals in their colours, the player last and blinking.
 */
const SIZE = { width: 74, height: 56 };
const PADDING = 5;
const MARGIN = 4;
const COLORS = {
    panel: 'rgba(16, 8, 34, 0.62)',
    frame: '#f2eef6',
    edge: '#140c1c',
    road: '#cfc8e6',
    start: '#ffd34a',
    car: '#ff3b4a',
    carCore: '#ffffff',
};

/** A box with its corners cut, the way a small pixel panel looks. */
function panel(ctx, width, height) {
    ctx.fillStyle = COLORS.frame;
    ctx.fillRect(1, 0, width - 2, height);
    ctx.fillRect(0, 1, width, height - 2);
    ctx.clearRect(1, 1, width - 2, height - 2);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(1, 1, width - 2, height - 2);
}

export class MiniMap {
    #art;
    #place;
    #size;

    /** @param {import('../../sim/Track.js').Track} track @param {{width: number, height: number}} [size] */
    constructor(track, size = SIZE) {
        this.#size = size;
        const xs = track.plan.map((p) => p.x);
        const ys = track.plan.map((p) => p.y);
        const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
        const spanX = Math.max(...xs) - minX;
        const spanY = Math.max(...ys) - minY;
        const scale = Math.min((size.width - PADDING * 2) / spanX, (size.height - PADDING * 2) / spanY);
        const left = (size.width - spanX * scale) / 2;
        const top = (size.height - spanY * scale) / 2;
        this.#place = (p) => ({ x: Math.round(left + (p.x - minX) * scale), y: Math.round(top + (p.y - minY) * scale) });

        const { canvas, ctx } = makeCanvas(size.width, size.height);
        panel(ctx, size.width, size.height);
        const points = track.plan.map(this.#place);
        // a dark outline first, then the road over it: it reads on any sky
        for (const [color, size] of [[COLORS.edge, 3], [COLORS.road, 1]]) {
            ctx.fillStyle = color;
            for (const p of points) ctx.fillRect(p.x - (size >> 1), p.y - (size >> 1), size, size);
        }
        ctx.fillStyle = COLORS.start;
        ctx.fillRect(points[0].x - 1, points[0].y - 1, 3, 3);
        this.#art = canvas;
    }

    get width() {
        return this.#size.width;
    }

    /** Just the map, at a place of one's choosing (the track select). */
    drawMap(ctx, left, top) {
        ctx.drawImage(this.#art, Math.round(left), Math.round(top));
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} frameWidth
     * @param {{at: import('../../sim/Track.js').PlanPoint, color: string}[]} rivals
     * @param {import('../../sim/Track.js').PlanPoint} player
     * @param {number} clock seconds, for the blink
     */
    draw(ctx, frameWidth, rivals, player, clock) {
        const left = frameWidth - this.#size.width - MARGIN - CORNER;
        const top = MARGIN;
        ctx.drawImage(this.#art, left, top);
        for (const rival of rivals) this.#dot(ctx, left, top, rival.at, rival.color, 3);
        this.#dot(ctx, left, top, player, COLORS.car, 3);
        if (Math.floor(clock * 4) % 2 === 0) {
            const p = this.#place(player);
            ctx.fillStyle = COLORS.carCore;
            ctx.fillRect(left + p.x, top + p.y, 1, 1);
        }
    }

    #dot(ctx, left, top, at, color, size) {
        const p = this.#place(at);
        const half = size >> 1;
        ctx.fillStyle = COLORS.edge;
        ctx.fillRect(left + p.x - half - 1, top + p.y - half - 1, size + 2, size + 2);
        ctx.fillStyle = color;
        ctx.fillRect(left + p.x - half, top + p.y - half, size, size);
    }
}

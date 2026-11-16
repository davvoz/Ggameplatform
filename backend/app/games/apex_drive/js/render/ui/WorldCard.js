import { Rng } from '../../core/Rng.js';
import { paintAuroraOn, paintBody } from '../Backdrop.js';
import { makeCanvas } from '../canvas.js';

/**
 * A world's postcard for the world select: its sky, its scenery (from the
 * theme's layers: mountains and hills, a skyline, stars, an aurora, the
 * sun or the moon) and a road running to the horizon, so a new world has its card
 * with no drawing to do.
 */
const SEED = 77;

export function paintWorldCard(theme, width, height) {
    const { canvas, ctx } = makeCanvas(width, height);
    const horizon = Math.round(height * 0.58);
    const band = horizon / theme.sky.length;
    theme.sky.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, Math.round(i * band), width, Math.ceil(band) + 1);
    });
    const card = { ctx, width, height, horizon, rng: new Rng(SEED) };
    for (const layer of theme.layers) CARD_PAINTERS[layer.kind]?.(card, theme, layer);
    road(ctx, theme, width, height, horizon);
    return canvas;
}

const CARD_PAINTERS = {
    mountains(card, theme) {
        if (theme.sun.shape === 'moon') moonHigh(card, theme.sun);
        else sunset(card, theme.sun);
        ridge(card, { base: card.height * 0.16, waves: [[2, 7], [5, 4], [11, 2]], color: theme.mountains.shade, lit: theme.mountains.lit });
    },
    hills(card, theme) {
        ridge(card, { base: card.height * 0.06, waves: [[3, 3], [8, 2]], color: theme.hills.body, lit: theme.hills.top });
    },
    aurora({ ctx, width, horizon, rng }, theme, layer) {
        paintAuroraOn(ctx, width, horizon - 4, theme, rng, layer.curtains);
    },
    stars({ ctx, width, horizon, rng }, theme) {
        for (let i = 0; i < width / 6; i++) {
            ctx.fillStyle = rng.pick(theme.stars.colors);
            ctx.fillRect(rng.int(0, width - 1), Math.floor(horizon * 0.8 * rng.next() * rng.next()), 1, 1);
        }
    },
    skyline({ ctx, width, height, horizon, rng }, theme, layer) {
        if (layer.body) paintBody(ctx, Math.round(width * 0.7), Math.round(horizon * 0.35), { ...theme.sun, radius: Math.round(height * 0.11) });
        const look = theme.city[layer.look];
        const scale = height / 140;
        for (let x = 0; x < width;) {
            const w = Math.max(3, Math.round(rng.int(layer.wide[0], layer.wide[1]) * scale));
            const h = Math.max(2, Math.round(rng.int(layer.tall[0], layer.tall[1]) * scale));
            ctx.fillStyle = look.body;
            ctx.fillRect(x, horizon - h, w, h);
            ctx.fillStyle = look.edge;
            ctx.fillRect(x, horizon - h, w, 1);
            for (let wy = horizon - h + 2; wy < horizon - 1; wy += 2) {
                for (let wx = x + 1; wx < x + w - 1; wx += 2) {
                    if (!rng.chance(layer.lit)) continue;
                    ctx.fillStyle = rng.pick(look.windows);
                    ctx.fillRect(wx, wy, 1, 1);
                }
            }
            x += w + 1;
        }
    },
};

/** A small moon high over the mountains. */
function moonHigh({ ctx, width, height, horizon }, moon) {
    paintBody(ctx, Math.round(width * 0.78), Math.round(horizon * 0.3), { ...moon, radius: Math.max(3, Math.round(height * 0.06)) });
}

/** The sun, half set behind the mountains. */
function sunset({ ctx, width, height, horizon }, sun) {
    const r = Math.round(height * 0.16);
    ctx.fillStyle = sun.core;
    for (let dy = -r; dy <= 0; dy++) {
        const half = Math.round(Math.sqrt(r * r - dy * dy));
        ctx.fillRect(Math.round(width * 0.68) - half, horizon - 6 + dy, half * 2, 1);
    }
}

function ridge({ ctx, width, horizon }, { base, waves, color, lit }) {
    for (let x = 0; x < width; x++) {
        const angle = (x / width) * Math.PI * 2;
        const h = Math.round(base + waves.reduce((sum, [k, amp]) => sum + amp * Math.sin(k * angle + k), 0));
        ctx.fillStyle = color;
        ctx.fillRect(x, horizon - h, 1, h);
        ctx.fillStyle = lit;
        ctx.fillRect(x, horizon - h, 1, 1);
    }
}

/** The road: a trapezoid with banded rumble strips. */
function road(ctx, theme, width, height, horizon) {
    ctx.fillStyle = theme.road.grass[0];
    ctx.fillRect(0, horizon, width, height - horizon);
    for (let y = horizon; y < height; y++) {
        const t = (y - horizon) / (height - horizon);
        const half = 2 + t * width * 0.42;
        const middle = width / 2;
        const band = Math.floor(Math.sqrt(t) * 12) % 2;
        ctx.fillStyle = theme.road.grass[band];
        ctx.fillRect(0, y, width, 1);
        ctx.fillStyle = theme.road.rumble[band];
        ctx.fillRect(Math.round(middle - half * 1.15), y, Math.round(half * 2.3), 1);
        ctx.fillStyle = theme.road.asphalt[band];
        ctx.fillRect(Math.round(middle - half), y, Math.round(half * 2), 1);
    }
}

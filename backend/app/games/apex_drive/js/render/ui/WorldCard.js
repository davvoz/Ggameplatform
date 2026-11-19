import { Rng } from '../../core/Rng.js';
import { paintPlanetOn } from '../AlienSky.js';
import { paintAuroraOn, paintBody } from '../Backdrop.js';
import { makeCanvas } from '../canvas.js';
import { neonSunOn } from '../NeonScenery.js';

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
    neonSun({ ctx, width, height, horizon }, theme) {
        neonSunOn(ctx, Math.round(width * 0.5), horizon - 1, { ...theme.neonSun, radius: Math.max(8, Math.round(height * 0.3)) });
    },
    gridPeaks(card, theme, layer) {
        const look = theme.peaks[layer.look];
        const near = layer.look === 'near';
        ridge(card, { base: card.height * (near ? 0.06 : 0.12), waves: near ? [[4, 3], [9, 2]] : [[3, 6], [7, 3]], color: look.body, lit: look.crest });
    },
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
    planet({ ctx, width, height, horizon }, theme) {
        paintPlanetOn(ctx, Math.round(width * 0.3), Math.round(horizon * 0.42), theme.planet, Math.max(6, Math.round(height * 0.14)));
    },
    rays({ ctx, width, horizon, rng }, theme) {
        const { colors, slant } = theme.rays;
        for (let i = 0; i < width / 12; i++) {
            const x = rng.int(0, width - 1);
            for (let y = 0; y < horizon; y++) {
                ctx.fillStyle = colors[Math.min(colors.length - 1, Math.floor((y / horizon) * colors.length))];
                ctx.fillRect(Math.round(x + y * slant), y, 3, 1);
            }
        }
    },
    ruins({ ctx, width, height, horizon, rng }, theme, layer) {
        const look = theme.ruins;
        const scale = height / 140;
        for (let x = 0; x < width;) {
            const w = Math.max(3, Math.round(rng.int(layer.wide[0], layer.wide[1]) * scale));
            const h = Math.max(2, Math.round(rng.int(layer.tall[0], layer.tall[1]) * scale));
            ctx.fillStyle = look.body;
            ctx.fillRect(x, horizon - h, w, h);
            ctx.fillStyle = look.edge;
            ctx.fillRect(x + w - 1, horizon - h, 1, h);
            ctx.fillStyle = rng.pick(look.windows);
            if (h > 6) ctx.fillRect(x + 1, horizon - h + 3, 1, 1);
            x += w + rng.int(1, 4);
        }
    },
    reef({ ctx, width, horizon, rng }, theme) {
        const look = theme.reef;
        for (let x = 0; x < width; x++) {
            const h = 2 + Math.round(1.5 * Math.sin(x * 0.3) + rng.next());
            ctx.fillStyle = look.body;
            ctx.fillRect(x, horizon - h, 1, h);
            if (rng.chance(0.08)) {
                ctx.fillStyle = rng.pick(look.coral);
                ctx.fillRect(x, horizon - h - 1, 1, 1);
            }
        }
    },
    spires({ ctx, width, height, horizon, rng }, theme, layer) {
        const look = theme.spires[layer.look];
        const scale = height / 160;
        for (let i = 0; i < width * layer.perPixel * 2; i++) {
            const x = rng.int(0, width - 1);
            const tall = Math.round(rng.int(layer.tall[0], layer.tall[1]) * scale);
            const half = Math.max(1, Math.round(rng.int(layer.wide[0], layer.wide[1]) * scale * 0.5));
            for (let row = 0; row < tall; row++) {
                const w = Math.max(1, Math.round((half * (row + 1)) / tall));
                ctx.fillStyle = look.body;
                ctx.fillRect(x - w, horizon - tall + row, w * 2, 1);
                ctx.fillStyle = look.lit;
                ctx.fillRect(x - w, horizon - tall + row, 1, 1);
            }
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

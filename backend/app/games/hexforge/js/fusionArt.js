import { drawBuilding, halo, withAlpha } from './forgeArt.js';
import { toScreen } from './iso.js';
import { BUILDING_INFO, HERO_INFO } from './labels.js';

/**
 * What a fusion looks like.
 *   building  a rune circle on the ground, turning, in the colours of its
 *             parts; each donor floats beside the body as a small copy of
 *             itself, bobbing and tied to the body by an energy tether; one
 *             gem per grade circles above.
 *   hero      a ring at its feet in the parts' colours and one spirit per
 *             donor circling it, in the donor class's colour, plus the gems.
 * `parts` are the server's fusion parts ([{type, path|form, power}]); the
 * first is the body.
 */

export function partColor(part) {
    return BUILDING_INFO[part.type]?.glow ?? HERO_INFO[part.type]?.color ?? '#ffb347';
}

export function fusionColors(parts) {
    return parts.map(partColor);
}

const SIZES = { core: 3, wall: 1, rune_trap: 1 };

// ── buildings ───────────────────────────────────────────────────────────
export function drawFusionUnder(ctx, cam, b, time) {
    const colors = fusionColors(b.fusion.parts);
    const c = toScreen(cam, b.x + b.size / 2, b.y + b.size / 2, 0);
    const rx = (b.size * 32 + 14) * cam.scale;
    halo(ctx, c.x, c.y, rx * 1.1, colors[colors.length - 1], 0.35);
    runeRing(ctx, c, rx, rx / 2, colors, time * 0.6 + b.id, cam.scale);
}

export function drawFusionOver(ctx, cam, b, time) {
    const s = cam.scale;
    const parts = b.fusion.parts;
    const top = BUILDING_INFO[b.type]?.height ?? 40;
    const body = toScreen(cam, b.x + b.size / 2, b.y + b.size / 2, top * 0.8);
    const donors = parts.slice(1);
    donors.forEach((part, i) => {
        const side = donors.length === 1 ? 1 : i === 0 ? -1 : 1;
        const bob = Math.sin(time * 2 + i * 2.1 + b.id) * 3 * s;
        const spot = { x: body.x + side * (b.size * 26 + 10) * s, y: body.y - (14 + 10 * i) * s + bob };
        tether(ctx, spot, body, partColor(part), time + i, s);
        mini(ctx, part, spot, s, time);
    });
    gems(ctx, { x: body.x, y: body.y - (top * 0.45 + 18) * s }, b.fusion.grade, fusionColors(parts), time, s);
}

/** A small copy of a donor, standing on `spot` (screen), drawn at a fraction of the map's scale. */
function mini(ctx, part, spot, s, time) {
    const k = 0.42 * s;
    const color = partColor(part);
    halo(ctx, spot.x, spot.y, 22 * s, color, 0.6);
    if (part.type === 'rune_trap') {
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `700 ${Math.round(18 * s)}px serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = color;
        ctx.shadowBlur = 10 * s;
        ctx.fillText('ᛟ', spot.x, spot.y);
        ctx.restore();
        return;
    }
    const m = SIZES[part.type] ?? 2;
    const cam = { scale: k, ox: spot.x, oy: spot.y - m * 16 * k };
    drawBuilding(ctx, cam, { id: 7, type: part.type, x: 0, y: 0, size: m }, { time, firing: 0, health: 1 });
}

function tether(ctx, a, b, color, time, s) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = withAlpha(color, 0.55);
    ctx.lineWidth = 2 * s;
    ctx.setLineDash([4 * s, 5 * s]);
    ctx.lineDashOffset = -time * 30 * s;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 12 * s, b.x, b.y);
    ctx.stroke();
    ctx.restore();
}

/** A turning ring of rune dashes, one arc per colour. */
function runeRing(ctx, c, rx, ry, colors, turn, s) {
    ctx.save();
    ctx.lineWidth = 2.2 * s;
    ctx.lineCap = 'round';
    const n = colors.length;
    for (let i = 0; i < n; i++) {
        const from = turn + (i / n) * Math.PI * 2;
        ctx.strokeStyle = colors[i];
        ctx.shadowColor = colors[i];
        ctx.shadowBlur = 8 * s;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx, ry, 0, from + 0.12, from + (Math.PI * 2) / n - 0.12);
        ctx.stroke();
        for (let k = 1; k < 4; k++) {                 // little rune ticks across the arc
            const a = from + (k / 4) * ((Math.PI * 2) / n);
            const px = c.x + Math.cos(a) * rx;
            const py = c.y + Math.sin(a) * ry;
            ctx.beginPath();
            ctx.moveTo(px - 2.5 * s, py - 2.5 * s);
            ctx.lineTo(px + 2.5 * s, py + 2.5 * s);
            ctx.stroke();
        }
    }
    ctx.restore();
}

/** One gem per grade, circling over the fused element. */
function gems(ctx, c, grade, colors, time, s) {
    for (let i = 0; i < grade; i++) {
        const a = time * 1.4 + (i / grade) * Math.PI * 2;
        const x = c.x + Math.cos(a) * 10 * s * Math.min(grade, 3) * 0.6;
        const y = c.y + Math.sin(a) * 3 * s;
        const color = colors[i % colors.length];
        const r = 3.4 * s;
        halo(ctx, x, y, 9 * s, color, 0.8);
        ctx.fillStyle = '#fff6e0';
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.4);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();
    }
}

// ── heroes (drawn in the hero's own units: feet at 0, about 48 tall) ────
export function drawHeroFusionUnder(ctx, parts, time) {
    const colors = fusionColors(parts);
    runeRing(ctx, { x: 0, y: 0 }, 17, 6, colors, time * 1.2, 1);
}

export function drawHeroFusionOver(ctx, parts, grade, time) {
    const colors = fusionColors(parts);
    parts.slice(1).forEach((part, i) => {
        const a = time * 2.2 + i * Math.PI;
        const x = Math.cos(a) * 16;
        const y = -26 + Math.sin(a) * 5 - Math.sin(time * 3 + i) * 2;
        const color = partColor(part);
        halo(ctx, x, y, 10, color, 0.9);
        ctx.fillStyle = '#fff6e8';
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.save();
        const alpha = ctx.globalAlpha;
        ctx.fillStyle = color;
        for (let t = 1; t <= 3; t++) {                // a little trail behind the spirit
            const b = a - t * 0.22;
            ctx.globalAlpha = alpha * (0.5 - t * 0.14);
            ctx.beginPath();
            ctx.arc(Math.cos(b) * 16, -26 + Math.sin(b) * 5, 2.2 - t * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
    gems(ctx, { x: 0, y: -58 }, grade, colors, time, 1);
}

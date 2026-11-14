import { FORM_INFO, HERO_INFO } from '../../data/labels.js';
import { halo, limbEnd, path, shade, stroke, withAlpha } from './primitives.js';

/**
 * Gear more than one class wears: a fused hero carries the marks of its
 * donors (backMarks, headMarks), so a Guardian may wear a Phantom's wings.
 */

/**
 * A fused hero wears what its donors were known for, in their form's colour:
 * the Warlord's cape, the Bastion's shield on the back, the Phantom's wings,
 * the Reaper's horns, the Archon's rune ring, the Arcanist's shards.
 * `backMarks` goes behind the body, `headMarks` on the head at (x, y).
 */
export function backMarks(ctx, p) {
    for (const form of p.marks) {
        const accent = FORM_INFO[form].accent;
        if (form === 'warlord') cape(ctx, accent, p.t, -5, -31, 22);
        else if (form === 'phantom') wings(ctx, accent, p.t);
        else if (form === 'bastion') backShield(ctx, accent);
        else if (form === 'arcanist') shards(ctx, accent, p.t);
    }
}

export function headMarks(ctx, p, x, y) {
    for (const form of p.marks) {
        const accent = FORM_INFO[form].accent;
        if (form === 'reaper') horns(ctx, accent, x, y);
        else if (form === 'archon') runeRing(ctx, accent, p.t, 2);
    }
}

/** A kite shield slung on the back, its rim in the Bastion's gold. */
function backShield(ctx, trim) {
    ctx.save();
    ctx.fillStyle = shade(HERO_INFO.guardian.color, 0.5);
    ctx.strokeStyle = trim;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-18, -34);
    ctx.lineTo(-7, -32);
    ctx.lineTo(-7, -15);
    ctx.quadraticCurveTo(-12, -6, -18, -13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = trim;
    ctx.fillRect(-13.4, -30, 1.8, 14);
    ctx.fillRect(-17, -24, 9, 1.8);
    ctx.restore();
}

export function leg(ctx, hipX, hipY, length, angle, color, width) {
    const knee = limbEnd(hipX, hipY, length * 0.5, angle);
    const foot = limbEnd(knee.x, knee.y, length * 0.5, angle * 0.4);
    stroke(ctx, color, width, [{ x: hipX, y: hipY }, knee, foot]);
    ctx.fillStyle = color;
    ctx.fillRect(foot.x - width * 0.5, foot.y - width * 0.45, width * 1.5, width * 0.9);
}

/** A cloak hanging from the shoulders, waving. */
export function cape(ctx, color, t, x, y, length) {
    const wave = Math.sin(t * 3) * 1.5;
    ctx.fillStyle = shade(color, 0.6);
    path(ctx, [{ x: x + 2, y }, { x: x - 8, y: y + length * 0.5 + wave }, { x: x - 10, y: y + length + wave }, { x: x + 1, y: y + length - 2 }]);
    ctx.fill();
}

/** Two horns (ascended Guardian and Reaper) above a head centred at (x, y). */
export function horns(ctx, color, x, y) {
    ctx.fillStyle = color;
    for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + side * 3, y + 3);
        ctx.quadraticCurveTo(x + side * 8, y - 1, x + side * 7, y - 7);
        ctx.quadraticCurveTo(x + side * 5, y - 2, x + side * 1, y + 1);
        ctx.closePath();
        ctx.fill();
    }
}

/** Two thin wings of light (the ascended Phantom). */
export function wings(ctx, color, t) {
    const beat = Math.sin(t * 6) * 0.15;
    ctx.save();
    ctx.globalAlpha *= 0.75;
    ctx.strokeStyle = color;
    ctx.fillStyle = withAlpha(color, 0.18);
    for (const k of [0, 1]) {
        ctx.beginPath();
        ctx.moveTo(-2, -27);
        ctx.quadraticCurveTo(-14 - k * 4, -44 + k * 6 - beat * 20, -22 - k * 3, -30 + k * 8);
        ctx.quadraticCurveTo(-12, -30 + k * 4, -2, -24);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    ctx.restore();
}

/** A ring of runes turning round the head (Archon); ascended, three orbs crown it. */
export function runeRing(ctx, color, t, tier) {
    ctx.save();
    ctx.strokeStyle = withAlpha(color, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0.5, -41, 9, 2.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    for (let i = 0; i < 6; i++) {
        const a = t * 1.5 + (i / 6) * Math.PI * 2;
        ctx.fillRect(0.5 + Math.cos(a) * 9 - 0.8, -41 + Math.sin(a) * 2.6 - 0.8, 1.6, 1.6);
    }
    if (tier === 3) {
        for (let i = 0; i < 3; i++) {
            const a = t * 0.8 + (i / 3) * Math.PI * 2;
            const ox = 0.5 + Math.cos(a) * 6;
            const oy = -47 + Math.sin(a) * 1.5;
            halo(ctx, ox, oy, 4, color, 0.9);
            ctx.fillStyle = '#fff6d8';
            ctx.beginPath();
            ctx.arc(ox, oy, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

/** Crystal shards floating round the ascended Arcanist. */
export function shards(ctx, color, t) {
    for (let i = 0; i < 3; i++) {
        const a = t * 1.2 + (i / 3) * Math.PI * 2;
        const x = Math.cos(a) * 12;
        const y = -24 + Math.sin(a) * 4 - 6;
        crystal(ctx, color, x, y, 2.4);
    }
}

export function crystal(ctx, color, x, y, r) {
    halo(ctx, x, y, r * 3, color, 0.7);
    ctx.fillStyle = color;
    path(ctx, [{ x, y: y - r * 1.8 }, { x: x + r, y }, { x, y: y + r * 1.8 }, { x: x - r, y }]);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    path(ctx, [{ x, y: y - r * 1.8 }, { x: x + r * 0.4, y }, { x, y: y + r * 0.6 }]);
    ctx.fill();
}

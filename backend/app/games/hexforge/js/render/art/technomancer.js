import { halo, lunge, shade, stroke, swing } from './primitives.js';
import { backMarks, crystal, headMarks, runeRing, shards } from './heroGear.js';

/** The Technomancer: floating robe, rune staff, charged orb. */

export function mage(ctx, color, p) {
    const hover = -3 + Math.sin(p.t * 2.2) * 1.5;
    ctx.translate(lunge(p.attack) * 2, hover);
    backMarks(ctx, p);
    const robe = ctx.createLinearGradient(0, -30, 0, 0);
    robe.addColorStop(0, shade(color, 0.55));
    robe.addColorStop(1, shade(color, 0.25));
    // robe with a hem that ripples as it floats
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(-4, -28);
    ctx.lineTo(4, -28);
    ctx.lineTo(9, 0);
    for (let i = 1; i <= 6; i++) {
        const hx = 9 - (18 * i) / 6;
        ctx.lineTo(hx, Math.sin(p.t * 5 + i) * 1.2 + (i % 2 ? 1.5 : 0));
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(1, -27);
    ctx.lineTo(3, -1);
    ctx.stroke();
    // a rune glowing on the chest
    halo(ctx, 0, -20, 6, color, 0.8 + 0.2 * Math.sin(p.t * 4));
    ctx.fillStyle = '#f1eaff';
    ctx.fillRect(-0.8, -23, 1.6, 6);
    ctx.fillRect(-2.5, -21, 5, 1.4);
    // hood
    ctx.fillStyle = shade(color, 0.75);
    ctx.beginPath();
    ctx.moveTo(-5, -27);
    ctx.quadraticCurveTo(-7, -38, 0, -40);
    ctx.quadraticCurveTo(6, -37, 5, -27);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#120a1c';
    ctx.beginPath();
    ctx.ellipse(1.5, -32, 3, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.form ? p.accent : '#e6d8ff';
    ctx.fillRect(1.2, -33, 3, 1.3);
    if (p.form === 'archon') runeRing(ctx, p.accent, p.t, p.tier);
    if (p.tier === 3 && p.form === 'arcanist') shards(ctx, p.accent, p.t);
    headMarks(ctx, p, 0.5, -40);
    staff(ctx, color, p);
}

function staff(ctx, color, p) {
    const angle = swing(p.attack, 0.12, -0.45, 0.95);   // from straight up, forward is positive
    const hand = { x: 6, y: -19 };
    const up = { x: Math.sin(angle), y: -Math.cos(angle) };
    stroke(ctx, '#3f2a5a', 3, [{ x: 2, y: -26 }, hand]);
    const long = p.form === 'arcanist' ? 6 : 0;
    const bottom = { x: hand.x - up.x * 13, y: hand.y - up.y * 13 };
    const top = { x: hand.x + up.x * (21 + long), y: hand.y + up.y * (21 + long) };
    stroke(ctx, p.form === 'arcanist' ? '#3a3f4a' : '#6b4a2e', 2, [bottom, top]);
    let charge = 0;
    if (p.attack !== null) charge = p.attack < 0 ? 1 + p.attack : Math.max(0, 1 - p.attack * 2);
    const orb = { x: top.x + up.x * 4, y: top.y + up.y * 4 + Math.sin(p.t * 3) * 1.2 };
    if (p.form === 'arcanist') {
        halo(ctx, orb.x, orb.y, 8 + charge * 14, p.accent, 0.8 + charge * 0.2);
        crystal(ctx, p.accent, orb.x, orb.y, 2.6 + charge);
        return;
    }
    halo(ctx, orb.x, orb.y, 9 + charge * (p.nova ? 26 : 14), p.form === 'archon' ? p.accent : color, 0.8 + charge * 0.2);
    ctx.fillStyle = '#f1eaff';
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 3 + charge * 1.6, 0, Math.PI * 2);
    ctx.fill();
}

/** Where the Technomancer's orb sits, relative to the feet, in unscaled units (for its bolts). */
export const MAGE_ORB = { x: 9, y: -46 };

import { halo, limbEnd, lunge, path, shade, stroke, swing } from './primitives.js';
import { backMarks, headMarks, horns, leg, wings } from './heroGear.js';

/** The Neon Blade: hooded assassin, twin energy daggers. */

const BLADE_DARK = '#1d1418';

export function blade(ctx, color, p) {
    const running = p.walk !== null;
    const step = running ? Math.sin(p.walk) : 0;
    bladeStance(ctx, p, running);
    const tuck = p.leap === null ? 1 : 0.55;
    bladeCloak(ctx, color, p, running);

    leg(ctx, -1, -13, 13 * tuck, -step * 0.9, BLADE_DARK, 3.6);
    const reach = p.form === 'reaper' ? 1.35 + 0.15 * (p.tier - 2) : 1;
    const edge = p.form === 'reaper' ? p.accent : color;
    dagger(ctx, edge, swing(p.attack, 0.9, -1.6, 2.1) - 0.5, { x: -2, y: -26 }, reach);
    // slim body
    ctx.fillStyle = '#2b1f27';
    path(ctx, [{ x: -5, y: -13 }, { x: -4, y: -29 }, { x: 4, y: -29 }, { x: 5, y: -13 }]);
    ctx.fill();
    ctx.fillStyle = color;
    path(ctx, [{ x: -1, y: -28 }, { x: 2, y: -28 }, { x: 3, y: -14 }, { x: -2, y: -14 }]);
    ctx.fill();
    leg(ctx, 1, -13, 13 * tuck, step * 0.9, '#2b1f27', 3.6);
    bladeHood(ctx, color, p);
    dagger(ctx, edge, swing(p.attack, 1.2, -1.2, 2.4), { x: 2, y: -26 }, reach);
    if (p.attack !== null && p.attack > -0.35 && p.attack < 0.8) slash(ctx, edge, p.attack);
}

/** Lunging into a blow, bobbing and leaning while running, or a tucked front flip over a wall. */
function bladeStance(ctx, p, running) {
    ctx.translate(lunge(p.attack) * 7, running ? -Math.abs(Math.cos(p.walk)) * 1.5 : 0);
    if (p.leap !== null) {
        ctx.translate(0, -16);
        ctx.rotate(p.leap * Math.PI * 2);
        ctx.translate(0, 16);
    } else if (running) {
        ctx.rotate(0.22);
    }
}

/** Scarf and cloak streaming behind (and the Phantom's ribbon and wings). */
function bladeCloak(ctx, color, p, running) {
    const wave = Math.sin(p.t * (running ? 14 : 4));
    backMarks(ctx, p);
    if (p.tier === 3 && p.form === 'phantom') wings(ctx, p.accent, p.t);
    if (p.form === 'phantom') {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-1, -27);
        ctx.quadraticCurveTo(-12, -27 - wave * 2, -21, -21 + wave * 2);
        ctx.stroke();
    }
    ctx.fillStyle = shade(color, 0.45);
    path(ctx, [{ x: -3, y: -30 }, { x: -14, y: -22 + wave * 2 }, { x: -11, y: -8 + wave }, { x: -2, y: -12 }]);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-1, -29);
    ctx.quadraticCurveTo(-9, -31 + wave * 2, -16, -27 - wave * 2);
    ctx.stroke();
}

/** Hood with burning eyes (the ascended Reaper grows horns). */
function bladeHood(ctx, color, p) {
    ctx.fillStyle = shade(color, 0.6);
    ctx.beginPath();
    ctx.moveTo(-5, -28);
    ctx.quadraticCurveTo(-6, -40, 1, -42);
    ctx.quadraticCurveTo(7, -38, 5, -28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = BLADE_DARK;
    ctx.beginPath();
    ctx.ellipse(2.5, -33, 3, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.form ? p.accent : '#ffe0ef';
    ctx.fillRect(2.5, -34, 2.6, 1.3);
    if (p.tier === 3 && p.form === 'reaper') horns(ctx, p.accent, 0, -40);
    headMarks(ctx, p, 0, -40);
}

function dagger(ctx, color, angle, shoulder, reach = 1) {
    const hand = limbEnd(shoulder.x, shoulder.y, 8, angle);
    stroke(ctx, '#2b1f27', 3, [shoulder, hand]);
    const tip = limbEnd(hand.x, hand.y, 10 * reach, angle - 0.6 * reach);
    halo(ctx, (hand.x + tip.x) / 2, (hand.y + tip.y) / 2, 8, color, 0.7);
    stroke(ctx, color, 2.6, [hand, tip]);
    stroke(ctx, '#ffffff', 1, [hand, tip]);
}

/** The bright arc a dagger leaves when it cuts. */
function slash(ctx, color, a) {
    const fade = a < 0 ? (a + 0.35) / 0.35 : 1 - a / 0.8;
    ctx.save();
    ctx.globalAlpha *= Math.max(0, fade);
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(2, -24, 17, -1.4, 0.9);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(2, -24, 17, -1.1, 0.7);
    ctx.stroke();
    ctx.restore();
}

import { halo, limbEnd, lunge, path, shade, stroke, swing } from './primitives.js';
import { backMarks, cape, headMarks, horns, leg } from './heroGear.js';

/** The Guardian: plate armour, tower shield, rune hammer. */

export function guardian(ctx, color, p) {
    const step = p.walk === null ? 0 : Math.sin(p.walk);
    const bob = p.walk === null ? 0 : -Math.abs(Math.cos(p.walk)) * 1.4;
    const push = lunge(p.attack) * 4;
    ctx.translate(push, bob);
    const steel = '#5b5f69';
    const dark = '#2a2c33';

    backMarks(ctx, p);
    if (p.form === 'warlord') cape(ctx, p.accent, p.t, -2, -30, 16);
    leg(ctx, -2, -15, 15, -step * 0.5, dark, 5);
    // hammer arm behind the body while resting or winding up
    const arm = swing(p.attack, 0.35, -2.7, 1.1, true);
    const striking = p.attack !== null && (p.attack > -0.3);
    const head = p.form === 'warlord' ? 1.25 + 0.15 * (p.tier - 2) : 1;
    if (!striking) hammer(ctx, color, arm, head, p.accent);

    // body: plate cuirass with the class tabard
    const body = ctx.createLinearGradient(-9, 0, 9, 0);
    body.addColorStop(0, '#3a3d45');
    body.addColorStop(0.5, '#7a7f8a');
    body.addColorStop(1, '#3a3d45');
    ctx.fillStyle = body;
    path(ctx, [{ x: -9, y: -14 }, { x: -10, y: -31 }, { x: 9, y: -31 }, { x: 8, y: -14 }]);
    ctx.fill();
    ctx.fillStyle = color;
    path(ctx, [{ x: -3, y: -29 }, { x: 4, y: -29 }, { x: 5, y: -9 }, { x: 0.5, y: -6 }, { x: -4, y: -9 }]);
    ctx.fill();
    ctx.fillStyle = p.form ? p.accent : '#d9a441';
    ctx.fillRect(-9, -16, 17, 2.4);
    leg(ctx, 2, -15, 15, step * 0.5, steel, 5);

    // great helm with a glowing visor and a plume
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.moveTo(-6, -31);
    ctx.lineTo(-6.5, -39);
    ctx.quadraticCurveTo(0, -46, 6.5, -39);
    ctx.lineTo(6, -31);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd36b';
    ctx.fillRect(0, -38, 6.5, 1.8);
    ctx.fillRect(3, -38, 1.6, 5);
    ctx.fillStyle = p.form === 'warlord' ? p.accent : color;        // the warlord's plume burns red
    ctx.beginPath();
    ctx.moveTo(-1, -44);
    ctx.quadraticCurveTo(-10, -48 + Math.sin(p.t * 6) * 1.5, -13, -40);
    ctx.quadraticCurveTo(-7, -43, -1, -42);
    ctx.fill();
    // pauldron
    ctx.fillStyle = '#80858f';
    ctx.beginPath();
    ctx.ellipse(-1, -30, 7, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    if (p.form) {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }
    if (p.tier === 3) horns(ctx, p.form === 'warlord' ? '#2a2c33' : p.accent, 0, -41);
    headMarks(ctx, p, 0, -41);

    if (striking) hammer(ctx, color, arm, head, p.accent);
    const big = p.form === 'bastion' ? 1.2 + 0.15 * (p.tier - 2) : 1;
    shield(ctx, color, push * 0.5, big, p.form ? p.accent : '#d9a441');
}

function hammer(ctx, color, angle, size = 1, accent = color) {
    const shoulder = { x: -2, y: -29 };
    const hand = limbEnd(shoulder.x, shoulder.y, 10, angle);
    stroke(ctx, '#4a4d55', 4.5, [shoulder, hand]);
    const tip = limbEnd(hand.x, hand.y, 15, angle);
    stroke(ctx, '#6b4a2e', 2.4, [limbEnd(hand.x, hand.y, -4, angle), tip]);
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(-angle);
    ctx.scale(size, size);
    ctx.fillStyle = '#3d4048';
    ctx.fillRect(-6, -3.5, 12, 7);
    ctx.fillStyle = '#9aa0ab';
    ctx.fillRect(-6, -3.5, 12, 1.6);
    if (size > 1) {
        // the warlord's spikes
        ctx.fillStyle = accent;
        path(ctx, [{ x: -6, y: -3.5 }, { x: -9, y: 0 }, { x: -6, y: 3.5 }]);
        ctx.fill();
        path(ctx, [{ x: 6, y: -3.5 }, { x: 9, y: 0 }, { x: 6, y: 3.5 }]);
        ctx.fill();
        halo(ctx, 0, 0, 9, accent, 0.5);
    }
    ctx.fillStyle = color;
    ctx.fillRect(-1.5, -2.5, 3, 5);
    ctx.restore();
}

function shield(ctx, color, push, size = 1, trim = '#d9a441') {
    const x = 9 + push;
    ctx.save();
    ctx.translate(x, -20);
    ctx.scale(size, size);
    ctx.translate(-x, 20);
    ctx.fillStyle = shade(color, 0.55);
    ctx.strokeStyle = trim;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 4, -33);
    ctx.lineTo(x + 5, -31);
    ctx.lineTo(x + 5, -12);
    ctx.quadraticCurveTo(x + 1, -3, x - 4, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = size > 1 ? trim : color;
    ctx.fillRect(x - 0.5, -28, 2, 14);
    ctx.fillRect(x - 3, -22, 7, 2);
    ctx.restore();
}

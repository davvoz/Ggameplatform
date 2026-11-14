import { shade } from './primitives.js';

/** The Explorer, the hero sent on missions. */

/** The Explorer: wide-brimmed hat, a pack with a bedroll, a cape and a brass spyglass. */
export function explorer(ctx, color, p) {
    const step = p.walk === null ? 0 : Math.sin(p.walk);
    const bob = Math.abs(step) * -1.2;
    ctx.translate(0, bob);
    // boots and legs
    ctx.strokeStyle = '#3b2a1c';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(-3 + step * 3, 0);
    ctx.moveTo(2, -12);
    ctx.lineTo(3 - step * 3, 0);
    ctx.stroke();
    ctx.fillStyle = '#20150c';
    ctx.fillRect(-5.5 + step * 3, -2, 5, 2.4);
    ctx.fillRect(0.5 - step * 3, -2, 5, 2.4);
    // the pack on the back, a rolled blanket on top
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(-11, -27, 7, 13);
    ctx.fillStyle = '#9c6b3a';
    ctx.fillRect(-11, -27, 7, 2.5);
    ctx.fillStyle = shade(color, 0.8);
    ctx.beginPath();
    ctx.ellipse(-7.5, -29.5, 5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // a cape that sways
    ctx.fillStyle = shade(color, 0.45);
    ctx.beginPath();
    ctx.moveTo(-4, -28);
    ctx.quadraticCurveTo(-9 - step, -16, -7 + Math.sin(p.t * 3) * 1.2, -9);
    ctx.lineTo(-1, -12);
    ctx.closePath();
    ctx.fill();
    // coat, belt and buckle
    const coat = ctx.createLinearGradient(0, -29, 0, -11);
    coat.addColorStop(0, shade(color, 0.85));
    coat.addColorStop(1, shade(color, 0.5));
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-4.5, -29);
    ctx.lineTo(4.5, -29);
    ctx.lineTo(6, -11);
    ctx.lineTo(-6, -11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3b2a1c';
    ctx.fillRect(-5.5, -18, 11, 2.2);
    ctx.fillStyle = '#ffd36b';
    ctx.fillRect(-1, -18.3, 2.4, 2.8);
    // head and scarf
    ctx.fillStyle = '#e8b98c';
    ctx.beginPath();
    ctx.arc(0.5, -33, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c94a2e';
    ctx.fillRect(-4, -30, 9, 2.4);
    ctx.fillStyle = '#20150c';
    ctx.fillRect(2, -34, 1.6, 1.6);
    // the wide-brimmed hat
    ctx.fillStyle = '#5a3d22';
    ctx.beginPath();
    ctx.ellipse(0.5, -36.5, 9, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, -36.5);
    ctx.quadraticCurveTo(-3.5, -43, 0.5, -43);
    ctx.quadraticCurveTo(5, -43, 5, -36.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-3.8, -38.6, 8.6, 1.6);
    // arm raising a brass spyglass, glinting
    const raise = 0.5 + 0.5 * Math.sin(p.t * 0.9);
    ctx.save();
    ctx.translate(4, -26);
    ctx.rotate(-0.4 - raise * 0.6);
    ctx.strokeStyle = shade(color, 0.7);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(5, -1.8, 9, 3.6);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(12, -1.4, 2.4, 2.8);
    ctx.restore();
}

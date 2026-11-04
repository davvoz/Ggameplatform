import { Ink, RAINBOW } from '../../config/Palette.js';

/** The features of the storm: they are drawn live because they follow the runner. */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{rightSide: number, top: number, scale: number, danger: number, targetX: number, targetY: number}} state
 *   danger goes from 0 (mouth almost shut) to 1 (wide open)
 */
export function drawStormFace(ctx, { rightSide, top, scale, danger, targetX, targetY }) {
    const eyeY = top + scale * 118;
    const eyes = [rightSide - scale * 164, rightSide - scale * 76];

    for (const [i, eyeX] of eyes.entries()) {
        const rx = scale * (i === 0 ? 40 : 34);
        const ry = scale * (i === 0 ? 46 : 40);
        ctx.fillStyle = Ink.eye;
        ctx.strokeStyle = Ink.line;
        ctx.lineWidth = Math.max(2, scale * 4);
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const angle = Math.atan2(targetY - eyeY, targetX - eyeX);
        ctx.fillStyle = Ink.line;
        ctx.beginPath();
        ctx.arc(eyeX + Math.cos(angle) * rx * 0.46, eyeY + Math.sin(angle) * ry * 0.46, rx * 0.42, 0, Math.PI * 2);
        ctx.fill();
    }

    // the brows slope down towards the middle: it is angry
    ctx.strokeStyle = Ink.line;
    ctx.lineWidth = scale * 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(eyes[0] - scale * 44, eyeY - scale * 66);
    ctx.lineTo(eyes[0] + scale * 40, eyeY - scale * 36);
    ctx.moveTo(eyes[1] - scale * 34, eyeY - scale * 34);
    ctx.lineTo(eyes[1] + scale * 36, eyeY - scale * 58);
    ctx.stroke();

    const mouthX = (eyes[0] + eyes[1]) / 2;
    const mouthY = eyeY + scale * 76;
    const open = scale * (8 + danger * 28);
    ctx.fillStyle = Ink.line;
    ctx.beginPath();
    ctx.ellipse(mouthX, mouthY, scale * 54, open, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = Ink.eye;
    const tooth = scale * 12;
    for (const offset of [-26, 0, 26]) {
        const x = mouthX + offset * scale;
        ctx.beginPath();
        ctx.moveTo(x - tooth / 2, mouthY - open * 0.8);
        ctx.lineTo(x + tooth / 2, mouthY - open * 0.8);
        ctx.lineTo(x, mouthY - open * 0.8 + Math.min(tooth, open));
        ctx.closePath();
        ctx.fill();
    }
}

/** A child's lightning bolt. */
export function drawBolt(ctx, x, top, step, width) {
    const zig = [[0, 0], [-14, step], [6, step], [-20, step * 2.4], [14, step * 1.1], [0, step * 1.1], [24, 0]];
    ctx.fillStyle = RAINBOW[2];
    ctx.strokeStyle = Ink.line;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const [dx, dy] of zig) ctx.lineTo(x + dx * width, top + dy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

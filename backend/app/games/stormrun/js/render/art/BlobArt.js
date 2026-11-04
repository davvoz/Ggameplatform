import { Ink, RAINBOW } from '../../config/Palette.js';
import { SimConfig } from '../../config/SimConfig.js';
import { Rng } from '../../core/Rng.js';
import { bake, paperEdge, traceBlob } from './Bake.js';

/** The tempera blob: bodies by paint level and faces by mood, drawn once. */

const R = 50;
const SIZE = 170;
const BOIL_FRAMES = 3;
const FOOT_LENGTH = 0.36;

export const Mood = Object.freeze({
    CALM: 'calm',
    HURT: 'hurt',
    FLY: 'fly',
    JOY: 'joy',
    FEAR: 'fear',
});

/** Art units per metre of the runner. */
export const BLOB_ART_RADIUS = R;

// The outline shifts a little between frames: a hand-drawn "boil".
function silhouette(frame) {
    const phase = frame * 0.28;
    return (a) =>
        0.96 +
        0.09 * Math.sin(3 * a + 0.5 + phase) +
        0.06 * Math.sin(5 * a + 2.1 - phase) +
        0.03 * Math.sin(9 * a + 1 + phase * 2);
}

function paintBands(ctx, bands) {
    const rng = new Rng(11);
    const top = -R * 1.0;
    const height = R * 1.98;
    const bandHeight = height / RAINBOW.length;
    const phases = RAINBOW.map(() => rng.range(0, 6));

    for (let i = bands - 1; i >= 0; i--) {
        const y = top + height - bandHeight * (i + 1);
        ctx.fillStyle = RAINBOW[i];
        ctx.beginPath();
        ctx.moveTo(-R * 2, top + height + 4);
        ctx.lineTo(-R * 2, y);
        for (let x = -R * 2; x <= R * 2; x += R / 8) {
            ctx.lineTo(x, y + Math.sin(x / (R * 0.32) + phases[i]) * R * 0.035);
        }
        ctx.lineTo(R * 2, top + height + 4);
        ctx.closePath();
        ctx.fill();
    }
}

function brushStrokes(ctx) {
    const rng = new Rng(10);
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
        const y = rng.range(-R, R);
        const x = rng.range(-R * 1.2, R * 0.2);
        const length = R * rng.range(0.3, 1.1);
        ctx.strokeStyle = rng.chance(0.5) ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
        ctx.lineWidth = R * rng.range(0.02, 0.07);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + length / 2, y + rng.range(-R * 0.06, R * 0.06), x + length, y);
        ctx.stroke();
    }
}

function drawBody(ctx, frame, bands) {
    const shape = silhouette(frame);
    ctx.translate(SIZE / 2, SIZE / 2);
    paperEdge(ctx, () => traceBlob(ctx, shape, R * 1.09), Ink.shadow, Ink.edge, R * 0.075);

    traceBlob(ctx, shape, R);
    ctx.fillStyle = Ink.body;
    ctx.fill();

    ctx.save();
    traceBlob(ctx, shape, R);
    ctx.clip();
    paintBands(ctx, bands);
    brushStrokes(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.beginPath();
    ctx.ellipse(-R * 0.42, -R * 0.56, R * 0.3, R * 0.13, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawClosedEye(ctx, x, y, rx, ry) {
    ctx.fillStyle = Ink.eye;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 1.08, ry * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = Ink.line;
    ctx.lineWidth = rx * 0.44;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y + ry * 0.22, rx * 0.66, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
}

function drawOpenEye(ctx, x, y, rx, ry, look, pupilSize) {
    ctx.save();
    ctx.fillStyle = Ink.eye;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.clip();

    const pupil = rx * pupilSize;
    const px = x + look[0] * rx * 0.42;
    const py = y + look[1] * ry * 0.42;
    ctx.fillStyle = Ink.line;
    ctx.beginPath();
    ctx.arc(px, py, pupil, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = Ink.eye;
    ctx.beginPath();
    ctx.arc(px - pupil * 0.34, py - pupil * 0.4, pupil * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawMouth(ctx, kind, x, y) {
    ctx.strokeStyle = Ink.eye;
    ctx.lineWidth = R * 0.06;
    ctx.lineCap = 'round';
    ctx.beginPath();
    switch (kind) {
        case 'open':
            ctx.ellipse(x, y + R * 0.03, R * 0.13, R * 0.11, 0, 0, Math.PI * 2);
            ctx.fillStyle = Ink.line;
            ctx.fill();
            break;
        case 'wobble':
            ctx.moveTo(x - R * 0.15, y);
            ctx.quadraticCurveTo(x - R * 0.08, y - R * 0.08, x, y);
            ctx.quadraticCurveTo(x + R * 0.08, y + R * 0.08, x + R * 0.15, y);
            break;
        default:
            ctx.arc(x, y - R * 0.04, R * 0.13, Math.PI * 0.18, Math.PI * 0.82);
    }
    ctx.stroke();
}

const FACES = Object.freeze({
    [Mood.CALM]: { eye: 'open', look: [1, 0.1], pupil: 0.58, mouth: 'smile' },
    [Mood.HURT]: { eye: 'closed', mouth: 'wobble' },
    [Mood.FLY]: { eye: 'open', look: [1, -0.3], pupil: 0.58, mouth: 'open' },
    [Mood.JOY]: { eye: 'closed', mouth: 'open' },
    [Mood.FEAR]: { eye: 'open', look: [-1, -0.1], pupil: 0.38, mouth: 'wobble' },
});

function drawFace(ctx, face) {
    ctx.translate(SIZE / 2, SIZE / 2);
    const eyeX = R * 0.34;
    const eyeY = -R * 0.2;
    const rx = R * 0.25;
    const ry = R * 0.31;
    const gap = R * 0.5;
    const eyes = [
        [eyeX - gap / 2, rx, ry],
        [eyeX + gap / 2 + R * 0.04, rx * 0.92, ry * 0.94],
    ];

    for (const [x, eyeRx, eyeRy] of eyes) {
        if (face.eye === 'closed') drawClosedEye(ctx, x, eyeY, eyeRx, eyeRy);
        else drawOpenEye(ctx, x, eyeY, eyeRx, eyeRy, face.look, face.pupil);
    }
    drawMouth(ctx, face.mouth, eyeX + R * 0.03, eyeY + ry + R * 0.13);
}

/** One leg, from the hip to a foot pointing forward. */
export function drawLeg(ctx, hipX, hipY, footX, footY, radius) {
    ctx.strokeStyle = Ink.line;
    ctx.lineWidth = Math.max(2.5, radius * 0.17);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(footX, footY);
    ctx.lineTo(footX + radius * FOOT_LENGTH, footY);
    ctx.stroke();
}

/** Everything the runner needs on screen. */
export class BlobArt {
    /** bodies[bands][frame] */
    bodies = [];
    /** faces[mood] */
    faces = {};

    constructor() {
        for (let bands = 0; bands <= SimConfig.paint.bands; bands++) {
            const frames = [];
            for (let frame = 0; frame < BOIL_FRAMES; frame++) {
                frames.push(bake(SIZE, SIZE, (ctx) => drawBody(ctx, frame, bands)));
            }
            this.bodies.push(frames);
        }
        for (const [mood, face] of Object.entries(FACES)) {
            this.faces[mood] = bake(SIZE, SIZE, (ctx) => drawFace(ctx, face));
        }
    }

    /** @returns {import('./Bake.js').Sprite} */
    body(bands, time) {
        return this.bodies[bands][Math.floor(time * 7) % BOIL_FRAMES];
    }
}

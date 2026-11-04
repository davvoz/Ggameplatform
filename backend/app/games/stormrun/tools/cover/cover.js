import { Biomes, Ink, RAINBOW } from '../../js/config/Palette.js';
import { FONT_FACES } from '../../js/config/Typography.js';
import { loadFonts } from '../../js/core/loadFonts.js';
import { Rng } from '../../js/core/Rng.js';
import { bake, drawSprite } from '../../js/render/art/Bake.js';
import { BlobArt, BLOB_ART_RADIUS, drawLeg, Mood } from '../../js/render/art/BlobArt.js';
import { bakeDecor, bakeGrain } from '../../js/render/art/DecorArt.js';
import { bakeObstacles } from '../../js/render/art/ObstacleArt.js';
import { bakeDrops } from '../../js/render/art/PickupArt.js';
import { bakeClouds, bakeStormHead, bakeSun, bakeVillage, STORM_ART } from '../../js/render/art/SceneryArt.js';
import { drawBolt, drawStormFace } from '../../js/render/art/StormFace.js';
import { drawTitle } from '../../js/render/art/TitleArt.js';

/**
 * The cover of the game, a poster rather than a screenshot: the storm opens its
 * mouth, the blob jumps a stump and paints the sky behind it. It uses the art of
 * the game, so the two cannot drift apart. Everything that matters stays in the
 * middle 1000 units: the catalogue crops the sides on narrow cards.
 */

const WIDTH = 1280;
const HEIGHT = 720;
const SAVES = Object.freeze([
    { name: 'thumbnail.png', width: WIDTH, height: HEIGHT, type: 'image/png' },
    { name: 'thumbnail_preview.webp', width: 640, height: 360, type: 'image/webp', quality: 0.86 },
]);

const COLORS = Biomes[0];
const BLOB = Object.freeze({ x: 806, y: 386, radius: 86, tilt: -0.2 });
const STORM = Object.freeze({ rightSide: 596, top: 138, scale: 1.32 });
const TRAIL = Object.freeze({ from: [392, 640], control: [590, 150], to: [BLOB.x - 30, BLOB.y + 10] });
const SUN = Object.freeze({ x: 1118, y: 326, scale: 1.4 });
const TRAIL_BAND = 15;
const RAIN_STREAKS = 70;

const groundY = (x) => 610 + Math.sin(x / 190 + 0.8) * 20 + Math.sin(x / 83) * 6 - (x / WIDTH) * 16;

/** A closed strip of land under a wandering top line. */
function fillLand(ctx, topAt, color, line) {
    ctx.beginPath();
    ctx.moveTo(-10, HEIGHT + 10);
    for (let x = -10; x <= WIDTH + 10; x += 8) ctx.lineTo(x, topAt(x));
    ctx.lineTo(WIDTH + 10, HEIGHT + 10);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (!line) return;

    ctx.beginPath();
    for (let x = -10; x <= WIDTH + 10; x += 8) ctx.lineTo(x, topAt(x));
    ctx.strokeStyle = Ink.line;
    ctx.lineWidth = line;
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function drawSky(ctx, sun, clouds) {
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    drawSprite(ctx, clouds[1], 1238, 214, 0.86);

    ctx.save();
    ctx.translate(SUN.x, SUN.y);
    ctx.rotate(0.2);
    drawSprite(ctx, sun.rays, 0, 0, SUN.scale);
    ctx.restore();
    drawSprite(ctx, sun.worried, SUN.x, SUN.y, SUN.scale);
}

function drawCountry(ctx, village) {
    const far = (x) => 470 + Math.sin(x / 150 + 2) * 34 + Math.sin(x / 61) * 8;
    const near = (x) => 528 + Math.sin(x / 120 + 4.2) * 24;
    fillLand(ctx, far, COLORS.far, 2);
    for (const [sprite, x, scale] of [
        [village.cypress, 610, 0.8],
        [village.church, 1190, 0.86],
    ]) {
        drawSprite(ctx, sprite, x, far(x) + 6, scale);
    }
    fillLand(ctx, near, COLORS.near, 2);
    for (const [sprite, x, scale] of [
        [village.tree, 688, 0.9],
        [village.house, 960, 0.92],
    ]) {
        drawSprite(ctx, sprite, x, near(x) + 6, scale);
    }
}

function trailPoint(t) {
    const { from, control, to } = TRAIL;
    const u = 1 - t;
    return [
        u * u * from[0] + 2 * u * t * control[0] + t * t * to[0],
        u * u * from[1] + 2 * u * t * control[1] + t * t * to[1],
    ];
}

/** The path the blob flew, painted in seven hand-laid stripes. */
function drawTrail(ctx) {
    const steps = 64;
    const line = (offset, seed) => {
        const rng = new Rng(seed);
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const [x, y] = trailPoint(t);
            const [nextX, nextY] = trailPoint(Math.min(1, t + 0.01));
            const [prevX, prevY] = trailPoint(Math.max(0, t - 0.01));
            const length = Math.hypot(nextX - prevX, nextY - prevY);
            const wander = rng.range(-1, 1);
            ctx.lineTo(
                x + ((nextY - prevY) / length) * (offset + wander),
                y - ((nextX - prevX) / length) * (offset + wander)
            );
        }
    };

    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    line(0, 1);
    ctx.strokeStyle = Ink.line;
    ctx.lineWidth = TRAIL_BAND * RAINBOW.length + 8;
    ctx.stroke();

    RAINBOW.forEach((color, i) => {
        line((3 - i) * TRAIL_BAND, 10 + i);
        ctx.strokeStyle = color;
        ctx.lineWidth = TRAIL_BAND + 1.5;
        ctx.stroke();
    });
}

function drawStormSky(ctx) {
    const edgeAt = (y) => 372 + Math.sin(y / 74 + 1) * 22 + Math.sin(y / 31) * 7;

    ctx.fillStyle = Ink.storm;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let y = 0; y <= HEIGHT; y += 10) ctx.lineTo(edgeAt(y), y);
    ctx.lineTo(0, HEIGHT);
    ctx.closePath();
    ctx.fill();

    const rng = new Rng(5);
    ctx.strokeStyle = Ink.rain;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < RAIN_STREAKS; i++) {
        const y = rng.range(380, 640);
        const x = rng.range(0, edgeAt(y) - 8);
        ctx.moveTo(x, y);
        ctx.lineTo(x - 7, y + 30);
    }
    ctx.stroke();
}

function drawGround(ctx, decor) {
    fillLand(ctx, groundY, COLORS.ground, 5);
    fillLand(ctx, (x) => groundY(x) + 44 + Math.sin(x / 140) * 9, COLORS.ground2, 0);
    fillLand(ctx, (x) => groundY(x) + 88 + Math.sin(x / 110 + 2) * 8, COLORS.ground3, 0);

    ctx.strokeStyle = Ink.line;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = 20; x < WIDTH; x += 46) {
        const y = groundY(x) + 22 + (x % 3) * 3;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 7, y + 14);
    }
    ctx.stroke();

    for (const [index, x, scale] of [[0, 470, 1.5], [1, 556, 1.7], [3, 650, 1.7], [0, 690, 1.3], [5, 1012, 1.7], [2, 1120, 1.4]]) {
        drawSprite(ctx, decor[index], x, groundY(x) + 2, scale);
    }
}

function drawBlob(ctx, art) {
    const { x, y, radius, tilt } = BLOB;
    const scale = radius / BLOB_ART_RADIUS;
    const body = art.bodies.at(-1)[0];
    const face = art.faces[Mood.FLY];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    drawLeg(ctx, radius * 0.16, radius * 0.72, radius * 0.72, radius * 1.16, radius);
    drawLeg(ctx, -radius * 0.2, radius * 0.72, -radius * 0.74, radius * 1.02, radius);
    ctx.scale(scale, scale);
    ctx.drawImage(body.canvas, -body.anchorX, -body.anchorY, body.width, body.height);
    ctx.drawImage(face.canvas, -face.anchorX, -face.anchorY, face.width, face.height);
    ctx.restore();
}

function drawStormHead(ctx, head) {
    const { rightSide, top, scale } = STORM;
    const width = STORM_ART.width * scale;
    const height = STORM_ART.height * scale;
    drawBolt(ctx, rightSide - 330, top + height - 34, 48, 3.2);
    ctx.drawImage(head.canvas, rightSide - width, top, width, height);
    drawStormFace(ctx, { rightSide, top, scale, danger: 1, targetX: BLOB.x, targetY: BLOB.y });
}

function paint(ctx) {
    const village = bakeVillage();
    const drops = bakeDrops();
    const obstacles = bakeObstacles();

    drawSky(ctx, bakeSun(), bakeClouds());
    drawCountry(ctx, village);
    drawTrail(ctx);
    drawStormSky(ctx);
    drawGround(ctx, bakeDecor());

    drawSprite(ctx, obstacles.stump, 812, groundY(812) - 36, 1.34);
    drawSprite(ctx, village.sheep, 1146, groundY(1146) + 6, 1.35);
    for (const [color, x, y, scale] of [[1, 952, 372, 1.45], [3, 1040, 452, 1.45], [4, 1128, 498, 1.3], [6, 1212, 530, 1.15]]) {
        drawSprite(ctx, drops[color], x, y, scale);
    }

    drawBlob(ctx, new BlobArt());
    drawStormHead(ctx, bakeStormHead());
    drawTitle(ctx, WIDTH / 2, 142, 138);

    ctx.fillStyle = ctx.createPattern(bakeGrain(), 'repeat');
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

async function save(picture, { name, width, height, type, quality }) {
    const output = bake(width, height, (ctx) => {
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(picture, 0, 0, width, height);
    }, { resolution: 1 }).canvas;
    const blob = await new Promise((resolve) => output.toBlob(resolve, type, quality));
    await fetch(`/save/${name}`, { method: 'POST', body: blob });
}

await loadFonts(FONT_FACES);
const picture = document.getElementById('cover');
paint(picture.getContext('2d'));

if (new URLSearchParams(location.search).has('save')) {
    for (const target of SAVES) await save(picture, target);
    await fetch('/done', { method: 'POST' });
}
document.title = 'done';

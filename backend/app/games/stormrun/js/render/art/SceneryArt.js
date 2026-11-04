import { Ink, RAINBOW } from '../../config/Palette.js';
import { bake } from './Bake.js';
import { inkCircle, inkLumps, inkShape, inkStroke } from './InkPen.js';

/** The little painted country the blob runs through. */

function drawHouse(ctx, wall, roof) {
    inkShape(ctx, [[12, 44], [68, 44], [68, 90], [12, 90]], wall, 1);
    inkShape(ctx, [[4, 46], [40, 12], [76, 46]], roof, 2);
    inkShape(ctx, [[33, 62], [47, 62], [47, 90], [33, 90]], Ink.woodDark, 3);
    inkShape(ctx, [[18, 54], [28, 54], [28, 64], [18, 64]], Ink.waterLight, 4);
    inkShape(ctx, [[52, 54], [62, 54], [62, 64], [52, 64]], Ink.waterLight, 5);
    inkShape(ctx, [[54, 14], [62, 14], [62, 34], [54, 26]], wall, 6);
}

function drawChurch(ctx) {
    inkShape(ctx, [[8, 72], [72, 72], [72, 118], [8, 118]], '#f4e4c4', 7);
    inkShape(ctx, [[2, 74], [40, 50], [78, 74]], RAINBOW[0], 8);
    inkShape(ctx, [[60, 30], [92, 30], [92, 118], [60, 118]], '#eed7ae', 9);
    inkShape(ctx, [[56, 32], [76, 2], [96, 32]], RAINBOW[5], 10);
    inkCircle(ctx, 76, 48, 7, Ink.edge, 11, 10);
    inkStroke(ctx, [[76, 48], [76, 43]], 12, 1.6);
    inkStroke(ctx, [[76, 48], [80, 50]], 13, 1.6);
    inkShape(ctx, [[30, 92], [44, 92], [44, 118], [30, 118]], Ink.woodDark, 14);
}

function drawWindmill(ctx) {
    inkShape(ctx, [[30, 44], [70, 44], [78, 124], [22, 124]], '#f2dcb8', 15);
    inkShape(ctx, [[26, 46], [50, 22], [74, 46]], RAINBOW[0], 16);
    for (const [x, y] of [[50, 2], [92, 42], [52, 84], [8, 44]]) {
        inkShape(ctx, [[50, 42], [x - 6, y], [x + 6, y + 6]], Ink.edge, 17 + x);
    }
    inkCircle(ctx, 50, 42, 4, Ink.woodDark, 19, 8);
    inkShape(ctx, [[42, 98], [58, 98], [58, 124], [42, 124]], Ink.woodDark, 20);
}

function drawLollipopTree(ctx, color) {
    inkShape(ctx, [[30, 62], [40, 62], [42, 104], [28, 104]], Ink.wood, 21);
    inkCircle(ctx, 35, 36, 30, color, 22, 18);
    inkStroke(ctx, [[22, 30], [30, 38], [40, 26], [46, 36]], 23, 1.5);
}

function drawCypress(ctx) {
    inkShape(ctx, [[20, 4], [36, 50], [34, 96], [6, 96], [4, 50]], Ink.leaf, 24);
    inkStroke(ctx, [[20, 24], [14, 40]], 25, 1.4);
    inkStroke(ctx, [[22, 50], [16, 70]], 26, 1.4);
}

function drawSheep(ctx) {
    inkStroke(ctx, [[18, 40], [18, 52]], 27, 3);
    inkStroke(ctx, [[42, 40], [42, 52]], 28, 3);
    inkLumps(ctx, [[16, 26, 11], [30, 20, 13], [44, 27, 11], [30, 32, 12]], '#fbf6ea');
    inkCircle(ctx, 56, 24, 8, Ink.line, 29, 10);
    ctx.fillStyle = Ink.eye;
    ctx.beginPath();
    ctx.arc(58, 22, 2.2, 0, Math.PI * 2);
    ctx.fill();
}

/** Far buildings and creatures, anchored at their feet. */
export function bakeVillage() {
    const planted = (width, height, draw) => bake(width, height, draw, { anchorX: width / 2, anchorY: height - 8 });
    return {
        house: planted(84, 98, (ctx) => drawHouse(ctx, '#f5e6c8', RAINBOW[0])),
        blueHouse: planted(84, 98, (ctx) => drawHouse(ctx, '#d6e6ea', RAINBOW[4])),
        yellowHouse: planted(84, 98, (ctx) => drawHouse(ctx, RAINBOW[2], '#b5563a')),
        church: planted(102, 126, drawChurch),
        windmill: planted(104, 132, drawWindmill),
        tree: planted(72, 112, (ctx) => drawLollipopTree(ctx, RAINBOW[3])),
        orangeTree: planted(72, 112, (ctx) => drawLollipopTree(ctx, RAINBOW[1])),
        cypress: planted(42, 104, drawCypress),
        sheep: planted(70, 60, drawSheep),
    };
}

function drawCloud(ctx, lumps, sleepy) {
    inkLumps(ctx, lumps, '#fbf6ea');
    if (!sleepy) return;
    inkStroke(ctx, [[72, 42], [84, 44]], 31, 2.4);
    inkStroke(ctx, [[100, 44], [112, 42]], 32, 2.4);
    inkStroke(ctx, [[86, 56], [92, 59], [98, 56]], 33, 2.2);
}

/** Sky clouds. @returns {import('./Bake.js').Sprite[]} */
export function bakeClouds() {
    return [
        bake(190, 96, (ctx) => drawCloud(ctx, [[42, 58, 28], [88, 44, 36], [136, 56, 30], [90, 66, 24]], true)),
        bake(150, 76, (ctx) => drawCloud(ctx, [[36, 46, 22], [76, 34, 28], [112, 46, 24], [74, 52, 18]], false)),
    ];
}

const SUN_RAYS = 12;

function drawSunRays(ctx) {
    ctx.translate(80, 80);
    for (let i = 0; i < SUN_RAYS; i++) {
        const angle = (i / SUN_RAYS) * Math.PI * 2;
        const long = i % 2 === 0 ? 74 : 62;
        const side = 0.14;
        inkShape(ctx, [
            [Math.cos(angle - side) * 46, Math.sin(angle - side) * 46],
            [Math.cos(angle) * long, Math.sin(angle) * long],
            [Math.cos(angle + side) * 46, Math.sin(angle + side) * 46],
        ], RAINBOW[1], 40 + i);
    }
}

function drawSunDisc(ctx, mood) {
    ctx.translate(80, 80);
    inkCircle(ctx, 0, 0, 46, RAINBOW[2], 60, 24);
    ctx.fillStyle = 'rgba(229,72,63,0.28)';
    for (const x of [-27, 27]) {
        ctx.beginPath();
        ctx.ellipse(x, 11, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    if (mood === 'worried') {
        inkStroke(ctx, [[-24, -18], [-10, -24]], 61, 2.6);
        inkStroke(ctx, [[10, -24], [24, -18]], 62, 2.6);
        inkCircle(ctx, -15, -7, 5, Ink.line, 63, 10);
        inkCircle(ctx, 15, -7, 5, Ink.line, 64, 10);
        inkStroke(ctx, [[-12, 22], [-4, 17], [4, 22], [12, 17]], 65, 2.8);
        return;
    }

    inkCircle(ctx, -15, -8, 5, Ink.line, 66, 10);
    inkCircle(ctx, 15, -8, 5, Ink.line, 67, 10);
    inkStroke(ctx, [[-17, 14], [-8, 23], [8, 23], [17, 14]], 68, 3);
}

/** The sun of a child's drawing: rays turn apart, the face follows the game. */
export function bakeSun() {
    const size = 160;
    return {
        rays: bake(size, size, drawSunRays),
        happy: bake(size, size, (ctx) => drawSunDisc(ctx, 'happy')),
        worried: bake(size, size, (ctx) => drawSunDisc(ctx, 'worried')),
    };
}

const STORM_WIDTH = 460;
const STORM_HEIGHT = 300;

function drawStormHead(ctx) {
    const lumps = [
        [70, 130, 70], [150, 90, 86], [250, 74, 92], [340, 104, 80], [396, 158, 56],
        [90, 196, 62], [190, 200, 74], [290, 204, 68], [370, 196, 44],
    ];
    inkLumps(ctx, lumps, Ink.stormCloud, 4);
    ctx.fillStyle = Ink.stormCloudLight;
    for (const [x, y, rx, ry] of [[140, 48, 46, 14], [262, 34, 52, 13], [356, 74, 28, 10]]) {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, -0.12, 0, Math.PI * 2);
        ctx.fill();
    }
}

/** The villain, without eyes and mouth: those follow the runner live. */
export function bakeStormHead() {
    return bake(STORM_WIDTH, STORM_HEIGHT, drawStormHead, { anchorX: STORM_WIDTH, anchorY: 0 });
}

export const STORM_ART = Object.freeze({ width: STORM_WIDTH, height: STORM_HEIGHT });

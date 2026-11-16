import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES } from '../js/config/Themes.js';
import { ROAD, SCREEN } from '../js/config/Tuning.js';
import { mixPixel, rgbOf, toPixel } from '../js/render/color.js';
import { projectRoad } from '../js/render/road/project.js';
import { paintRoad } from '../js/render/road/raster.js';
import { RoadPalette } from '../js/render/road/RoadPalette.js';
import { fitScreen, focalLength } from '../js/render/screen.js';
import { squareTrack } from './support/track.js';

const VIEW = { width: 320, height: 180, horizon: 72, focal: focalLength(SCREEN) };
const COLORS = { grass: 1, rumble: 2, asphalt: 3, lane: 4 };

function camera(track, z, x = 0) {
    return { x, y: 1000 + track.elevationAt(z), z };
}

test('on a straight flat road the strips climb towards the horizon and narrow', () => {
    const track = squareTrack();
    const strips = projectRoad(track, camera(track, 12000), VIEW, { ...ROAD, drawDistance: 20 });
    assert.ok(strips.length >= 19);
    strips.forEach((strip, i) => {
        assert.ok(strip.far.y < strip.near.y && strip.far.y > VIEW.horizon);
        assert.ok(strip.far.w < strip.near.w);
        if (i > 0) assert.equal(strip.near.y, strips[i - 1].far.y);
    });
    assert.ok(Math.abs(strips.at(-1).far.x - VIEW.width / 2) < 2, 'centred');
});

test('a bend slides the far road its way, the camera slides it the other way', () => {
    const track = squareTrack();
    // the first corner of the square is a right turn (map y grows downwards)
    const corner = track.length / 4 - 3000;
    const strips = projectRoad(track, camera(track, corner), VIEW, ROAD);
    assert.ok(strips.at(-1).far.x > VIEW.width / 2 + 50, 'the road bends right');
    const aside = projectRoad(track, camera(track, 12000, 800), VIEW, ROAD);
    assert.ok(aside[0].far.x < VIEW.width / 2, 'a camera on the right sees the road on its left');
});

test('rows the road does not reach stay clear for the backdrop', () => {
    const track = squareTrack();
    const pixels = new Uint32Array(VIEW.width * VIEW.height);
    const strips = projectRoad(track, camera(track, 2000), VIEW, ROAD);
    const top = paintRoad(pixels, VIEW.width, VIEW.height, strips, () => COLORS, 3);
    assert.ok(top > VIEW.horizon - 2 && top < VIEW.horizon + 6, `top ${top}`);
    assert.equal(pixels[(top - 1) * VIEW.width], 0);
    const bottom = (VIEW.height - 1) * VIEW.width;
    assert.equal(pixels[bottom], COLORS.grass);
    assert.equal(pixels[bottom + VIEW.width / 2 + 20], COLORS.asphalt);
});

test('a nearer crest hides the road behind it', () => {
    const pixels = new Uint32Array(10 * 10);
    const edge = (y, w = 2) => ({ x: 5, y, w });
    const strips = [
        { index: 0, n: 1, near: edge(10, 4), far: edge(5) }, // up to the crest at row 5
        { index: 1, n: 2, near: edge(5), far: edge(8) }, // beyond it: seen from behind
        { index: 2, n: 3, near: edge(8), far: edge(6) }, // lower than the crest: hidden
        { index: 3, n: 4, near: edge(4), far: edge(2, 1) }, // higher: shows above it
    ];
    const painted = [];
    const top = paintRoad(pixels, 10, 10, strips, (strip) => {
        painted.push(strip.index);
        return COLORS;
    }, 2);
    assert.deepEqual(painted, [0, 3]);
    assert.equal(top, 2);
});

test('the far road fades into the fog in steps, the start line is white', () => {
    const palette = new RoadPalette(THEMES.dusk, ROAD);
    const near = palette.colorsOf({ index: 3, n: 1 });
    const far = palette.colorsOf({ index: 3, n: ROAD.drawDistance });
    assert.equal(near.grass, toPixel(rgbOf(THEMES.dusk.road.grass[1])));
    assert.equal(far.grass, toPixel(rgbOf(THEMES.dusk.fog)));
    assert.equal(palette.colorsOf({ index: 0, n: 5 }).asphalt, toPixel(rgbOf(THEMES.dusk.road.start)));
    assert.equal(palette.colorsOf({ index: ROAD.bandSegments, n: 5 }).lane, null);
    assert.equal(mixPixel('#000000', '#ffffff', 0.5), toPixel([128, 128, 128]));
});

test('the frame keeps its height and takes the screen shape within limits', () => {
    assert.equal(fitScreen(1280, 720, SCREEN).width, 320);
    assert.equal(fitScreen(844, 390, SCREEN).width, 390);
    const wide = fitScreen(3000, 720, SCREEN);
    assert.equal(wide.width, SCREEN.maxWidth);
    assert.equal(wide.cssHeight, 720);
    const tall = fitScreen(400, 800, SCREEN);
    assert.equal(tall.width, SCREEN.minWidth);
    assert.equal(tall.cssWidth, 400);
});

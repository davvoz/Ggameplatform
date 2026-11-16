import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shrinkPixels } from '../js/render/art/shrink.js';

const CLEAR = 0;
/** Pixel words are ABGR: 0xAABBGGRR. */
const RED = 0xff0000ff;
const BLUE = 0xffff0000;
const PURPLE = 0xff800080;

/** Rows of letters as pixel words: '.' clear, r red, b blue. */
function pixels(rows) {
    const word = { '.': CLEAR, r: RED, b: BLUE };
    return Uint32Array.from(rows.join('').split('').map((letter) => word[letter]));
}

const channels = (pixel) => [pixel & 255, (pixel >>> 8) & 255, (pixel >>> 16) & 255, pixel >>> 24];

test('each new pixel is the average of the old ones it covers', () => {
    const source = pixels([
        'rrrb',
        'rrbb',
        'bbbb',
        'bbbb',
    ]);
    const [topLeft, topRight, bottomLeft] = shrinkPixels(source, 4, 4, 2, 2);
    assert.equal(topLeft, RED);
    assert.deepEqual(channels(topRight), [64, 0, 191, 255], 'one red in four');
    assert.equal(bottomLeft, BLUE);
    assert.equal(shrinkPixels(pixels(['rb']), 2, 1, 1, 1)[0], PURPLE);
});

test('a pixel mostly clear stays clear; clear pixels do not darken the colour', () => {
    const source = pixels([
        'rrrr',
        'rrrr',
        '...r',
        '....',
    ]);
    assert.deepEqual([...shrinkPixels(source, 4, 4, 2, 2)], [RED, RED, CLEAR, CLEAR]);
    assert.deepEqual([...shrinkPixels(pixels(['r.']), 2, 1, 1, 1)], [RED], 'half covered is solid, in its own colour');
});

test('a pixel covering part of an old one counts only that part', () => {
    // 3 -> 2: the middle old pixel is split between the two new ones
    const [left, right] = shrinkPixels(pixels(['rbb']), 3, 1, 2, 1);
    assert.deepEqual(channels(left), [170, 0, 85, 255]);
    assert.equal(right, BLUE);
});

test('the same art at the same size is always the same pixels', () => {
    const source = pixels(['rb.r', 'br.b', 'rrbb', '.b.r', 'b..r', 'rbrb']);
    const once = shrinkPixels(source, 4, 6, 3, 4);
    assert.deepEqual(once, shrinkPixels(source, 4, 6, 3, 4));
    assert.equal(once.length, 12);
});

test('a car shrinking a pixel at a time changes only a little each time', () => {
    // a 24-wide block of stripes, like the rows of a car
    const width = 24;
    const height = 8;
    const source = Uint32Array.from({ length: width * height }, (_, i) => (Math.floor(i / width) % 2 ? RED : BLUE));
    let before = null;
    for (let w = 6; w <= width; w++) {
        const now = shrinkPixels(source, width, height, w, Math.round((w * height) / width));
        const red = now.reduce((sum, pixel) => sum + (pixel & 255), 0) / now.length;
        if (before !== null) assert.ok(Math.abs(red - before) < 40, `width ${w}: ${before} -> ${red}`);
        before = red;
    }
});

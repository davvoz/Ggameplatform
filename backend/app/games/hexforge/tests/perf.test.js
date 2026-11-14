import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FrameWatch, detectPerf, perf } from '../js/render/perf.js';

const media = (coarse, fine) => (query) => ({ matches: query.includes('coarse') ? coarse : fine });

test('performance mode is on for touch-only devices and off for desktops', () => {
    assert.equal(detectPerf('', media(true, false)), true);
    assert.equal(detectPerf('', media(false, true)), false);
    assert.equal(detectPerf('', media(true, true)), false);      // a tablet with a mouse
    assert.equal(detectPerf('', undefined), false);
});

test('the address can force performance mode either way', () => {
    assert.equal(detectPerf('?perf=on', media(false, true)), true);
    assert.equal(detectPerf('?perf=off', media(true, false)), false);
});

test('a device that keeps missing frames is asked for a lower quality', () => {
    const watch = new FrameWatch({ size: 10, warmup: 0 });
    let asked = false;
    for (let i = 0; i < 10; i++) asked = watch.sample(i < 4 ? 34 : 16, 1000 + i);
    assert.equal(asked, true);
});

test('a smooth device, the warm-up and stalls never lower the quality', () => {
    const smooth = new FrameWatch({ size: 10, warmup: 0 });
    for (let i = 0; i < 30; i++) assert.equal(smooth.sample(i % 5 === 0 ? 34 : 16, 1000 + i), false);
    const warming = new FrameWatch({ size: 10, warmup: 3000 });
    for (let i = 0; i < 30; i++) assert.equal(warming.sample(40, 100 + i), false);
    const stalled = new FrameWatch({ size: 10, warmup: 0 });
    for (let i = 0; i < 30; i++) assert.equal(stalled.sample(500, 1000 + i), false);
});

test('after a drop the watcher waits before asking again', () => {
    const watch = new FrameWatch({ size: 5, warmup: 0, cooldown: 5000 });
    const asks = [];
    for (let i = 0; i < 20; i++) asks.push(watch.sample(40, 1000 + i));
    assert.equal(asks.filter(Boolean).length, 1);
});

test('quality steps down to a floor and stays there', () => {
    const before = perf.level;
    perf.level = 0;
    assert.equal(perf.dpr, 1.5);
    assert.equal(perf.lower(), true);
    assert.equal(perf.lower(), true);
    assert.equal(perf.lower(), false);
    assert.equal(perf.dpr, 1);
    perf.level = before;
});

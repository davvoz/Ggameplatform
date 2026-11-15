import { test } from 'node:test';
import assert from 'node:assert/strict';
import { curtainCover } from '../js/render/CurtainArt.js';

test('the curtain closes from the edges in to the mage, then opens from the mage out', () => {
    // closing: the far cells cover first, all are covered at the end
    assert.equal(curtainCover('close', 0, 1), 0);
    assert.ok(curtainCover('close', 0.5, 1) > curtainCover('close', 0.5, 0));
    assert.ok([0, 0.3, 0.7, 1].every((reach) => curtainCover('close', 1, reach) === 1));
    // opening: still dark at its start, the near cells open first, all open at the end
    assert.ok([0, 0.3, 0.7, 1].every((reach) => curtainCover('open', 0, reach) === 1));
    assert.ok(curtainCover('open', 0.5, 0) < curtainCover('open', 0.5, 1));
    assert.ok([0, 0.3, 0.7, 1].every((reach) => curtainCover('open', 1, reach) === 0));
    // with a ring of light: closing stops at it, the dance keeps it open, then it shuts
    const ring = 0.2;
    assert.equal(curtainCover('close', 1, 0.1, ring), 0, 'the mage stays in the light');
    assert.equal(curtainCover('close', 1, 0.5, ring), 1);
    assert.equal(curtainCover('cheer', 0.3, 0.1, ring), 0, 'he dances in it');
    assert.equal(curtainCover('cheer', 0.3, 0.3, ring), 1);
    assert.equal(curtainCover('cheer', 1, 0, ring), 1, 'the ring has shut');
    assert.equal(curtainCover('close', 0, 0.9, ring), 0, 'it starts from nothing');
    // in steps, as pixel art
    for (let p = 0; p <= 1; p += 0.05) assert.ok(Number.isInteger(curtainCover('close', p, 0.5) * 4));
});

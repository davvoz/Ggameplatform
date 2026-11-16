import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/app/Game.js';

/** A Game with screens that only record what happens to them, and a frame that draws nowhere. */
function makeGame() {
    const shown = [];
    const screen = (name) => (app, params) => ({
        enter: () => shown.push({ name, params }),
        leave() {},
        update() {},
        draw() {},
        tick() {},
        press: () => false,
        key() {},
        suspend() {},
        music: null,
    });
    const ctx = { fillRect() {}, set fillStyle(_) {} };
    const frame = { ctx, size: { width: 320, height: 180 }, toFrame: (x, y) => ({ x, y }) };
    const game = new Game({ frame, factories: { a: screen('a'), b: screen('b'), c: screen('c') }, app: {} });
    const run = (seconds) => {
        for (let t = 0; t < seconds; t += 1 / 60) game.frame(1 / 60);
    };
    return { game, shown, run };
}

test('a screen asked for during a wipe comes right after it, the last ask winning', () => {
    const { game, shown, run } = makeGame();
    game.start('a');
    game.show('b');
    run(0.4);
    assert.equal(game.screenName, 'b', 'swapped while covered');
    // an answer from the server, while the wipe still opens
    game.show('c', { go: true });
    game.show('a', { last: true });
    run(1.5);
    assert.equal(game.screenName, 'a');
    assert.deepEqual(shown.map((s) => s.name), ['a', 'b', 'a']);
    assert.deepEqual(shown.at(-1).params, { last: true });
});

test('a press during a wipe does nothing', () => {
    const { game, run } = makeGame();
    game.start('a');
    game.show('b');
    assert.equal(game.press(10, 10), false);
    run(1);
    assert.equal(game.screenName, 'b');
});

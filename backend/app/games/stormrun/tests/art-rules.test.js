import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** The look of the game is a rule, not a habit: no glow, no gradients, no emoji. */

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function files(dir) {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? files(path) : [path];
    });
}

const sources = [
    ...files(join(root, 'js')),
    ...files(join(root, 'tools')),
    join(root, 'css', 'style.css'),
    join(root, 'index.html'),
];

test('nothing glows', () => {
    const glow = /shadowBlur|shadowColor|globalCompositeOperation|create(Linear|Radial|Conic)Gradient|filter\s*[:=]\s*['"]?blur|text-shadow|linear-gradient|radial-gradient/;
    for (const file of sources) {
        assert.doesNotMatch(readFileSync(file, 'utf8'), glow, file);
    }
});

test('no emoji anywhere in the game', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const file of sources) {
        assert.doesNotMatch(readFileSync(file, 'utf8'), emoji, file);
    }
});

test('the typeface travels with the game, with its licence', () => {
    const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');
    const fonts = [...css.matchAll(/url\("\.\.\/(assets\/fonts\/[^"]+)"\)/g)].map((match) => match[1]);
    assert.ok(fonts.length > 0);
    for (const font of [...fonts, 'assets/fonts/OFL.txt']) {
        assert.ok(existsSync(join(root, font)), font);
    }
});

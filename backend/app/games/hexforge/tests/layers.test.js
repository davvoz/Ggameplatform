import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// The folder rules in README "Code layout": logic never imports graphics, nothing below the screens imports them.
const JS = resolve(dirname(fileURLToPath(import.meta.url)), '../js');
const ONLY = {
    core: ['core', 'data'],
    data: [],
    net: ['core', 'data'],
    render: ['core', 'data', 'render'],
};
const NOT_MODES = new Set(['fx', 'ui', 'ui/panels', 'minigames']);

function walk(dir) {
    return readdirSync(dir, { withFileTypes: true })
        .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
        .filter((f) => f.endsWith('.js'));
}

function layerOf(file) {
    const parts = relative(JS, file).split(sep);
    if (parts.length === 1) return 'main';
    if (parts[0] === 'ui' && parts[1] === 'panels') return 'ui/panels';
    return parts[0];
}

function importsOf(file) {
    const specifiers = [...readFileSync(file, 'utf8').matchAll(/(?:from\s+|import\s*\(\s*)'(\.[^']+)'/g)];
    return specifiers.map((m) => resolve(dirname(file), m[1]));
}

function allowed(from, to) {
    if (ONLY[from]) return ONLY[from].includes(to);
    return !(NOT_MODES.has(from) && to === 'modes');
}

test('every module imports only from the layers it may use', () => {
    const broken = [];
    for (const file of walk(JS)) {
        for (const target of importsOf(file)) {
            const from = layerOf(file);
            const to = layerOf(target);
            if (!allowed(from, to)) broken.push(`${relative(JS, file)} -> ${relative(JS, target)}`);
        }
    }
    assert.deepEqual(broken, []);
});

test('logic, data and network modules never touch the DOM or a canvas', () => {
    const touching = walk(JS)
        .filter((f) => ['core', 'data', 'net'].includes(layerOf(f)))
        .filter((f) => /\bdocument\.|getContext\(|\bwindow\.document/.test(readFileSync(f, 'utf8')))
        .map((f) => relative(JS, f));
    assert.deepEqual(touching, []);
});

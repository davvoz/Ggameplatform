import { BattleMode } from './battle.js';
import { CityMode } from './city.js';
import { Renderer } from './render.js';

/** App shell: the two tabs (My city / Attack), input routing and the frame loop. */

const TAB_KEY = 'hexforge.tab';
const $ = (id) => document.getElementById(id);

const renderer = new Renderer($('view'));
const modes = { city: new CityMode(renderer), battle: new BattleMode(renderer) };
modes.battle.onStateChanged = () => modes.city.invalidate();
let active = null;
let activeName = null;
let time = 0;
let last = performance.now();

async function switchTo(name) {
    if (name === activeName) return;
    active?.leave();
    activeName = name;
    active = null;                       // no frames while the new mode loads
    for (const tab of document.querySelectorAll('[data-tab]')) {
        tab.setAttribute('aria-pressed', String(tab.dataset.tab === name));
    }
    try {
        globalThis.localStorage.setItem(TAB_KEY, name);
    } catch {
        // storage blocked: the default tab is fine
    }
    try {
        await modes[name].enter();
        if (activeName === name) active = modes[name];
        $('loading').hidden = true;
    } catch (error) {
        console.error(`[Hexforge] could not open ${name}`, error);
        $('loading').hidden = false;
        $('loading').textContent = 'The Hexforge server is not reachable.';
    }
}

function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    time += dt;
    active?.frame(time, dt);
    requestAnimationFrame(frame);
}

function wire() {
    for (const tab of document.querySelectorAll('[data-tab]')) {
        tab.addEventListener('click', () => switchTo(tab.dataset.tab));
    }
    const canvas = $('view');
    canvas.addEventListener('click', (event) => active?.onClick?.(event));
    canvas.addEventListener('pointermove', (event) => active?.onPointerMove?.(event));
    globalThis.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') active?.onEscape?.();
    });
    new ResizeObserver(() => renderer.resize()).observe($('stage'));
}

function initialTab() {
    try {
        const saved = globalThis.localStorage.getItem(TAB_KEY);
        if (saved in modes) return saved;
    } catch {
        // storage blocked
    }
    return 'city';
}

async function boot() {
    wire();
    requestAnimationFrame(frame);
    const at = new URLSearchParams(globalThis.location.search).get('at');
    if (at === null) {
        await switchTo(initialTab());
    } else {
        await switchTo('battle');
        await modes.battle.devJump(at);
    }
}

boot();

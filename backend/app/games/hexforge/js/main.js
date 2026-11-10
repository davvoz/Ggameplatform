import { BattleMode } from './battle.js';
import { CityMode } from './city.js';
import { RankingPanel } from './ranking.js';
import { Renderer } from './render.js';
import { closeSheet, isSheetOpen, wireSheets } from './sheets.js';

/**
 * App shell: the two full-screen modes (my city, attack), the ranking sheet,
 * touch and mouse on the map (tap, drag to pan, pinch or wheel to zoom)
 * and the frame loop.
 */

const $ = (id) => document.getElementById(id);
const TAP_SLOP = 9;          // CSS px a finger may wander and still count as a tap

const renderer = new Renderer($('view'));
const modes = { city: new CityMode(renderer), battle: new BattleMode(renderer) };
const ranking = new RankingPanel();
modes.battle.onStateChanged = () => modes.city.invalidate();
modes.battle.onExit = () => void switchTo('city');
modes.city.onAttack = () => void switchTo('battle');
modes.city.onRanking = () => void ranking.open();
modes.city.onWatch = (battle, note) => {
    closeSheet();
    modes.battle.watch(battle, () => void switchTo('city'), note);
    void switchTo('battle');
};
modes.city.onRevenge = () => {
    closeSheet();
    modes.battle.showRivals();
    void switchTo('battle');
};
let active = null;
let activeName = null;
let time = 0;
let last = performance.now();

async function switchTo(name) {
    if (name === activeName) return;
    closeSheet();
    active?.leave();
    activeName = name;
    active = null;                       // no frames while the new mode loads
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

/** Tap, drag and pinch on the map. A gesture that moved is never a tap. */
function wireMap() {
    const canvas = $('view');
    const pointers = new Map();
    let moved = false;
    const local = (e) => {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener('pointerdown', (e) => {
        canvas.setPointerCapture(e.pointerId);
        const p = local(e);
        pointers.set(e.pointerId, { ...p, startX: p.x, startY: p.y });
        if (pointers.size === 1) moved = false;
        else moved = true;               // a second finger: a pinch, never a tap
    });
    canvas.addEventListener('pointermove', (e) => {
        const held = pointers.get(e.pointerId);
        if (!held) {
            active?.onPointerMove?.(e);  // a mouse hovering: placement preview
            return;
        }
        const p = local(e);
        if (pointers.size === 1) {
            if (!moved && Math.hypot(p.x - held.startX, p.y - held.startY) > TAP_SLOP) moved = true;
            if (moved) renderer.panBy(p.x - held.x, p.y - held.y);
            else if (e.pointerType === 'mouse') active?.onPointerMove?.(e);
        } else if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            const other = a === held ? b : a;
            const before = Math.hypot(held.x - other.x, held.y - other.y);
            const after = Math.hypot(p.x - other.x, p.y - other.y);
            const mid = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
            if (before > 0) renderer.zoomAt(after / before, mid.x, mid.y);
            renderer.panBy((p.x - held.x) / 2, (p.y - held.y) / 2);
        }
        held.x = p.x;
        held.y = p.y;
    });
    const release = (e) => {
        if (!pointers.delete(e.pointerId)) return;
        if (e.type === 'pointerup' && pointers.size === 0 && !moved) {
            active?.onPointerMove?.(e);
            active?.onClick?.(e);
        }
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const p = local(e);
        renderer.zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
    }, { passive: false });
}

function wire() {
    wireSheets();
    wireMap();
    globalThis.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (isSheetOpen()) closeSheet();
        else active?.onEscape?.();
    });
    new ResizeObserver(() => renderer.resize()).observe($('app'));
}

async function boot() {
    wire();
    requestAnimationFrame(frame);
    const params = new URLSearchParams(globalThis.location.search);
    if (params.has('debug')) globalThis.hexforge = { renderer, modes };   // for automated screenshots
    const at = params.get('at');
    if (at === null) {
        await switchTo('city');
    } else {
        await switchTo('battle');
        await modes.battle.devJump(at);
    }
}

boot();

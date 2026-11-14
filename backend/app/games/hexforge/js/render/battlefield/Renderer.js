import { carryOver, clampCamera, panBy, zoomAt } from '../../core/camera.js';
import { depthOf, fitRegion, groundEllipse, rotatePoint, rotateRect, toScreen, toWorld } from '../../core/iso.js';
import { BUILDING_INFO } from '../../data/labels.js';
import { drawBuilding, drawRubble, drawTrapMark } from '../forgeArt.js';
import { perf } from '../perf.js';
import { GroundLayer } from './ground.js';
import { HeroPainter } from './heroes.js';
import { BattleEffects } from './effects.js';
import { MapMarks } from './marks.js';

const SELECT = '#ffb347';
const FITS = '#7dff9a';
const BLOCKED = '#ff5040';
const NONE = new Set();   // no traps sprung, nothing destroyed: the untouched city

function pointInPolygon(p, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        const crosses = (a.y > p.y) !== (b.y > p.y)
            && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
        if (crosses) inside = !inside;
    }
    return inside;
}

/**
 * Canvas renderer for the isometric battlefield, "Forgia Infernale" style:
 * a basalt plain, iron buildings, embers in the air.
 * The art itself lives in forgeArt.js; this class owns the camera, picks what
 * the pointer is on, and lays out a frame in depth order. Beside it:
 *  - ground.js: the sky, the basalt tiles and their cache in performance mode
 *  - heroes.js: heroes standing, falling, shielded, and the Technomancer's bolt
 *  - effects.js: blows, shots, novas, traps, explosions, the drifting embers
 *  - marks.js: what is drawn over the map: selection, reach, entry side,
 *    production medallions, health bars, floating labels
 * The view can be turned a quarter at a time (`rot`): everything is laid out
 * in turned "view" coordinates, while callers always speak world cells.
 */
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.city = null;
        this.byId = new Map();
        this.camera = null;
        this.base = null;             // the fitted view; zoom limits are relative to the whole field
        this.limits = { min: 0.1, max: 4 };
        this.region = null;           // what focus() fits on screen (null: the whole field)
        this.insets = {};             // CSS pixels kept free for the interface
        this.zoomedAt = 0;
        this.rot = 0;                 // quarter turns of the view
        this.dpr = 1;
        this.w = 1;
        this.h = 1;
        this.groundLayer = new GroundLayer(this);
        this.heroes = new HeroPainter(this);
        this.effects = new BattleEffects(this);
        this.marks = new MapMarks(this);
    }

    setCity(city) {
        const sameGrid = this.city?.grid === city.grid && this.camera;
        this.city = city;
        this.byId = new Map(city.buildings.map((b) => [b.id, b]));
        if (!sameGrid) this.focus(this.region, this.insets);
    }

    /**
     * Fit `region` ({x0, y0, x1, y1} in cells, or null for the whole field)
     * inside the canvas, leaving `insets` (CSS px: top, right, bottom, left)
     * free for the interface. Resets any zoom or pan.
     */
    focus(region, insets = {}) {
        this.region = region;
        this.insets = insets;
        this.#measure();
        if (!this.city) return;
        this.base = this.#fit();
        this.camera = this.base;
        this.groundLayer.groundDirty = true;
        this.groundLayer.tiles = null;
    }

    /** Turn the view to `rot` quarter turns (0..3) and fit it again. */
    setRotation(rot) {
        const next = ((rot % 4) + 4) % 4;
        if (next === this.rot) return;
        this.rot = next;
        this.heroes.facings.clear();
        if (this.camera) this.focus(this.region, this.insets);
    }

    // ── world ↔ view ───────────────────────────────────────────────────
    /** World cells (and height z) → canvas pixels, through the turned view. */
    at(x, y, z = 0) {
        const v = rotatePoint(x, y, this.city.grid, this.rot);
        return toScreen(this.camera, v.x, v.y, z);
    }

    /** Painter's depth of a world point in the turned view. */
    #depth(x, y) {
        const v = rotatePoint(x, y, this.city.grid, this.rot);
        return depthOf(v.x, v.y);
    }

    /** A building moved to its footprint in the turned view (the art itself is never turned). */
    #inView(b) {
        if (this.rot === 0) return b;
        const r = rotateRect({ x0: b.x, y0: b.y, x1: b.x + b.size, y1: b.y + b.size }, this.city.grid, this.rot);
        return { ...b, x: r.x0, y: r.y0 };
    }

    /** Pinch or wheel: zoom by `factor` around a point in CSS pixels. */
    zoomAt(factor, cssX, cssY) {
        if (!this.camera) return;
        this.zoomedAt = performance.now();
        this.#setCamera(zoomAt(this.camera, factor, cssX * this.dpr, cssY * this.dpr, this.limits));
    }

    /** Drag: move the map by CSS pixels. */
    panBy(dx, dy) {
        if (!this.camera) return;
        this.#setCamera(panBy(this.camera, dx * this.dpr, dy * this.dpr));
    }

    #setCamera(camera) {
        this.camera = clampCamera(camera, this.city.grid, { w: this.w, h: this.h });
        this.groundLayer.groundDirty = true;
    }

    #fit() {
        const d = this.dpr;
        const { top = 0, right = 0, bottom = 0, left = 0 } = this.insets;
        const free = { top: top * d, right: right * d, bottom: bottom * d, left: left * d };
        const g = this.city.grid;
        const whole = fitRegion({ x0: 0, y0: 0, x1: g, y1: g }, this.w, this.h, { ...free, headroom: 60 });
        this.limits = { min: whole.scale * 0.8, max: Math.max(whole.scale * 4, 1.6 * d) };
        const region = rotateRect(this.region ?? { x0: 0, y0: 0, x1: g, y1: g }, g, this.rot);
        // on a tall phone screen the city may spill past the sides: bigger buildings, drag to see the edges
        const wide = this.h > this.w * 1.2 ? this.w * 1.4 : this.w;
        const fitted = fitRegion(region, wide, this.h, { ...free, headroom: 70 });
        const scale = Math.min(fitted.scale, this.limits.max);
        const k = scale / fitted.scale;
        const cx = (free.left + wide - free.right) / 2;
        const cy = (free.top + this.h - free.bottom) / 2;
        return { scale, ox: cx + (fitted.ox - cx) * k - (wide - this.w) / 2, oy: cy + (fitted.oy - cy) * k };
    }

    #measure() {
        this.dpr = Math.min(globalThis.devicePixelRatio || 1, perf.on ? perf.dpr : 2);
        const rect = this.canvas.getBoundingClientRect();
        this.w = Math.max(1, Math.round(rect.width * this.dpr));
        this.h = Math.max(1, Math.round(rect.height * this.dpr));
        this.canvas.width = this.w;
        this.canvas.height = this.h;
        this.groundLayer.tiles = null;
        this.groundLayer.sky = null;
    }

    /** Where a world point (cells, height z) is on the page, in CSS pixels. */
    screenOf(x, y, z = 0) {
        const rect = this.canvas.getBoundingClientRect();
        const p = this.at(x, y, z);
        return { x: rect.left + p.x / this.dpr, y: rect.top + p.y / this.dpr };
    }

    /** Slide the map up if building `b` sits below `limitY` (CSS px), e.g. under a panel. */
    reveal(b, limitY) {
        if (!this.camera) return;
        const v = this.#inView(b);
        const foot = toScreen(this.camera, v.x + v.size, v.y + v.size);
        const y = foot.y / this.dpr + 8;
        if (y > limitY) this.panBy(0, limitY - y);
    }

    /**
     * Where to put the button for an entry side: the middle of that edge of
     * the field, pulled inside the free part of the screen. CSS pixels, plus
     * the angle (degrees, 0 = up) of an arrow pointing into the city.
     */
    edgeAnchor(side) {
        const g = this.city.grid;
        const mids = { north: [g / 2, 0.5], south: [g / 2, g - 0.5], west: [0.5, g / 2], east: [g - 0.5, g / 2] };
        const [x, y] = mids[side];
        const p = this.at(x, y);
        const c = this.at(g / 2, g / 2);
        const d = this.dpr;
        const { top = 0, right = 0, bottom = 0, left = 0 } = this.insets;
        const pad = 48;             // room for the button and its "Enter here" label
        const cssX = Math.min(this.w / d - right - pad, Math.max(left + pad, p.x / d));
        const cssY = Math.min(this.h / d - bottom - pad, Math.max(top + pad, p.y / d));
        const angle = (Math.atan2(c.x - p.x, -(c.y - p.y)) * 180) / Math.PI;
        return { x: cssX, y: cssY, angle };
    }

    /** Canvas pixels under a pointer event. */
    canvasPoint(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) * this.w) / rect.width,
            y: ((event.clientY - rect.top) * this.h) / rect.height,
        };
    }

    /** World point on the ground under canvas pixels. */
    groundAt(point) {
        if (!this.camera) return null;
        const v = toWorld(this.camera, point.x, point.y);
        return rotatePoint(v.x, v.y, this.city.grid, -this.rot);
    }

    /** The building drawn under canvas pixels (nearest to the viewer first), or null. */
    buildingAt(point) {
        if (!this.camera) return null;
        const standing = this.city.buildings
            .filter((b) => b.type !== 'rune_trap')
            .map((b) => ({ b, v: this.#inView(b) }))
            .sort((p, q) => (q.v.x + q.v.y + q.v.size) - (p.v.x + p.v.y + p.v.size));
        for (const { b, v } of standing) {
            if (pointInPolygon(point, this.#silhouette(v))) return b;
        }
        const cell = this.groundAt(point);
        return this.city.buildings.find((b) => b.type === 'rune_trap'
            && cell.x >= b.x && cell.x < b.x + 1 && cell.y >= b.y && cell.y < b.y + 1) ?? null;
    }

    /** Clickable outline of a building in view coordinates: the footprint raised to the top of the silhouette. */
    #silhouette(b) {
        const { camera } = this;
        const up = BUILDING_INFO[b.type].pick + 4;
        const s = b.size;
        return [
            toScreen(camera, b.x, b.y, up), toScreen(camera, b.x + s, b.y, up),
            toScreen(camera, b.x + s, b.y), toScreen(camera, b.x + s, b.y + s),
            toScreen(camera, b.x, b.y + s), toScreen(camera, b.x, b.y + s, up),
        ];
    }

    /** The canvas changed size: keep what the player was looking at. */
    resize() {
        const old = this.camera && { camera: this.camera, base: this.base, view: { w: this.w, h: this.h } };
        this.#measure();
        if (!this.city) return;
        const base = this.#fit();
        this.base = base;
        this.camera = old ? clampCamera(carryOver(old.camera, old.view, old.base, base, { w: this.w, h: this.h }), this.city.grid, { w: this.w, h: this.h }) : base;
        this.groundLayer.groundDirty = true;
    }

    /**
     * `state` = replay.stateAt(tick), or null to show the untouched city.
     * Options: `side` (entry edge to highlight), `time`, `selectedId`,
     * `preview` {x, y, size, valid}, `bubbles` Map(id → {amount, material, full}),
     * `floaters` [{x, y, text, color, age}], `showTraps` (the owner sees their
     * own traps), `ranges` ('all' or a building id whose reach to draw).
     */
    draw(state, options = {}) {
        const { ctx } = this;
        if (!this.camera) return;
        const { side = null, time = 0, selectedId = null, preview = null } = options;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        this.groundLayer.drawGround();

        if (side) this.marks.entryEdge(side, time);
        if (options.ranges !== undefined && options.ranges !== null) this.marks.ranges(options.ranges, state, time);
        const selected = selectedId === null ? null : this.byId.get(selectedId);
        if (selected) this.marks.footprint(selected.x, selected.y, selected.size, SELECT, 0.18 + 0.08 * Math.sin(time * 5));
        if (preview) this.marks.footprint(preview.x, preview.y, preview.size, preview.valid ? FITS : BLOCKED, 0.3);
        const items = this.#standingItems(state, time, options.showTraps);
        items.sort((a, b) => a.depth - b.depth);
        for (const item of items) item.draw();
        if (state) this.#overlays(state, time);
        if (options.bubbles) this.marks.bubbles(options.bubbles, time);
        for (const floater of options.floaters ?? []) this.marks.floater(floater);
        this.effects.embers(time);
    }

    /** Draws what lies flat on the ground and returns what stands up, for depth sorting. */
    #standingItems(state, time, showTraps = false) {
        const items = [];
        for (const b of this.city.buildings) {
            const item = this.#buildingItem(b, state, time, showTraps);
            if (item) items.push(item);
        }
        items.push(...this.#heroItems(state, time));
        return items;
    }

    /** A trap or rubble is drawn flat right away (null); a standing building is returned for depth sorting. */
    #buildingItem(b, state, time, showTraps) {
        if (b.type === 'rune_trap') {
            if ((state?.sprung ?? NONE).has(b.id)) this.marks.scorch(b);
            else if (showTraps) drawTrapMark(this.ctx, this.camera, this.#inView(b), time, groundEllipse(this.camera, 0.42).rx);
            return null;
        }
        if ((state?.destroyed ?? NONE).has(b.id)) {
            drawRubble(this.ctx, this.camera, this.#inView(b), time);
            return null;
        }
        const look = {
            time,
            firing: state ? this.effects.recentlyFired(b.id, state) : 0,
            health: state ? (state.buildingHp.get(b.id) ?? b.hp) / b.hp : 1,
        };
        return { depth: this.#depth(b.x + b.size / 2, b.y + b.size / 2), draw: () => drawBuilding(this.ctx, this.camera, this.#inView(b), look) };
    }

    /** Heroes on their feet, and the ones still falling. */
    #heroItems(state, time) {
        const items = [];
        const falling = new Map();
        for (const { event, age } of state?.effects ?? []) {
            if (event.type === 'hero_down') falling.set(event.hero, age);
        }
        for (const hero of state?.heroes ?? []) {
            if (hero.alive) items.push({ depth: this.#depth(hero.x, hero.y) + 0.01, draw: () => this.heroes.hero(hero, time) });
            else if (falling.has(hero.id)) items.push({ depth: this.#depth(hero.x, hero.y), draw: () => this.heroes.fallen(hero, time, falling.get(hero.id)) });
        }
        return items;
    }

    #overlays(state, time) {
        for (const b of this.city.buildings) {
            const hp = state.buildingHp.get(b.id);
            if (b.type !== 'rune_trap' && !state.destroyed.has(b.id) && hp < b.hp) this.marks.buildingBar(b, hp);
        }
        for (const hero of state.heroes) {
            if (!hero.alive) continue;
            this.marks.heroBar(hero);
            if (hero.cls === 'technomancer' && hero.attack && !hero.attack.nova && hero.attack.phase < 0) this.heroes.mageBolt(hero, time);
        }
        for (const fx of state.effects) this.effects.effect(fx, state, time);
    }
}

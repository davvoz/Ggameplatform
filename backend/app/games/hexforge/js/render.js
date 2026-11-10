import { fitCamera, toScreen, toWorld, groundEllipse, depthOf } from './iso.js';
import { BUILDING_INFO, HERO_INFO, MATERIAL_INFO } from './labels.js';
import {
    drawBuilding, drawHero, drawRubble, drawTrapMark, flame, halo, hash, path, withAlpha,
} from './forgeArt.js';

/**
 * Canvas renderer for the isometric battlefield, "Forgia Infernale" style:
 * a basalt plain, iron buildings, embers in the air.
 * The art itself lives in forgeArt.js; this class lays it out, picks what
 * the pointer is on, and draws the battle effects and the city overlays.
 */

const HERO_SCALE = 1.5;   // heroes are drawn larger than life so they read next to buildings
const INWARD = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] };
const EMBERS = 46;
const FONT = '"Chakra Petch", "Segoe UI", system-ui, sans-serif';
const SELECT = '#ffb347';
const FITS = '#7dff9a';
const BLOCKED = '#ff5040';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.city = null;
        this.byId = new Map();
        this.camera = null;
        this.ground = null;
    }

    setCity(city) {
        const sameGrid = this.city?.grid === city.grid && this.ground;
        this.city = city;
        this.byId = new Map(city.buildings.map((b) => [b.id, b]));
        if (!sameGrid) this.resize();
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
        return this.camera ? toWorld(this.camera, point.x, point.y) : null;
    }

    /** The building drawn under canvas pixels (nearest to the viewer first), or null. */
    buildingAt(point) {
        if (!this.camera) return null;
        const standing = this.city.buildings
            .filter((b) => b.type !== 'rune_trap')
            .sort((a, b) => (b.x + b.y + b.size) - (a.x + a.y + a.size));
        for (const b of standing) {
            if (pointInPolygon(point, this.#silhouette(b))) return b;
        }
        const cell = this.groundAt(point);
        return this.city.buildings.find((b) => b.type === 'rune_trap'
            && cell.x >= b.x && cell.x < b.x + 1 && cell.y >= b.y && cell.y < b.y + 1) ?? null;
    }

    /** Clickable outline: the footprint raised to the top of the silhouette. */
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

    resize() {
        const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
        const rect = this.canvas.getBoundingClientRect();
        this.w = Math.max(1, Math.round(rect.width * dpr));
        this.h = Math.max(1, Math.round(rect.height * dpr));
        this.canvas.width = this.w;
        this.canvas.height = this.h;
        if (!this.city) return;
        this.camera = fitCamera(this.city.grid, this.w, this.h, { margin: 10 * dpr, headroom: 90 });
        this.ground = this.#paintGround();
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
        if (!this.ground) return;
        const { side = null, time = 0, selectedId = null, preview = null } = options;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(this.ground, 0, 0);

        if (side) this.#entryEdge(side, time);
        if (options.ranges !== undefined && options.ranges !== null) this.#ranges(options.ranges, state, time);
        const selected = selectedId === null ? null : this.byId.get(selectedId);
        if (selected) this.#footprint(selected.x, selected.y, selected.size, SELECT, 0.18 + 0.08 * Math.sin(time * 5));
        if (preview) this.#footprint(preview.x, preview.y, preview.size, preview.valid ? FITS : BLOCKED, 0.3);
        const items = this.#standingItems(state, time, options.showTraps);
        items.sort((a, b) => a.depth - b.depth);
        for (const item of items) item.draw();
        if (state) this.#overlays(state, time);
        if (options.bubbles) this.#bubbles(options.bubbles, time);
        for (const floater of options.floaters ?? []) this.#floater(floater);
        this.#embers(time);
    }

    /** Draws what lies flat on the ground and returns what stands up, for depth sorting. */
    #standingItems(state, time, showTraps = false) {
        const destroyed = state?.destroyed ?? new Set();
        const sprung = state?.sprung ?? new Set();
        const items = [];
        for (const b of this.city.buildings) {
            if (b.type === 'rune_trap') {
                if (sprung.has(b.id)) this.#scorch(b);
                else if (showTraps) drawTrapMark(this.ctx, this.camera, b, time, groundEllipse(this.camera, 0.42).rx);
            } else if (destroyed.has(b.id)) {
                drawRubble(this.ctx, this.camera, b, time);
            } else {
                const look = {
                    time,
                    firing: state ? this.#recentlyFired(b.id, state) : 0,
                    health: state ? (state.buildingHp.get(b.id) ?? b.hp) / b.hp : 1,
                };
                items.push({ depth: depthOf(b.x + b.size / 2, b.y + b.size / 2), draw: () => drawBuilding(this.ctx, this.camera, b, look) });
            }
        }
        for (const hero of state?.heroes ?? []) {
            if (hero.alive) items.push({ depth: depthOf(hero.x, hero.y), draw: () => this.#hero(hero, time) });
        }
        return items;
    }

    #overlays(state, time) {
        for (const b of this.city.buildings) {
            const hp = state.buildingHp.get(b.id);
            if (b.type !== 'rune_trap' && !state.destroyed.has(b.id) && hp < b.hp) this.#buildingBar(b, hp);
        }
        for (const hero of state.heroes) {
            if (hero.alive) this.#heroBar(hero);
        }
        for (const fx of state.effects) this.#effect(fx, state, time);
    }

    // ── ground ─────────────────────────────────────────────────────────
    #paintGround() {
        const canvas = document.createElement('canvas');
        canvas.width = this.w;
        canvas.height = this.h;
        const ctx = canvas.getContext('2d');
        const bg = ctx.createLinearGradient(0, 0, 0, this.h);
        bg.addColorStop(0, '#0b0605');
        bg.addColorStop(0.65, '#170c07');
        bg.addColorStop(1, '#261006');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.w, this.h);

        const { grid } = this.city;
        for (let x = 0; x < grid; x++) {
            for (let y = 0; y < grid; y++) {
                const outside = x === 0 || y === 0 || x === grid - 1 || y === grid - 1;
                const v = (outside ? 15 : 27) + hash(x * 31 + y * 17) * 9;
                this.#tile(ctx, x, y, `rgb(${Math.round(v + 5)}, ${Math.round(v - 2)}, ${Math.round(v - 7)})`, '#0a0605');
            }
        }
        // iron rim around the city limits
        ctx.lineWidth = 3 * this.camera.scale;
        ctx.strokeStyle = '#3a2a20';
        this.#outline(ctx, 1, 1, grid - 2);
        ctx.lineWidth = 1 * this.camera.scale;
        ctx.strokeStyle = 'rgba(255, 140, 60, 0.35)';
        this.#outline(ctx, 1, 1, grid - 2);

        const vignette = ctx.createRadialGradient(this.w / 2, this.h * 0.55, this.h * 0.25, this.w / 2, this.h * 0.55, this.h * 0.9);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(8,2,0,0.65)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, this.w, this.h);
        return canvas;
    }

    #tile(ctx, x, y, fill, stroke) {
        const pts = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([px, py]) => toScreen(this.camera, px, py));
        path(ctx, pts);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }

    #diamond(ctx, x, y, size, fill) {
        const pts = [[x, y], [x + size, y], [x + size, y + size], [x, y + size]].map(([px, py]) => toScreen(this.camera, px, py));
        path(ctx, pts);
        ctx.fillStyle = fill;
        ctx.fill();
    }

    #outline(ctx, x, y, size) {
        const pts = [[x, y], [x + size, y], [x + size, y + size], [x, y + size]].map(([px, py]) => toScreen(this.camera, px, py));
        path(ctx, pts);
        ctx.stroke();
    }

    #entryEdge(side, time) {
        const { ctx } = this;
        const g = this.city.grid;
        const strips = {
            north: [0, 0, g, 1], south: [0, g - 1, g, 1], west: [0, 0, 1, g], east: [g - 1, 0, 1, g],
        };
        const [x, y, w, h] = strips[side];
        const pulse = 0.2 + 0.1 * Math.sin(time * 4);
        const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => toScreen(this.camera, px, py));
        path(ctx, pts);
        ctx.fillStyle = `rgba(255, 70, 30, ${pulse})`;
        ctx.fill();

        const [ix, iy] = INWARD[side];
        ctx.strokeStyle = 'rgba(255, 170, 90, 0.95)';
        ctx.lineWidth = 3 * this.camera.scale;
        ctx.lineCap = 'round';
        for (const f of [0.25, 0.5, 0.75]) {
            const cx = side === 'north' || side === 'south' ? f * g : x + 0.5;
            const cy = side === 'west' || side === 'east' ? f * g : y + 0.5;
            const shift = ((time * 1.2) % 1) * 0.6;
            const tipX = cx + ix * (0.6 + shift);
            const tipY = cy + iy * (0.6 + shift);
            const px = -iy * 0.45;
            const py = ix * 0.45;
            const a = toScreen(this.camera, tipX - ix * 0.45 + px, tipY - iy * 0.45 + py);
            const b = toScreen(this.camera, tipX, tipY);
            const c = toScreen(this.camera, tipX - ix * 0.45 - px, tipY - iy * 0.45 - py);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(c.x, c.y);
            ctx.stroke();
        }
    }

    /** Dashed rings showing how far towers reach: 'all', or one building id. */
    #ranges(which, state, time) {
        const { ctx, camera } = this;
        for (const b of this.city.buildings) {
            if (!b.range || (which !== 'all' && which !== b.id) || state?.destroyed.has(b.id)) continue;
            const c = toScreen(camera, b.x + b.size / 2, b.y + b.size / 2);
            const { rx, ry } = groundEllipse(camera, b.range);   // the simulation measures from the tower's centre
            const color = BUILDING_INFO[b.type].glow;
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
            ctx.fillStyle = withAlpha(color, which === 'all' ? 0.05 : 0.09);
            ctx.fill();
            ctx.setLineDash([6 * camera.scale, 6 * camera.scale]);
            ctx.lineDashOffset = -time * 14 * camera.scale;
            ctx.strokeStyle = withAlpha(color, 0.55);
            ctx.lineWidth = 1.5 * camera.scale;
            ctx.stroke();
            ctx.restore();
        }
    }

    #scorch(b) {
        const { ctx, camera } = this;
        const c = toScreen(camera, b.x + 0.5, b.y + 0.5);
        const { rx, ry } = groundEllipse(camera, 1.1);
        ctx.fillStyle = 'rgba(20, 8, 2, 0.7)';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 110, 30, 0.45)';
        ctx.lineWidth = 1.5 * camera.scale;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── city mode ──────────────────────────────────────────────────────
    #footprint(x, y, size, color, alpha) {
        const { ctx } = this;
        this.#diamond(ctx, x, y, size, withAlpha(color, alpha));
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10 * this.camera.scale;
        ctx.strokeStyle = withAlpha(color, 0.95);
        ctx.lineWidth = 2 * this.camera.scale;
        this.#outline(ctx, x, y, size);
        ctx.restore();
    }

    /** A forged-iron medallion over production buildings: what is waiting to be collected. */
    #bubbles(bubbles, time) {
        const { ctx, camera } = this;
        const s = camera.scale;
        for (const [id, bubble] of bubbles) {
            const b = this.byId.get(id);
            if (!b) continue;
            const color = MATERIAL_INFO[bubble.material].color;
            const bob = Math.sin(time * 3 + id) * 3 * s;
            const p = toScreen(camera, b.x + b.size / 2, b.y + b.size / 2, BUILDING_INFO[b.type].pick + 26);
            const r = Math.max(12, 16 * s);
            halo(ctx, p.x, p.y + bob, r * 2.3, color, bubble.full ? 1 : 0.55);
            ctx.save();
            ctx.fillStyle = '#1a120d';
            ctx.strokeStyle = '#5a4434';
            ctx.lineWidth = Math.max(3, 4 * s);
            ctx.beginPath();
            ctx.arc(p.x, p.y + bob, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1.5, 2 * s);
            ctx.beginPath();
            const full = bubble.full ? 1 : 0.999;
            ctx.arc(p.x, p.y + bob, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * full);
            ctx.stroke();
            // pointer to the building
            ctx.fillStyle = '#5a4434';
            ctx.beginPath();
            ctx.moveTo(p.x - 5 * s, p.y + bob + r - 1);
            ctx.lineTo(p.x + 5 * s, p.y + bob + r - 1);
            ctx.lineTo(p.x, p.y + bob + r + 7 * s);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = color;
            ctx.font = `700 ${Math.max(10, r * 0.82)}px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(bubble.amount), p.x, p.y + bob + 1);
            ctx.restore();
        }
    }

    #floater({ x, y, text, color, age }) {
        const p = toScreen(this.camera, x, y, 80 + 50 * age);
        this.#label(text, p.x, p.y, color, 1 - age * age);
    }

    #recentlyFired(buildingId, state) {
        let best = 0;
        for (const { event, age } of state.effects) {
            if (event.building === buildingId && ['shot', 'bolt', 'frost'].includes(event.type)) {
                best = Math.max(best, 1 - age);
            }
        }
        return best;
    }

    // ── heroes ─────────────────────────────────────────────────────────
    #hero(hero, time) {
        const { ctx, camera } = this;
        const s = camera.scale * HERO_SCALE;
        const info = HERO_INFO[hero.cls];
        const foot = toScreen(camera, hero.x, hero.y);
        const bob = hero.moving ? Math.abs(Math.sin(time * 12 + hero.id * 1.7)) * -2 * s : 0;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(foot.x, foot.y, 12 * s, 5.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // a ring in the class colour under the feet: whose hero this is, at a glance
        ctx.strokeStyle = withAlpha(info.color, 0.8);
        ctx.lineWidth = 1.6 * camera.scale;
        ctx.beginPath();
        ctx.ellipse(foot.x, foot.y, 12 * s, 5.5 * s, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (hero.cls === 'neon_blade' && hero.moving) {
            for (const k of [2, 1]) {
                ctx.globalAlpha = 0.16 * k;
                drawHero(ctx, hero, foot.x - (hero.facing || 1) * k * 7 * s, foot.y + bob, s, info.color, time);
            }
            ctx.globalAlpha = 1;
        }
        drawHero(ctx, hero, foot.x, foot.y + bob, s, info.color, time);
        if (hero.slowed) {
            ctx.fillStyle = 'rgba(159, 227, 255, 0.28)';
            ctx.beginPath();
            ctx.ellipse(foot.x, foot.y - 16 * s, 14 * s, 19 * s, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── bars and effects ───────────────────────────────────────────────
    #bar(x, y, width, ratio, color) {
        const { ctx } = this;
        const s = this.camera.scale;
        const h = Math.max(4, 5 * s);
        ctx.fillStyle = '#120b08';
        ctx.fillRect(x - width / 2 - 2, y - 2, width + 4, h + 4);
        ctx.fillStyle = '#3a2a20';
        ctx.fillRect(x - width / 2 - 1, y - 1, width + 2, h + 2);
        ctx.fillStyle = '#120b08';
        ctx.fillRect(x - width / 2, y, width, h);
        ctx.fillStyle = color;
        ctx.fillRect(x - width / 2, y, width * Math.max(0, ratio), h);
    }

    #buildingBar(b, hp) {
        const info = BUILDING_INFO[b.type];
        const p = toScreen(this.camera, b.x + b.size / 2, b.y + b.size / 2, info.pick + 16);
        const ratio = hp / b.hp;
        this.#bar(p.x, p.y, (18 + 10 * b.size) * this.camera.scale, ratio, ratio > 0.5 ? '#ffb347' : '#ff5040');
    }

    #heroBar(hero) {
        const p = toScreen(this.camera, hero.x, hero.y, 48 * HERO_SCALE);
        this.#bar(p.x, p.y, 26 * this.camera.scale * HERO_SCALE, hero.hp / hero.maxHp, HERO_INFO[hero.cls].color);
    }

    #heroPoint(state, id, z = 16 * HERO_SCALE) {
        const h = state.heroes[id];
        return toScreen(this.camera, h.x, h.y, z);
    }

    #buildingPoint(id, zFactor = 0.6) {
        const b = this.byId.get(id);
        const info = BUILDING_INFO[b.type];
        return toScreen(this.camera, b.x + b.size / 2, b.y + b.size / 2, info.height * zFactor + 6);
    }

    #towerMuzzle(id) {
        const b = this.byId.get(id);
        return toScreen(this.camera, b.x + b.size / 2, b.y + b.size / 2, BUILDING_INFO[b.type].pick - 14);
    }

    #effect({ event: e, age }, state, time) {
        const { ctx, camera } = this;
        const s = camera.scale;
        const fade = 1 - age;
        ctx.lineCap = 'round';
        switch (e.type) {
            case 'strike': {
                const to = this.#buildingPoint(e.building);
                const color = HERO_INFO[state.heroes[e.hero].cls].color;
                this.#sparks(to, e.t + e.hero, age, s, ['#fff1c9', '#ffb347', color]);
                halo(ctx, to.x, to.y, 16 * s, color, fade);
                break;
            }
            case 'nova': {
                const c = toScreen(camera, e.x, e.y);
                const { rx, ry } = groundEllipse(camera, e.radius * (0.3 + 0.7 * easeOut(age)));
                ctx.fillStyle = withAlpha('#b48cff', 0.22 * fade);
                ctx.strokeStyle = withAlpha('#e6d8ff', fade);
                ctx.lineWidth = 3 * s;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                halo(ctx, c.x, c.y - 10 * s, 50 * s * fade, '#b48cff', fade);
                break;
            }
            case 'shot': {
                const from = this.#towerMuzzle(e.building);
                const to = this.#heroPoint(state, e.hero);
                this.#fireball(from, to, age, s, '#ffe08a', '#ff5a00');
                break;
            }
            case 'bolt': {
                let from = this.#towerMuzzle(e.building);
                ctx.save();
                ctx.shadowColor = '#6fd3ff';
                ctx.shadowBlur = 14 * s;
                e.hits.forEach((hit, i) => {
                    const to = this.#heroPoint(state, hit.hero);
                    ctx.strokeStyle = withAlpha('#6fd3ff', fade);
                    ctx.lineWidth = 4 * s;
                    this.#zigzag(from, to, e.t + i, s);
                    ctx.strokeStyle = withAlpha('#ffffff', fade);
                    ctx.lineWidth = 1.5 * s;
                    this.#zigzag(from, to, e.t + i, s);
                    halo(ctx, to.x, to.y, 16 * s, '#6fd3ff', fade);
                    from = to;
                });
                ctx.restore();
                break;
            }
            case 'frost': {
                const from = this.#towerMuzzle(e.building);
                const c = toScreen(camera, e.x, e.y);
                if (age < 0.4) this.#fireball(from, toScreen(camera, e.x, e.y, 20), age / 0.4, s, '#f1fbff', '#3ab0ff');
                const { rx, ry } = groundEllipse(camera, e.radius * (0.6 + 0.4 * age));
                ctx.fillStyle = withAlpha('#9fe3ff', 0.25 * fade);
                ctx.strokeStyle = withAlpha('#f1fbff', fade);
                ctx.lineWidth = 2 * s;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                for (let i = 0; i < 6; i++) {        // ice shards
                    const a = (i / 6) * Math.PI * 2 + e.t;
                    const p = { x: c.x + Math.cos(a) * rx * 0.7, y: c.y + Math.sin(a) * ry * 0.7 };
                    ctx.fillStyle = withAlpha('#e6f9ff', fade);
                    path(ctx, [{ x: p.x, y: p.y - 9 * s * fade }, { x: p.x + 3 * s, y: p.y }, { x: p.x - 3 * s, y: p.y }]);
                    ctx.fill();
                }
                break;
            }
            case 'trap': {
                const c = toScreen(camera, e.x, e.y);
                const { rx, ry } = groundEllipse(camera, e.radius * (0.3 + 0.7 * easeOut(age)));
                ctx.fillStyle = withAlpha('#ff5a00', 0.45 * fade);
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                flame(ctx, c, 38 * s * fade, time, e.building, '#ffe08a', '#ff3a00');
                halo(ctx, c.x, c.y - 20 * s, 60 * s, '#ff5a00', fade);
                this.#label('RUNE TRAP!', c.x, c.y - (56 + 30 * age) * s, '#ffcf8a', fade);
                break;
            }
            case 'destroyed': {
                const p = this.#buildingPoint(e.building, 0.5);
                halo(ctx, p.x, p.y, (30 + 60 * easeOut(age)) * s, '#fff1c9', fade);
                halo(ctx, p.x, p.y, (40 + 80 * easeOut(age)) * s, '#ff5a00', fade);
                ctx.fillStyle = withAlpha('#5b4a3c', fade);
                for (let i = 0; i < 9; i++) {
                    const a = (i / 9) * Math.PI * 2 + e.building;
                    const r = (8 + 50 * easeOut(age)) * s;
                    const lift = Math.sin(age * Math.PI) * 30 * s;
                    ctx.fillRect(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.5 - lift, 4 * s, 4 * s);
                }
                break;
            }
            case 'hero_down': {
                const h = state.heroes[e.hero];
                const p = toScreen(camera, h.x, h.y, 20 + 50 * age);
                halo(ctx, p.x, p.y, 16 * s, HERO_INFO[h.cls].color, fade);
                ctx.fillStyle = withAlpha('#f1eaff', fade);
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3 * s, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            default:
                break;
        }
    }

    #fireball(from, to, k, s, core, glow) {
        const { ctx } = this;
        const lift = 40 * s;
        const at = (q) => ({ x: from.x + (to.x - from.x) * q, y: from.y + (to.y - from.y) * q - Math.sin(q * Math.PI) * lift });
        const p = at(Math.min(1, k * 1.6));
        for (let i = 1; i <= 5; i++) {
            const q = at(Math.max(0, Math.min(1, k * 1.6) - i * 0.05));
            halo(ctx, q.x, q.y, (9 - i) * s, glow, 0.6 - i * 0.1);
        }
        halo(ctx, p.x, p.y, 16 * s, glow, 1);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5 * s, 0, Math.PI * 2);
        ctx.fill();
        if (k * 1.6 >= 1) halo(ctx, to.x, to.y, 22 * s, glow, 1 - k);
    }

    #sparks(at, seed, age, s, colors) {
        const { ctx } = this;
        for (let i = 0; i < 7; i++) {
            const a = hash(seed * 3 + i) * Math.PI * 2;
            const r = (4 + 22 * easeOut(age)) * s * (0.6 + hash(seed + i));
            ctx.fillStyle = withAlpha(colors[i % colors.length], 1 - age);
            ctx.fillRect(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r * 0.7 - age * 8 * s, 2.5 * s, 2.5 * s);
        }
    }

    /** Embers drifting up over the whole field. */
    #embers(time) {
        const { ctx } = this;
        const s = this.camera.scale;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < EMBERS; i++) {
            const life = (time * (0.05 + hash(i) * 0.08) + hash(i + 5)) % 1;
            const x = hash(i + 11) * this.w + Math.sin(time * 1.1 + i) * 16 * s * life;
            const y = this.h * (1.02 - life * 1.05);
            ctx.globalAlpha = (1 - life) * 0.75;
            ctx.fillStyle = life < 0.5 ? '#ffb347' : '#ff5a00';
            ctx.beginPath();
            ctx.arc(x, y, (1.2 + (1 - life)) * Math.max(1, s), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    #zigzag(from, to, seed, s) {
        const { ctx } = this;
        const steps = 6;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        for (let i = 1; i < steps; i++) {
            const k = i / steps;
            const jitter = Math.sin(seed * 12.9898 + i * 78.233) * 8 * s;
            ctx.lineTo(from.x + dx * k + nx * jitter, from.y + dy * k + ny * jitter);
        }
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }

    #label(text, x, y, color, alpha) {
        const { ctx } = this;
        const s = this.camera.scale;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = `700 ${Math.max(11, 14 * s)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(10, 4, 0, 0.85)';
        ctx.strokeText(text, x, y);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.restore();
    }
}

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

function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
}

export { withAlpha, shade } from './forgeArt.js';

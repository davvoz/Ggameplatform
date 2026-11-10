import { fitCamera, toScreen, toWorld, groundEllipse, depthOf } from './iso.js';
import { BUILDING_INFO, HERO_INFO, MATERIAL_INFO } from './labels.js';

/**
 * Canvas renderer for the isometric battlefield. Placeholder art: every
 * building and hero is drawn from simple shapes (a CC0 sprite pack replaces
 * this once the battle loop proves fun).
 */

const HERO_SCALE = 1.5;   // heroes are drawn larger than life so they read next to buildings
const INWARD = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] };

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
            if (this.#silhouettes(b).some((shape) => pointInPolygon(point, shape))) return b;
        }
        const cell = this.groundAt(point);
        return this.city.buildings.find((b) => b.type === 'rune_trap'
            && cell.x >= b.x && cell.x < b.x + 1 && cell.y >= b.y && cell.y < b.y + 1) ?? null;
    }

    /** Clickable outlines: the box (plus a tower's head) and, for the core, its crystal. */
    #silhouettes(b) {
        const { camera } = this;
        const info = BUILDING_INFO[b.type];
        const up = info.height + (b.type.endsWith('_tower') ? 24 : 4);
        const s = b.size;
        const box = [
            toScreen(camera, b.x, b.y, up), toScreen(camera, b.x + s, b.y, up),
            toScreen(camera, b.x + s, b.y), toScreen(camera, b.x + s, b.y + s),
            toScreen(camera, b.x, b.y + s), toScreen(camera, b.x, b.y + s, up),
        ];
        if (b.type !== 'core') return [box];
        const top = toScreen(camera, b.x + s / 2, b.y + s / 2, info.height + 100);
        const bottom = toScreen(camera, b.x + s / 2, b.y + s / 2, info.height + 20);
        const half = 22 * camera.scale;
        const crystal = [
            { x: top.x - half, y: top.y }, { x: top.x + half, y: top.y },
            { x: bottom.x + half, y: bottom.y }, { x: bottom.x - half, y: bottom.y },
        ];
        return [box, crystal];
    }

    resize() {
        const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
        const rect = this.canvas.getBoundingClientRect();
        this.w = Math.max(1, Math.round(rect.width * dpr));
        this.h = Math.max(1, Math.round(rect.height * dpr));
        this.canvas.width = this.w;
        this.canvas.height = this.h;
        if (!this.city) return;
        this.camera = fitCamera(this.city.grid, this.w, this.h, { margin: 10 * dpr, headroom: 80 });
        this.ground = this.#paintGround();
    }

    /**
     * `state` = replay.stateAt(tick), or null to show the untouched city.
     * City mode options: `selectedId`, `preview` {x, y, size, valid},
     * `bubbles` Map(id → {amount, material, full}), `floaters` [{x, y, text, color, age}],
     * `showTraps` (the owner sees their own traps).
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
        const selected = selectedId === null ? null : this.byId.get(selectedId);
        if (selected) this.#footprint(selected.x, selected.y, selected.size, '#39e6ff', 0.25 + 0.1 * Math.sin(time * 5));
        if (preview) this.#footprint(preview.x, preview.y, preview.size, preview.valid ? '#4dff9a' : '#ff5d6c', 0.35);
        const items = this.#standingItems(state, time, options.showTraps);
        items.sort((a, b) => a.depth - b.depth);
        for (const item of items) item.draw();
        if (state) this.#overlays(state);
        if (options.bubbles) this.#bubbles(options.bubbles, time);
        for (const floater of options.floaters ?? []) this.#floater(floater);
    }

    /** Draws what lies flat on the ground and returns what stands up, for depth sorting. */
    #standingItems(state, time, showTraps = false) {
        const destroyed = state?.destroyed ?? new Set();
        const sprung = state?.sprung ?? new Set();
        const items = [];
        for (const b of this.city.buildings) {
            if (b.type === 'rune_trap') {
                if (sprung.has(b.id)) this.#scorch(b);
                else if (showTraps) this.#trapMark(b, time);
            } else if (destroyed.has(b.id)) {
                this.#rubble(b);
            } else {
                items.push({ depth: depthOf(b.x + b.size / 2, b.y + b.size / 2), draw: () => this.#building(b, state, time) });
            }
        }
        for (const hero of state?.heroes ?? []) {
            if (hero.alive) items.push({ depth: depthOf(hero.x, hero.y), draw: () => this.#hero(hero, time) });
        }
        return items;
    }

    #overlays(state) {
        for (const b of this.city.buildings) {
            const hp = state.buildingHp.get(b.id);
            if (b.type !== 'rune_trap' && !state.destroyed.has(b.id) && hp < b.hp) this.#buildingBar(b, hp);
        }
        for (const hero of state.heroes) {
            if (hero.alive) this.#heroBar(hero);
        }
        for (const fx of state.effects) this.#effect(fx, state);
    }

    // ── ground ─────────────────────────────────────────────────────────
    #paintGround() {
        const canvas = document.createElement('canvas');
        canvas.width = this.w;
        canvas.height = this.h;
        const ctx = canvas.getContext('2d');
        const bg = ctx.createLinearGradient(0, 0, 0, this.h);
        bg.addColorStop(0, '#06070c');
        bg.addColorStop(1, '#0c0f1c');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.w, this.h);

        const { grid } = this.city;
        for (let x = 0; x < grid; x++) {
            for (let y = 0; y < grid; y++) {
                this.#diamond(ctx, x, y, 1, tileColor(x, y, grid), 'rgba(57, 230, 255, 0.06)');
            }
        }
        // a faint rune circuit around the city limits
        ctx.lineWidth = 1.5 * this.camera.scale;
        ctx.strokeStyle = 'rgba(57, 230, 255, 0.28)';
        this.#outline(ctx, 1, 1, grid - 2);

        const vignette = ctx.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.25, this.w / 2, this.h / 2, this.h * 0.85);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, this.w, this.h);
        return canvas;
    }

    #diamond(ctx, x, y, size, fill, stroke) {
        const pts = [[x, y], [x + size, y], [x + size, y + size], [x, y + size]].map(([px, py]) => toScreen(this.camera, px, py));
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    #outline(ctx, x, y, size) {
        const pts = [[x, y], [x + size, y], [x + size, y + size], [x, y + size]].map(([px, py]) => toScreen(this.camera, px, py));
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.stroke();
    }

    #entryEdge(side, time) {
        const { ctx } = this;
        const g = this.city.grid;
        const strips = {
            north: [0, 0, g, 1], south: [0, g - 1, g, 1], west: [0, 0, 1, g], east: [g - 1, 0, 1, g],
        };
        const [x, y, w, h] = strips[side];
        const pulse = 0.18 + 0.1 * Math.sin(time * 4);
        const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => toScreen(this.camera, px, py));
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 61, 154, ${pulse})`;
        ctx.fill();

        const [ix, iy] = INWARD[side];
        ctx.strokeStyle = 'rgba(255, 120, 190, 0.9)';
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

    // ── buildings ──────────────────────────────────────────────────────
    #building(b, state, time) {
        const info = BUILDING_INFO[b.type];
        const inset = b.type === 'wall' ? 0.04 : 0.12;
        this.#box(b.x + inset, b.y + inset, b.size - 2 * inset, info.height, info.side, info.top, info.glow);
        const cx = b.x + b.size / 2;
        const cy = b.y + b.size / 2;
        const firing = state ? this.#recentlyFired(b.id, state) : 0;
        switch (b.type) {
            case 'core': this.#coreCrystal(cx, cy, info, time); break;
            case 'rune_tower':
            case 'lightning_tower':
            case 'frost_tower': this.#towerHead(b.type, cx, cy, info, time, firing); break;
            case 'wall': break;
            default: this.#productionDetail(b, cx, cy, info, time);
        }
    }

    #box(x, y, size, height, sideColor, topColor, glow) {
        const { ctx, camera } = this;
        const s = camera.scale;
        const A = toScreen(camera, x, y);
        const B = toScreen(camera, x + size, y);
        const C = toScreen(camera, x + size, y + size);
        const D = toScreen(camera, x, y + size);
        const up = height * s;
        // left face
        ctx.beginPath();
        ctx.moveTo(D.x, D.y); ctx.lineTo(C.x, C.y); ctx.lineTo(C.x, C.y - up); ctx.lineTo(D.x, D.y - up);
        ctx.closePath();
        ctx.fillStyle = sideColor;
        ctx.fill();
        // right face, a shade darker
        ctx.beginPath();
        ctx.moveTo(C.x, C.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x, B.y - up); ctx.lineTo(C.x, C.y - up);
        ctx.closePath();
        ctx.fillStyle = shade(sideColor, 0.7);
        ctx.fill();
        // top
        ctx.beginPath();
        ctx.moveTo(A.x, A.y - up); ctx.lineTo(B.x, B.y - up); ctx.lineTo(C.x, C.y - up); ctx.lineTo(D.x, D.y - up);
        ctx.closePath();
        ctx.fillStyle = topColor;
        ctx.fill();
        ctx.strokeStyle = withAlpha(glow, 0.55);
        ctx.lineWidth = Math.max(1, 1.2 * s);
        ctx.stroke();
        // glowing seam on the front edge
        ctx.beginPath();
        ctx.moveTo(C.x, C.y - up); ctx.lineTo(C.x, C.y);
        ctx.strokeStyle = withAlpha(glow, 0.35);
        ctx.stroke();
    }

    #halo(x, y, radius, color, strength = 1) {
        const { ctx } = this;
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0, withAlpha(color, 0.55 * strength));
        g.addColorStop(1, withAlpha(color, 0));
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    #coreCrystal(cx, cy, info, time) {
        const { ctx, camera } = this;
        const s = camera.scale;
        const bob = Math.sin(time * 2) * 4;
        const base = info.height + 26 + bob;
        const top = toScreen(camera, cx, cy, base + 70);
        const mid = toScreen(camera, cx, cy, base + 34);
        const bottom = toScreen(camera, cx, cy, base);
        const half = 20 * s;
        this.#halo(mid.x, mid.y, 70 * s, info.glow, 0.8 + 0.2 * Math.sin(time * 3));
        const grad = ctx.createLinearGradient(mid.x - half, top.y, mid.x + half, bottom.y);
        grad.addColorStop(0, '#ffd0f0');
        grad.addColorStop(0.5, '#ff3db8');
        grad.addColorStop(1, '#5a1050');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(mid.x + half, mid.y);
        ctx.lineTo(bottom.x, bottom.y);
        ctx.lineTo(mid.x - half, mid.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 220, 245, 0.8)';
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(bottom.x, bottom.y);
        ctx.stroke();
    }

    #towerHead(type, cx, cy, info, time, firing) {
        const { ctx, camera } = this;
        const s = camera.scale;
        const head = toScreen(camera, cx, cy, info.height + 14);
        this.#halo(head.x, head.y, (26 + 22 * firing) * s, info.glow, 0.7 + firing);
        if (type === 'lightning_tower') {
            ctx.strokeStyle = info.glow;
            ctx.lineWidth = 2.5 * s;
            for (const dx of [-7, 7]) {
                ctx.beginPath();
                ctx.moveTo(head.x + dx * s, head.y + 12 * s);
                ctx.lineTo(head.x + dx * 1.4 * s, head.y - 10 * s);
                ctx.stroke();
            }
        } else if (type === 'frost_tower') {
            ctx.fillStyle = '#dff6ff';
            ctx.beginPath();
            ctx.moveTo(head.x, head.y - 16 * s);
            ctx.lineTo(head.x + 7 * s, head.y);
            ctx.lineTo(head.x, head.y + 10 * s);
            ctx.lineTo(head.x - 7 * s, head.y);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.strokeStyle = info.glow;
            ctx.lineWidth = 2 * s;
            ctx.setLineDash([4 * s, 3 * s]);
            ctx.lineDashOffset = -time * 20 * s;
            ctx.beginPath();
            ctx.ellipse(head.x, head.y + 4 * s, 13 * s, 6.5 * s, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.fillStyle = '#fff6e0';
        ctx.beginPath();
        ctx.arc(head.x, head.y, 4.5 * s, 0, Math.PI * 2);
        ctx.fill();
    }

    #productionDetail(b, cx, cy, info, time) {
        const { ctx, camera } = this;
        const s = camera.scale;
        const top = toScreen(camera, cx, cy, info.height);
        switch (b.type) {
            case 'scrap_foundry': {
                this.#box(b.x + 0.35, b.y + 0.3, 0.5, info.height + 34, '#3a2318', '#5a3322', info.glow);
                const flue = toScreen(camera, b.x + 0.6, b.y + 0.55, info.height + 40);
                this.#halo(flue.x, flue.y, (16 + 4 * Math.sin(time * 6)) * s, info.glow);
                break;
            }
            case 'mana_well': {
                ctx.fillStyle = withAlpha(info.glow, 0.55 + 0.15 * Math.sin(time * 3));
                ctx.beginPath();
                ctx.ellipse(top.x, top.y, 22 * s, 11 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                this.#halo(top.x, top.y, 34 * s, info.glow, 0.6);
                break;
            }
            case 'data_node': {
                for (let i = 0; i < 3; i++) {
                    const on = Math.sin(time * 5 + i * 2.1) > 0;
                    ctx.fillStyle = on ? info.glow : withAlpha(info.glow, 0.25);
                    ctx.fillRect(top.x - 12 * s + i * 9 * s, top.y - 3 * s, 6 * s, 4 * s);
                }
                break;
            }
            case 'vault': {
                ctx.strokeStyle = info.glow;
                ctx.lineWidth = 2 * s;
                ctx.beginPath();
                ctx.ellipse(top.x, top.y, 14 * s, 7 * s, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
            }
            default: { // rune quarry: cut stones on the yard
                this.#box(b.x + 0.4, b.y + 0.4, 0.45, info.height + 14, '#30333a', '#4a4e57', info.glow);
                this.#box(b.x + 1.05, b.y + 0.9, 0.4, info.height + 8, '#30333a', '#4a4e57', info.glow);
            }
        }
    }

    #rubble(b) {
        const { ctx, camera } = this;
        this.#diamond(ctx, b.x + 0.1, b.y + 0.1, b.size - 0.2, b.type === 'wall' ? '#141822' : '#1a1712', null);
        if (b.type === 'wall') return;
        const s = camera.scale;
        const spots = [[0.3, 0.4], [0.7, 0.3], [0.5, 0.75], [0.25, 0.8]];
        ctx.fillStyle = '#2c2a26';
        for (const [fx, fy] of spots) {
            const p = toScreen(camera, b.x + fx * b.size, b.y + fy * b.size, 3);
            ctx.fillRect(p.x - 4 * s, p.y - 3 * s, 8 * s, 5 * s);
        }
    }

    #scorch(b) {
        const { ctx, camera } = this;
        const c = toScreen(camera, b.x + 0.5, b.y + 0.5);
        const { rx, ry } = groundEllipse(camera, 1.1);
        ctx.fillStyle = 'rgba(60, 25, 10, 0.55)';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 122, 61, 0.35)';
        ctx.lineWidth = 1.5 * camera.scale;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── city mode ──────────────────────────────────────────────────────
    #footprint(x, y, size, color, alpha) {
        const { ctx } = this;
        this.#diamond(ctx, x, y, size, withAlpha(color, alpha), null);
        ctx.strokeStyle = withAlpha(color, 0.9);
        ctx.lineWidth = 2 * this.camera.scale;
        this.#outline(ctx, x, y, size);
    }

    #trapMark(b, time) {
        const { ctx, camera } = this;
        const c = toScreen(camera, b.x + 0.5, b.y + 0.5);
        const { rx, ry } = groundEllipse(camera, 0.38);
        ctx.strokeStyle = withAlpha('#ff7a3d', 0.45 + 0.2 * Math.sin(time * 3));
        ctx.lineWidth = 2 * camera.scale;
        ctx.setLineDash([3 * camera.scale, 3 * camera.scale]);
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    #bubbles(bubbles, time) {
        const { ctx, camera } = this;
        const s = camera.scale;
        for (const [id, bubble] of bubbles) {
            const b = this.byId.get(id);
            if (!b) continue;
            const color = MATERIAL_INFO[bubble.material].color;
            const bob = Math.sin(time * 3 + id) * 3 * s;
            const p = toScreen(camera, b.x + b.size / 2, b.y + b.size / 2, BUILDING_INFO[b.type].height + 46);
            const r = Math.max(11, 15 * s);
            this.#halo(p.x, p.y + bob, r * 2.2, color, bubble.full ? 1 : 0.6);
            ctx.fillStyle = 'rgba(10, 13, 24, 0.92)';
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1.5, 2 * s);
            ctx.beginPath();
            ctx.arc(p.x, p.y + bob, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.font = `700 ${Math.max(10, r * 0.8)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(bubble.amount), p.x, p.y + bob + 1);
            ctx.textBaseline = 'alphabetic';
        }
    }

    #floater({ x, y, text, color, age }) {
        const p = toScreen(this.camera, x, y, 70 + 50 * age);
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
        const bob = hero.moving ? Math.sin(time * 14 + hero.id * 1.7) * 2 * s : 0;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(foot.x, foot.y, 11 * s, 5.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        const y = foot.y + bob;
        if (hero.cls === 'neon_blade' && hero.moving) {
            for (const k of [2, 1]) {
                ctx.globalAlpha = 0.18 * k;
                this.#bladeBody(foot.x - hero.facing * k * 6 * s, y, s, info.color);
            }
            ctx.globalAlpha = 1;
        }
        this.#halo(foot.x, y - 14 * s, 20 * s, info.color, 0.5);
        if (hero.cls === 'guardian') this.#guardianBody(foot.x, y, s, info.color, hero.facing);
        else if (hero.cls === 'neon_blade') this.#bladeBody(foot.x, y, s, info.color);
        else this.#mageBody(foot.x, y, s, info.color, time + hero.id);

        if (hero.slowed) {
            ctx.fillStyle = 'rgba(159, 227, 255, 0.3)';
            ctx.beginPath();
            ctx.ellipse(foot.x, y - 12 * s, 13 * s, 16 * s, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    #guardianBody(x, y, s, color, facing) {
        const { ctx } = this;
        ctx.fillStyle = shade(color, 0.55);
        roundRect(ctx, x - 8 * s, y - 24 * s, 16 * s, 22 * s, 4 * s);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        const sx = x + (facing || 1) * 6 * s;
        ctx.ellipse(sx, y - 13 * s, 6 * s, 10 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d8e8ff';
        ctx.beginPath();
        ctx.arc(x, y - 28 * s, 5 * s, 0, Math.PI * 2);
        ctx.fill();
    }

    #bladeBody(x, y, s, color) {
        const { ctx } = this;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - 32 * s);
        ctx.lineTo(x + 6 * s, y - 14 * s);
        ctx.lineTo(x, y - 2 * s);
        ctx.lineTo(x - 6 * s, y - 14 * s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffd0ea';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(x + 7 * s, y - 26 * s);
        ctx.lineTo(x + 13 * s, y - 8 * s);
        ctx.stroke();
    }

    #mageBody(x, y, s, color, phase) {
        const { ctx } = this;
        ctx.fillStyle = shade(color, 0.6);
        ctx.beginPath();
        ctx.moveTo(x, y - 26 * s);
        ctx.lineTo(x + 9 * s, y - 2 * s);
        ctx.lineTo(x - 9 * s, y - 2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e6dcff';
        ctx.beginPath();
        ctx.arc(x, y - 28 * s, 4.5 * s, 0, Math.PI * 2);
        ctx.fill();
        const ox = x + Math.cos(phase * 3) * 12 * s;
        const oy = y - 24 * s + Math.sin(phase * 3) * 3 * s;
        this.#halo(ox, oy, 10 * s, color, 1);
        ctx.fillStyle = '#f1eaff';
        ctx.beginPath();
        ctx.arc(ox, oy, 3 * s, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── bars and effects ───────────────────────────────────────────────
    #bar(x, y, width, ratio, color) {
        const { ctx } = this;
        const s = this.camera.scale;
        const h = Math.max(3, 4 * s);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - width / 2 - 1, y - 1, width + 2, h + 2);
        ctx.fillStyle = color;
        ctx.fillRect(x - width / 2, y, width * Math.max(0, ratio), h);
    }

    #buildingBar(b, hp) {
        const info = BUILDING_INFO[b.type];
        const extra = b.type === 'core' ? 150 : 26;
        const p = toScreen(this.camera, b.x + b.size / 2, b.y + b.size / 2, info.height + extra);
        const ratio = hp / b.hp;
        this.#bar(p.x, p.y, (18 + 10 * b.size) * this.camera.scale, ratio, ratio > 0.5 ? '#4dff9a' : '#ffb547');
    }

    #heroBar(hero) {
        const p = toScreen(this.camera, hero.x, hero.y, 44 * HERO_SCALE);
        this.#bar(p.x, p.y, 26 * this.camera.scale * HERO_SCALE, hero.hp / hero.maxHp, HERO_INFO[hero.cls].color);
    }

    #heroPoint(state, id, z = 14 * HERO_SCALE) {
        const h = state.heroes[id];
        return toScreen(this.camera, h.x, h.y, z);
    }

    #buildingPoint(id, zFactor = 0.6) {
        const b = this.byId.get(id);
        const info = BUILDING_INFO[b.type];
        return toScreen(this.camera, b.x + b.size / 2, b.y + b.size / 2, info.height * zFactor + 6);
    }

    #effect({ event: e, age }, state) {
        const { ctx, camera } = this;
        const s = camera.scale;
        const fade = 1 - age;
        ctx.lineCap = 'round';
        switch (e.type) {
            case 'strike': {
                const from = this.#heroPoint(state, e.hero);
                const to = this.#buildingPoint(e.building);
                const color = HERO_INFO[state.heroes[e.hero].cls].color;
                ctx.strokeStyle = withAlpha(color, fade);
                ctx.lineWidth = 2.5 * s;
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
                this.#halo(to.x, to.y, 14 * s, color, fade);
                break;
            }
            case 'nova': {
                const c = toScreen(camera, e.x, e.y);
                const { rx, ry } = groundEllipse(camera, e.radius * (0.3 + 0.7 * easeOut(age)));
                ctx.fillStyle = withAlpha('#a77bff', 0.22 * fade);
                ctx.strokeStyle = withAlpha('#d9c7ff', fade);
                ctx.lineWidth = 3 * s;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            }
            case 'shot': {
                const from = this.#buildingPoint(e.building, 1.25);
                const to = this.#heroPoint(state, e.hero);
                ctx.strokeStyle = withAlpha('#ffb547', fade);
                ctx.lineWidth = 2 * s;
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
                this.#halo(to.x, to.y, 12 * s, '#ffb547', fade);
                break;
            }
            case 'bolt': {
                let from = this.#buildingPoint(e.building, 1.25);
                ctx.strokeStyle = withAlpha('#9ff4ff', fade);
                ctx.lineWidth = 2.5 * s;
                e.hits.forEach((hit, i) => {
                    const to = this.#heroPoint(state, hit.hero);
                    this.#zigzag(from, to, e.t + i, s);
                    this.#halo(to.x, to.y, 14 * s, '#39e6ff', fade);
                    from = to;
                });
                break;
            }
            case 'frost': {
                const c = toScreen(camera, e.x, e.y);
                const { rx, ry } = groundEllipse(camera, e.radius * (0.6 + 0.4 * age));
                ctx.fillStyle = withAlpha('#9fe3ff', 0.28 * fade);
                ctx.strokeStyle = withAlpha('#dff6ff', fade);
                ctx.lineWidth = 2 * s;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            }
            case 'trap': {
                const c = toScreen(camera, e.x, e.y);
                const { rx, ry } = groundEllipse(camera, e.radius * (0.3 + 0.7 * easeOut(age)));
                ctx.fillStyle = withAlpha('#ff7a3d', 0.45 * fade);
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                this.#halo(c.x, c.y - 10 * s, 50 * s, '#ff7a3d', fade);
                this.#label('RUNE TRAP', c.x, c.y - (40 + 30 * age) * s, '#ffb08a', fade);
                break;
            }
            case 'destroyed': {
                const p = this.#buildingPoint(e.building, 0.5);
                const glow = BUILDING_INFO[this.byId.get(e.building).type].glow;
                this.#halo(p.x, p.y, (24 + 50 * easeOut(age)) * s, '#ffffff', fade);
                this.#halo(p.x, p.y, (30 + 60 * easeOut(age)) * s, glow, fade);
                ctx.fillStyle = withAlpha('#c8c2b8', fade);
                for (let i = 0; i < 7; i++) {
                    const a = (i / 7) * Math.PI * 2 + e.building;
                    const r = (8 + 40 * easeOut(age)) * s;
                    ctx.fillRect(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.6 - 20 * age * s, 3 * s, 3 * s);
                }
                break;
            }
            case 'hero_down': {
                const h = state.heroes[e.hero];
                const p = toScreen(camera, h.x, h.y, 20 + 30 * age);
                ctx.strokeStyle = withAlpha('#c9d2e3', fade * 0.8);
                ctx.lineWidth = 2 * s;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 9 * s, 0, Math.PI * 2);
                ctx.stroke();
                break;
            }
            default:
                break;
        }
    }

    #zigzag(from, to, seed, s) {
        const { ctx } = this;
        const steps = 5;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        for (let i = 1; i < steps; i++) {
            const k = i / steps;
            const jitter = Math.sin(seed * 12.9898 + i * 78.233) * 7 * s;
            ctx.lineTo(from.x + dx * k + nx * jitter, from.y + dy * k + ny * jitter);
        }
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }

    #label(text, x, y, color, alpha) {
        const { ctx } = this;
        const s = this.camera.scale;
        ctx.globalAlpha = alpha;
        ctx.font = `700 ${Math.max(10, 13 * s)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.globalAlpha = 1;
    }
}

function tileColor(x, y, grid) {
    if (x === 0 || y === 0 || x === grid - 1 || y === grid - 1) return '#0a0d15';
    return (x + y) % 2 === 1 ? '#111725' : '#131a2a';
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

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
}

function hexToRgb(hex) {
    const n = Number.parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function withAlpha(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function shade(hex, factor) {
    const [r, g, b] = hexToRgb(hex).map((c) => Math.round(c * factor));
    return `rgb(${r}, ${g}, ${b})`;
}

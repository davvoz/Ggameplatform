import { groundEllipse } from '../../core/iso.js';
import { BUILDING_INFO, HERO_INFO, MATERIAL_INFO } from '../../data/labels.js';
import { halo, path, withAlpha } from '../art/primitives.js';
import { HERO_SCALE } from './shared.js';

const INWARD = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] };

const FONT = '"Chakra Petch", "Segoe UI", system-ui, sans-serif';

/** Marks over the map: entry side, tower reach, scorched traps, footprints, production medallions, health bars, labels. */
export class MapMarks {
    constructor(renderer) {
        this.renderer = renderer;
    }

    #diamond(ctx, x, y, size, fill) {
        const pts = [[x, y], [x + size, y], [x + size, y + size], [x, y + size]].map(([px, py]) => this.renderer.at(px, py));
        path(ctx, pts);
        ctx.fillStyle = fill;
        ctx.fill();
    }

    entryEdge(side, time) {
        const { ctx } = this.renderer;
        const g = this.renderer.city.grid;
        const strips = {
            north: [0, 0, g, 1], south: [0, g - 1, g, 1], west: [0, 0, 1, g], east: [g - 1, 0, 1, g],
        };
        const [x, y, w, h] = strips[side];
        const pulse = 0.2 + 0.1 * Math.sin(time * 4);
        const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => this.renderer.at(px, py));
        path(ctx, pts);
        ctx.fillStyle = `rgba(255, 70, 30, ${pulse})`;
        ctx.fill();

        const [ix, iy] = INWARD[side];
        ctx.strokeStyle = 'rgba(255, 170, 90, 0.95)';
        ctx.lineWidth = 3 * this.renderer.camera.scale;
        ctx.lineCap = 'round';
        for (const f of [0.25, 0.5, 0.75]) {
            const cx = side === 'north' || side === 'south' ? f * g : x + 0.5;
            const cy = side === 'west' || side === 'east' ? f * g : y + 0.5;
            const shift = ((time * 1.2) % 1) * 0.6;
            const tipX = cx + ix * (0.6 + shift);
            const tipY = cy + iy * (0.6 + shift);
            const px = -iy * 0.45;
            const py = ix * 0.45;
            const a = this.renderer.at(tipX - ix * 0.45 + px, tipY - iy * 0.45 + py);
            const b = this.renderer.at(tipX, tipY);
            const c = this.renderer.at(tipX - ix * 0.45 - px, tipY - iy * 0.45 - py);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(c.x, c.y);
            ctx.stroke();
        }
    }

    /** Dashed rings showing how far towers reach: 'all', or one building id. */
    ranges(which, state, time) {
        const { ctx, camera } = this.renderer;
        for (const b of this.renderer.city.buildings) {
            if (!b.range || (which !== 'all' && which !== b.id) || state?.destroyed.has(b.id)) continue;
            const c = this.renderer.at(b.x + b.size / 2, b.y + b.size / 2);
            const { rx, ry } = groundEllipse(camera, b.range + b.size / 2);   // the simulation measures from the tower's edge
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

    scorch(b) {
        const { ctx, camera } = this.renderer;
        const c = this.renderer.at(b.x + 0.5, b.y + 0.5);
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
    footprint(x, y, size, color, alpha) {
        const { ctx } = this.renderer;
        this.#diamond(ctx, x, y, size, withAlpha(color, alpha));
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10 * this.renderer.camera.scale;
        ctx.strokeStyle = withAlpha(color, 0.95);
        ctx.lineWidth = 2 * this.renderer.camera.scale;
        this.renderer.groundLayer.outline(ctx, x, y, size);
        ctx.restore();
    }

    /** A forged-iron medallion over production buildings: what is waiting to be collected. */
    bubbles(bubbles, time) {
        const { ctx, camera } = this.renderer;
        const s = camera.scale;
        for (const [id, bubble] of bubbles) {
            const b = this.renderer.byId.get(id);
            if (!b) continue;
            const color = MATERIAL_INFO[bubble.material].color;
            const bob = Math.sin(time * 3 + id) * 3 * s;
            const p = this.renderer.at(b.x + b.size / 2, b.y + b.size / 2, BUILDING_INFO[b.type].pick + 26);
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

    floater({ x, y, text, color, age }) {
        const p = this.renderer.at(x, y, 80 + 50 * age);
        this.label(text, p.x, p.y, color, 1 - age * age);
    }

    // ── bars and labels ────────────────────────────────────────────────
    #bar(x, y, width, ratio, color) {
        const { ctx } = this.renderer;
        const s = this.renderer.camera.scale;
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

    buildingBar(b, hp) {
        const info = BUILDING_INFO[b.type];
        const p = this.renderer.at(b.x + b.size / 2, b.y + b.size / 2, info.pick + 16);
        const ratio = hp / b.hp;
        this.#bar(p.x, p.y, (18 + 10 * b.size) * this.renderer.camera.scale, ratio, ratio > 0.5 ? '#ffb347' : '#ff5040');
    }

    heroBar(hero) {
        const p = this.renderer.at(hero.x, hero.y, 48 * HERO_SCALE);
        this.#bar(p.x, p.y, 26 * this.renderer.camera.scale * HERO_SCALE, hero.hp / hero.maxHp, HERO_INFO[hero.cls].color);
    }

    label(text, x, y, color, alpha) {
        const { ctx } = this.renderer;
        const s = this.renderer.camera.scale;
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

import { groundEllipse } from '../../core/iso.js';
import { BUILDING_INFO, HERO_INFO } from '../../data/labels.js';
import { flame, halo, hash, path, withAlpha } from '../art/primitives.js';
import { perf } from '../perf.js';
import { HERO_SCALE } from './shared.js';

const EMBERS = 46;

function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
}

/** Battle effects drawn from the replay events (blows, shots, bolts, frost, traps, explosions) and the embers in the air. */
export class BattleEffects {
    constructor(renderer) {
        this.renderer = renderer;
    }

    recentlyFired(buildingId, state) {
        let best = 0;
        for (const { event, age } of state.effects) {
            if (event.building === buildingId && ['shot', 'bolt', 'frost'].includes(event.type)) {
                best = Math.max(best, 1 - age);
            }
        }
        return best;
    }

    #heroPoint(state, id, z = 16 * HERO_SCALE) {
        const h = state.heroes[id];
        return this.renderer.at(h.x, h.y, z);
    }

    buildingPoint(id, zFactor = 0.6) {
        const b = this.renderer.byId.get(id);
        const info = BUILDING_INFO[b.type];
        return this.renderer.at(b.x + b.size / 2, b.y + b.size / 2, info.height * zFactor + 6);
    }

    #towerMuzzle(id) {
        const b = this.renderer.byId.get(id);
        return this.renderer.at(b.x + b.size / 2, b.y + b.size / 2, BUILDING_INFO[b.type].pick - 14);
    }

    effect({ event: e, age }, state, time) {
        const { ctx, camera } = this.renderer;
        const s = camera.scale;
        const fade = 1 - age;
        ctx.lineCap = 'round';
        switch (e.type) {
            case 'strike': {
                const to = this.buildingPoint(e.building);
                const cls = state.heroes[e.hero].cls;
                const color = HERO_INFO[cls].color;
                if (cls === 'neon_blade') this.#cuts(to, e.t + e.hero, age, s, color);
                else if (cls === 'guardian') this.#shockwave(e.building, age, s, color);
                this.#sparks(to, e.t + e.hero, age, s, ['#fff1c9', '#ffb347', color]);
                halo(ctx, to.x, to.y, (cls === 'technomancer' ? 26 : 16) * s, color, fade);
                break;
            }
            case 'nova': {
                const c = this.renderer.at(e.x, e.y);
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
                const c = this.renderer.at(e.x, e.y);
                if (age < 0.4) this.#fireball(from, this.renderer.at(e.x, e.y, 20), age / 0.4, s, '#f1fbff', '#3ab0ff');
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
                const c = this.renderer.at(e.x, e.y);
                const { rx, ry } = groundEllipse(camera, e.radius * (0.3 + 0.7 * easeOut(age)));
                ctx.fillStyle = withAlpha('#ff5a00', 0.45 * fade);
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                flame(ctx, c, 38 * s * fade, time, e.building, '#ffe08a', '#ff3a00');
                halo(ctx, c.x, c.y - 20 * s, 60 * s, '#ff5a00', fade);
                this.renderer.marks.label('RUNE TRAP!', c.x, c.y - (56 + 30 * age) * s, '#ffcf8a', fade);
                break;
            }
            case 'destroyed': {
                const p = this.buildingPoint(e.building, 0.5);
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
                const p = this.renderer.at(h.x, h.y, 20 + 50 * age);
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
        const { ctx } = this.renderer;
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

    /** Two crossing cuts where the Neon Blade's daggers bite. */
    #cuts(at, seed, age, s, color) {
        const { ctx } = this.renderer;
        const fade = 1 - age;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10 * s;
        for (const [i, tilt] of [[0, 0.6], [1, -0.7]]) {
            const len = 18 * s * easeOut(Math.min(1, age * 2 + i * 0.2));
            const a = tilt + hash(seed + i) * 0.4;
            ctx.strokeStyle = withAlpha(color, fade);
            ctx.lineWidth = 3.5 * s;
            ctx.beginPath();
            ctx.moveTo(at.x - Math.cos(a) * len, at.y - Math.sin(a) * len);
            ctx.lineTo(at.x + Math.cos(a) * len, at.y + Math.sin(a) * len);
            ctx.stroke();
            ctx.strokeStyle = withAlpha('#ffffff', fade);
            ctx.lineWidth = 1.2 * s;
            ctx.stroke();
        }
        ctx.restore();
    }

    /** The Guardian's hammer shaking the ground round the building. */
    #shockwave(buildingId, age, s, color) {
        const b = this.renderer.byId.get(buildingId);
        if (!b) return;
        const { ctx } = this.renderer;
        const c = this.renderer.at(b.x + b.size / 2, b.y + b.size / 2);
        const { rx, ry } = groundEllipse(this.renderer.camera, b.size * 0.6 + 0.6 * easeOut(age));
        ctx.strokeStyle = withAlpha('#ffe6b0', 0.8 * (1 - age));
        ctx.lineWidth = 3 * s * (1 - age);
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = withAlpha(color, 0.6 * (1 - age));
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();
    }

    #sparks(at, seed, age, s, colors) {
        const { ctx } = this.renderer;
        for (let i = 0; i < 7; i++) {
            const a = hash(seed * 3 + i) * Math.PI * 2;
            const r = (4 + 22 * easeOut(age)) * s * (0.6 + hash(seed + i));
            ctx.fillStyle = withAlpha(colors[i % colors.length], 1 - age);
            ctx.fillRect(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r * 0.7 - age * 8 * s, 2.5 * s, 2.5 * s);
        }
    }

    /** Embers drifting up over the whole field. */
    embers(time) {
        const { ctx } = this.renderer;
        const s = this.renderer.camera.scale;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const count = perf.on ? perf.embers : EMBERS;
        for (let i = 0; i < count; i++) {
            const life = (time * (0.05 + hash(i) * 0.08) + hash(i + 5)) % 1;
            const x = hash(i + 11) * this.renderer.w + Math.sin(time * 1.1 + i) * 16 * s * life;
            const y = this.renderer.h * (1.02 - life * 1.05);
            ctx.globalAlpha = (1 - life) * 0.75;
            ctx.fillStyle = life < 0.5 ? '#ffb347' : '#ff5a00';
            ctx.beginPath();
            ctx.arc(x, y, (1.2 + (1 - life)) * Math.max(1, s), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    #zigzag(from, to, seed, s) {
        const { ctx } = this.renderer;
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
}

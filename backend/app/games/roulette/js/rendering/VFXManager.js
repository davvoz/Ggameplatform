import { GameConfig } from '../config/GameConfig.js';

const C = GameConfig.COLOR;

/**
 * Simple particle / flash effect manager. Uses an object pool to avoid
 * per-frame allocation. Effect "kind" is data-driven (referenced by bet.vfx).
 */
export class VFXManager {
    constructor() {
        this._effects = [];
        this._pool = [];
    }

    /** kind: 'default' | 'luckyZero' | 'hot' | 'cold' | 'snake' | 'mirror' | 'neighbour' | 'bigwin' */
    burst(x, y, kind = 'default', count = 18) {
        const palette = this._palette(kind);
        for (let i = 0; i < count; i++) {
            const p = this._acquire();
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 160;
            p.x = x; p.y = y;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed - 60;
            p.life = 0;
            p.maxLife = 0.6 + Math.random() * 0.6;
            p.size = 2 + Math.random() * 3;
            p.color = palette[i % palette.length];
            this._effects.push(p);
        }
    }

    flash(text, color = C.GOLD_BRIGHT) {
        this._effects.push({
            kind: 'flash', text, color,
            life: 0, maxLife: 1.2,
            x: GameConfig.VIEW_WIDTH / 2, y: GameConfig.VIEW_HEIGHT / 2
        });
    }

    update(dt) {
        for (let i = this._effects.length - 1; i >= 0; i--) {
            const p = this._effects[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                this._release(this._effects[i]);
                this._effects.splice(i, 1);
                continue;
            }
            if (p.kind === 'flash') continue;
            p.vy += 220 * dt;   // gravity
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
    }

    render(ctx) {
        for (const p of this._effects) {
            if (p.kind === 'flash') {
                const t = p.life / p.maxLife;
                const alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.font = 'bold 36px system-ui';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.text, p.x, p.y);
                ctx.restore();
                continue;
            }
            const alpha = 1 - (p.life / p.maxLife);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _palette(kind) {
        const palettes = {
            default:   [C.GOLD_BRIGHT, C.GOLD, C.IVORY],
            luckyZero: [C.GREEN,       C.GOLD_BRIGHT, C.IVORY],
            hot:       [C.HOT,         C.RED_BRIGHT,  C.GOLD],
            cold:      [C.COLD,        C.IVORY,       C.GOLD],
            snake:     ['#7d3ec8',     C.GOLD,        C.IVORY],
            mirror:    [C.GOLD_BRIGHT, C.IVORY,       '#7d3ec8'],
            neighbour: [C.GOLD,        C.IVORY,       C.GOLD_BRIGHT],
            bigwin:    [C.GOLD_BRIGHT, C.RED_BRIGHT,  C.IVORY, C.HOT],
        };
        return palettes[kind] ?? palettes.default;
    }

    _acquire() {
        return this._pool.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color: '#fff' };
    }
    _release(p) { if (this._pool.length < 256) this._pool.push(p); }
}

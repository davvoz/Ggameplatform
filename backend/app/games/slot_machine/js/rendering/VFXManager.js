/**
 * Lightweight pooled particle/text-popup system for VFX (coin bursts, win popups,
 * scatter sparkles). No per-frame allocations once the pool is warmed.
 */
const PARTICLE_POOL_SIZE = 240;

export class VFXManager {
    constructor() {
        this.particles = new Array(PARTICLE_POOL_SIZE);
        for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
            this.particles[i] = this._newParticle();
        }
        this.popups = [];   // alive text popups (rare, small array)
    }

    _newParticle() {
        return { alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', kind: 'dot' };
    }

    emitBurst(x, y, count, color, opts = {}) {
        let emitted = 0;
        for (const p of this.particles) {
            if (emitted >= count) break;
            if (p.alive) continue;
            const a = Math.random() * Math.PI * 2;
            const speed = (opts.speedMin ?? 40) + Math.random() * ((opts.speedMax ?? 240) - (opts.speedMin ?? 40));
            p.alive = true;
            p.x = x; p.y = y;
            p.vx = Math.cos(a) * speed;
            p.vy = Math.sin(a) * speed - (opts.upBias ?? 60);
            p.life = 0;
            p.maxLife = (opts.lifeMin ?? 0.4) + Math.random() * ((opts.lifeMax ?? 1) - (opts.lifeMin ?? 0.4));
            p.size = (opts.sizeMin ?? 2) + Math.random() * ((opts.sizeMax ?? 4) - (opts.sizeMin ?? 2));
            p.color = color;
            p.kind = opts.kind ?? 'dot';
            emitted++;
        }
    }

    popup(x, y, text, color, opts = {}) {
        this.popups.push({
            x, y, text, color,
            life: 0,
            maxLife: opts.life ?? 1,
            vy: opts.vy ?? -80,
            size: opts.size ?? 22
        });
    }

    update(dt) {
        const gravity = 320;
        for (const p of this.particles) {
            if (!p.alive) continue;
            p.life += dt;
            if (p.life >= p.maxLife) { p.alive = false; continue; }
            p.vy += gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const u = this.popups[i];
            u.life += dt;
            u.y += u.vy * dt;
            u.vy *= 0.96;
            if (u.life >= u.maxLife) this.popups.splice(i, 1);
        }
    }

    render(ctx) {
        ctx.save();
        for (const p of this.particles) {
            if (!p.alive) continue;
            const a = 1 - (p.life / p.maxLife);
            ctx.globalAlpha = Math.max(0, a);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        for (const u of this.popups) {
            const k = u.life / u.maxLife;
            ctx.globalAlpha = Math.max(0, 1 - k * k);
            ctx.font = `900 ${u.size}px system-ui,sans-serif`;
            ctx.fillStyle = u.color;
            ctx.shadowColor = u.color;
            ctx.shadowBlur = 14;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(u.text, u.x, u.y);
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Pre-allocated particle pool. Zero allocation in hot loop.
 * Particles have position, velocity, life, color, size and gravity scale.
 */
export class ParticlePool {
    constructor(size = C.PARTICLE_POOL) {
        this.size = size;
        this.particles = new Array(size);
        for (let i = 0; i < size; i++) {
            this.particles[i] = {
                x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 1,
                color: '#fff', size: 2, gScale: 1,
            };
        }
        this.next = 0;
    }

    /**
     * Spawn a circular burst of `count` particles centered at (x,y).
     * @param {number} x  world X
     * @param {number} y  world Y
     * @param {string} color  CSS color
     * @param {number} count  particle count
     * @param {number} speed  base speed magnitude
     * @param {number} gScale gravity multiplier (1 = full gravity, 0 = none)
     */
    burst(x, y, color, count = 8, speed = 220, gScale = 0.6) {
        const life = C.PARTICLE_LIFE;
        for (let i = 0; i < count; i++) {
            const p = this.particles[this.next];
            this.next = (this.next + 1) % this.size;
            const ang = Math.random() * Math.PI * 2;
            const sp  = speed * (0.5 + Math.random() * 0.7);
            p.x = x; p.y = y;
            p.vx = Math.cos(ang) * sp;
            p.vy = Math.sin(ang) * sp;
            p.life = life * (0.7 + Math.random() * 0.6);
            p.maxLife = p.life;
            p.color = color;
            p.size = 1.5 + Math.random() * 2.2;
            p.gScale = gScale;
        }
    }

    /** Linear streak (e.g. flipper flick): emit along an angle. */
    streak(x, y, angle, color, count = 5, speed = 280) {
        const life = C.PARTICLE_LIFE * 0.6;
        const spread = 0.45;
        for (let i = 0; i < count; i++) {
            const p = this.particles[this.next];
            this.next = (this.next + 1) % this.size;
            const a = angle + (Math.random() - 0.5) * spread;
            const sp = speed * (0.6 + Math.random() * 0.6);
            p.x = x; p.y = y;
            p.vx = Math.cos(a) * sp;
            p.vy = Math.sin(a) * sp;
            p.life = life;
            p.maxLife = life;
            p.color = color;
            p.size = 1.2 + Math.random() * 1.6;
            p.gScale = 0.2;
        }
    }

    update(dt) {
        const g = 1600 * dt;
        for (let i = 0; i < this.size; i++) {
            const p = this.particles[i];
            if (p.life <= 0) continue;
            p.life -= dt;
            p.vy += g * p.gScale;
            p.x  += p.vx * dt;
            p.y  += p.vy * dt;
            // Mild damping so particles slow toward death
            p.vx *= 0.985;
        }
    }

    draw(ctx) {
        ctx.save();
        for (let i = 0; i < this.size; i++) {
            const p = this.particles[i];
            if (p.life <= 0) continue;
            const a = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = a;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

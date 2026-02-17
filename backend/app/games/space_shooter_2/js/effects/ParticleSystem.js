/**
 * ParticleSystem - Particle effects engine (performance-optimised)
 *
 * Key optimisations vs previous version:
 *  • update() uses swap-and-pop instead of splice (O(1) per removal vs O(n))
 *  • emit() recycles dead particles via a free-list cursor instead of findIndex
 *  • render() batches particles to minimise ctx.save()/restore() calls
 *  • shadowBlur (glow) skipped entirely when glowEnabled === false
 */

class Particle {
    constructor() {
        // All fields pre-allocated; reset() initialises them
        this.x = 0; this.y = 0;
        this.vx = 0; this.vy = 0;
        this.life = 0; this.maxLife = 1;
        this.size = 3; this.endSize = 0;
        this.color = { r: 255, g: 255, b: 255 };
        this.endColor = null;
        this.alpha = 1;
        this.gravity = 0;
        this.friction = 1;
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.shape = 'circle';
        this.glow = false;
        this.active = false;
    }

    reset(x, y, config) {
        this.x = x;
        this.y = y;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.life = config.life || 1;
        this.maxLife = this.life;
        this.size = config.size || 3;
        this.endSize = config.endSize || 0;
        this.color = config.color || { r: 255, g: 255, b: 255 };
        this.endColor = config.endColor || null;
        this.alpha = config.alpha || 1;
        this.gravity = config.gravity || 0;
        this.friction = config.friction || 1;
        this.rotation = config.rotation || 0;
        this.rotationSpeed = config.rotationSpeed || 0;
        this.shape = config.shape || 'circle';
        this.glow = config.glow || false;
        this.active = true;
    }

    update(dt) {
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        this.vy += this.gravity * dt;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotationSpeed * dt;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
        this.particleMultiplier = 1;
        this.glowEnabled = true;
        this.trailEnabled = true;
        // Ring-buffer cursor for recycling dead particles
        this._recycleCursor = 0;
    }

    /** Acquire a particle slot — recycles dead ones or grows array up to maxParticles */
    _acquire(x, y, cfg) {
        // 1) Try to recycle a dead particle near the cursor (amortised O(1))
        const len = this.particles.length;
        if (len >= this.maxParticles) {
            for (let attempts = 0; attempts < len; attempts++) {
                const idx = this._recycleCursor % len;
                this._recycleCursor++;
                if (!this.particles[idx].active) {
                    this.particles[idx].reset(x, y, cfg);
                    return;
                }
            }
            // All particles active, cannot emit
            return;
        }
        // 2) Array not full — push a new pre-allocated Particle
        const p = new Particle();
        p.reset(x, y, cfg);
        this.particles.push(p);
    }

    emit(x, y, preset, count = 10) {
        const configs = ParticleSystem.PRESETS[preset] || ParticleSystem.PRESETS.explosion;
        const scaledCount = Math.max(1, Math.round(count * this.particleMultiplier));
        for (let i = 0; i < scaledCount; i++) {
            const cfg = typeof configs === 'function' ? configs() : { ...configs };
            if (!this.glowEnabled) cfg.glow = false;
            this._acquire(x, y, cfg);
        }
    }

    emitCustom(x, y, config, count = 1) {
        const scaledCount = Math.max(1, Math.round(count * this.particleMultiplier));
        for (let i = 0; i < scaledCount; i++) {
            const cfg = typeof config === 'function' ? config() : { ...config };
            if (!this.glowEnabled) cfg.glow = false;
            this._acquire(x, y, cfg);
        }
    }

    update(dt) {
        // Swap-and-pop: O(1) removal per dead particle, no array shifts
        let i = 0;
        let len = this.particles.length;
        while (i < len) {
            const p = this.particles[i];
            p.update(dt);
            if (!p.active) {
                // Swap with last element and shrink
                len--;
                this.particles[i] = this.particles[len];
                this.particles[len] = p; // keep dead particle for reuse
                this.particles.length = len;
                // Don't increment i — need to check the swapped element
            } else {
                i++;
            }
        }
    }

    render(ctx) {
        const particles = this.particles;
        const len = particles.length;
        if (len === 0) return;

        // Single save/restore for all particles instead of per-particle
        ctx.save();
        ctx.shadowBlur = 0; // will be set per-particle only when needed

        for (let i = 0; i < len; i++) {
            const p = particles[i];
            if (!p.active) continue;

            const t = 1 - (p.life / p.maxLife);
            const size = p.size + (p.endSize - p.size) * t;
            const alpha = p.alpha * (p.life / p.maxLife);
            if (alpha <= 0.01 || size <= 0.2) continue;

            let r = p.color.r, g = p.color.g, b = p.color.b;
            if (p.endColor) {
                r = (p.color.r + (p.endColor.r - p.color.r) * t) | 0;
                g = (p.color.g + (p.endColor.g - p.color.g) * t) | 0;
                b = (p.color.b + (p.endColor.b - p.color.b) * t) | 0;
            }

            ctx.globalAlpha = alpha;

            if (p.glow) {
                ctx.shadowColor = `rgb(${r},${g},${b})`;
                ctx.shadowBlur = size * 2;
            }

            ctx.fillStyle = `rgb(${r},${g},${b})`;

            if (p.rotation !== 0 || p.shape === 'spark') {
                // Only use translate+rotate for particles that need rotation
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);

                if (p.shape === 'spark') {
                    ctx.beginPath();
                    ctx.moveTo(-size, 0);
                    ctx.lineTo(0, -size * 0.3);
                    ctx.lineTo(size, 0);
                    ctx.lineTo(0, size * 0.3);
                    ctx.closePath();
                    ctx.fill();
                } else if (p.shape === 'square') {
                    ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            } else {
                // No rotation — draw directly without translate (cheaper)
                if (p.shape === 'square') {
                    ctx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size, size);
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Reset shadow after glow particle to avoid bleeding into next one
            if (p.glow) {
                ctx.shadowBlur = 0;
            }
        }

        ctx.restore();
    }

    clear() {
        this.particles.length = 0;
        this._recycleCursor = 0;
    }
}

ParticleSystem.PRESETS = {
    explosion: () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 200;
        return {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.3 + Math.random() * 0.5,
            size: 2 + Math.random() * 4,
            endSize: 0,
            color: { r: 255, g: 150 + Math.floor(Math.random() * 105), b: 0 },
            endColor: { r: 255, g: 50, b: 0 },
            friction: 0.95,
            glow: true,
            shape: Math.random() > 0.5 ? 'circle' : 'spark'
        };
    },
    thruster: () => ({
        vx: (Math.random() - 0.5) * 30,
        vy: 80 + Math.random() * 60,
        life: 0.15 + Math.random() * 0.2,
        size: 2 + Math.random() * 3,
        endSize: 0,
        color: { r: 100, g: 180, b: 255 },
        endColor: { r: 50, g: 80, b: 200 },
        friction: 0.98,
        glow: true
    }),
    spark: () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 150;
        return {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.1 + Math.random() * 0.3,
            size: 1 + Math.random() * 2,
            endSize: 0,
            color: { r: 255, g: 255, b: 200 },
            friction: 0.96,
            shape: 'spark',
            glow: true
        };
    },
    powerup: () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 20 + Math.random() * 40;
        return {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.3 + Math.random() * 0.5,
            size: 2 + Math.random() * 3,
            endSize: 0,
            color: { r: 100, g: 255, b: 100 },
            glow: true
        };
    },
    hit: () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 80;
        return {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.1 + Math.random() * 0.2,
            size: 1 + Math.random() * 2,
            endSize: 0,
            color: { r: 255, g: 100, b: 100 },
            glow: true,
            shape: 'spark'
        };
    },
    shield: () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 10 + Math.random() * 30;
        return {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.3 + Math.random() * 0.4,
            size: 2 + Math.random() * 3,
            endSize: 0,
            color: { r: 100, g: 200, b: 255 },
            glow: true,
            alpha: 0.6
        };
    },
    ultimateCharged: () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 15 + Math.random() * 25;
        return {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.5 + Math.random() * 0.5,
            size: 2 + Math.random() * 4,
            endSize: 0,
            color: { r: 255, g: 215, b: 0 },
            endColor: { r: 255, g: 100, b: 0 },
            glow: true
        };
    },
    levelUp: () => {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const speed = 50 + Math.random() * 100;
        return {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.5 + Math.random() * 1,
            size: 3 + Math.random() * 5,
            endSize: 0,
            color: { r: 255, g: 255, b: 100 },
            endColor: { r: 100, g: 255, b: 100 },
            gravity: -20,
            glow: true
        };
    }
};

export { Particle, ParticleSystem };
export default ParticleSystem;

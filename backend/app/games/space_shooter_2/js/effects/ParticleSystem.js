/**
 * ParticleSystem - Particle effects engine
 */

class Particle {
    constructor(x, y, config = {}) {
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
        this.shape = config.shape || 'circle'; // circle, square, spark
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

    render(ctx) {
        const t = 1 - (this.life / this.maxLife);
        const size = this.size + (this.endSize - this.size) * t;
        let alpha = this.alpha * (this.life / this.maxLife);

        let r = this.color.r, g = this.color.g, b = this.color.b;
        if (this.endColor) {
            r = Math.floor(this.color.r + (this.endColor.r - this.color.r) * t);
            g = Math.floor(this.color.g + (this.endColor.g - this.color.g) * t);
            b = Math.floor(this.color.b + (this.endColor.b - this.color.b) * t);
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.glow) {
            ctx.shadowColor = `rgb(${r},${g},${b})`;
            ctx.shadowBlur = size * 2;
        }

        ctx.fillStyle = `rgb(${r},${g},${b})`;

        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'square') {
            ctx.fillRect(-size / 2, -size / 2, size, size);
        } else if (this.shape === 'spark') {
            ctx.beginPath();
            ctx.moveTo(-size, 0);
            ctx.lineTo(0, -size * 0.3);
            ctx.lineTo(size, 0);
            ctx.lineTo(0, size * 0.3);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
        this.particleMultiplier = 1;
        this.glowEnabled = true;
        this.trailEnabled = true;
    }

    emit(x, y, preset, count = 10) {
        const configs = ParticleSystem.PRESETS[preset] || ParticleSystem.PRESETS.explosion;
        const scaledCount = Math.max(1, Math.round(count * this.particleMultiplier));
        for (let i = 0; i < scaledCount; i++) {
            if (this.particles.length >= this.maxParticles) {
                const idx = this.particles.findIndex(p => !p.active);
                if (idx === -1) return;
                this.particles.splice(idx, 1);
            }
            const cfg = typeof configs === 'function' ? configs() : { ...configs };
            if (!this.glowEnabled) cfg.glow = false;
            this.particles.push(new Particle(x, y, cfg));
        }
    }

    emitCustom(x, y, config, count = 1) {
        const scaledCount = Math.max(1, Math.round(count * this.particleMultiplier));
        for (let i = 0; i < scaledCount; i++) {
            if (this.particles.length >= this.maxParticles) {
                const idx = this.particles.findIndex(p => !p.active);
                if (idx === -1) return;
                this.particles.splice(idx, 1);
            }
            const cfg = typeof config === 'function' ? config() : { ...config };
            if (!this.glowEnabled) cfg.glow = false;
            this.particles.push(new Particle(x, y, cfg));
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (!this.particles[i].active) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        for (const p of this.particles) {
            p.render(ctx);
        }
    }

    clear() {
        this.particles = [];
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

/**
 * ParticleSystem - Sistema di particelle avanzato
 */
class Particle {
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        this.vx = config.vx || (Math.random() - 0.5) * 100;
        this.vy = config.vy || (Math.random() - 0.5) * 100;
        this.size = config.size || 3;
        this.originalSize = this.size;
        this.life = config.life || 1;
        this.maxLife = this.life;
        this.decay = config.decay || 1;
        this.color = config.color || { r: 255, g: 255, b: 255 };
        this.endColor = config.endColor || this.color;
        this.gravity = config.gravity || 0;
        this.friction = config.friction || 0.98;
        this.shape = config.shape || 'circle'; // circle, square, star, spark
        this.rotation = config.rotation || 0;
        this.rotationSpeed = config.rotationSpeed || 0;
        this.alpha = 1;
        this.glow = config.glow || false;
        this.trail = config.trail || false;
        this.trailPositions = [];
    }

    update(deltaTime) {
        if (this.trail) {
            this.trailPositions.unshift({ x: this.x, y: this.y });
            if (this.trailPositions.length > 5) this.trailPositions.pop();
        }

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.vy += this.gravity * deltaTime;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.life -= this.decay * deltaTime;
        this.rotation += this.rotationSpeed * deltaTime;
        
        const lifeRatio = this.life / this.maxLife;
        this.alpha = lifeRatio;
        this.size = this.originalSize * lifeRatio;
    }

    render(ctx) {
        if (this.life <= 0 || this.size <= 0) return;

        const lifeRatio = this.life / this.maxLife;
        const r = Math.floor(this.color.r + (this.endColor.r - this.color.r) * (1 - lifeRatio));
        const g = Math.floor(this.color.g + (this.endColor.g - this.color.g) * (1 - lifeRatio));
        const b = Math.floor(this.color.b + (this.endColor.b - this.color.b) * (1 - lifeRatio));

        ctx.save();

        // Trail
        if (this.trail && this.trailPositions.length > 0) {
            this.trailPositions.forEach((pos, i) => {
                const trailAlpha = this.alpha * (1 - i / this.trailPositions.length) * 0.5;
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${trailAlpha})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, this.size * (1 - i * 0.15), 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Glow effect
        if (this.glow) {
            ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
            ctx.shadowBlur = this.size * 3;
        }

        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        switch (this.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'square':
                ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
                break;
            case 'star':
                this.drawStar(ctx, 0, 0, 5, this.size, this.size / 2);
                break;
            case 'spark':
                ctx.beginPath();
                ctx.moveTo(0, -this.size * 2);
                ctx.lineTo(0, this.size * 2);
                ctx.moveTo(-this.size, 0);
                ctx.lineTo(this.size, 0);
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${this.alpha})`;
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
        }

        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
            rot += step;
        }
        ctx.closePath();
        ctx.fill();
    }

    isDead() {
        return this.life <= 0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.emitters = [];
    }

    emit(x, y, config = {}, count = 1) {
        for (let i = 0; i < count; i++) {
            const particle = new Particle(x, y, {
                ...config,
                vx: config.vx !== undefined ? config.vx : (Math.random() - 0.5) * (config.spread || 100),
                vy: config.vy !== undefined ? config.vy : (Math.random() - 0.5) * (config.spread || 100),
            });
            this.particles.push(particle);
        }
    }

    // Preset: Thruster flame
    emitThruster(x, y, intensity = 1) {
        this.emit(x, y, {
            vx: (Math.random() - 0.5) * 30,
            vy: 100 + Math.random() * 100,
            size: 3 + Math.random() * 4,
            life: 0.2 + Math.random() * 0.2,
            decay: 2,
            color: { r: 100, g: 200, b: 255 },
            endColor: { r: 255, g: 100, b: 50 },
            glow: true,
            shape: 'circle'
        }, Math.floor(2 * intensity));
    }

    // Preset: Explosion
    emitExplosion(x, y, size = 'medium') {
        const counts = { small: 15, medium: 30, large: 50 };
        const count = counts[size] || 30;
        
        // Core flash
        this.emit(x, y, {
            vx: 0, vy: 0,
            size: size === 'large' ? 60 : size === 'medium' ? 40 : 20,
            life: 0.15,
            decay: 5,
            color: { r: 255, g: 255, b: 255 },
            endColor: { r: 255, g: 200, b: 100 },
            glow: true
        }, 1);
        
        // Fire particles
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 50 + Math.random() * 200;
            this.emit(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 6,
                life: 0.5 + Math.random() * 0.5,
                decay: 1.5,
                color: { r: 255, g: 200, b: 50 },
                endColor: { r: 255, g: 50, b: 0 },
                gravity: 50,
                friction: 0.95,
                glow: true
            });
        }
        
        // Smoke
        for (let i = 0; i < count / 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 60;
            this.emit(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                size: 8 + Math.random() * 12,
                life: 0.8 + Math.random() * 0.5,
                decay: 1,
                color: { r: 100, g: 100, b: 100 },
                endColor: { r: 50, g: 50, b: 50 },
                gravity: -20,
                friction: 0.98
            });
        }
        
        // Sparks
        for (let i = 0; i < count / 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 300;
            this.emit(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2,
                life: 0.3 + Math.random() * 0.4,
                decay: 2,
                color: { r: 255, g: 255, b: 200 },
                endColor: { r: 255, g: 150, b: 0 },
                gravity: 200,
                trail: true,
                shape: 'circle'
            });
        }
    }

    // Preset: Hit spark
    emitHitSpark(x, y, color = { r: 255, g: 255, b: 255 }) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const speed = 100 + Math.random() * 100;
            this.emit(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 2,
                life: 0.2 + Math.random() * 0.1,
                decay: 3,
                color: color,
                endColor: { r: 255, g: 200, b: 100 },
                glow: true,
                shape: 'spark'
            });
        }
    }

    // Preset: PowerUp collect
    emitPowerUpCollect(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const speed = 80 + Math.random() * 40;
            this.emit(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 3,
                life: 0.5 + Math.random() * 0.3,
                decay: 1.5,
                color: color,
                endColor: { r: 255, g: 255, b: 255 },
                glow: true,
                shape: 'star',
                rotationSpeed: 5 + Math.random() * 5
            });
        }
    }

    // Preset: Bullet trail
    emitBulletTrail(x, y, isPlayer = true) {
        const color = isPlayer ? { r: 0, g: 200, b: 255 } : { r: 255, g: 100, b: 100 };
        this.emit(x, y, {
            vx: (Math.random() - 0.5) * 10,
            vy: isPlayer ? 20 : -20,
            size: 2 + Math.random() * 2,
            life: 0.15,
            decay: 5,
            color: color,
            endColor: { r: color.r, g: color.g, b: color.b },
            glow: true
        }, 1);
    }

    update(deltaTime) {
        this.particles.forEach(p => p.update(deltaTime));
        this.particles = this.particles.filter(p => !p.isDead());
    }

    render(ctx) {
        this.particles.forEach(p => p.render(ctx));
    }

    clear() {
        this.particles = [];
    }
}

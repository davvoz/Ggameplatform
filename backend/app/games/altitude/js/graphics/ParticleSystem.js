/**
 * ParticleSystem - Lightweight particle effects
 * Single Responsibility: Manage and render particle effects.
 */

export class Particle {
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        this.vx = config.vx ?? (Math.random() - 0.5) * 100;
        this.vy = config.vy ?? (Math.random() - 0.5) * 100;
        this.ax = config.ax ?? 0;
        this.ay = config.ay ?? 0;
        this.life = config.life ?? 1;
        this.maxLife = this.life;
        this.size = config.size ?? 4;
        this.sizeEnd = config.sizeEnd ?? 0;
        this.color = config.color ?? '#ffffff';
        this.colorEnd = config.colorEnd ?? this.color;
        this.alpha = config.alpha ?? 1;
        this.alphaEnd = config.alphaEnd ?? 0;
        this.rotation = config.rotation ?? 0;
        this.rotationSpeed = config.rotationSpeed ?? 0;
        this.shape = config.shape ?? 'circle'; // circle, square, star, spark
        this.friction = config.friction ?? 1;
        this.gravity = config.gravity ?? 0;
    }

    update(dt) {
        this.life -= dt;
        
        // Physics
        this.vx += this.ax * dt;
        this.vy += (this.ay + this.gravity) * dt;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotationSpeed * dt;
        
        return this.life > 0;
    }

    get progress() {
        return 1 - (this.life / this.maxLife);
    }

    draw(ctx) {
        const t = this.progress;
        const size = this.size + (this.sizeEnd - this.size) * t;
        const alpha = this.alpha + (this.alphaEnd - this.alpha) * t;
        
        if (size <= 0 || alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Interpolate color
        ctx.fillStyle = this.color;
        
        switch (this.shape) {
            case 'square':
                ctx.fillRect(-size / 2, -size / 2, size, size);
                break;
            case 'star':
                this.#drawStar(ctx, size);
                break;
            case 'spark':
                this.#drawSpark(ctx, size);
                break;
            case 'heart':
                this.#drawHeart(ctx, size);
                break;
            default: // circle
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.fill();
        }
        
        ctx.restore();
    }

    #drawStar(ctx, size) {
        const spikes = 5;
        const outerRadius = size / 2;
        const innerRadius = size / 4;
        
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    #drawSpark(ctx, size) {
        ctx.beginPath();
        ctx.moveTo(-size / 2, 0);
        ctx.lineTo(size / 2, 0);
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(0, size / 2);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    #drawHeart(ctx, size) {
        const s = size / 2;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.3);
        ctx.bezierCurveTo(-s * 0.1, -s * 0.1, -s, -s * 0.1, -s, s * 0.4);
        ctx.bezierCurveTo(-s, s * 0.9,  0, s * 1.2, 0, s * 1.4);
        ctx.bezierCurveTo( 0, s * 1.2,  s, s * 0.9,  s, s * 0.4);
        ctx.bezierCurveTo( s, -s * 0.1, s * 0.1, -s * 0.1, 0, s * 0.3);
        ctx.closePath();
        ctx.fill();
    }
}

export class ParticleSystem {
    #particles = [];
    #maxParticles = 500;

    emit(x, y, config = {}, count = 1) {
        for (let i = 0; i < count; i++) {
            if (this.#particles.length >= this.#maxParticles) {
                this.#particles.shift(); // Remove oldest
            }
            this.#particles.push(new Particle(x, y, { ...config }));
        }
    }

    /**
     * Emit a burst of particles with spread
     */
    burst(x, y, config = {}, count = 10) {
        const spread = config.spread ?? 360;
        const speed = config.speed ?? 100;
        const baseAngle = config.angle ?? 0;
        
        for (let i = 0; i < count; i++) {
            const angle = (baseAngle - spread / 2 + Math.random() * spread) * Math.PI / 180;
            const spd = speed * (0.5 + Math.random() * 0.5);
            
            this.emit(x, y, {
                ...config,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
            });
        }
    }

    /**
     * Emit a trail particle
     */
    trail(x, y, config = {}) {
        this.emit(x, y, {
            life: 0.3,
            size: 6,
            sizeEnd: 0,
            alpha: 0.6,
            alphaEnd: 0,
            ...config,
        });
    }

    /**
     * Coin collection effect
     */
    coinCollect(x, y, color = '#ffd700') {
        this.burst(x, y, {
            color,
            count: 8,
            size: 6,
            sizeEnd: 0,
            life: 0.5,
            speed: 80,
            spread: 360,
            gravity: 100,
            shape: 'star',
        }, 8);
    }

    /**
     * Enemy death effect
     */
    enemyDeath(x, y, color = '#ff4466') {
        this.burst(x, y, {
            color,
            size: 8,
            sizeEnd: 2,
            life: 0.6,
            speed: 150,
            spread: 360,
            friction: 0.95,
            shape: 'square',
        }, 15);
    }

    /**
     * Jump dust effect
     */
    jumpDust(x, y) {
        this.burst(x, y, {
            color: 'rgba(255, 255, 255, 0.6)',
            size: 4,
            sizeEnd: 0,
            life: 0.3,
            speed: 50,
            angle: -90,
            spread: 60,
            gravity: 150,
        }, 6);
    }

    /**
     * Platform break effect
     */
    platformBreak(x, y, width, color) {
        for (let i = 0; i < 8; i++) {
            const px = x - width / 2 + Math.random() * width;
            this.emit(px, y, {
                color,
                size: 8 + Math.random() * 6,
                sizeEnd: 0,
                life: 0.8,
                vx: (Math.random() - 0.5) * 100,
                vy: -50 - Math.random() * 100,
                gravity: 400,
                rotation: Math.random() * Math.PI,
                rotationSpeed: (Math.random() - 0.5) * 10,
                shape: 'square',
            });
        }
    }

    /**
     * Extra-life heart burst — hearts fly upward and fade
     */
    extraLifeCollect(x, y) {
        // Central flash ring: small white circles outward
        this.burst(x, y, {
            color: '#ff4466',
            size: 12, sizeEnd: 0,
            life: 0.45,
            speed: 90, spread: 360,
            gravity: -60,
            shape: 'circle',
            alpha: 0.7, alphaEnd: 0,
        }, 10);

        // Heart particles floating upward
        for (let i = 0; i < 7; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
            const spd   = 60 + Math.random() * 80;
            this.emit(x + (Math.random() - 0.5) * 30, y, {
                color: i % 2 === 0 ? '#ff4466' : '#ff88aa',
                size: 10 + Math.random() * 8, sizeEnd: 0,
                life: 0.8 + Math.random() * 0.4,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                gravity: -30,
                alpha: 1, alphaEnd: 0,
                rotation: (Math.random() - 0.5) * 0.8,
                rotationSpeed: (Math.random() - 0.5) * 2,
                shape: 'heart',
            });
        }

        // Tiny sparkle glitter
        this.burst(x, y, {
            color: '#ffbbcc',
            size: 5, sizeEnd: 0,
            life: 0.6, speed: 120, spread: 360,
            gravity: 80,
            shape: 'star',
        }, 8);
    }

    update(dt) {
        this.#particles = this.#particles.filter(p => p.update(dt));
    }

    draw(ctx, cameraY = 0) {
        for (const particle of this.#particles) {
            ctx.save();
            ctx.translate(0, -cameraY);
            particle.draw(ctx);
            ctx.restore();
        }
    }

    clear() {
        this.#particles.length = 0;
    }

    get count() {
        return this.#particles.length;
    }
}

/**
 * Explosion - Effetto esplosione animato avanzato (OPTIMIZED)
 */
class Explosion extends GameObject {
    constructor(x, y, size = 'medium') {
        const SIZE_MAP = { small: 40, medium: 72, large: 120 };
        const s = SIZE_MAP[size] || SIZE_MAP.medium;

        super(x - s / 2, y - s / 2, s, s);

        this.tag = 'explosion';
        this.size = size;

        // Animation
        this.frameCount = 8;
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameDuration = 0.06;

        // FX
        this.centerX = x;
        this.centerY = y;

        this.flashIntensity = 1;

        this.shockwaveRadius = 0;
        this.shockwaveMaxRadius = s * 1.5;
        this.shockwaveSpeed = s * 4;

        this.particles = this.createParticles();
    }

    createParticles() {
        const particles = [];
        const baseCount = this.size === 'large' ? 30 : this.size === 'medium' ? 18 : 10;

        const spawn = (type, cfg) => {
            for (let i = 0; i < cfg.count; i++) {
                const a = cfg.angle(i);
                const sp = cfg.speed();
                particles.push({
                    x: this.centerX + (cfg.offsetX?.() || 0),
                    y: this.centerY + (cfg.offsetY?.() || 0),
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp + (cfg.vyOffset || 0),
                    size: cfg.size(),
                    life: 1,
                    decay: cfg.decay(),
                    type,
                    hue: cfg.hue?.(),
                    rotation: cfg.rotation?.(),
                    rotationSpeed: cfg.rotationSpeed?.()
                });
            }
        };

        // Fire
        spawn('fire', {
            count: baseCount,
            angle: i => (i / baseCount) * Math.PI * 2 + Math.random() * 0.5,
            speed: () => 80 + Math.random() * 200,
            size: () => 3 + Math.random() * 6,
            decay: () => 1.2 + Math.random() * 0.8,
            hue: () => Math.random() * 60
        });

        // Sparks
        spawn('spark', {
            count: Math.floor(baseCount * 0.7),
            angle: () => Math.random() * Math.PI * 2,
            speed: () => 150 + Math.random() * 250,
            size: () => 1 + Math.random() * 2,
            decay: () => 2 + Math.random()
        });

        // Smoke
        spawn('smoke', {
            count: Math.floor(baseCount * 0.5),
            angle: () => Math.random() * Math.PI * 2,
            speed: () => 20 + Math.random() * 40,
            size: () => 10 + Math.random() * 15,
            decay: () => 0.6 + Math.random() * 0.4,
            offsetX: () => (Math.random() - 0.5) * 20,
            offsetY: () => (Math.random() - 0.5) * 20,
            vyOffset: -30,
            rotation: () => Math.random() * Math.PI * 2,
            rotationSpeed: () => (Math.random() - 0.5) * 2
        });

        return particles;
    }

    update(dt) {
        this.frameTime += dt;
        if (this.frameTime >= this.frameDuration) {
            this.frameTime = 0;
            if (++this.currentFrame >= this.frameCount) {
                this.destroy();
                return;
            }
        }

        this.flashIntensity = Math.max(0, this.flashIntensity - dt * 4);
        this.shockwaveRadius += this.shockwaveSpeed * dt;

        const GRAVITY_FIRE = 50;
        const GRAVITY_SPARK = 200;

        let alive = 0;

        for (let p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            switch (p.type) {
                case 'fire':
                    p.vy += GRAVITY_FIRE * dt;
                    p.vx *= 0.98;
                    p.size *= 0.96;
                    break;
                case 'spark':
                    p.vy += GRAVITY_SPARK * dt;
                    p.size *= 0.96;
                    break;
                case 'smoke':
                    p.vy -= 40 * dt;
                    p.size *= 1.02;
                    p.rotation += p.rotationSpeed * dt;
                    break;
            }

            p.life -= p.decay * dt;
            if (p.life > 0 && p.size > 0.3) {
                this.particles[alive++] = p;
            }
        }

        this.particles.length = alive;
    }

    render(ctx, assets) {
        ctx.save();

        /* SHOCKWAVE */
        if (this.shockwaveRadius < this.shockwaveMaxRadius) {
            const a = 1 - this.shockwaveRadius / this.shockwaveMaxRadius;

            ctx.strokeStyle = `rgba(255,200,100,${a * 0.6})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.shockwaveRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = `rgba(255,255,200,${a * 0.4})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.shockwaveRadius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }

        /* SMOKE */
        for (const p of this.particles) {
            if (p.type !== 'smoke') continue;

            const alpha = p.life * 0.4;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
            g.addColorStop(0, `rgba(80,60,40,${alpha})`);
            g.addColorStop(0.5, `rgba(50,40,30,${alpha * 0.5})`);
            g.addColorStop(1, 'rgba(30,25,20,0)');

            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /* FLASH */
        if (this.flashIntensity > 0) {
            const g = ctx.createRadialGradient(
                this.centerX, this.centerY, 0,
                this.centerX, this.centerY, this.width * 0.8
            );

            g.addColorStop(0, `rgba(255,255,200,${this.flashIntensity * 0.8})`);
            g.addColorStop(0.3, `rgba(255,200,100,${this.flashIntensity * 0.4})`);
            g.addColorStop(1, 'rgba(255,100,50,0)');

            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.width * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        /* SPRITE */
        const scale = 1 + (1 - this.currentFrame / this.frameCount) * 0.3;
        const w = this.width * scale;
        const h = this.height * scale;

        assets.drawSprite(
            ctx,
            `explosion_${this.currentFrame}`,
            this.centerX - w / 2,
            this.centerY - h / 2,
            w, h
        );

        /* FIRE + SPARK */
        ctx.globalCompositeOperation = 'lighter';

        for (const p of this.particles) {
            if (p.type === 'fire') {
                const glow = p.size * 3;
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
                g.addColorStop(0, `hsla(${p.hue},100%,60%,${p.life * 0.6})`);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = `hsla(${p.hue + 20},100%,70%,${p.life})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'spark') {
                ctx.fillStyle = `rgba(255,255,200,${p.life})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}

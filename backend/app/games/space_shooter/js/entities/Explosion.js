import GameObject from './GameObject.js';
/**
 * Explosion - Organic fireball with debris and smoke
 */
class Explosion extends GameObject {
    constructor(x, y, size = 'medium', scale = 1) {
        const SIZE_MAP = { small: Math.round(44 * scale), medium: Math.round(80 * scale), large: Math.round(130 * scale) };
        const s = SIZE_MAP[size] || SIZE_MAP.medium;

        super(x - s / 2, y - s / 2, s, s);

        this.tag = 'explosion';
        this.size = size;

        this.frameCount = 8;
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameDuration = 0.065;
        this.totalTime = 0;

        this.centerX = x;
        this.centerY = y;
        this.flashIntensity = 1;
        this.shockwaveRadius = 0;
        this.shockwaveMaxRadius = s * 1.1;
        this.shockwaveSpeed = s * 6;

        this.particles = this.createParticles();
    }

    createParticles() {
        const particles = [];
        const TAU = Math.PI * 2;
        const isLarge = this.size === 'large';
        const isMedium = this.size === 'medium';

        // Fire blobs - big, overlapping, slow-moving outward to create fireball mass
        const fireCount = isLarge ? 8 : isMedium ? 5 : 3;
        for (let i = 0; i < fireCount; i++) {
            const a = (i / fireCount) * TAU + Math.random() * 0.8;
            const sp = 30 + Math.random() * 60;
            particles.push({
                x: this.centerX + (Math.random() - 0.5) * 8,
                y: this.centerY + (Math.random() - 0.5) * 8,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                size: (isLarge ? 18 : isMedium ? 12 : 8) + Math.random() * 6,
                life: 1, decay: 1.6 + Math.random() * 0.4,
                type: 'fire',
                hue: 15 + Math.random() * 35
            });
        }

        // Hot sparks - fast debris with gravity
        const sparkCount = isLarge ? 12 : isMedium ? 7 : 4;
        for (let i = 0; i < sparkCount; i++) {
            const a = (i / sparkCount) * TAU + Math.random() * 0.5;
            const sp = 200 + Math.random() * 300;
            particles.push({
                x: this.centerX, y: this.centerY,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                size: 1 + Math.random() * 1.5,
                life: 1, decay: 2 + Math.random(),
                type: 'spark'
            });
        }

        // Smoke - appears after fireball fades
        const smokeCount = isLarge ? 4 : isMedium ? 3 : 2;
        for (let i = 0; i < smokeCount; i++) {
            const a = Math.random() * TAU;
            const sp = 8 + Math.random() * 15;
            particles.push({
                x: this.centerX + (Math.random() - 0.5) * 12,
                y: this.centerY + (Math.random() - 0.5) * 12,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 15,
                size: 14 + Math.random() * 10,
                life: 1, decay: 0.55 + Math.random() * 0.2,
                type: 'smoke',
                delay: 0.15 + Math.random() * 0.1
            });
        }

        return particles;
    }

    update(dt) {
        this.totalTime += dt;
        this.frameTime += dt;
        if (this.frameTime >= this.frameDuration) {
            this.frameTime = 0;
            if (++this.currentFrame >= this.frameCount) {
                this.destroy();
                return;
            }
        }

        this.flashIntensity = Math.max(0, this.flashIntensity - dt * 8);
        this.shockwaveRadius += this.shockwaveSpeed * dt;

        let alive = 0;
        for (let p of this.particles) {
            // Delayed smoke
            if (p.delay && p.delay > 0) {
                p.delay -= dt;
                this.particles[alive++] = p;
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay * dt;

            if (p.type === 'fire') {
                p.vx *= 0.95;
                p.vy *= 0.95;
                p.vy += 15 * dt;
                p.size *= (1 - 0.8 * dt); // shrink gradually
                p.hue = Math.max(0, p.hue - 30 * dt); // shift to red
            } else if (p.type === 'spark') {
                p.vy += 200 * dt;
            } else {
                p.vy -= 20 * dt;
                p.size += 8 * dt;
            }

            if (p.life > 0 && p.size > 0.3) {
                this.particles[alive++] = p;
            }
        }
        this.particles.length = alive;
    }

    render(ctx, assets) {
        ctx.save();
        const TAU = Math.PI * 2;
        const progress = this.currentFrame / this.frameCount;

        /* SHOCKWAVE - fast expanding ring */
        if (this.shockwaveRadius < this.shockwaveMaxRadius) {
            const sw = 1 - this.shockwaveRadius / this.shockwaveMaxRadius;
            ctx.strokeStyle = `rgba(255,200,100,${sw * 0.35})`;
            ctx.lineWidth = 1 + sw * 2;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.shockwaveRadius, 0, TAU);
            ctx.stroke();
        }

        /* SMOKE (behind everything) */
        for (const p of this.particles) {
            if (p.type !== 'smoke' || (p.delay && p.delay > 0)) continue;
            const a = p.life * 0.2;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grad.addColorStop(0, `rgba(50,42,35,${a})`);
            grad.addColorStop(0.5, `rgba(40,35,28,${a * 0.3})`);
            grad.addColorStop(1, 'rgba(30,25,20,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, TAU);
            ctx.fill();
        }

        /* FLASH */
        if (this.flashIntensity > 0.1) {
            const r = this.width * 0.5;
            const g = ctx.createRadialGradient(
                this.centerX, this.centerY, 0,
                this.centerX, this.centerY, r
            );
            g.addColorStop(0, `rgba(255,255,240,${this.flashIntensity * 0.5})`);
            g.addColorStop(1, 'rgba(255,120,30,0)');
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, r, 0, TAU);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        /* SPRITE (pre-rendered organic fireball) */
        const spriteScale = 1 + (1 - progress) * 0.15;
        const sw = this.width * spriteScale;
        const sh = this.height * spriteScale;
        ctx.globalAlpha = Math.max(0, 1 - progress * 0.4);
        assets.drawSprite(
            ctx,
            `explosion_${this.currentFrame}`,
            this.centerX - sw / 2,
            this.centerY - sh / 2,
            sw, sh
        );
        ctx.globalAlpha = 1;

        /* FIRE BLOBS - additive blending, big overlapping soft glows */
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.particles) {
            if (p.type !== 'fire') continue;
            const r = p.size;
            const a = p.life;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            grad.addColorStop(0, `hsla(${p.hue + 10},100%,75%,${a * 0.7})`);
            grad.addColorStop(0.5, `hsla(${p.hue},100%,50%,${a * 0.35})`);
            grad.addColorStop(1, `hsla(${p.hue - 5},100%,25%,0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, TAU);
            ctx.fill();
        }

        /* SPARKS - velocity streaks */
        for (const p of this.particles) {
            if (p.type !== 'spark') continue;
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed < 10) continue;
            const nx = p.vx / speed;
            const ny = p.vy / speed;
            const len = Math.min(speed * 0.04, 12);

            ctx.globalAlpha = p.life;
            ctx.strokeStyle = `rgba(255,${180 + Math.floor(p.life * 75)},${100 + Math.floor(p.life * 100)},1)`;
            ctx.lineWidth = p.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.x - nx * len, p.y - ny * len);
            ctx.lineTo(p.x + nx * 2, p.y + ny * 2);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

export default Explosion;
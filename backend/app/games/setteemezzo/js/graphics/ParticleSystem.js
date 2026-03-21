/**
 * Simple particle system for visual effects (card sparkles, win celebration, etc.)
 */
export class Particle {
    constructor(x, y, vx, vy, life, color, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.alpha = 1;
    }

    update(dt) {
        const sec = dt / 1000;
        this.x += this.vx * sec;
        this.y += this.vy * sec;
        this.vy += 60 * sec; // gravity
        this.life -= dt;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }

    get dead() { return this.life <= 0; }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export class ParticleSystem {
    #particles = [];

    /**
     * Emit a burst of particles at (x, y).
     */
    emit(x, y, count, {
        colors = ['#d4af37', '#fff', '#ff6b35'],
        speedMin = 30,
        speedMax = 120,
        sizeMin = 1,
        sizeMax = 3,
        lifeMin = 400,
        lifeMax = 1200,
    } = {}) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = speedMin + Math.random() * (speedMax - speedMin);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 40;
            const life = lifeMin + Math.random() * (lifeMax - lifeMin);
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = sizeMin + Math.random() * (sizeMax - sizeMin);
            this.#particles.push(new Particle(x, y, vx, vy, life, color, size));
        }
    }

    /** Emit floating sparkles (no gravity). */
    sparkle(x, y, count, color = '#d4af37') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 10 + Math.random() * 30;
            const p = new Particle(
                x + (Math.random() - 0.5) * 40,
                y + (Math.random() - 0.5) * 20,
                Math.cos(angle) * speed,
                -Math.abs(Math.sin(angle) * speed) - 10,
                600 + Math.random() * 600,
                color,
                1 + Math.random() * 2
            );
            this.#particles.push(p);
        }
    }

    update(dt) {
        for (let i = this.#particles.length - 1; i >= 0; i--) {
            this.#particles[i].update(dt);
            if (this.#particles[i].dead) {
                this.#particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.#particles) {
            p.draw(ctx);
        }
    }

    get active() { return this.#particles.length; }

    clear() { this.#particles.length = 0; }
}

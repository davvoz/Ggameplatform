/**
 * Particle system for visual effects — goals, power-ups, celebrations.
 */
class Particle {
    constructor(x, y, { vx, vy, life, color, size, gravity = 60 } = {}) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.alpha = 1;
        this.gravity = gravity;
    }

    update(dt) {
        const sec = dt / 1000;
        this.x += this.vx * sec;
        this.y += this.vy * sec;
        this.vy += this.gravity * sec;
        this.life -= dt;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }

    get dead() { return this.life <= 0; }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(
            Math.round(this.x - this.size / 2),
            Math.round(this.y - this.size / 2),
            Math.ceil(this.size * this.alpha),
            Math.ceil(this.size * this.alpha)
        );
        ctx.restore();
    }
}

export class ParticleSystem {
    #particles = [];

    emit(x, y, count, {
        colors = ['#00f0ff', '#ff00aa', '#39ff14'],
        speedMin = 30,
        speedMax = 150,
        sizeMin = 2,
        sizeMax = 5,
        lifeMin = 300,
        lifeMax = 1000,
        gravity = 60,
    } = {}) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = speedMin + Math.random() * (speedMax - speedMin);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 40;
            const life = lifeMin + Math.random() * (lifeMax - lifeMin);
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = sizeMin + Math.random() * (sizeMax - sizeMin);
            this.#particles.push(new Particle(x, y, { vx, vy, life, color, size, gravity }));
        }
    }

    sparkle(x, y, count, color = '#00f0ff') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 10 + Math.random() * 30;
            this.#particles.push(new Particle(
                x + (Math.random() - 0.5) * 30,
                y + (Math.random() - 0.5) * 20,
                {
                    vx: Math.cos(angle) * speed,
                    vy: -Math.abs(Math.sin(angle) * speed) - 10,
                    life: 400 + Math.random() * 500,
                    color,
                    size: 2 + Math.random() * 3,
                    gravity: 0
                }
            ));
        }
    }

    trail(x, y, color = '#00f0ff') {
        this.#particles.push(new Particle(
            x + (Math.random() - 0.5) * 4,
            y + (Math.random() - 0.5) * 4,
            {
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                life: 200 + Math.random() * 200,
                color,
                size: 2 + Math.random() * 3,
                gravity: 0
            }
        ));
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

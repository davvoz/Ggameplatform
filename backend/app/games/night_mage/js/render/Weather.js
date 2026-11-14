import { WEATHERS } from '../config/Weathers.js';
import { jitter as random, pickOne } from './jitter.js';

const W = 960;
const H = 540;
const TAU = Math.PI * 2;


/** How each kind of particle moves, one function per motion. */
const MOTIONS = {
    wander(p, dt, t, speed) {
        p.x += Math.cos(p.phase + t * 0.7) * speed * dt;
        p.y += Math.sin(p.phase * 1.3 + t * 0.9) * speed * dt;
    },
    drift(p, dt, t, speed) {
        p.x += speed * dt;
        p.y += Math.sin(p.phase + t * 0.2) * 4 * dt;
    },
    rise(p, dt, t, speed) {
        p.y -= speed * p.depth * dt;
        p.x += Math.sin(p.phase + t * 2) * 14 * dt;
    },
    rain(p, dt, t, speed) {
        p.y += speed * p.depth * dt;
        p.x -= speed * 0.18 * p.depth * dt;
    },
    fall(p, dt, t, speed) {
        p.y += speed * p.depth * dt;
        p.x += Math.sin(p.phase + t * 1.5) * 18 * dt;
    },
    flutter(p, dt, t, speed) {
        p.y += speed * 0.6 * p.depth * dt;
        p.x += (Math.sin(p.phase + t * 2.2) * 40 - 20) * dt;
        p.spin += dt * 3;
    },
};

function wrap(p) {
    if (p.y > H + 20) p.y = -20;
    if (p.y < -20) p.y = H + 20;
    if (p.x > W + 300) p.x = -300;
    if (p.x < -300) p.x = W + 300;
}

/** The weather in front of a map: fireflies, rain, snow, embers, fog, leaves, spores. */
export class Weather {
    #spec = null;
    #particles = [];
    #time = 0;

    set(kind) {
        this.#spec = WEATHERS[kind] ?? null;
        this.#time = 0;
        const spec = this.#spec;
        this.#particles = spec ? Array.from({ length: spec.count }, () => ({
            x: random(-100, W + 100),
            y: random(0, H),
            size: random(spec.size[0], spec.size[1]),
            color: pickOne(spec.colors),
            phase: random(0, TAU),
            depth: random(0.6, 1.2),
            spin: random(0, TAU),
        })) : [];
    }

    update(dt) {
        if (!this.#spec) return;
        this.#time += dt;
        const move = MOTIONS[this.#spec.motion];
        for (const p of this.#particles) {
            move(p, dt, this.#time, this.#spec.speed);
            wrap(p);
        }
    }

    draw(ctx) {
        const spec = this.#spec;
        if (!spec) return;
        if (spec.tint) {
            ctx.fillStyle = spec.tint;
            ctx.fillRect(0, 0, W, H);
        }
        ctx.save();
        if (spec.glow) ctx.globalCompositeOperation = 'lighter';
        for (const p of this.#particles) this.#drawParticle(ctx, p, spec);
        ctx.restore();
    }

    #drawParticle(ctx, p, spec) {
        ctx.fillStyle = p.color;
        if (spec.motion === 'rain') {
            ctx.fillRect(p.x, p.y, p.size, 14 * p.depth);
        } else if (spec.motion === 'drift') {
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.size, p.size * 0.35, 0, 0, TAU);
            ctx.fill();
        } else if (spec.motion === 'flutter') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.spin);
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        } else {
            const pulse = spec.glow ? 0.55 + 0.45 * Math.sin(p.phase + this.#time * 3) : 1;
            ctx.globalAlpha = pulse;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            ctx.globalAlpha = 1;
        }
    }
}

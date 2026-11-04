import { Ink, RAINBOW } from '../../config/Palette.js';
import { SimConfig } from '../../config/SimConfig.js';
import { SimEvent } from '../../sim/Simulation.js';
import { drawSprite } from '../art/Bake.js';

/** Reactions to what happens: all paper and paint, nothing lights up. */

const PARTICLES = 160;
const GRAVITY = 26;

const BURSTS = Object.freeze({
    [SimEvent.DROP]: { count: 4, speed: 7, colors: null },
    [SimEvent.PERFECT]: { count: 10, speed: 11, colors: RAINBOW },
    [SimEvent.RAINBOW]: { count: 44, speed: 22, colors: RAINBOW },
    [SimEvent.HIT]: { count: 12, speed: 12, colors: [Ink.wood, Ink.woodLight, Ink.edge] },
    [SimEvent.SPLASH]: { count: 14, speed: 10, colors: [Ink.water, Ink.waterLight, Ink.edge] },
    [SimEvent.LAND]: { count: 3, speed: 5, colors: [Ink.edge] },
    [SimEvent.DOUBLE_JUMP]: { count: 8, speed: 9, colors: [Ink.edge, Ink.rain] },
});

/** Paper confetti, from a fixed pool so a busy moment never allocates. */
export class ConfettiLayer {
    #pool = Array.from({ length: PARTICLES }, () => ({
        life: 0, x: 0, y: 0, vx: 0, vy: 0, size: 0, color: Ink.edge,
    }));
    #next = 0;

    reset() {
        for (const particle of this.#pool) particle.life = 0;
    }

    onEvent(event) {
        const burst = BURSTS[event.type];
        if (!burst) return;
        for (let i = 0; i < burst.count; i++) {
            const particle = this.#pool[this.#next];
            this.#next = (this.#next + 1) % PARTICLES;
            const colors = burst.colors ?? [RAINBOW[event.value % RAINBOW.length]];
            const angle = Math.random() * Math.PI;
            const speed = burst.speed * (0.4 + Math.random() * 0.6);
            particle.life = 0.5 + Math.random() * 0.5;
            particle.x = event.x;
            particle.y = event.y + SimConfig.runner.radius;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.size = 0.22 + Math.random() * 0.3;
            particle.color = colors[i % colors.length];
        }
    }

    update({ dt }) {
        for (const particle of this.#pool) {
            if (particle.life <= 0) continue;
            particle.life -= dt;
            particle.vy -= GRAVITY * dt;
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
        }
    }

    draw(ctx, { camera }) {
        for (const particle of this.#pool) {
            if (particle.life <= 0) continue;
            const size = particle.size * camera.scale;
            ctx.fillStyle = particle.color;
            ctx.fillRect(camera.sx(particle.x), camera.sy(particle.y), size, size);
        }
    }
}

const ARC_SECONDS = 1.1;
const ARC_RADIUS = 30;
const ARC_THICKNESS = 1.15;

/** The reward: a big painted rainbow rising behind the blob. */
export class RainbowBurstLayer {
    #age = Infinity;
    #x = 0;
    #y = 0;

    reset() {
        this.#age = Infinity;
    }

    onEvent(event) {
        if (event.type !== SimEvent.RAINBOW) return;
        this.#age = 0;
        this.#x = event.x;
        this.#y = event.y;
    }

    update({ dt }) {
        this.#age += dt;
    }

    draw(ctx, { camera }) {
        if (this.#age >= ARC_SECONDS) return;
        const progress = this.#age / ARC_SECONDS;
        const eased = 1 - (1 - progress) * (1 - progress);

        ctx.globalAlpha = Math.min(1, (1 - progress) * 3);
        ctx.lineWidth = ARC_THICKNESS * camera.scale;
        ctx.lineCap = 'butt';
        RAINBOW.forEach((color, i) => {
            const radius = (ARC_RADIUS * eased - i * ARC_THICKNESS) * camera.scale;
            if (radius <= 0) return;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(camera.sx(this.#x), camera.sy(this.#y), radius, Math.PI, 0);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
    }
}

const LABEL_SECONDS = 0.8;
const LABEL_ART_SCALE = 0.075;

/** A paper tag that pops up after a clean landing. */
export class LabelLayer {
    #sprite;
    #age = Infinity;

    /** @param {import('../art/Bake.js').Sprite} perfectTag */
    constructor(perfectTag) {
        this.#sprite = perfectTag;
    }

    reset() {
        this.#age = Infinity;
    }

    onEvent(event) {
        if (event.type === SimEvent.PERFECT) this.#age = 0;
    }

    update({ dt }) {
        this.#age += dt;
    }

    draw(ctx, { camera, runnerX, runnerY }) {
        if (this.#age >= LABEL_SECONDS) return;
        const rise = 5 + (this.#age / LABEL_SECONDS) * 2.5;
        drawSprite(ctx, this.#sprite, camera.sx(runnerX), camera.sy(runnerY + rise), camera.scale * LABEL_ART_SCALE);
    }
}

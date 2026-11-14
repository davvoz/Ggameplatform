import { jitter } from './jitter.js';
import { poseFrame } from './poses.js';
import { pixelRing, stepped } from './pixels.js';
import { drawLightning, lightningPath } from './StormArt.js';

const TAU = Math.PI * 2;
const PX = 5;
const FIRE = ['#ffffff', '#fff176', '#ffab40', '#ff5722', '#d32f2f', '#424242'];

/** The colour of each monster's magic, for spawns and deaths. */
export const MONSTER_COLORS = Object.freeze({ bat: '#a855f7', warrior: '#ffaa00', archer: '#22d3ee', brawler: '#ff6600' });


/** Chunky pixel explosion (from the original game). */
class Burst {
    constructor(x, y, { count = 16, palette = FIRE, power = 1, duration = 0.5 } = {}) {
        this.x = x;
        this.y = y;
        this.age = 0;
        this.duration = duration;
        this.palette = palette;
        this.parts = Array.from({ length: count }, (_, i) => ({
            angle: (TAU / count) * i + jitter(-0.2, 0.2),
            speed: jitter(50, 130) * power,
            size: PX * (jitter() < 0.5 ? 1 : 2),
        }));
    }

    update(dt) {
        this.age += dt;
        return this.age < this.duration;
    }

    draw(ctx) {
        const progress = this.age / this.duration;
        let alpha = 1;
        if (progress >= 0.66) alpha = 0.35;
        else if (progress >= 0.33) alpha = 0.7;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.palette[Math.min(this.palette.length - 1, Math.floor(progress * this.palette.length))];
        for (const p of this.parts) {
            const d = p.speed * this.age;
            const px = Math.round((this.x + Math.cos(p.angle) * d) / PX) * PX;
            const py = Math.round((this.y + Math.sin(p.angle) * d) / PX) * PX;
            ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
        }
        if (progress < 0.35) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = progress < 0.15 ? '#ffffff' : '#fff176';
            ctx.fillRect(this.x - PX * 3, this.y - PX * 3, PX * 6, PX * 6);
        }
        ctx.globalAlpha = 1;
    }
}

/** An expanding ring of square cells: the shield, a block, a gift, the nova. */
class Ring {
    constructor(x, y, { color = '#7ad7ff', radius = 90, duration = 0.4, width = 6 } = {}) {
        Object.assign(this, { x, y, color, radius, duration, width, age: 0 });
    }

    update(dt) {
        this.age += dt;
        return this.age < this.duration;
    }

    draw(ctx) {
        const t = this.age / this.duration;
        const size = Math.max(PX - 1, Math.round(this.width * (1 - t)) + 2);
        ctx.globalAlpha = stepped(1 - t, 3);
        pixelRing(ctx, this.x, this.y, this.radius * (0.3 + 0.7 * t), { size, color: this.color });
        ctx.globalAlpha = 1;
    }
}

/** A lightning of the storm, from the top of the arena down to the monster. */
class Lightning {
    constructor(x, y) {
        this.age = 0;
        this.duration = 0.28;
        this.path = lightningPath(x, y, jitter);
    }

    update(dt) {
        this.age += dt;
        return this.age < this.duration;
    }

    draw(ctx) {
        drawLightning(ctx, this.path, this.age);
    }
}

/** A word or number that pops up and floats away. */
class FloatText {
    constructor(font, text, x, y, { color = '#ffd27a', size = 18, rise = 50, duration = 0.9 } = {}) {
        Object.assign(this, { font, text, x, y, color, size, rise, duration, age: 0 });
    }

    update(dt) {
        this.age += dt;
        return this.age < this.duration;
    }

    draw(ctx) {
        const t = this.age / this.duration;
        const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.6 : 1.2 - Math.min(0.2, (t - 0.15));
        this.font.draw(ctx, this.text, this.x, this.y - this.rise * t, {
            size: this.size * pop, color: this.color, align: 'center', alpha: t > 0.7 ? (1 - t) / 0.3 : 1,
        });
    }
}

/** A fallen monster: its hurt frame flickers, sinks and fades. */
class Corpse {
    constructor(bank, { kind, x, feetY, y, facing }) {
        const flying = kind === 'bat';
        Object.assign(this, { bank, kind, x, y: flying ? y : feetY, facing, age: 0, duration: 0.55 });
    }

    update(dt) {
        this.age += dt;
        return this.age < this.duration;
    }

    draw(ctx) {
        const t = this.age / this.duration;
        if (Math.floor(this.age * 30) % 2 === 1) return;
        const { anim, frame } = poseFrame(this.kind, 'stagger', this.age);
        ctx.globalAlpha = 1 - t;
        this.bank.draw(ctx, { actor: this.kind, anim, frame, facing: this.facing, x: this.x, y: this.y + t * 12, flash: t < 0.3 });
        ctx.globalAlpha = 1;
    }
}

/** A column of light where a monster arrives. */
class Portal {
    constructor(x, y, flying, color) {
        Object.assign(this, { x, y, flying, color, age: 0, duration: 0.5 });
    }

    update(dt) {
        this.age += dt;
        return this.age < this.duration;
    }

    draw(ctx) {
        const t = this.age / this.duration;
        const height = 170;
        const width = 70 * (t < 0.5 ? t * 2 : 2 - t * 2);
        const bottom = this.flying ? this.y + 70 : this.y;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gradient = ctx.createLinearGradient(0, bottom - height, 0, bottom);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, this.color);
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - width / 2, bottom - height, width, height);
        ctx.restore();
    }
}

/** The flash of a cast: a bright line from the staff to where the tap landed. */
class Zap {
    constructor(from, to) {
        Object.assign(this, { from, to, age: 0, duration: 0.12 });
    }

    update(dt) {
        this.age += dt;
        return this.age < this.duration;
    }

    draw(ctx) {
        const t = this.age / this.duration;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (const [width, color] of [[10, 'rgba(255,60,40,0.35)'], [4, 'rgba(255,170,120,0.9)'], [1.5, '#ffffff']]) {
            ctx.globalAlpha = 1 - t;
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(this.from.x, this.from.y);
            ctx.lineTo(this.to.x, this.to.y);
            ctx.stroke();
        }
        ctx.restore();
    }
}

/**
 * Short-lived effects driven by the simulation's events, plus screen shake
 * and the red flash of a wound. Its randomness is for looks: nothing here
 * changes the game.
 */
export class Effects {
    #items = [];
    #bank;
    #font;
    shake = 0;
    hurtFlash = 0;

    constructor(bank, font) {
        this.#bank = bank;
        this.#font = font;
    }

    clear() {
        this.#items = [];
        this.shake = 0;
        this.hurtFlash = 0;
    }

    burst(x, y, options) {
        this.#items.push(new Burst(x, y, options));
    }

    ring(x, y, options) {
        this.#items.push(new Ring(x, y, options));
    }

    text(text, x, y, options) {
        this.#items.push(new FloatText(this.#font, text, x, y, options));
    }

    corpse(event) {
        this.#items.push(new Corpse(this.#bank, event));
    }

    portal(x, y, flying, color) {
        this.#items.push(new Portal(x, y, flying, color));
    }

    zap(from, to) {
        this.#items.push(new Zap(from, to));
    }

    lightning(x, y) {
        this.#items.push(new Lightning(x, y));
    }

    kick(amount) {
        this.shake = Math.max(this.shake, amount);
    }

    update(dt) {
        this.#items = this.#items.filter((item) => item.update(dt));
        this.shake = Math.max(0, this.shake - dt * 40);
        this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5);
    }

    draw(ctx) {
        for (const item of this.#items) item.draw(ctx);
    }
}

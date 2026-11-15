import { INVADER, WORLD } from '../config/Tuning.js';
import { jitter } from './jitter.js';
import { pixelRing, stepped } from './pixels.js';
import { poseFrame } from './poses.js';

/**
 * A boss's fall, a little cartoon in chunky pixels: it shudders with pops
 * all over its body, is flung up into the sky spinning a quarter turn at a
 * time with dizzy stars around it, shrinks away and goes "ding" as a
 * twinkling star, while confetti rains down. Looks only: the night waits
 * for it (`INVADER.farewell`) before the wave ends.
 */
export const BOSS_FALL = Object.freeze({
    /** Seconds of each part, one after the other. */
    shudder: 0.45,
    flight: 0.85,
    twinkle: 0.5,
    /** The confetti falls from the twinkle on, this long. */
    confetti: 1.5,
});

const PX = 5;
const TAU = Math.PI * 2;
/** Where in the sky it vanishes: this high, this far inside the screen. */
const SKY_Y = 135;
const SKY_MARGIN = 200;
/** How high over its start the flight bends. */
const ARC = 260;
const END_SCALE = 0.18;
const QUARTER_TURNS_PER_SECOND = 12;
const WOBBLE = 4;
const POPS = Object.freeze([0.03, 0.1, 0.17, 0.25, 0.33]);
const POP_TIME = 0.12;
const STARS = 3;
const CONFETTI = 30;
const GRAVITY = 260;
const STAR = '#ffe066';
const CONFETTI_COLORS = Object.freeze(['#ff4fd0', '#ffd27a', '#7ad7ff', '#9cff8a', '#ffffff']);
const DURATION = BOSS_FALL.shudder + BOSS_FALL.flight + Math.max(BOSS_FALL.twinkle, BOSS_FALL.confetti);

/** The point of the sky over `x` where the boss vanishes, always on screen. */
export function skyPoint(x) {
    return { x: Math.min(WORLD.width - SKY_MARGIN, Math.max(SKY_MARGIN, x)), y: SKY_Y };
}

/**
 * Where the boss's body is, `age` seconds into its fall, from its centre
 * `from` to the sky point `to`. Pure.
 * @returns {{phase: 'shudder'|'flight'|'gone', x: number, y: number, scale: number, turn: number}} `turn` in quarter turns
 */
export function bossFallPose(age, from, to) {
    const { shudder, flight } = BOSS_FALL;
    if (age < shudder) {
        const side = Math.floor(age * 30) % 2 === 0 ? -1 : 1;
        return { phase: 'shudder', x: from.x + side * WOBBLE, y: from.y, scale: 1, turn: 0 };
    }
    if (age >= shudder + flight) return { phase: 'gone', x: to.x, y: to.y, scale: 0, turn: 0 };
    // a curve that rises over the start, then bends to the sky point
    const t = (age - shudder) / flight;
    const u = 1 - t;
    const top = from.y - ARC;
    return {
        phase: 'flight',
        x: u * u * from.x + 2 * u * t * from.x + t * t * to.x,
        y: u * u * from.y + 2 * u * t * top + t * t * to.y,
        scale: 1 - (1 - END_SCALE) * t,
        turn: Math.floor((age - shudder) * QUARTER_TURNS_PER_SECOND) % 4,
    };
}

/** A plus of square cells, `arm` cells long each way. */
function pixelPlus(ctx, x, y, arm, color) {
    const cx = Math.round(x / PX) * PX;
    const cy = Math.round(y / PX) * PX;
    ctx.fillStyle = color;
    ctx.fillRect(cx - (arm + 0.5) * PX, cy - PX / 2, (2 * arm + 1) * PX, PX);
    ctx.fillRect(cx - PX / 2, cy - (arm + 0.5) * PX, PX, (2 * arm + 1) * PX);
}

export class BossFall {
    /** @param {{kind: string, x: number, y: number, feetY: number, facing: number}} kill the boss's kill event */
    constructor(bank, { kind, x, y, feetY, facing }) {
        this.bank = bank;
        this.kind = kind;
        this.facing = facing;
        this.from = { x, y };
        /** From the body's centre down to where the sprite is anchored (its feet; flyers by the centre). */
        this.lift = kind === 'bat' ? 0 : feetY - y;
        this.to = skyPoint(x);
        this.age = 0;
        const reach = Math.max(30, this.lift);
        this.pops = POPS.map((at) => ({ at, dx: jitter(-0.6, 0.6) * reach, dy: jitter(-1, 1) * reach }));
        this.confetti = Array.from({ length: CONFETTI }, (_, i) => ({
            vx: jitter(-170, 170),
            vy: jitter(-220, -50),
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            size: i % 3 === 0 ? 2 * PX : PX,
            spin: jitter(8, 16),
        }));
    }

    update(dt) {
        this.age += dt;
        return this.age < DURATION;
    }

    draw(ctx) {
        const pose = bossFallPose(this.age, this.from, this.to);
        if (pose.phase === 'gone') {
            this.#twinkle(ctx);
            this.#confetti(ctx);
            return;
        }
        this.#body(ctx, pose);
        if (pose.phase === 'shudder') this.#pops(ctx);
        else this.#dizzy(ctx, pose);
    }

    #body(ctx, pose) {
        const { anim, frame } = poseFrame(this.kind, 'stagger', this.age);
        const flash = pose.phase === 'shudder' && Math.floor(this.age * 20) % 2 === 0;
        ctx.save();
        ctx.translate(pose.x, pose.y);
        ctx.rotate((pose.turn * Math.PI) / 2);
        this.bank.draw(ctx, {
            actor: this.kind, anim, frame, facing: this.facing, x: 0, y: this.lift * pose.scale, flash, scale: INVADER.lookScale * pose.scale,
        });
        ctx.restore();
    }

    /** Little white and yellow pops all over the body, one after the other. */
    #pops(ctx) {
        for (const pop of this.pops) {
            const t = (this.age - pop.at) / POP_TIME;
            if (t < 0 || t >= 1) continue;
            pixelPlus(ctx, this.from.x + pop.dx, this.from.y + pop.dy, 1 + Math.floor(t * 3), t < 0.5 ? '#ffffff' : STAR);
        }
    }

    /** Stars turning round its head while it flies. */
    #dizzy(ctx, pose) {
        const radius = 20 + 50 * pose.scale;
        for (let i = 0; i < STARS; i++) {
            const angle = this.age * 9 + (TAU * i) / STARS;
            pixelPlus(ctx, pose.x + Math.cos(angle) * radius, pose.y - 20 * pose.scale + Math.sin(angle) * radius * 0.45, 1, STAR);
        }
    }

    /** "Ding": a star that opens and closes where it vanished, in a ring of light. */
    #twinkle(ctx) {
        const t = (this.age - BOSS_FALL.shudder - BOSS_FALL.flight) / BOSS_FALL.twinkle;
        if (t >= 1) return;
        ctx.globalAlpha = stepped(1 - t, 3);
        pixelRing(ctx, this.to.x, this.to.y, 20 + 70 * t, { size: PX, color: '#ffffff' });
        ctx.globalAlpha = 1;
        const arm = Math.round(Math.sin(t * Math.PI) * 8);
        if (arm < 1) return;
        pixelPlus(ctx, this.to.x, this.to.y, arm, STAR);
        pixelPlus(ctx, this.to.x, this.to.y, Math.max(0, arm - 2), '#ffffff');
        if (arm < 4) return;
        // the short diagonal rays at its brightest
        ctx.fillStyle = STAR;
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            for (const step of [2, 3]) ctx.fillRect(this.to.x + dx * step * PX - PX / 2, this.to.y + dy * step * PX - PX / 2, PX, PX);
        }
    }

    /** Confetti out of the twinkle, falling and turning (a cell that narrows and widens). */
    #confetti(ctx) {
        const age = this.age - BOSS_FALL.shudder - BOSS_FALL.flight;
        if (age >= BOSS_FALL.confetti) return;
        ctx.globalAlpha = stepped(1 - age / BOSS_FALL.confetti, 3);
        for (const bit of this.confetti) {
            const x = this.to.x + bit.vx * age;
            const y = this.to.y + bit.vy * age + 0.5 * GRAVITY * age * age;
            const wide = Math.floor(age * bit.spin) % 2 === 0;
            ctx.fillStyle = bit.color;
            ctx.fillRect(Math.round(x / PX) * PX, Math.round(y / PX) * PX, wide ? bit.size : Math.ceil(bit.size / 2), bit.size);
        }
        ctx.globalAlpha = 1;
    }
}

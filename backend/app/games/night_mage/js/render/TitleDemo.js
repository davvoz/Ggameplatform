import { ENEMIES, SHOTS } from '../config/Enemies.js';
import { STRINGS } from '../config/Strings.js';
import { Rng } from '../core/Rng.js';
import { poseFrame } from './poses.js';
import { drawShot } from './ShotArt.js';
import { drawLightning, drawStormButton, lightningPath, paintCloud } from './StormArt.js';

const LOOP = 3.4;
const TAU = Math.PI * 2;
/** A monster fades in over this long at the start of its scene, and out at the end. */
const APPEAR = 0.35;
const LEAVE = 0.4;

/**
 * The three rules, each with its moment: the bat is tapped, the archer's
 * arrow is tapped down, the mage is tapped and his shield sends Ken's
 * fireball back. `at` is when the finger lands.
 */
const SCENES = Object.freeze([
    { at: 1.5, move: 'cast' },
    { at: 1.55, move: 'cast', shooter: 'archer', x: 150, release: 1.0 },
    { at: 1.25, move: 'shield', shooter: 'brawler', x: 170, release: 0.9 },
    { at: 1.3, move: 'cast' },
]);
/** Where the mage aims, roughly, when he casts (only the side matters): the bat, the arrow, the storm. */
const CAST_X = [340, 330, null, 300];
/**
 * The storm scene: its button fills, is pressed, and a lightning falls on
 * each monster. The button sits on the left, clear of the captions.
 */
const STORM_SCENE = Object.freeze({
    button: { x: 110, dy: -150 },
    fillTime: 0.9,
    targets: [
        { actor: 'bat', x: 250, dy: -90, strikeAt: 1.6 },
        { actor: 'warrior', x: 320, strikeAt: 1.72 },
    ],
});
const LIGHTNING_TIME = 0.28;
const STORM_VIOLET_SPARK = '#c9a6ff';
/** The bubble's rim, from the mage's chest: where the fireball bounces. */
const RIM = 84;
const REFLECT_SPEED = 1.8;

/**
 * The demo's timeline, the same for the drawing and for the mage's moves:
 * which rule is shown (0 monster, 1 arrow, 2 shield) and how far into it.
 */
export function titleBeat(time) {
    const at = Math.max(0, time);
    return { scene: Math.floor(at / LOOP) % SCENES.length, t: at % LOOP };
}

/**
 * What the mage does between two moments of the demo, if anything: a cast at
 * a target, or the shield.
 * @returns {{move: 'cast', x: number}|{move: 'shield'}|null}
 */
export function titleCue(before, now) {
    const { scene, t } = titleBeat(now);
    const { at, move } = SCENES[scene];
    const crossed = t >= at && (titleBeat(before).scene !== scene || titleBeat(before).t < at);
    if (!crossed) return null;
    return move === 'shield' ? { move } : { move, x: CAST_X[scene] };
}

/**
 * Where a demo shot is at `t`: out from `from` to `chest`; the shield one
 * bounces off the bubble and flies back to `home` (its shooter), faster.
 * Pure, for the drawing and the tests.
 * @returns {{x: number, y: number, vx: number, vy: number, phase: 'out'|'back'|'hit'}|null} null before it leaves
 */
export function demoShot({ kind, from, chest, home, release, reflects }, t) {
    if (t < release) return null;
    const speed = SHOTS[kind].speed;
    const dx = chest.x - from.x;
    const dy = chest.y - from.y;
    const length = Math.hypot(dx, dy);
    const out = { vx: (dx / length) * speed, vy: (dy / length) * speed };
    const flown = (t - release) * speed;
    const rimAt = length - RIM;
    if (!reflects || flown < rimAt) {
        return { x: from.x + (out.vx / speed) * flown, y: from.y + (out.vy / speed) * flown, ...out, phase: 'out' };
    }
    const bounce = { x: from.x + (out.vx / speed) * rimAt, y: from.y + (out.vy / speed) * rimAt };
    const backX = home.x - bounce.x;
    const backY = home.y - bounce.y;
    const backLength = Math.hypot(backX, backY);
    const back = Math.min(backLength, (flown - rimAt) * REFLECT_SPEED);
    const vx = (backX / backLength) * speed * REFLECT_SPEED;
    const vy = (backY / backLength) * speed * REFLECT_SPEED;
    const phase = back >= backLength ? 'hit' : 'back';
    return { x: bounce.x + (backX / backLength) * back, y: bounce.y + (backY / backLength) * back, vx, vy, phase };
}

/** When a bounced shot gets back to its shooter (stepping the path tick by tick). */
export function bounceHitTime(spec) {
    for (let t = spec.release; t <= LOOP; t += 1 / 60) {
        if (demoShot(spec, t).phase === 'hit') return t;
    }
    return Infinity;
}

/** A pixel hand with a pointing finger, its fingertip on (x, y). */
function finger(ctx, x, y, pressed) {
    const px = 4;
    const rows = ['0011000', '0011000', '0011000', '0011110', '0111111', '1111111', '1111111', '0111110', '0011110'];
    const dy = pressed ? 4 : 0;
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(x - px * 2 - 2, y + dy - 2, px * 7 + 4, px * rows.length + 4);
    ctx.fillStyle = '#ffe3c4';
    rows.forEach((row, r) => [...row].forEach((cell, c) => {
        if (cell === '1') ctx.fillRect(x - px * 2 + c * px, y + dy + r * px, px, px);
    }));
}

/** A key of the keyboard, drawn in pixels, with its letter; pressed, it sinks. */
function keyCap(ctx, font, x, y, label, pressed) {
    const dy = pressed ? 3 : 0;
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(x - 22, y - 20, 44, 44);
    ctx.fillStyle = pressed ? '#c9b8ff' : '#efe8ff';
    ctx.fillRect(x - 19, y - 17 + dy, 38, 36);
    ctx.fillStyle = '#9d8fd0';
    ctx.fillRect(x - 19, y + 13 + dy, 38, 6);
    font.draw(ctx, label, x, y - 12 + dy, { size: 22, align: 'center', color: '#1a0a2e', outline: false });
}

/** Square sparks flying out of a point, `after` seconds in. */
function sparks(ctx, x, y, after, color) {
    const r = 10 + after * 120;
    ctx.globalAlpha = Math.max(0, 1 - after / 0.6);
    ctx.fillStyle = color;
    for (let i = 0; i < 10; i++) {
        const a = (TAU / 10) * i;
        ctx.fillRect(Math.round(x + Math.cos(a) * r) - 4, Math.round(y + Math.sin(a) * r) - 4, 8, 8);
    }
    ctx.globalAlpha = 1;
}

/**
 * The rules shown by example on the title, on the left of the mage (who
 * faces that way): a bat is tapped and blasted; an archer shoots and her
 * arrow is tapped down; Ken throws a fireball, the mage is tapped and his
 * shield sends it back into Ken.
 */
export class TitleDemo {
    #bank;
    #font;
    #shots;
    #keyboard;
    #cloud;

    /** @param {{bank: object, font: object, shots: object, keyboard?: boolean}} parts */
    constructor({ bank, font, shots, keyboard = false }) {
        this.#bank = bank;
        this.#font = font;
        this.#shots = shots;
        this.#keyboard = keyboard;
        this.#cloud = paintCloud();
    }

    /**
     * @param {{mage: {x: number, feetY: number}, ground: (x: number) => number}} stage the title's mage and the floor under any x
     * @param {number} captionY where the rule is written
     * @param {number} time seconds since the title opened
     */
    draw(ctx, { mage, ground }, captionY, time) {
        const { scene, t } = titleBeat(time);
        const chest = { x: mage.x, y: mage.feetY - 66 };
        if (scene === 0) this.#bat(ctx, t, chest);
        else if (scene === 3) this.#storm(ctx, t, chest, ground);
        else this.#duel(ctx, t, chest, { ...SCENES[scene], feetY: ground(SCENES[scene].x) });
        this.#captions(ctx, scene, t, captionY);
    }

    #captions(ctx, scene, t, captionY) {
        const caption = STRINGS.rules[this.#keyboard ? 'keys' : 'touch'][scene];
        const note = STRINGS.ruleNotes[scene];
        const pop = Math.min(1, t * 4);
        this.#font.draw(ctx, caption, 480, captionY, { size: 26 * (0.8 + 0.2 * pop), align: 'center', color: '#ffffff', alpha: pop });
        if (note) this.#font.draw(ctx, note, 480, captionY + 36, { size: 18, align: 'center', color: '#9be7ff', alpha: pop });
    }

    /** A bat and a warrior wait; the storm button fills, is pressed, and the lightnings fall. */
    #storm(ctx, t, chest, ground) {
        const { at } = SCENES[3];
        for (const target of STORM_SCENE.targets) this.#stormTarget(ctx, t, target, chest, ground);
        const { x, dy } = STORM_SCENE.button;
        const y = chest.y + dy;
        const ready = t >= STORM_SCENE.fillTime && t < at;
        const fill = t < at ? Math.min(1, t / STORM_SCENE.fillTime) : 0;
        const label = this.#keyboard ? STRINGS.stormKey : STRINGS.stormTap;
        drawStormButton(ctx, x, y, { cloud: this.#cloud, font: this.#font, fill, ready, time: t, label: ready ? label : null });
        const pressed = Math.abs(t - at) < 0.15;
        if (this.#keyboard && t > STORM_SCENE.fillTime && t < at + 0.4) keyCap(ctx, this.#font, x + 70, y, STRINGS.stormKey, pressed);
        else if (!this.#keyboard && t > STORM_SCENE.fillTime && t < at + 0.3) finger(ctx, x + 10, y + 6, pressed);
    }

    /** One monster of the storm scene: there until its lightning falls, then it bursts and fades. */
    #stormTarget(ctx, t, { actor, x, dy, strikeAt }, chest, ground) {
        const flying = actor === 'bat';
        const y = flying ? chest.y + dy + Math.sin(t * 5) * 8 : ground(x);
        const after = t - strikeAt;
        const fadeIn = Math.min(1, t / APPEAR);
        if (after < 0.5) {
            const state = after >= 0 ? 'stagger' : 'idle';
            const { anim, frame } = poseFrame(actor, flying ? 'fly' : state, Math.max(0, after >= 0 ? after : t));
            ctx.globalAlpha = Math.max(0, Math.min(fadeIn, after >= 0 ? 1 - after / 0.5 : 1));
            this.#bank.draw(ctx, { actor, anim, frame, facing: 1, x, y, flash: after >= 0 && after < 0.15 });
            ctx.globalAlpha = 1;
        }
        if (after < 0 || after > LIGHTNING_TIME + 0.4) return;
        const centerY = flying ? y : y - ENEMIES[actor].body.height / 2;
        const wobble = new Rng(x);
        if (after < LIGHTNING_TIME) drawLightning(ctx, lightningPath(x, centerY, (min, max) => wobble.range(min, max)), after);
        sparks(ctx, x, centerY, after, STORM_VIOLET_SPARK);
    }

    #bat(ctx, t, chest) {
        const { at } = SCENES[0];
        const x = 100 + Math.min(t, at) * 160;
        const y = chest.y - 80 + Math.sin(t * 5) * 12;
        if (t < at + 0.08) {
            const { anim, frame } = poseFrame('bat', 'fly', t);
            this.#bank.draw(ctx, { actor: 'bat', anim, frame, facing: 1, x, y });
        }
        this.#tapped(ctx, t - at, x, y);
        this.#blast(ctx, t - at, x, y, chest);
    }

    /** An archer or Ken comes in, shoots once, and the mage answers. */
    #duel(ctx, t, chest, scene) {
        const { shooter, x, feetY, release } = scene;
        const stats = ENEMIES[shooter];
        const body = { x, y: feetY - stats.body.height / 2 };
        const reflects = scene.move === 'shield';
        const from = { x: x + stats.muzzle.forward, y: feetY - stats.muzzle.up };
        const spec = { kind: stats.shot, from, chest, home: body, release, reflects };
        const hitAt = reflects ? bounceHitTime(spec) : Infinity;
        this.#shooter(ctx, t, scene, stats, hitAt);
        if (reflects) this.#reflected(ctx, t, demoShot(spec, t), hitAt, chest);
        else this.#burnt(ctx, t, spec, scene.at, chest);
    }

    #shooter(ctx, t, { shooter, x, feetY, release }, stats, hitAt) {
        const fadeIn = Math.min(1, t / APPEAR);
        const fadeOut = Math.min(1, (LOOP - t) / LEAVE);
        let state = 'idle';
        let time = t;
        if (t >= hitAt) [state, time] = ['stagger', t - hitAt];
        else if (t >= APPEAR && t < release) [state, time] = [shooter === 'archer' ? 'windup' : 'throw', t - APPEAR];
        const timing = { ...stats, windup: release - APPEAR, throwWindup: release - APPEAR };
        const { anim, frame } = poseFrame(shooter, state, time, timing);
        ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut, t >= hitAt ? 1 - (t - hitAt) / 0.9 : 1));
        const flash = t >= hitAt && t < hitAt + 0.15;
        this.#bank.draw(ctx, { actor: shooter, anim, frame, facing: 1, x, y: feetY, flash });
        ctx.globalAlpha = 1;
    }

    /** The arrow flies until the finger taps it; the mage's bolt burns it there. */
    #burnt(ctx, t, spec, at, chest) {
        const shot = demoShot(spec, Math.min(t, at));
        if (!shot) return;
        if (t < at + 0.05) drawShot(ctx, this.#shots, { kind: spec.kind, ...shot }, t);
        this.#tapped(ctx, t - at, shot.x, shot.y);
        this.#blast(ctx, t - at, shot.x, shot.y, chest, '+25');
    }

    /** The finger taps the mage, the fireball bounces off the bubble and hits Ken. */
    #reflected(ctx, t, shot, hitAt, chest) {
        const { at } = SCENES[2];
        if (t > at - 0.6 && t < at + 0.5) finger(ctx, chest.x + 4, chest.y - 10, Math.abs(t - at) < 0.15);
        if (!shot) return;
        if (shot.phase !== 'hit') drawShot(ctx, this.#shots, { kind: 'fireball', ...shot }, t);
        if (t >= hitAt) sparks(ctx, shot.x, shot.y, t - hitAt, '#8fdcff');
    }

    /** The finger comes and taps a moving target at `x, y` (`after` < 0 before the tap). */
    #tapped(ctx, after, x, y) {
        if (after < 0.3) finger(ctx, x + 12, y + 20, Math.abs(after) < 0.15);
    }

    /** The bolt flies from the staff and the target bursts. */
    #blast(ctx, after, x, y, chest, points = '+100') {
        if (after < 0 || after > 0.6) return;
        if (after < 0.1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(255,170,120,0.9)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(chest.x - 46, chest.y - 40);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.restore();
        }
        sparks(ctx, x, y, after, '#ffab40');
        ctx.globalAlpha = Math.max(0, 1 - after / 0.6);
        this.#font.draw(ctx, points, x, y - 40 - after * 40, { size: 18, align: 'center' });
        ctx.globalAlpha = 1;
    }
}

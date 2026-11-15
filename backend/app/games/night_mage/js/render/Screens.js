import { BOON_SCREEN, BOONS } from '../config/Boons.js';
import { STRINGS, bossName } from '../config/Strings.js';
import { INVADER } from '../config/Tuning.js';
import { drawName } from './Font.js';
import { poseFrame } from './poses.js';

const INK = 'rgba(12,6,24,0.82)';
const GOLD = '#ffd27a';
const INVADER_PINK = '#ff4fd0';
/** The invader's band opens in this long, and stays this long after it steps in. */
const HERALD_OPEN = 0.15;
const HERALD_LINGER = 0.5;
const SEND_KINDS = ['bat', 'warrior', 'archer', 'brawler'];
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeOut = (t) => 1 - (1 - t) ** 3;

/**
 * How one power card looks at a moment of its screen: rising in one after
 * the other, then (once one is picked) the picked one swelling and flashing
 * while the others sink and fade. Pure.
 * @param {{age: number, picked: string|null, pickedAt: number}} show
 * @returns {{alpha: number, dy: number, scale: number, glow: boolean}}
 */
export function cardLook(show, id, index) {
    const { intro, stagger, outro } = BOON_SCREEN;
    if (!show.picked) {
        const rise = easeOut(clamp01((show.age - index * stagger) / (intro - 2 * stagger)));
        return { alpha: rise, dy: (1 - rise) * 160, scale: 0.9 + 0.1 * rise, glow: false };
    }
    const leaving = clamp01((show.age - show.pickedAt) / outro);
    if (show.picked === id) {
        return { alpha: 1 - clamp01((leaving - 0.6) / 0.4), dy: 0, scale: 1 + 0.12 * Math.sin(leaving * Math.PI), glow: true };
    }
    return { alpha: 1 - leaving, dy: leaving * 80, scale: 1 - 0.1 * leaving, glow: false };
}

/** A rounded rectangle path; drawn by hand where the browser lacks `roundRect` (older Safari). */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    const k = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + k, y);
    ctx.arcTo(x + w, y, x + w, y + h, k);
    ctx.arcTo(x + w, y + h, x, y + h, k);
    ctx.arcTo(x, y + h, x, y, k);
    ctx.arcTo(x, y, x + w, y, k);
    ctx.closePath();
}

/**
 * The screens around the fight: title, countdown, pause and the results with
 * the invader to send. Each `draw…` returns its buttons as world rectangles
 * (`{id, x, y, w, h}`), which the game uses to read taps.
 */
export class Screens {
    #font;
    #bank;
    #keyboard;
    #boonIcons;
    #time = 0;

    /**
     * @param {boolean} keyboard tell the keys too (the countdown and the powers name them)
     * @param {Record<string, HTMLCanvasElement>} boonIcons one icon per power
     */
    constructor(font, bank, keyboard = false, boonIcons = {}) {
        this.#font = font;
        this.#bank = bank;
        this.#keyboard = keyboard;
        this.#boonIcons = boonIcons;
    }

    update(dt) {
        this.#time += dt;
    }

    #button(ctx, id, label, cx, cy, { w = 260, h = 64, color = '#ff5a3c', size = 30, pulse = false } = {}) {
        const grow = pulse ? 1 + 0.04 * Math.sin(this.#time * 5) : 1;
        const bw = w * grow;
        const bh = h * grow;
        const x = cx - bw / 2;
        const y = cy - bh / 2;
        ctx.fillStyle = '#1a0a2e';
        roundRect(ctx, x - 4, y + 2, bw + 8, bh + 8, 18);
        ctx.fill();
        ctx.fillStyle = color;
        roundRect(ctx, x, y, bw, bh, 16);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        roundRect(ctx, x + 6, y + 5, bw - 12, bh / 2 - 6, 10);
        ctx.fill();
        this.#font.draw(ctx, label, cx, cy - size / 2 + 2, { size, align: 'center', color: '#ffffff' });
        return { id, x, y, w: bw, h: bh };
    }

    #shade(ctx, area, alpha = 0.55) {
        ctx.fillStyle = `rgba(8,4,18,${alpha})`;
        ctx.fillRect(0, area.top, 960, area.height);
    }

    /** @param {{best: number, inbox: object|null, area: object}} model */
    drawTitle(ctx, { best, inbox, area }) {
        const gradient = ctx.createLinearGradient(0, area.top, 0, area.top + 170);
        gradient.addColorStop(0, 'rgba(8,4,18,0.85)');
        gradient.addColorStop(1, 'rgba(8,4,18,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, area.top, 960, 170);
        const float = Math.sin(this.#time * 1.6) * 4;
        this.#font.draw(ctx, STRINGS.title, 480, area.top + 20 + float, { size: 66, align: 'center', color: GOLD });
        this.#font.draw(ctx, STRINGS.tagline, 480, area.top + 104, { size: 15, align: 'center', color: '#c9b8ff' });
        // bottom right: the mage stands in the middle and the rules play on his left
        const start = this.#button(ctx, 'start', STRINGS.start, 760, area.bottom - 62, { w: 280, h: 74, size: 36, pulse: true });
        if (best > 0) this.#font.draw(ctx, `${STRINGS.best} ${best}`, 760, area.bottom - 130, { size: 18, align: 'center' });
        if (inbox) this.#inbox(ctx, inbox, area);
        return [start];
    }

    /** What the player's invaders did out there. */
    #inbox(ctx, inbox, area) {
        const x = 714;
        const y = area.top + 196;
        ctx.fillStyle = INK;
        roundRect(ctx, x, y, 230, 112, 12);
        ctx.fill();
        this.#font.draw(ctx, STRINGS.yourInvaders, x + 12, y + 10, { size: 15, color: '#ff9ad5' });
        const rows = [[STRINGS.inboxHits, inbox.hits], [STRINGS.inboxKills, inbox.kills], [STRINGS.inboxSlain, inbox.slain]];
        rows.forEach(([label, value], i) => {
            this.#font.draw(ctx, label, x + 12, y + 38 + i * 24, { size: 13, color: '#ffffff' });
            this.#font.draw(ctx, String(value), x + 218, y + 38 + i * 24, { size: 13, align: 'right' });
        });
    }

    /** 3, 2, 1 (0.6 s each), then GO! while `seconds` runs below zero. */
    drawCountdown(ctx, seconds, area) {
        const step = Math.ceil(seconds / 0.6);
        const label = step > 0 ? String(step) : STRINGS.go;
        const local = step > 0 ? 1 - (seconds / 0.6 - (step - 1)) : Math.min(1, -seconds / 0.35);
        const size = 90 + local * 40;
        this.#font.draw(ctx, label, 480, area.top + area.height / 2 - size / 2 - 20, { size, align: 'center', color: '#ffffff', alpha: 1 - local * 0.4 });
        if (this.#keyboard) this.#font.draw(ctx, STRINGS.keysHint, 480, area.top + area.height / 2 + 60, { size: 20, align: 'center', color: '#9be7ff' });
    }

    drawPause(ctx, area) {
        this.#shade(ctx, area, 0.6);
        this.#font.draw(ctx, STRINGS.paused, 480, area.top + area.height / 2 - 50, { size: 54, align: 'center' });
        this.#font.draw(ctx, STRINGS.tapToResume, 480, area.top + area.height / 2 + 20, { size: 20, align: 'center', color: '#ffffff' });
        return [];
    }

    /**
     * The powers offered after a wave: the screen darkens, the cards rise one
     * by one and only then take taps (or 1 2 3); a picked card flashes while
     * the others go, then the screen clears.
     * @param {{choices: string[], boons: import('../sim/Boons.js').Boons, show: {age: number, picked: string|null, pickedAt: number}}} offer
     */
    drawOffer(ctx, { choices, boons, show }, area) {
        const coming = easeOut(clamp01(show.age / BOON_SCREEN.intro));
        const leaving = show.picked ? clamp01((show.age - show.pickedAt) / BOON_SCREEN.outro) : 0;
        const fade = coming * (1 - leaving);
        this.#shade(ctx, area, 0.62 * fade);
        const mid = area.top + area.height / 2;
        const drop = (1 - coming) * -30;
        this.#font.draw(ctx, STRINGS.offerTitle, 480, mid - 178 + drop, { size: 34, align: 'center', color: GOLD, alpha: fade });
        this.#font.draw(ctx, STRINGS.offerHint, 480, mid - 138 + drop, { size: 15, align: 'center', color: '#c9b8ff', alpha: fade });
        const armed = show.age >= BOON_SCREEN.intro && !show.picked;
        const buttons = [];
        choices.forEach((id, i) => {
            const cx = 480 + (i - (choices.length - 1) / 2) * 280;
            const cy = mid + 12;
            const look = cardLook(show, id, i);
            if (look.alpha <= 0) return;
            ctx.save();
            ctx.globalAlpha = look.alpha;
            ctx.translate(cx, cy + look.dy);
            ctx.scale(look.scale, look.scale);
            const card = this.#boonCard(ctx, id, i, boons.level(id), look.glow);
            ctx.restore();
            if (armed) buttons.push({ id: `boon:${id}`, x: cx + card.x, y: cy + card.y, w: card.w, h: card.h });
        });
        return buttons;
    }

    /** A power's card, centred on the origin. @returns {{x: number, y: number, w: number, h: number}} its area */
    #boonCard(ctx, id, index, level, glow) {
        const w = 250;
        const h = 226;
        const x = -w / 2;
        const y = -h / 2;
        ctx.fillStyle = '#1a0a2e';
        roundRect(ctx, x - 4, y + 4, w + 8, h + 8, 16);
        ctx.fill();
        ctx.fillStyle = 'rgba(40,22,70,0.96)';
        roundRect(ctx, x, y, w, h, 14);
        ctx.fill();
        const flash = glow && Math.floor(this.#time * 14) % 2 === 0;
        ctx.strokeStyle = flash ? '#ffffff' : GOLD;
        ctx.lineWidth = glow ? 6 : 3;
        ctx.stroke();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.#boonIcons[id], -36, y + 16, 72, 72);
        const { name, lines: first, next } = STRINGS.boons[id];
        const lines = next?.[level] ?? first;
        this.#font.draw(ctx, name, 0, y + 98, { size: 20, align: 'center', color: GOLD });
        lines.forEach((line, i) => this.#font.draw(ctx, line, 0, y + 132 + i * 22, { size: 13, align: 'center', color: '#ffffff' }));
        this.#levelPips(ctx, 0, y + h - 24, level, BOONS[id].max);
        if (this.#keyboard) this.#keyBadge(ctx, x + 22, y + 22, String(index + 1));
        return { x, y, w, h };
    }

    /** One square per level: taken (gold), the one this card gives (pink), still to come (dark). */
    #levelPips(ctx, cx, y, level, max) {
        const size = 10;
        const gap = 6;
        const left = cx - (max * size + (max - 1) * gap) / 2;
        for (let k = 0; k < max; k++) {
            let color = '#3a2a5a';
            if (k < level) color = GOLD;
            else if (k === level) color = '#ff9ad5';
            ctx.fillStyle = color;
            ctx.fillRect(Math.round(left + k * (size + gap)), y, size, size);
        }
    }

    #keyBadge(ctx, x, y, label) {
        ctx.fillStyle = '#1a0a2e';
        ctx.fillRect(x - 15, y - 13, 30, 30);
        ctx.fillStyle = '#efe8ff';
        ctx.fillRect(x - 12, y - 10, 24, 22);
        this.#font.draw(ctx, label, x, y - 9, { size: 18, align: 'center', color: '#1a0a2e', outline: false });
    }

    drawWaveBanner(ctx, wave, age, area) {
        if (age > 1.4) return;
        const alpha = age < 1 ? 1 : (1.4 - age) / 0.4;
        this.#font.draw(ctx, `${STRINGS.wave} ${wave}`, 480, area.top + area.height * 0.32, { size: 46, align: 'center', alpha });
    }

    /**
     * The warning before a wave's boss: a dark band across the arena, a
     * blinking INVADER!, its owner's name, what it is and, when it is back
     * from an earlier lap of the roster, that it is stronger.
     * @param {{invader: {name: string|null, kind: string, level: number, lap: number}, age: number}} herald
     */
    drawInvaderBanner(ctx, { invader, age }, area) {
        const total = INVADER.heraldTime + HERALD_LINGER;
        if (age > total) return;
        const open = Math.min(1, age / HERALD_OPEN);
        const alpha = age < INVADER.heraldTime ? 1 : (total - age) / HERALD_LINGER;
        const mid = area.top + area.height * 0.36;
        const half = 70 * open;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(30,0,24,0.72)';
        ctx.fillRect(0, mid - half, 960, half * 2);
        ctx.fillStyle = INVADER_PINK;
        ctx.fillRect(0, mid - half, 960, 4);
        ctx.fillRect(0, mid + half - 4, 960, 4);
        ctx.restore();
        if (open < 1) return;
        const blink = Math.floor(age * 6) % 2 === 0;
        this.#font.draw(ctx, STRINGS.invaderComing, 480, mid - 58, { size: 40, align: 'center', color: blink ? INVADER_PINK : '#ffffff', alpha });
        if (alpha < 1) return;
        drawName(ctx, bossName(invader), 480, mid - 6, { size: 24, color: '#ffb3e6' });
        const what = `${STRINGS.monsters[invader.kind] ?? ''}  ${STRINGS.level} ${invader.level}`;
        this.#font.draw(ctx, what, 480, mid + 24, { size: 15, align: 'center', color: '#c9b8ff' });
        if (invader.lap > 0) this.#font.draw(ctx, STRINGS.stronger, 480, mid + 46, { size: 13, align: 'center', color: '#ff9a3c' });
    }

    drawSceneName(ctx, name, age, area) {
        if (age > 2.2) return;
        const alpha = age < 1.6 ? 1 : (2.2 - age) / 0.6;
        this.#font.draw(ctx, name, 480, area.top + area.height * 0.32 + 56, { size: 22, align: 'center', color: '#c9b8ff', alpha });
    }

    /**
     * @param {{report: object, best: number, newBest: boolean, age: number, send: {state: string, level: number, kind?: string}, area: object}} model
     */
    drawResult(ctx, model) {
        const { area, age } = model;
        this.#shade(ctx, area, Math.min(0.75, age * 1.2));
        if (age < 1.1) {
            this.#font.draw(ctx, STRINGS.nightOver, 480, area.top + area.height / 2 - 30, { size: 40, align: 'center', color: '#ff6b6b', alpha: Math.min(1, age * 3) });
            return [];
        }
        const t = age - 1.1;
        const top = area.top + 18;
        this.#font.draw(ctx, STRINGS.score, 480, top, { size: 18, align: 'center', color: '#c9b8ff' });
        const shown = Math.round(model.report.score * Math.min(1, t / 1.1));
        this.#font.draw(ctx, String(shown), 480, top + 26, { size: 54, align: 'center', color: '#ffffff' });
        if (model.newBest && t > 1.1) this.#newBest(ctx, t, top, area);
        this.#stats(ctx, model.report, top + 96, t);
        const buttons = this.#sendRow(ctx, model.send, area.bottom - 214, t);
        if (t > 0.6) {
            buttons.push(
                this.#button(ctx, 'again', STRINGS.again, 480, area.bottom - 50, { w: 300, h: 64, size: 30, pulse: true }),
                this.#button(ctx, 'home', STRINGS.home, 790, area.bottom - 50, { w: 190, h: 56, size: 24, color: '#5b4a8a' }),
            );
        }
        return buttons;
    }

    #newBest(ctx, t, top, area) {
        const frame = Math.floor((t * 1000) / 70);
        this.#bank.drawCelebration(ctx, frame, 130, area.bottom - 30, 210);
        const wobble = Math.sin(t * 8) * 3;
        this.#font.draw(ctx, STRINGS.newBest, 740, top + 40 + wobble, { size: 30, align: 'center', color: '#ff9ad5' });
    }

    #stats(ctx, report, y, t) {
        const rows = [
            [STRINGS.wave, report.wave],
            [STRINGS.kills, report.kills],
            [STRINGS.combo, report.bestCombo],
            [STRINGS.invadersSlain, report.invadersSlain],
        ];
        rows.forEach(([label, value], i) => {
            if (t < 0.25 * (i + 1)) return;
            const x = 228 + i * 168;
            this.#font.draw(ctx, label, x, y, { size: 13, align: 'center', color: '#c9b8ff' });
            this.#font.draw(ctx, String(value), x, y + 20, { size: 26, align: 'center', color: GOLD });
        });
    }

    /**
     * The invader to send: the four monsters ('choose'), the one picked with
     * SEND and BACK ('confirm'), then how it went ('sending', 'sent', 'failed').
     */
    #sendRow(ctx, send, y, t) {
        if (t < 1.2) return [];
        if (send.state === 'locked') {
            this.#font.draw(ctx, STRINGS.sendLocked, 480, y + 40, { size: 18, align: 'center', color: '#9aa4b8' });
            return [];
        }
        this.#font.draw(ctx, STRINGS.sendTitle, 480, y - 6, { size: 20, align: 'center', color: '#ff9ad5' });
        if (send.state === 'choose') {
            this.#font.draw(ctx, STRINGS.sendHint, 480, y + 20, { size: 12, align: 'center', color: '#c9b8ff' });
            return SEND_KINDS.map((kind, i) => this.#portrait(ctx, kind, 480 + (i - 1.5) * 118, y + 40, send.level, false));
        }
        // one monster picked: its card on the left, the words and buttons beside it
        this.#portrait(ctx, send.kind, 330, y + 36, send.level, true);
        if (send.state === 'confirm') {
            this.#font.draw(ctx, `${STRINGS.sendAsk} ${STRINGS.monsters[send.kind]}?`, 420, y + 44, { size: 18, color: '#ffffff' });
            return [
                this.#button(ctx, 'send:confirm', STRINGS.send, 500, y + 96, { w: 150, h: 46, size: 20, color: '#c2389a' }),
                this.#button(ctx, 'send:back', STRINGS.back, 670, y + 96, { w: 150, h: 46, size: 20, color: '#5b4a8a' }),
            ];
        }
        const message = { sent: STRINGS.sent, failed: STRINGS.sendFailed, sending: STRINGS.sending }[send.state];
        this.#font.draw(ctx, message, 420, y + 44, { size: 18, color: '#ffffff' });
        return send.state === 'failed' ? [this.#button(ctx, 'send:back', STRINGS.back, 500, y + 96, { w: 150, h: 46, size: 20, color: '#5b4a8a' })] : [];
    }

    #portrait(ctx, kind, cx, y, level, chosen) {
        const w = 104;
        const h = 84;
        const x = cx - w / 2;
        ctx.fillStyle = chosen ? 'rgba(255,90,200,0.35)' : INK;
        roundRect(ctx, x, y, w, h, 12);
        ctx.fill();
        ctx.strokeStyle = '#ff9ad5';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        const { anim, frame } = poseFrame(kind, kind === 'bat' ? 'fly' : 'idle', this.#time);
        const feet = kind === 'bat' ? y + 36 : y + h + 12;
        this.#bank.draw(ctx, { actor: kind, anim, frame, facing: 1, x: cx, y: feet, scale: kind === 'bat' ? 0.5 : 0.62 });
        ctx.fillStyle = 'rgba(12,6,24,0.8)';
        ctx.fillRect(x, y + h - 20, w, 20);
        ctx.restore();
        drawName(ctx, `${STRINGS.level} ${level}`, x + w - 8, y + 4, { size: 12, color: GOLD, align: 'right' });
        this.#font.draw(ctx, STRINGS.monsters[kind], cx, y + h - 17, { size: 13, align: 'center', color: '#ffffff' });
        return { id: `send:${kind}`, x, y, w, h };
    }
}

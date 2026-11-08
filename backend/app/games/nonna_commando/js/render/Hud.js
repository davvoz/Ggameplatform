import { C } from '../config/Palette.js';
import { PlayerTuning, View } from '../config/Tuning.js';

const MULT_COLORS = [C.white, C.white, C.yellow, C.yellow, C.orange, C.orange, C.pink, C.pink, C.pink];

/**
 * The heads-up display, drawn inside the game picture in the game's own
 * lettering. Everything the score depends on is visible at a glance: the
 * multiplier and how long it will last, the grandkids and teeth still out
 * there.
 */
export class Hud {
    #bank;
    #font;

    constructor(bank, font) {
        this.#bank = bank;
        this.#font = font;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('../sim/Simulation.js').Simulation} sim
     * @param {import('./Effects.js').Effects} fx
     * @param {number} frame frame counter for blinking
     * @param {number} [height] rows of the picture on screen
     */
    draw(ctx, sim, fx, frame, height = View.height) {
        const bank = this.#bank;
        const font = this.#font;
        const p = sim.player;
        const score = sim.score;

        // lives and hearts
        bank.draw(ctx, 'ui_nonna', 4, 3);
        font.draw(ctx, `X${Math.max(0, p.lives)}`, 20, 7);
        for (let i = 0; i < PlayerTuning.maxHearts; i++) {
            const full = i < p.hearts;
            const blink = !full && fx.flash > 0 && i === p.hearts;
            bank.draw(ctx, full || blink ? 'ui_heart' : 'ui_heartEmpty', 36 + i * 11, 4);
        }

        // weapon and meatballs
        const w = p.arsenal.weapon;
        bank.draw(ctx, `ui_w_${w.id}`, 4, 20);
        const ammo = w.ammo > 0 ? String(p.arsenal.ammo) : 'INF';
        const low = w.ammo > 0 && p.arsenal.ammo < w.ammo * 0.2;
        font.draw(ctx, ammo, 28, 21, { color: low && (frame >> 3) & 1 ? C.bandana : C.white });
        bank.draw(ctx, 'ui_meatball', 54, 20);
        font.draw(ctx, String(p.bombs), 66, 21);

        // score, centred and big
        const text = String(score.total).padStart(7, '0');
        font.draw(ctx, text, View.width / 2, 4, { align: 'center', scale: 2, color: C.white });

        // multiplier with its fuse
        const m = score.multiplier;
        const pulse = fx.chainPulse < 10 ? 1 : 0;
        if (m > 1 || fx.chainLost < 40) {
            const shown = m > 1 ? m : fx.lastLost;
            const color = m > 1 ? MULT_COLORS[m] : C.smoke;
            const x = View.width - 6;
            font.draw(ctx, `X${shown}`, x, 3 - pulse, { align: 'right', scale: 2, color: fx.chainLost < 40 && (frame >> 2) & 1 ? C.bandana : color });
            if (m > 1) {
                const bw = 36;
                const fill = Math.round(bw * Math.min(1, score.chainFraction));
                ctx.fillStyle = C.ink;
                ctx.fillRect(x - bw - 1, 20, bw + 2, 4);
                ctx.fillStyle = score.chainFraction < 0.3 && (frame >> 2) & 1 ? C.bandana : color;
                ctx.fillRect(x - bw, 21, fill, 2);
            }
            font.draw(ctx, 'HEAT', x - 40, 7, { align: 'right', color: C.smokeLight });
        }

        // objectives still out there
        const ms = score.mission;
        font.draw(ctx, `KIDS ${ms.rescues}/${ms.rescuesTotal}`, View.width - 6, 28, { align: 'right', color: ms.rescues === ms.rescuesTotal ? C.lime : C.white });
        font.draw(ctx, `TEETH ${ms.teeth}/${ms.teethTotal}`, View.width - 6, 38, { align: 'right', color: ms.teeth === ms.teethTotal ? C.gold : C.white });

        this.#bossBar(ctx, sim, frame, height);
    }

    #bossBar(ctx, sim, frame, height) {
        const boss = sim.world.boss;
        if (!boss || !boss.awake || boss.dead) return;
        const w = 180;
        const x = (View.width - w) / 2;
        const y = height - 14;
        const f = Math.max(0, boss.hp / boss.maxHp);
        ctx.fillStyle = C.ink;
        ctx.fillRect(x - 2, y - 2, w + 4, 8);
        ctx.fillStyle = C.inkSoft;
        ctx.fillRect(x, y, w, 4);
        ctx.fillStyle = f < 0.25 && (frame >> 3) & 1 ? C.white : C.bandana;
        ctx.fillRect(x, y, Math.round(w * f), 4);
        ctx.fillStyle = C.fireOrange;
        ctx.fillRect(x, y, Math.round(w * f), 1);
        // phase notches
        ctx.fillStyle = C.ink;
        for (const ph of boss.phases ?? []) ctx.fillRect(x + Math.round(w * ph), y, 1, 4);
        this.#font.draw(ctx, boss.name, View.width / 2, y - 11, { align: 'center', color: C.yellow });
    }
}

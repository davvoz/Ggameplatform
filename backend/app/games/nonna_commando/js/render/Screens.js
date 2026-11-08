import { C } from '../config/Palette.js';
import { View } from '../config/Tuning.js';
import { HIP } from './art/NonnaArt.js';

const W = View.width;
const H = View.height;
const CX = W / 2;

/**
 * Title, tally, game over, results and pause, drawn inside the game picture
 * in the game's own lettering, over the scene.
 */
export class Screens {
    #bank;
    #font;

    constructor(bank, font) {
        this.#bank = bank;
        this.#font = font;
    }

    /** Hint text for the current device. */
    static startHint(device) {
        return device === 'touch' ? 'TAP TO START' : device === 'gamepad' ? 'PRESS A TO START' : 'PRESS Z OR ENTER';
    }

    title(ctx, { frame, best, standings, device, weekId }) {
        const font = this.#font;
        this.#dim(ctx, 0.45);
        this.#logo(ctx, 22, frame);

        // Nonna, big
        ctx.save();
        ctx.scale(3, 3);
        const bob = (frame >> 4) & 1;
        this.#bank.draw(ctx, 'nonna_lo_stand', 26, 70);
        this.#bank.draw(ctx, `nonna_up_heavy_fwd_${bob}`, 26, 70 - HIP);
        ctx.restore();

        if ((frame >> 5) % 3 !== 2) font.draw(ctx, Screens.startHint(device), CX + 40, 112, { align: 'center', color: C.yellow, scale: 2 });
        if (device !== 'touch') {
            font.draw(ctx, 'ARROWS/WASD MOVE + AIM', CX + 40, 136, { align: 'center', color: C.white });
            font.draw(ctx, 'Z FIRE   X JUMP   C MEATBALL', CX + 40, 147, { align: 'center', color: C.white });
        } else {
            font.draw(ctx, 'STICK MOVE + AIM, HOLD FIRE', CX + 40, 140, { align: 'center', color: C.white });
        }
        font.draw(ctx, 'KILL FAST, STAY CLOSE: HEAT = SCORE', CX + 40, 160, { align: 'center', color: C.cyan });

        // the week's best: something to beat
        const top = standings.slice(0, 3);
        const y0 = 176;
        font.draw(ctx, `THIS WEEK ${weekId}`, W - 8, y0, { align: 'right', color: C.smokeLight });
        if (top.length === 0) font.draw(ctx, 'NO SCORES YET. BE FIRST!', W - 8, y0 + 11, { align: 'right', color: C.white });
        top.forEach((s, i) => {
            const name = s.username.toUpperCase().slice(0, 12);
            font.draw(ctx, `${i + 1}. ${name} ${s.score}`, W - 8, y0 + 11 + i * 10, { align: 'right', color: s.isPlayer ? C.lime : [C.gold, C.white, C.white][i] });
        });
        if (best > 0) font.draw(ctx, `YOUR BEST ${best}`, 8, H - 12, { color: C.gold });
    }

    #logo(ctx, y, frame) {
        const font = this.#font;
        const wobble = (frame >> 3) & 1;
        // NONNA in thick white with a red shadow, COMMANDO in yellow
        font.draw(ctx, 'NONNA', CX + 42, y + 3, { align: 'center', scale: 5, color: C.bandanaShade });
        font.draw(ctx, 'NONNA', CX + 40, y + wobble, { align: 'center', scale: 5, color: C.white });
        font.draw(ctx, 'COMMANDO', CX + 41, y + 41, { align: 'center', scale: 3, color: C.bandanaShade });
        font.draw(ctx, 'COMMANDO', CX + 40, y + 40, { align: 'center', scale: 3, color: C.yellow });
        font.draw(ctx, "PARTY'S OVER, SUPREMO.", CX + 40, y + 70, { align: 'center', color: C.pink });
    }

    /** @param {number} h rows of the picture on screen */
    paused(ctx, device, h = H) {
        this.#dim(ctx, 0.6, h);
        const mid = h >> 1;
        this.#font.draw(ctx, 'PAUSED', CX, mid - 28, { align: 'center', scale: 3, color: C.white });
        const hint = device === 'touch' ? 'TAP TO RESUME' : 'PRESS P OR ENTER TO RESUME';
        this.#font.draw(ctx, hint, CX, mid + 8, { align: 'center', color: C.yellow });
    }

    /** End of a mission (or of the war), over the scene. */
    tally(ctx, sim, device, h = H) {
        const font = this.#font;
        const t = sim.phaseTicks;
        const victory = sim.phase === 'victory';
        const lines = sim.tally;
        const panelH = 130 + (victory ? 12 : 0);
        const y0 = Math.max(2, (h - panelH) >> 1);
        this.#panel(ctx, 40, y0, W - 80, panelH);
        const title = victory ? 'PARTY CRASHED!' : `MISSION ${sim.mission.id} COMPLETE`;
        font.draw(ctx, title, CX, y0 + 8, { align: 'center', scale: 2, color: victory ? C.pink : C.yellow });

        lines.forEach((line, i) => {
            if (t < 30 + i * 22) return;
            const y = y0 + 34 + i * 13;
            font.draw(ctx, line.label, 56, y, { color: C.white });
            font.draw(ctx, line.value, 200, y, { align: 'center', color: C.cyan });
            font.draw(ctx, line.points > 0 ? `+${line.points}` : '-', W - 56, y, { align: 'right', color: line.points > 0 ? C.yellow : C.smoke });
        });
        let y = y0 + 34 + lines.length * 13 + 4;
        if (victory && t > 30 + lines.length * 22) {
            font.draw(ctx, 'LIVES LEFT', 56, y, { color: C.white });
            font.draw(ctx, `+${sim.livesBonus}`, W - 56, y, { align: 'right', color: C.yellow });
            y += 13;
        }
        if (t > 40 + lines.length * 22) font.draw(ctx, `SCORE ${sim.score.total}`, CX, y + 4, { align: 'center', scale: 2, color: C.white });
        if (t > 150 && (t >> 4) & 1) font.draw(ctx, device === 'touch' ? 'TAP FIRE' : 'PRESS FIRE', CX, y0 + panelH - 12, { align: 'center', color: C.yellow });
    }

    gameOver(ctx, sim, h = H) {
        const t = sim.phaseTicks;
        this.#dim(ctx, Math.min(0.5, t / 120), h);
        const drop = Math.max(0, 40 - t) * 2;
        this.#font.draw(ctx, 'GAME OVER', CX, (h >> 1) - 24 - drop, { align: 'center', scale: 4, color: C.bandana });
    }

    results(ctx, { report, best, isNewBest, rank, age, device, frame }) {
        const font = this.#font;
        this.#dim(ctx, 0.7);
        font.draw(ctx, report.victory ? 'PARTY CRASHED!' : 'NONNA IS DOWN', CX, 18, { align: 'center', scale: 2, color: report.victory ? C.pink : C.bandana });
        font.draw(ctx, String(report.score), CX, 42, { align: 'center', scale: 4, color: C.white });
        // a new record stays on screen; the colour pulses gently instead of flickering
        if (isNewBest) font.draw(ctx, 'NEW PERSONAL BEST!', CX, 76, { align: 'center', color: (frame >> 5) & 1 ? C.lime : C.yellow });
        else font.draw(ctx, `BEST ${best}`, CX, 76, { align: 'center', color: C.gold });

        const stats = [
            ['MISSIONS', `${report.missionsCleared}/3`],
            ['KILLS', String(report.kills)],
            ['GRANDKIDS', String(report.rescues)],
            ['GOLD TEETH', String(report.teeth)],
            ['TOP HEAT', `X${report.bestMultiplier}`],
        ];
        stats.forEach(([label, value], i) => {
            const y = 96 + i * 12;
            font.draw(ctx, label, CX - 70, y, { color: C.white });
            font.draw(ctx, value, CX + 70, y, { align: 'right', color: C.cyan });
        });
        if (rank) font.draw(ctx, `#${rank} THIS WEEK`, CX, 162, { align: 'center', scale: 2, color: C.yellow });
        if (age > 70 && (frame >> 4) & 1) {
            font.draw(ctx, device === 'touch' ? 'TAP TO PLAY AGAIN' : 'PRESS FIRE TO PLAY AGAIN', CX, H - 18, { align: 'center', color: C.white });
        }
    }

    #dim(ctx, alpha, h = H) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = C.ink;
        ctx.fillRect(0, 0, W, h);
        ctx.globalAlpha = 1;
    }

    #panel(ctx, x, y, w, h) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = C.ink;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = C.bandana;
        ctx.fillRect(x, y, w, 2);
        ctx.fillRect(x, y + h - 2, w, 2);
        ctx.fillStyle = C.gold;
        ctx.fillRect(x, y + 2, 2, h - 4);
        ctx.fillRect(x + w - 2, y + 2, 2, h - 4);
    }
}

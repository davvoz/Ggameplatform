import { State } from './State.js';
import {
    DESIGN_WIDTH, DESIGN_HEIGHT,
    FONT_FAMILY, UI_FONT,
} from '../config/Constants.js';
import { CHARACTERS } from '../characters/CharacterData.js';
import { SpriteGenerator } from '../characters/SpriteGenerator.js';

/* ---- fonts ---- */
const FNT = UI_FONT;

/* ---- palette ---- */
const CLR = {
    BG:        '#050510',
    CARD_BG:   'rgba(12,8,30,0.85)',
    CARD_SEL:  'rgba(191,90,242,0.10)',
    BORDER:    'rgba(60,50,100,0.40)',
    ACCENT:    '#bf5af2',
    TEXT_HI:   '#f0f0ff',
    TEXT_MID:  '#8888aa',
    TEXT_LO:   '#555570',
    GREEN:     '#39ff14',
    RED:       '#ff2d78',
    GOLD:      '#ffd700',
    PINK:      '#ff2d78',
    DIVIDER:   'rgba(100,80,160,0.25)',
};

/* ---- layout ---- */
const CELL      = 78;
const COLS      = 3;
const GAP       = 6;
const GRID_W    = COLS * CELL + (COLS - 1) * GAP;
const GRID_LEFT = Math.floor((DESIGN_WIDTH - GRID_W) / 2);
const GRID_TOP  = 60;
const GRID_BOT  = GRID_TOP + 2 * CELL + GAP;

const PANEL_X   = 16;
const PANEL_Y   = GRID_BOT + 10;
const PANEL_W   = DESIGN_WIDTH - 32;
const PANEL_H   = 74;

const STATUS_Y  = PANEL_Y + PANEL_H + 16;
const INFO_Y    = DESIGN_HEIGHT - 140;
const READY_Y   = DESIGN_HEIGHT - 110;
const BACK_Y    = DESIGN_HEIGHT - 56;

/* ---- helpers ---- */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

/**
 * Multiplayer character-select screen.
 *
 * Flow:
 *   1. Both players see the character grid and pick one.
 *   2. On READY, the choice is sent to the server.
 *   3. When the server confirms both are ready (bothReady),
 *      both clients transition to countdown simultaneously.
 */
export class MultiCharSelectState extends State {
    #selectedIndex = 0;
    #phase = 0;
    #ready = false;              // local player locked in
    #opponentReady = false;      // opponent locked in
    #opponentCharId = null;      // opponent's character id (after both ready)
    #roomData = null;            // { roundsToWin, betAmount, stage, opponentName }

    enter(data) {
        this.#roomData = data ?? {};
        this.#selectedIndex = 0;
        this.#phase = 0;
        this.#ready = false;
        this.#opponentReady = false;
        this.#opponentCharId = null;
        this.#setupButtons();
        this.#wireNetwork();
    }

    exit() {
        this._game.ui.clearButtons();
        this._game.network.off('opponentReady');
        this._game.network.off('bothReady');
        this._game.network.off('opponentLeft');
    }

    update(dt) {
        this.#phase += dt / 1000;
    }

    /* ======================= DRAW ======================= */

    draw(ctx) {
        const w = DESIGN_WIDTH;
        const h = DESIGN_HEIGHT;

        ctx.fillStyle = CLR.BG;
        ctx.fillRect(0, 0, w, h);

        // dot pattern
        ctx.fillStyle = 'rgba(255,255,255,0.012)';
        for (let gx = 8; gx < w; gx += 20)
            for (let gy = 8; gy < h; gy += 20)
                ctx.fillRect(gx, gy, 1, 1);

        // title
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CLR.PINK;
        ctx.shadowColor = CLR.PINK;
        ctx.shadowBlur = 10;
        ctx.font = 'bold 14px ' + FONT_FAMILY;
        ctx.fillText('SELECT YOUR FIGHTER', w / 2, 28);
        ctx.restore();

        // subtitle
        const oppName = this.#roomData.opponentName ?? 'Opponent';
        ctx.fillStyle = CLR.TEXT_MID;
        ctx.font = '8px ' + FNT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VS ' + oppName, w / 2, 44);

        // divider
        ctx.strokeStyle = CLR.DIVIDER;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(30, 52); ctx.lineTo(w - 30, 52); ctx.stroke();

        this.#drawCharacterGrid(ctx);
        this.#drawSelectedDetail(ctx);

        // divider above status
        ctx.strokeStyle = CLR.DIVIDER;
        ctx.beginPath(); ctx.moveTo(30, STATUS_Y - 10); ctx.lineTo(w - 30, STATUS_Y - 10); ctx.stroke();

        this.#drawStatus(ctx);
        this.#drawRoomInfo(ctx);

        this._game.ui.drawButtons(ctx);

        // scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.025)';
        for (let i = 0; i < h; i += 3) ctx.fillRect(0, i, w, 1);
    }

    /* ======================= GRID ======================= */

    #drawCharacterGrid(ctx) {
        for (let i = 0; i < CHARACTERS.length; i++) {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = GRID_LEFT + col * (CELL + GAP);
            const y = GRID_TOP + row * (CELL + GAP);
            const sel = i === this.#selectedIndex;
            const ch = CHARACTERS[i];
            const cut = 8;

            // Angular card path
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x + cut, y);
            ctx.lineTo(x + CELL, y);
            ctx.lineTo(x + CELL, y + CELL - cut);
            ctx.lineTo(x + CELL - cut, y + CELL);
            ctx.lineTo(x, y + CELL);
            ctx.lineTo(x, y + cut);
            ctx.closePath();

            ctx.fillStyle = sel ? CLR.CARD_SEL : CLR.CARD_BG;
            ctx.fill();
            if (sel) {
                const pulse = 0.5 + Math.sin(this.#phase * 3.5) * 0.5;
                ctx.strokeStyle = ch.palette.accent;
                ctx.shadowColor = ch.palette.accent;
                ctx.shadowBlur = 6 + pulse * 10;
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = CLR.BORDER;
                ctx.lineWidth = 1;
            }
            ctx.stroke();
            ctx.restore();

            // portrait
            const portrait = SpriteGenerator.generatePortrait(ch, 52);
            ctx.drawImage(portrait, x + (CELL - 52) / 2, y + 4);

            // name
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = sel ? CLR.TEXT_HI : CLR.TEXT_MID;
            ctx.font = 'bold 8px ' + FNT;
            ctx.fillText(ch.name, x + CELL / 2, y + 58);

            // accent bar
            if (sel) {
                ctx.fillStyle = ch.palette.accent;
                ctx.shadowColor = ch.palette.accent;
                ctx.shadowBlur = 4;
            } else {
                ctx.fillStyle = CLR.BORDER;
            }
            ctx.fillRect(x + CELL / 2 - 12, y + 70, 24, 2);
            ctx.shadowBlur = 0;
            ctx.fill();

            // locked overlay when ready
            if (this.#ready && i !== this.#selectedIndex) {
                ctx.save();
                roundRect(ctx, x, y, CELL, CELL, 6);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fill();
                ctx.restore();
            }
        }
    }

    /* ======================= DETAIL PANEL ======================= */

    #drawSelectedDetail(ctx) {
        const ch = CHARACTERS[this.#selectedIndex];
        const px = PANEL_X, py = PANEL_Y, pw = PANEL_W, ph = PANEL_H;

        // panel background
        ctx.save();
        roundRect(ctx, px, py, pw, ph, 8);
        ctx.fillStyle = CLR.CARD_BG;
        ctx.fill();
        ctx.strokeStyle = ch.palette.accent;
        ctx.shadowColor = ch.palette.accent;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // top accent bar
        ctx.save();
        roundRect(ctx, px + 10, py + 1, pw - 20, 3, 1);
        ctx.fillStyle = ch.palette.accent;
        ctx.shadowColor = ch.palette.accent;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.restore();

        // -- LEFT: portrait + info --
        const portrait = SpriteGenerator.generatePortrait(ch, 52);
        ctx.drawImage(portrait, px + 12, py + 14);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.fillStyle = CLR.TEXT_HI;
        ctx.font = 'bold 13px ' + FNT;
        ctx.fillText(ch.name, px + 64, py + 12);

        ctx.fillStyle = ch.palette.accent;
        ctx.font = '10px ' + FNT;
        ctx.fillText(ch.title, px + 64, py + 29);

        ctx.fillStyle = CLR.TEXT_MID;
        ctx.font = '9px ' + FNT;
        ctx.fillText(ch.description, px + 64, py + 46);

        if (ch.superShot) {
            ctx.fillStyle = ch.superShot.color ?? ch.palette.accent;
            ctx.font = 'bold 8px ' + FNT;
            ctx.fillText('\u26A1 ' + ch.superShot.name, px + 64, py + 60);
        }

        // -- RIGHT: stat bars --
        const stats = [
            { label: 'STR', val: ch.strength, color: CLR.RED },
            { label: 'SPD', val: ch.speed,    color: CLR.GREEN },
            { label: 'SPN', val: ch.spin,     color: CLR.ACCENT },
        ];

        const barStartX = px + 210;
        const barLabelX = px + 196;
        const barW = pw - 232;
        const barH = 8;

        for (let i = 0; i < stats.length; i++) {
            const sy = py + 20 + i * 22;

            ctx.fillStyle = CLR.TEXT_MID;
            ctx.font = 'bold 9px ' + FNT;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(stats[i].label, barLabelX, sy);

            // track
            roundRect(ctx, barStartX, sy - barH / 2, barW, barH, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fill();

            // fill
            const fill = (stats[i].val / 10) * barW;
            if (fill > 0) {
                ctx.save();
                roundRect(ctx, barStartX, sy - barH / 2, Math.max(fill, 6), barH, 3);
                ctx.fillStyle = stats[i].color;
                ctx.fill();
                if (fill > 8) {
                    ctx.globalAlpha = 0.35;
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(barStartX + fill - 3, sy - barH / 2 + 1, 3, barH - 2);
                    ctx.globalAlpha = 1;
                }
                ctx.restore();
            }

            ctx.fillStyle = CLR.TEXT_LO;
            ctx.font = 'bold 8px ' + FNT;
            ctx.textAlign = 'right';
            ctx.fillText(String(stats[i].val), px + pw - 12, sy);
        }
    }

    /* ======================= STATUS ======================= */

    #drawStatus(ctx) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (this.#ready && this.#opponentReady) {
            ctx.fillStyle = CLR.GREEN;
            ctx.font = 'bold 11px ' + FONT_FAMILY;
            ctx.fillText('STARTING MATCH...', DESIGN_WIDTH / 2, STATUS_Y);
        } else if (this.#ready) {
            const dots = '.'.repeat(Math.floor(this.#phase * 2) % 4);
            ctx.fillStyle = CLR.ACCENT;
            ctx.font = '9px ' + FONT_FAMILY;
            ctx.fillText('READY! WAITING FOR OPPONENT' + dots, DESIGN_WIDTH / 2, STATUS_Y);
        } else if (this.#opponentReady) {
            ctx.fillStyle = CLR.PINK;
            ctx.font = '9px ' + FONT_FAMILY;
            ctx.fillText('OPPONENT IS READY!', DESIGN_WIDTH / 2, STATUS_Y);
        }
    }

    /* ======================= ROOM INFO ======================= */

    #drawRoomInfo(ctx) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const d = this.#roomData;
        const stageName = d.stage?.name ?? 'CLASSIC';

        ctx.fillStyle = CLR.TEXT_LO;
        ctx.font = '7px ' + FNT;
        ctx.fillText('FIRST TO ' + (d.roundsToWin ?? 3) + '  \u2022  ' + stageName, DESIGN_WIDTH / 2, INFO_Y);

        if (d.betAmount > 0) {
            ctx.fillStyle = CLR.GOLD;
            ctx.font = '7px ' + FNT;
            ctx.fillText('BET: ' + d.betAmount + ' COINS', DESIGN_WIDTH / 2, INFO_Y + 14);
        }
    }

    /* ======================= BUTTONS ======================= */

    #setupButtons() {
        const buttons = [];

        // Character grid hitboxes
        for (let i = 0; i < CHARACTERS.length; i++) {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            buttons.push({
                x: GRID_LEFT + col * (CELL + GAP),
                y: GRID_TOP + row * (CELL + GAP),
                w: CELL, h: CELL,
                label: '', action: 'char_' + i,
                color: 'transparent',
            });
        }

        // READY button
        buttons.push({
            x: 40, y: READY_Y, w: DESIGN_WIDTH - 80, h: 46,
            label: 'READY!', action: 'doReady',
            color: CLR.GREEN, fontSize: 15,
        });

        // BACK button
        buttons.push({
            x: 60, y: BACK_Y, w: DESIGN_WIDTH - 120, h: 36,
            label: 'BACK', action: 'goBack',
            color: CLR.TEXT_MID, fontSize: 10,
        });

        this._game.ui.setButtons(buttons);

        for (let i = 0; i < CHARACTERS.length; i++) {
            this._game.ui.on(`char_${i}`, () => {
                if (!this.#ready) {
                    this.#selectedIndex = i;
                    this._game.sound.playCharacterSelect();
                }
            });
        }

        this._game.ui.on('doReady', () => this.#onReady());
        this._game.ui.on('goBack', () => {
            if (this.#ready) return;    // can't back out once ready
            this._game.network.disconnect();
            this._game.fsm.transition('menu');
        });
    }

    /* ======================= READY ======================= */

    async #onReady() {
        if (this.#ready) return;

        // Spend coins when committing to the match
        const betAmount = this.#roomData?.betAmount ?? 0;
        if (betAmount > 0) {
            const spent = await this._game.platform.spendCoins(betAmount, 'Pong multiplayer bet');
            if (!spent) {
                // Not enough coins — disconnect and go back
                this._game.network.disconnect();
                this._game.fsm.transition('menu');
                return;
            }
        }

        this.#ready = true;

        // Send character choice to server FIRST, then play sound
        this._game.network.send({
            type: 'charSelected',
            characterId: CHARACTERS[this.#selectedIndex].id,
        });
        this._game.sound.playConfirm();
    }

    /* ======================= NETWORK ======================= */

    #wireNetwork() {
        // Opponent picked their character and is ready
        this._game.network.on('opponentReady', (_data) => {
            this.#opponentReady = true;
        });

        // Server says both are ready — start the match
        this._game.network.on('bothReady', (data) => {
            this.#opponentReady = true;
            this.#opponentCharId = data.opponentCharId;

            const d = this.#roomData;
            const stage = d.stage ?? null;

            // Small delay so "STARTING MATCH..." shows
            setTimeout(() => {
                this._game.fsm.transition('countdown', {
                    mode: 'multi',
                    playerCharId: CHARACTERS[this.#selectedIndex].id,
                    opponentCharId: this.#opponentCharId,
                    roundsToWin: d.roundsToWin,
                    betAmount: d.betAmount,
                    theme: stage?.theme ?? null,
                    obstacles: stage?.obstacles ?? [],
                    opponentName: d.opponentName ?? 'Opponent',
                    stageName: stage?.name ?? 'CLASSIC',
                });
            }, 600);
        });

        // Opponent disconnected
        this._game.network.on('opponentLeft', () => {
            // Refund bet only if we already clicked READY (coins were spent)
            const betAmount = this.#roomData?.betAmount ?? 0;
            if (betAmount > 0 && this.#ready) {
                this._game.platform.awardCoins(betAmount, 'Pong bet refund - opponent left');
            }
            this._game.network.disconnect();
            this._game.fsm.transition('menu');
        });
    }
}

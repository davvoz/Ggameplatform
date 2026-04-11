import { State } from './State.js';
import {
    DESIGN_WIDTH, DESIGN_HEIGHT,
     FONT_FAMILY, UI_FONT, ROUNDS_TO_WIN_OPTIONS,
} from '../config/Constants.js';
import { CHARACTERS } from '../characters/CharacterData.js';
import { SpriteGenerator } from '../characters/SpriteGenerator.js';
import { getStoryLevel, VS_STAGES } from '../story/StoryModeConfig.js';

/* ---- fonts ---- */
const FNT_PIXEL = FONT_FAMILY;
const FNT_CLEAN = UI_FONT;

/* ---- refined palette ---- */
const CLR = {
    BG:        '#050510',
    CARD_BG:   'rgba(12,8,30,0.85)',
    CARD_SEL:  'rgba(191,90,242,0.10)',
    BORDER:    'rgba(60,50,100,0.40)',
    ACCENT:    '#bf5af2',
    ACCENT_LO: 'rgba(191,90,242,0.25)',
    TEXT_HI:   '#f0f0ff',
    TEXT_MID:  '#8888aa',
    TEXT_LO:   '#555570',
    GREEN:     '#39ff14',
    YELLOW:    '#ffe600',
    RED:       '#ff2d78',
    GOLD:      '#ffd700',
    DIVIDER:   'rgba(100,80,160,0.25)',
};

/* ---- layout: grid CENTERED, detail panel BELOW ---- */
const CELL      = 78;
const COLS      = 3;
const GAP       = 6;
const GRID_W    = COLS * CELL + (COLS - 1) * GAP;
const GRID_LEFT = Math.floor((DESIGN_WIDTH - GRID_W) / 2);
const GRID_TOP  = 48;
const GRID_BOT  = GRID_TOP + 2 * CELL + GAP;

const PANEL_X   = 16;
const PANEL_Y   = GRID_BOT + 10;
const PANEL_W   = DESIGN_WIDTH - 32;
const PANEL_H   = 74;

const DIFF_Y    = PANEL_Y + PANEL_H + 14;
const ROUNDS_Y  = DIFF_Y + 54;
const STAGE_Y   = ROUNDS_Y + 54;
const FIGHT_Y   = STAGE_Y + 100;
const BACK_Y    = FIGHT_Y + 54;

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

export class CharacterSelectState extends State {
    #selectedIndex = 0;
    #phase = 0;
    #mode = 'cpu';
    #aiDifficulty = 'MEDIUM';
    #roundsToWin = 3;
    #betAmount = 0;
    #selectedStage = 0;          // index into VS_STAGES

    #multiData = null;   // store multiplayer data from lobby

    enter(data) {
        this.#mode = data?.mode ?? 'cpu';
        this.#selectedIndex = 0;
        this.#phase = 0;
        this.#aiDifficulty = 'MEDIUM';
        this.#roundsToWin = data?.roundsToWin ?? 3;
        this.#betAmount = data?.betAmount ?? 0;
        this.#selectedStage = 0;
        this.#multiData = data?.mode === 'multi' ? data : null;
        this.#setupButtons();
    }

    exit() { this._game.ui.clearButtons(); }

    update(dt) { this.#phase += dt / 1000; }

    /* ==================== DRAW ==================== */

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
        ctx.fillStyle = CLR.ACCENT;
        ctx.shadowColor = CLR.ACCENT;
        ctx.shadowBlur = 10;
        ctx.font = 'bold 14px ' + FNT_PIXEL;
        ctx.fillText('SELECT FIGHTER', w / 2, 28);
        ctx.restore();

        // divider
        ctx.strokeStyle = CLR.DIVIDER;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(30, 42); ctx.lineTo(w - 30, 42); ctx.stroke();

        this.#drawCharacterGrid(ctx);
        this.#drawSelectedDetail(ctx);

        // divider above options
        ctx.strokeStyle = CLR.DIVIDER;
        ctx.beginPath(); ctx.moveTo(30, DIFF_Y - 10); ctx.lineTo(w - 30, DIFF_Y - 10); ctx.stroke();

        if (this.#mode === 'cpu') this.#drawDifficultySelector(ctx);
        if (this.#mode !== 'story') this.#drawRoundsSelector(ctx);
        if (this.#mode !== 'story') this.#drawStageSelector(ctx);

        if (this.#mode === 'story') {
            ctx.fillStyle = CLR.ACCENT;
            ctx.font = 'bold 11px ' + FNT_CLEAN;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('STORY MODE — CHOOSE YOUR FIGHTER', w / 2, DIFF_Y + 10);
            ctx.fillStyle = CLR.TEXT_MID;
            ctx.font = '9px ' + FNT_CLEAN;
            ctx.fillText('Battle all 6 opponents in sequence!', w / 2, DIFF_Y + 30);
        }

        this._game.ui.drawButtons(ctx);

        // scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.025)';
        for (let i = 0; i < h; i += 3) ctx.fillRect(0, i, w, 1);
    }

    /* ==================== GRID (centered) ==================== */

    #drawCharacterGrid(ctx) {
        for (let i = 0; i < CHARACTERS.length; i++) {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = GRID_LEFT + col * (CELL + GAP);
            const y = GRID_TOP + row * (CELL + GAP);
            const sel = i === this.#selectedIndex;
            const ch = CHARACTERS[i];
            const cut = 8; // angular corner cut

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
            ctx.font = 'bold 8px ' + FNT_CLEAN;
            ctx.fillText(ch.name, x + CELL / 2, y + 58);

            // accent bar (angular)
            if (sel) {
                ctx.fillStyle = ch.palette.accent;
                ctx.shadowColor = ch.palette.accent;
                ctx.shadowBlur = 4;
            } else {
                ctx.fillStyle = CLR.BORDER;
            }
            ctx.fillRect(x + CELL / 2 - 12, y + 70, 24, 2);
            ctx.shadowBlur = 0;
        }
    }

    /* ==================== DETAIL PANEL (full-width, below grid) ==================== */

    #drawSelectedDetail(ctx) {
        const ch = CHARACTERS[this.#selectedIndex];
        const px = PANEL_X, py = PANEL_Y, pw = PANEL_W, ph = PANEL_H;

        // panel bg
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

        // -- LEFT SIDE: portrait + info --
        const portrait = SpriteGenerator.generatePortrait(ch, 52);
        ctx.drawImage(portrait, px + 12, py + 14);

        // name
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = CLR.TEXT_HI;
        ctx.font = 'bold 13px ' + FNT_CLEAN;
        ctx.fillText(ch.name, px + 64, py + 12);

        // title
        ctx.fillStyle = ch.palette.accent;
        ctx.font = '10px ' + FNT_CLEAN;
        ctx.fillText(ch.title, px + 64, py + 29);

        // description
        ctx.fillStyle = CLR.TEXT_MID;
        ctx.font = '9px ' + FNT_CLEAN;
        ctx.fillText(ch.description, px + 64, py + 46);

        // super shot name
        if (ch.superShot) {
            ctx.fillStyle = ch.superShot.color ?? ch.palette.accent;
            ctx.font = 'bold 8px ' + FNT_CLEAN;
            ctx.fillText('\u26A1 ' + ch.superShot.name, px + 64, py + 60);
        }

        // -- RIGHT SIDE: stat bars --
        const stats = [
            { label: 'STR', val: ch.strength, color: CLR.RED },
            { label: 'SPD', val: ch.speed,    color: CLR.GREEN },
            { label: 'SPN', val: ch.spin,     color: CLR.ACCENT },
        ];

        const barStartX = px + 210;
        const barLabelX = px + 196;
        const barW = pw - 232;           // ~128px
        const barH = 8;

        for (let i = 0; i < stats.length; i++) {
            const sy = py + 20 + i * 22;

            // label
            ctx.fillStyle = CLR.TEXT_MID;
            ctx.font = 'bold 9px ' + FNT_CLEAN;
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

            // value
            ctx.fillStyle = CLR.TEXT_LO;
            ctx.font = 'bold 8px ' + FNT_CLEAN;
            ctx.textAlign = 'right';
            ctx.fillText(String(stats[i].val), px + pw - 12, sy);
        }
    }

    /* ==================== DIFFICULTY ==================== */

    #drawDifficultySelector(ctx) {
        const y = DIFF_Y;
        ctx.fillStyle = CLR.TEXT_MID;
        ctx.font = 'bold 10px ' + FNT_CLEAN;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('DIFFICULTY', DESIGN_WIDTH / 2, y);

        const diffs = ['EASY', 'MEDIUM', 'HARD'];
        const diffColors = [CLR.GREEN, CLR.YELLOW, CLR.RED];
        const btnW = 100;
        const btnH = 28;
        const spacing = 10;
        const totalW = diffs.length * btnW + (diffs.length - 1) * spacing;
        const startX = (DESIGN_WIDTH - totalW) / 2;

        for (let i = 0; i < diffs.length; i++) {
            const bx = startX + i * (btnW + spacing);
            const by = y + 18;
            const sel = diffs[i] === this.#aiDifficulty;

            ctx.save();
            roundRect(ctx, bx, by, btnW, btnH, 5);
            ctx.fillStyle = sel ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.015)';
            ctx.fill();
            ctx.strokeStyle = sel ? diffColors[i] : CLR.BORDER;
            ctx.lineWidth = sel ? 2 : 1;
            if (sel) { ctx.shadowColor = diffColors[i]; ctx.shadowBlur = 6; }
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = sel ? diffColors[i] : CLR.TEXT_LO;
            ctx.font = (sel ? 'bold 10px ' : '9px ') + FNT_CLEAN;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(diffs[i], bx + btnW / 2, by + btnH / 2);
        }
    }

    /* ==================== ROUNDS ==================== */

    #drawRoundsSelector(ctx) {
        const shift = this.#mode === 'cpu' ? 0 : -(ROUNDS_Y - DIFF_Y);
        const y = ROUNDS_Y + shift;

        ctx.fillStyle = CLR.TEXT_MID;
        ctx.font = 'bold 10px ' + FNT_CLEAN;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('FIRST TO', DESIGN_WIDTH / 2, y);

        const opts = ROUNDS_TO_WIN_OPTIONS;
        const btnW = 40;
        const btnH = 28;
        const spacing = 6;
        const totalW = opts.length * btnW + (opts.length - 1) * spacing;
        const startX = (DESIGN_WIDTH - totalW) / 2;
        const by = y + 18;

        for (let i = 0; i < opts.length; i++) {
            const bx = startX + i * (btnW + spacing);
            const sel = opts[i] === this.#roundsToWin;

            ctx.save();
            roundRect(ctx, bx, by, btnW, btnH, 5);
            ctx.fillStyle = sel ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.015)';
            ctx.fill();
            ctx.strokeStyle = sel ? CLR.ACCENT : CLR.BORDER;
            ctx.lineWidth = sel ? 2 : 1;
            if (sel) { ctx.shadowColor = CLR.ACCENT; ctx.shadowBlur = 6; }
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = sel ? CLR.ACCENT : CLR.TEXT_LO;
            ctx.font = (sel ? 'bold 11px ' : '10px ') + FNT_CLEAN;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(opts[i]), bx + btnW / 2, by + btnH / 2);
        }
    }

    /* ==================== STAGE SELECTOR ==================== */

    #drawStageSelector(ctx) {
        const shift = this.#mode === 'cpu' ? 0 : -(ROUNDS_Y - DIFF_Y);
        const y = STAGE_Y + shift;

        ctx.fillStyle = CLR.TEXT_MID;
        ctx.font = 'bold 10px ' + FNT_CLEAN;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('STAGE', DESIGN_WIDTH / 2, y);

        const stages = VS_STAGES;
        const cols = 4;
        const btnW = 88;
        const btnH = 30;
        const spacingX = 6;
        const spacingY = 6;
        const by = y + 18;

        for (let idx = 0; idx < stages.length; idx++) {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const itemsInRow = Math.min(cols, stages.length - row * cols);
            const rowW = itemsInRow * btnW + (itemsInRow - 1) * spacingX;
            const rowStartX = (DESIGN_WIDTH - rowW) / 2;
            const bx = rowStartX + col * (btnW + spacingX);
            const ry = by + row * (btnH + spacingY);
            const sel = idx === this.#selectedStage;
            const stage = stages[idx];
            const accent = stage.theme?.accent ?? CLR.ACCENT;

            // button background + accent border
            ctx.save();
            roundRect(ctx, bx, ry, btnW, btnH, 5);
            ctx.fillStyle = sel ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)';
            ctx.fill();
            if (sel) {
                ctx.strokeStyle = accent;
                ctx.lineWidth = 2;
                ctx.shadowColor = accent;
                ctx.shadowBlur = 8;
            } else {
                ctx.strokeStyle = accent;
                ctx.globalAlpha = 0.35;
                ctx.lineWidth = 1;
            }
            ctx.stroke();
            ctx.restore();

            // label — centered in full button
            ctx.fillStyle = sel ? accent : CLR.TEXT_MID;
            ctx.font = (sel ? 'bold 9px ' : '8px ') + FNT_CLEAN;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(stage.name, bx + btnW / 2, ry + btnH / 2);
        }
    }

    /* ==================== BUTTON SETUP ==================== */

    #createCharacterButtons() {
        const characterButtons = [];
        for (let i = 0; i < CHARACTERS.length; i++) {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            characterButtons.push({
                x: GRID_LEFT + col * (CELL + GAP),
                y: GRID_TOP + row * (CELL + GAP),
                w: CELL, h: CELL,
                label: '', action: 'selectChar_' + i,
                color: 'transparent',
            });
        }
        return characterButtons;
    }

    #createDifficultyButtons() {
        const buttons = [];
        if (this.#mode !== 'cpu') return buttons;

        const diffs = ['EASY', 'MEDIUM', 'HARD'];
        const btnW = 100;
        const spacing = 10;
        const totalW = diffs.length * btnW + (diffs.length - 1) * spacing;
        const startX = (DESIGN_WIDTH - totalW) / 2;
        const by = DIFF_Y + 18;
        for (let i = 0; i < diffs.length; i++) {
            buttons.push({
                x: startX + i * (btnW + spacing),
                y: by, w: btnW, h: 28,
                label: '', action: 'diff_' + diffs[i],
                color: 'transparent',
            });
        }
        return buttons;
    }

    #createRoundsButtons() {
        const buttons = [];
        if (this.#mode === 'story') return buttons;

        const opts = ROUNDS_TO_WIN_OPTIONS;
        const btnW = 40;
        const spacing = 6;
        const totalW = opts.length * btnW + (opts.length - 1) * spacing;
        const startX = (DESIGN_WIDTH - totalW) / 2;
        const ry = (this.#mode === 'cpu' ? ROUNDS_Y : DIFF_Y) + 18;
        for (let i = 0; i < opts.length; i++) {
            buttons.push({
                x: startX + i * (btnW + spacing),
                y: ry, w: btnW, h: 28,
                label: '', action: 'rounds_' + opts[i],
                color: 'transparent',
            });
        }
        return buttons;
    }

    #createStageButtons() {
        const buttons = [];
        if (this.#mode === 'story') return buttons;

        const stages = VS_STAGES;
        const cols = 4;
        const btnW = 88;
        const btnH = 30;
        const spacingX = 6;
        const spacingY = 6;
        const shift = this.#mode === 'cpu' ? 0 : -(ROUNDS_Y - DIFF_Y);
        const by = STAGE_Y + shift + 18;
        for (let idx = 0; idx < stages.length; idx++) {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const itemsInRow = Math.min(cols, stages.length - row * cols);
            const rowW = itemsInRow * btnW + (itemsInRow - 1) * spacingX;
            const rowStartX = (DESIGN_WIDTH - rowW) / 2;
            buttons.push({
                x: rowStartX + col * (btnW + spacingX),
                y: by + row * (btnH + spacingY),
                w: btnW, h: btnH,
                label: '', action: 'stage_' + idx,
                color: 'transparent',
            });
        }
        return buttons;
    }

    #createActionButtons() {
        const fightLabel = this.#mode === 'story' ? 'BEGIN STORY' : 'FIGHT!';
        return [
            {
                x: 40, y: FIGHT_Y, w: DESIGN_WIDTH - 80, h: 46,
                label: fightLabel, action: 'confirmCharacter',
                color: CLR.GREEN, fontSize: 15,
            },
            {
                x: 60, y: BACK_Y, w: DESIGN_WIDTH - 120, h: 36,
                label: 'BACK', action: 'backToMenu',
                color: CLR.TEXT_MID, fontSize: 10,
            }
        ];
    }

    #registerEventHandlers() {
        for (let i = 0; i < CHARACTERS.length; i++) {
            this._game.ui.on('selectChar_' + i, () => {
                this.#selectedIndex = i;
                this._game.sound.playCharacterSelect();
            });
        }

        this._game.ui.on('diff_EASY',   () => { this.#aiDifficulty = 'EASY'; });
        this._game.ui.on('diff_MEDIUM',  () => { this.#aiDifficulty = 'MEDIUM'; });
        this._game.ui.on('diff_HARD',    () => { this.#aiDifficulty = 'HARD'; });

        for (const val of ROUNDS_TO_WIN_OPTIONS) {
            this._game.ui.on('rounds_' + val, () => {
                this.#roundsToWin = val;
            });
        }

        for (let si = 0; si < VS_STAGES.length; si++) {
            this._game.ui.on('stage_' + si, () => {
                this.#selectedStage = si;
            });
        }

        this._game.ui.on('confirmCharacter', () => this.#handleConfirmCharacter());
        this._game.ui.on('backToMenu', () => {
            this._game.fsm.transition('menu');
        });
    }

    #handleConfirmCharacter() {
        this._game.sound.playConfirm();

        if (this.#mode === 'story') {
            this._game.storyPlayerCharId = CHARACTERS[this.#selectedIndex].id;
            this._game.storyLevel = 1;
            const firstLevel = getStoryLevel(1);
            this._game.fsm.transition('storyIntro', { level: firstLevel });
            return;
        }

        const transitionData = {
            mode: this.#mode,
            playerCharId: CHARACTERS[this.#selectedIndex].id,
            aiDifficulty: this.#aiDifficulty,
            roundsToWin: this.#roundsToWin,
            betAmount: this.#betAmount,
            theme: VS_STAGES[this.#selectedStage].theme,
            obstacles: VS_STAGES[this.#selectedStage].obstacles,
        };
        if (this.#multiData) {
            transitionData.opponentCharId = this.#multiData.opponentCharId;
        }
        this._game.fsm.transition('countdown', transitionData);
    }

    #setupButtons() {
        const characterButtons = this.#createCharacterButtons();
        const difficultyButtons = this.#createDifficultyButtons();
        const roundsButtons = this.#createRoundsButtons();
        const stageButtons = this.#createStageButtons();
        const actionButtons = this.#createActionButtons();

        const buttons = [
            ...characterButtons,
            ...difficultyButtons,
            ...roundsButtons,
            ...stageButtons,
            ...actionButtons,
        ];

        this._game.ui.setButtons(buttons);
        this.#registerEventHandlers();
    }
}

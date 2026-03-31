import { State } from './State.js';
import {
    DESIGN_WIDTH, DESIGN_HEIGHT,
    FONT_FAMILY, UI_FONT, DEFAULT_ROUNDS_TO_WIN,
    ROUNDS_TO_WIN_OPTIONS,
} from '../config/Constants.js';
import { VS_STAGES } from '../story/StoryModeConfig.js';

/* ---- fonts ---- */
const FNT = UI_FONT;

/* ---- palette ---- */
const CLR = {
    BG:       '#050510',
    CARD_SEL: 'rgba(191,90,242,0.08)',
    CARD_LO:  'rgba(255,255,255,0.015)',
    BORDER:   'rgba(60,50,100,0.40)',
    ACCENT:   '#bf5af2',
    TEXT_HI:  '#f0f0ff',
    TEXT_MID: '#8888aa',
    TEXT_LO:  '#555570',
    GREEN:    '#39ff14',
    GOLD:     '#ffd700',
    RED:      '#ff2d78',
    DIVIDER:  'rgba(100,80,160,0.25)',
};

/**
 * Multiplayer lobby state � create/join rooms.
 * Creator configures: rounds, bet, stage.
 * Joiner enters the 4-char room code.
 * Once both are connected -> transition to multiCharSelect.
 */
export class LobbyState extends State {
    #subState = 'choice';
    #roomCode = '';
    #betAmount = 0;
    #roundsToWin = DEFAULT_ROUNDS_TO_WIN;
    #selectedStage = 0;
    #waitingText = '';
    #errorMessage = '';
    #errorTimer = 0;
    #phase = 0;

    enter() {
        this.#subState = 'choice';
        this.#roomCode = '';
        this.#errorMessage = '';
        this.#phase = 0;
        this.#betAmount = 0;
        this.#roundsToWin = DEFAULT_ROUNDS_TO_WIN;
        this.#selectedStage = 0;
        this.#setupChoiceButtons();
    }

    exit() {
        this._game.ui.clearButtons();
    }

    update(dt) {
        this.#phase += dt / 1000;
        if (this.#errorTimer > 0) {
            this.#errorTimer -= dt;
            if (this.#errorTimer <= 0) this.#errorMessage = '';
        }
    }

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

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = CLR.ACCENT;
        ctx.shadowColor = CLR.ACCENT;
        ctx.shadowBlur = 10;
        ctx.font = `bold 14px ${FONT_FAMILY}`;
        ctx.fillText('MULTIPLAYER', w / 2, 28);
        ctx.shadowBlur = 0;
        ctx.restore();

        // divider
        ctx.strokeStyle = CLR.DIVIDER;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(30, 42); ctx.lineTo(w - 30, 42); ctx.stroke();

        ctx.save();
        ctx.textAlign = 'center';

        switch (this.#subState) {
            case 'choice':  this.#drawChoice(ctx);     break;
            case 'create':  this.#drawCreateRoom(ctx); break;
            case 'join':    this.#drawJoinRoom(ctx);   break;
            case 'waiting': this.#drawWaiting(ctx);    break;
        }

        if (this.#errorMessage) {
            ctx.fillStyle = CLR.RED;
            ctx.font = `7px ${FONT_FAMILY}`;
            ctx.fillText(this.#errorMessage, w / 2, h - 60);
        }

        ctx.restore();
        this._game.ui.drawButtons(ctx);

        // scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.025)';
        for (let i = 0; i < h; i += 3) ctx.fillRect(0, i, w, 1);
    }

    showError(msg) {
        this.#errorMessage = msg;
        this.#errorTimer = 3000;
    }

    /* ====================== DRAWING ====================== */

    #drawChoice(ctx) {
        ctx.fillStyle = CLR.TEXT_MID;
        ctx.font = `bold 10px ${FNT}`;
        ctx.fillText('SELECT MODE', DESIGN_WIDTH / 2, 120);
    }

    #drawCreateRoom(ctx) {
        const w = DESIGN_WIDTH;

        // --- BET ---
        const betY = 80;
        ctx.fillStyle = CLR.TEXT_MID;
        ctx.font = `bold 10px ${FNT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('BET', w / 2, betY);

        ctx.fillStyle = CLR.GOLD;
        ctx.font = `bold 14px ${FNT}`;
        ctx.fillText(`${this.#betAmount} COINS`, w / 2, betY + 22);

        ctx.fillStyle = CLR.TEXT_LO;
        ctx.font = `7px ${FNT}`;
        ctx.fillText('(0 = JUST FOR FUN)', w / 2, betY + 42);

        // --- FIRST TO ---
        const roundsY = 150;
        ctx.fillStyle = CLR.TEXT_MID;
        ctx.font = `bold 10px ${FNT}`;
        ctx.fillText('FIRST TO', w / 2, roundsY);

        const opts = ROUNDS_TO_WIN_OPTIONS;
        const rBtnW = 40, rBtnH = 28, rSpace = 6;
        const rTotalW = opts.length * rBtnW + (opts.length - 1) * rSpace;
        const rStartX = (w - rTotalW) / 2;
        const rBy = roundsY + 18;

        for (let i = 0; i < opts.length; i++) {
            const bx = rStartX + i * (rBtnW + rSpace);
            const sel = opts[i] === this.#roundsToWin;

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(bx, rBy, rBtnW, rBtnH, 5);
            ctx.fillStyle = sel ? CLR.CARD_SEL : CLR.CARD_LO;
            ctx.fill();
            ctx.strokeStyle = sel ? CLR.ACCENT : CLR.BORDER;
            ctx.lineWidth = sel ? 2 : 1;
            if (sel) { ctx.shadowColor = CLR.ACCENT; ctx.shadowBlur = 6; }
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = sel ? CLR.ACCENT : CLR.TEXT_LO;
            ctx.font = (sel ? 'bold 11px ' : '10px ') + FNT;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(opts[i]), bx + rBtnW / 2, rBy + rBtnH / 2);
        }

        // --- STAGE ---
        const stageY = 220;
        ctx.fillStyle = CLR.TEXT_MID;
        ctx.font = `bold 10px ${FNT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('STAGE', w / 2, stageY);

        const stages = VS_STAGES;
        const cols = 4;
        const sBtnW = 88, sBtnH = 30, sSpX = 6, sSpY = 6;
        const sby = stageY + 18;

        for (let idx = 0; idx < stages.length; idx++) {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const itemsInRow = Math.min(cols, stages.length - row * cols);
            const rowW = itemsInRow * sBtnW + (itemsInRow - 1) * sSpX;
            const rowStartX = (w - rowW) / 2;
            const bx = rowStartX + col * (sBtnW + sSpX);
            const ry = sby + row * (sBtnH + sSpY);
            const sel = idx === this.#selectedStage;
            const stage = stages[idx];
            const accent = stage.theme?.accent ?? CLR.ACCENT;

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(bx, ry, sBtnW, sBtnH, 5);
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

            ctx.fillStyle = sel ? accent : CLR.TEXT_MID;
            ctx.font = (sel ? 'bold 9px ' : '8px ') + FNT;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(stage.name, bx + sBtnW / 2, ry + sBtnH / 2);
        }
    }

    #drawJoinRoom(ctx) {
        const w = DESIGN_WIDTH;

        ctx.fillStyle = CLR.TEXT_MID;
        ctx.font = `bold 10px ${FNT}`;
        ctx.fillText('JOIN ROOM', w / 2, 80);

        ctx.fillStyle = CLR.ACCENT;
        ctx.font = `24px ${FONT_FAMILY}`;
        ctx.fillText(this.#roomCode.padEnd(4, '_'), w / 2, 160);

        ctx.fillStyle = CLR.TEXT_LO;
        ctx.font = `7px ${FNT}`;
        ctx.fillText('ENTER 4-DIGIT ROOM CODE', w / 2, 190);
    }

    #drawWaiting(ctx) {
        const w = DESIGN_WIDTH;

        ctx.fillStyle = CLR.ACCENT;
        ctx.font = `24px ${FONT_FAMILY}`;
        ctx.fillText(this.#roomCode, w / 2, 150);

        ctx.fillStyle = CLR.TEXT_LO;
        ctx.font = `7px ${FNT}`;
        ctx.fillText('ROOM CODE \u2014 SHARE WITH YOUR FRIEND', w / 2, 170);

        const dots = '.'.repeat(Math.floor(this.#phase * 2) % 4);
        ctx.fillStyle = '#e879f9';
        ctx.font = `9px ${FONT_FAMILY}`;
        ctx.fillText(`WAITING FOR OPPONENT${dots}`, w / 2, 240);

        const stage = VS_STAGES[this.#selectedStage];
        ctx.fillStyle = CLR.TEXT_LO;
        ctx.font = `7px ${FNT}`;
        ctx.fillText(`FIRST TO ${this.#roundsToWin}  \u2022  ${stage.name}`, w / 2, 280);
        if (this.#betAmount > 0) {
            ctx.fillStyle = CLR.GOLD;
            ctx.font = `8px ${FNT}`;
            ctx.fillText(`BET: ${this.#betAmount} COINS`, w / 2, 310);
        }
    }

    /* ====================== BUTTON SETUPS ====================== */

    #setupChoiceButtons() {
        this._game.ui.setButtons([
            { x: 40, y: 160, w: DESIGN_WIDTH - 80, h: 50, label: 'CREATE ROOM', action: 'lobbyCreate', color: CLR.ACCENT, fontSize: 12 },
            { x: 40, y: 230, w: DESIGN_WIDTH - 80, h: 50, label: 'JOIN ROOM',   action: 'lobbyJoin',   color: '#e879f9', fontSize: 12 },
            { x: 60, y: DESIGN_HEIGHT - 56, w: DESIGN_WIDTH - 120, h: 36, label: 'BACK', action: 'backToMenu', color: CLR.TEXT_MID, fontSize: 10 },
        ]);
        this._game.ui.on('lobbyCreate', () => { this.#subState = 'create'; this.#setupCreateButtons(); });
        this._game.ui.on('lobbyJoin',   () => { this.#subState = 'join';   this.#setupJoinButtons(); });
        this._game.ui.on('backToMenu',  () => { this._game.network.disconnect(); this._game.fsm.transition('menu'); });
    }

    #setupCreateButtons() {
        const w = DESIGN_WIDTH;
        const buttons = [];

        // --- BET -/+ ---
        buttons.push({ x: 80,  y: 96, w: 50, h: 30, label: '-', action: 'betMinus', color: CLR.GOLD, fontSize: 14 });
        buttons.push({ x: 270, y: 96, w: 50, h: 30, label: '+', action: 'betPlus',  color: CLR.GOLD, fontSize: 14 });

        // --- ROUNDS preset hitboxes ---
        const opts = ROUNDS_TO_WIN_OPTIONS;
        const rBtnW = 40, rSpace = 6;
        const rTotalW = opts.length * rBtnW + (opts.length - 1) * rSpace;
        const rStartX = (w - rTotalW) / 2;
        const rBy = 150 + 18;
        for (let i = 0; i < opts.length; i++) {
            buttons.push({
                x: rStartX + i * (rBtnW + rSpace),
                y: rBy, w: rBtnW, h: 28,
                label: '', action: 'rounds_' + opts[i],
                color: 'transparent',
            });
        }

        // --- STAGE grid hitboxes ---
        const stages = VS_STAGES;
        const cols = 4;
        const sBtnW = 88, sBtnH = 30, sSpX = 6, sSpY = 6;
        const sby = 220 + 18;
        for (let idx = 0; idx < stages.length; idx++) {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const itemsInRow = Math.min(cols, stages.length - row * cols);
            const rowW = itemsInRow * sBtnW + (itemsInRow - 1) * sSpX;
            const rowStartX = (w - rowW) / 2;
            buttons.push({
                x: rowStartX + col * (sBtnW + sSpX),
                y: sby + row * (sBtnH + sSpY),
                w: sBtnW, h: sBtnH,
                label: '', action: 'stage_' + idx,
                color: 'transparent',
            });
        }

        // --- CREATE ---
        buttons.push({
            x: 40, y: 340, w: w - 80, h: 46,
            label: 'CREATE ROOM', action: 'doCreate',
            color: CLR.GREEN, fontSize: 15,
        });

        // --- BACK ---
        buttons.push({
            x: 60, y: 394, w: w - 120, h: 36,
            label: 'BACK', action: 'lobbyBack',
            color: CLR.TEXT_MID, fontSize: 10,
        });

        this._game.ui.setButtons(buttons);

        this._game.ui.on('betMinus', () => { this.#betAmount = Math.max(0, this.#betAmount - 10); });
        this._game.ui.on('betPlus',  () => { this.#betAmount = Math.min(1000, this.#betAmount + 10); });

        for (const val of opts) {
            this._game.ui.on('rounds_' + val, () => { this.#roundsToWin = val; });
        }

        for (let si = 0; si < stages.length; si++) {
            this._game.ui.on('stage_' + si, () => { this.#selectedStage = si; });
        }

        this._game.ui.on('doCreate',  () => this.#doCreateRoom());
        this._game.ui.on('lobbyBack', () => { this.#subState = 'choice'; this.#setupChoiceButtons(); });
    }

    #setupJoinButtons() {
        const keys = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const buttons = [];
        const cols = 8;
        const sz = 36;
        const sx = (DESIGN_WIDTH - cols * sz) / 2;
        const sy = 240;

        for (let i = 0; i < keys.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            buttons.push({ x: sx + col * sz, y: sy + row * (sz + 4), w: sz - 4, h: sz - 4, label: keys[i], action: `key_${keys[i]}`, color: CLR.ACCENT, fontSize: 10 });
        }
        buttons.push({ x: 60,  y: sy + 5 * (sz + 4), w: 100, h: 32, label: 'DEL',  action: 'keyDel', color: CLR.RED,   fontSize: 9 });
        buttons.push({ x: 200, y: sy + 5 * (sz + 4), w: 140, h: 32, label: 'JOIN',  action: 'doJoin', color: CLR.GREEN, fontSize: 10 });
        buttons.push({ x: 60,  y: DESIGN_HEIGHT - 56, w: DESIGN_WIDTH - 120, h: 36, label: 'BACK', action: 'lobbyBack', color: CLR.TEXT_MID, fontSize: 10 });

        this._game.ui.setButtons(buttons);
        for (const ch of keys) {
            this._game.ui.on(`key_${ch}`, () => { if (this.#roomCode.length < 4) this.#roomCode += ch; });
        }
        this._game.ui.on('keyDel',    () => { this.#roomCode = this.#roomCode.slice(0, -1); });
        this._game.ui.on('doJoin',    () => this.#doJoinRoom());
        this._game.ui.on('lobbyBack', () => { this.#subState = 'choice'; this.#roomCode = ''; this.#setupChoiceButtons(); });
    }

    #setupWaitingButtons() {
        this._game.ui.setButtons([
            { x: 60, y: DESIGN_HEIGHT - 100, w: DESIGN_WIDTH - 120, h: 40, label: 'CANCEL', action: 'lobbyCancel', color: CLR.RED, fontSize: 10 },
        ]);
        this._game.ui.on('lobbyCancel', () => {
            this._game.network.disconnect();
            this.#subState = 'choice';
            this.#roomCode = '';
            this.#setupChoiceButtons();
        });
    }

    /* ====================== NETWORK ====================== */

    async #doCreateRoom() {
        try {
            if (!this._game.network.connected) {
                await this._game.network.connect();
            }
            const stage = VS_STAGES[this.#selectedStage];

            this._game.network.on('roomCreated', (data) => {
                this.#roomCode = data.roomCode;
                this.#subState = 'waiting';
                this.#setupWaitingButtons();
            });

            this._game.network.on('playerJoined', (data) => {
                this._game.isHost = true;
                this._game.isVsCPU = false;
                this._game.fsm.transition('multiCharSelect', {
                    roundsToWin: this.#roundsToWin,
                    betAmount: this.#betAmount,
                    stage,
                    opponentName: data.username,
                });
            });

            this._game.network.send({
                type: 'createRoom',
                username: 'Player',
                betAmount: this.#betAmount,
                roundsToWin: this.#roundsToWin,
                stageId: stage.id,
            });
        } catch (e) {
            this.showError('COULD NOT CONNECT TO SERVER');
        }
    }

    async #doJoinRoom() {
        if (this.#roomCode.length !== 4) {
            this.showError('ENTER A 4-CHARACTER ROOM CODE');
            return;
        }
        try {
            if (!this._game.network.connected) {
                await this._game.network.connect();
            }

            this._game.network.on('joinedRoom', (data) => {
                const stageId = data.stageId ?? 'default';
                const stage = VS_STAGES.find(s => s.id === stageId) ?? VS_STAGES[0];

                this._game.isHost = false;
                this._game.isVsCPU = false;
                this._game.fsm.transition('multiCharSelect', {
                    roundsToWin: data.roundsToWin,
                    betAmount: data.betAmount,
                    stage,
                    opponentName: data.opponentName,
                });
            });

            this._game.network.on('error', (data) => {
                this.showError(data.message || 'ROOM NOT FOUND');
            });

            this._game.network.send({
                type: 'joinRoom',
                roomCode: this.#roomCode,
                username: 'Player',
            });
        } catch (e) {
            this.showError('COULD NOT CONNECT TO SERVER');
        }
    }
}

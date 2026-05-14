import { GameConfig } from '../config/GameConfig.js';
import { UIPainter } from '../ui/UIPainter.js';
import { ModeSelectState } from './ModeSelectState.js';
import { BattleState } from './BattleState.js';
import { SoundEvent } from '../audio/SoundEvent.js';
import { MultiplayerClient } from '../platform/MultiplayerClient.js';

// Charset must match backend ROOM_CODE_CHARS in minion_clash_be/router.py.
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 4;

/**
 * Lobby for 1v1 multiplayer.
 *
 * Phases:
 *   menu      → user picks Create Room or Join Room
 *   hosting   → waiting for guest, displays the 4-char room code
 *   codeEntry → in-canvas keypad to type the room code
 *   joining   → code submitted, waiting for matchStart
 *   matching  → matchStart received, transitioning to BattleState
 *   error     → connection failed
 *
 * Preconditions: heroId and deckIds (10) already in the run context.
 * On matchStart we hand the live MultiplayerClient and the opponent's
 * loadout to BattleState via runContext.mpRoom / runContext.mpClient.
 */
export class MultiplayerLobbyState {
    constructor(game) {
        this._game = game;
        this._client = null;
        this._phase = 'menu';
        this._roomCode = '';
        this._typedCode = '';
        this._statusMsg = '';
        this._tap = null;
        this._menuButtons = [];
        this._keypadButtons = [];
        this._delBtn = null;
        this._goBtn = null;
        this._backBtn = null;
    }

    enter() {
        const cx = GameConfig.VIEW_WIDTH / 2;
        this._backBtn = { id: 'back', label: '◀ BACK', x: 16, y: 16, w: 90, h: 36, enabled: true };
        this._menuButtons = [
            { id: 'host', label: 'CREATE ROOM', subLabel: 'Wait for a friend',
              x: cx - 130, y: 380, w: 260, h: 70, enabled: true },
            { id: 'join', label: 'JOIN ROOM',   subLabel: 'Enter a 4-char code',
              x: cx - 130, y: 470, w: 260, h: 70, enabled: true },
        ];
        this._buildKeypad();
        this._connect();
    }

    _buildKeypad() {
        // 8 cols x 4 rows = 32 keys, matches CODE_CHARSET.
        const cols = 8;
        const rows = 4;
        const kw = 50;
        const kh = 46;
        const gap = 4;
        const totalW = cols * kw + (cols - 1) * gap;
        const x0 = (GameConfig.VIEW_WIDTH - totalW) / 2;
        const y0 = 380;
        this._keypadButtons = [];
        for (let i = 0; i < CODE_CHARSET.length; i++) {
            const r = Math.floor(i / cols);
            const c = i % cols;
            this._keypadButtons.push({
                id: `k_${CODE_CHARSET[i]}`,
                ch: CODE_CHARSET[i],
                label: CODE_CHARSET[i],
                x: x0 + c * (kw + gap),
                y: y0 + r * (kh + gap),
                w: kw, h: kh, enabled: true,
            });
        }
        const cx = GameConfig.VIEW_WIDTH / 2;
        const btnY = y0 + rows * (kh + gap) + 18;
        this._delBtn = { id: 'del', label: 'DEL', x: cx - 140, y: btnY, w: 120, h: 50, enabled: true };
        this._goBtn  = { id: 'go',  label: 'GO',  x: cx + 20,  y: btnY, w: 120, h: 50, enabled: true };
    }

    exit() {
        // Only tear down if we're not handing the client over to BattleState.
        if (this._phase !== 'matching') {
            this._client?.disconnect();
            this._client = null;
        }
    }

    async _connect() {
        const url = this._game.platform._wsBase() + '/ws/minion-clash';
        this._client = new MultiplayerClient();
        this._client.on('roomCreated', (m) => this._onRoomCreated(m));
        this._client.on('matchStart', (m) => this._onMatchStart(m));
        this._client.on('error', (m) => {
            this._statusMsg = m?.message ?? 'connection error';
            this._phase = 'menu';
        });
        this._client.on('opponentDisconnected', () => {
            this._statusMsg = 'Opponent disconnected';
            this._phase = 'menu';
        });
        this._client.on('close', () => {
            if (this._phase !== 'matching') {
                this._statusMsg = 'Disconnected';
                this._phase = 'menu';
            }
        });
        try {
            await this._client.connect(url);
            this._statusMsg = 'Connected';
        } catch (err) {
            this._statusMsg = `Connection failed: ${err?.message ?? err}`;
            this._phase = 'error';
        }
    }

    _onRoomCreated(m) {
        this._roomCode = m.roomCode;
        this._phase = 'hosting';
        this._statusMsg = 'Waiting for opponent...';
    }

    _onMatchStart(m) {
        this._phase = 'matching';
        const run = this._game.run;
        run.mpRoom = {
            roomCode: this._roomCode || m.roomCode || '',
            opponentName:    m.opponentName    ?? 'Opponent',
            opponentHeroId:  m.opponentHero    ?? null,
            opponentDeckIds: m.opponentDeck    ?? [],
            seed: m.seed ?? 0,
        };
        run.mpClient = this._client;
        run.levelId = '__multiplayer__';
        this._game.transitionTo(new BattleState(this._game));
    }

    handleInput(ev) {
        if (ev.type === 'up') this._tap = { x: ev.x, y: ev.y };
    }

    update() {
        if (!this._tap) return;
        const t = this._tap; this._tap = null;
        if (UIPainter.isInside(t, this._backBtn)) {
            this._game.sound?.play(SoundEvent.UI_CLICK);
            if (this._phase === 'codeEntry') {
                this._phase = 'menu';
                this._typedCode = '';
                this._statusMsg = '';
            } else {
                this._game.transitionTo(new ModeSelectState(this._game));
            }
            return;
        }
        if (this._phase === 'menu') { this._handleMenuTap(t); return; }
        if (this._phase === 'codeEntry') { this._handleKeypadTap(t); }
    }

    _handleMenuTap(t) {
        for (const b of this._menuButtons) {
            if (!UIPainter.isInside(t, b)) continue;
            this._game.sound?.play(SoundEvent.UI_CLICK);
            if (b.id === 'host') this._doHost();
            else this._openCodeEntry();
            return;
        }
    }

    _handleKeypadTap(t) {
        if (UIPainter.isInside(t, this._delBtn)) {
            this._game.sound?.play(SoundEvent.UI_CLICK);
            this._typedCode = this._typedCode.slice(0, -1);
            this._statusMsg = '';
            return;
        }
        if (UIPainter.isInside(t, this._goBtn)) {
            this._game.sound?.play(SoundEvent.UI_CLICK);
            this._submitCode();
            return;
        }
        if (this._typedCode.length >= CODE_LEN) return;
        for (const b of this._keypadButtons) {
            if (!UIPainter.isInside(t, b)) continue;
            this._game.sound?.play(SoundEvent.UI_CLICK);
            this._typedCode += b.ch;
            this._statusMsg = '';
            if (this._typedCode.length === CODE_LEN) this._submitCode();
            return;
        }
    }

    _openCodeEntry() {
        if (!this._client?.isConnected()) { this._statusMsg = 'Not connected'; return; }
        this._phase = 'codeEntry';
        this._typedCode = '';
        this._statusMsg = '';
    }

    _doHost() {
        if (!this._client?.isConnected()) { this._statusMsg = 'Not connected'; return; }
        const username = this._game.platform.getUsername() ?? 'Player';
        this._statusMsg = 'Creating room...';
        this._phase = 'hosting';
        this._client.createRoom(username, this._game.run.heroId, this._game.run.deckIds);
    }

    _submitCode() {
        if (this._typedCode.length !== CODE_LEN) { this._statusMsg = 'Need 4 chars'; return; }
        if (!this._client?.isConnected()) { this._statusMsg = 'Not connected'; return; }
        const code = this._typedCode;
        const username = this._game.platform.getUsername() ?? 'Player';
        this._statusMsg = `Joining ${code}...`;
        this._phase = 'joining';
        this._roomCode = code;
        this._client.joinRoom(code, username, this._game.run.heroId, this._game.run.deckIds);
    }

    render(ctx) {
        UIPainter.button(ctx, this._backBtn);
        UIPainter.text(ctx, 'MULTIPLAYER', GameConfig.VIEW_WIDTH / 2, 200,
            { font: 'bold 32px system-ui', color: GameConfig.COLOR.GOLD, align: 'center' });
        UIPainter.text(ctx, '1v1 real-time match', GameConfig.VIEW_WIDTH / 2, 240,
            { font: '14px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'center' });

        if (this._phase === 'menu' || this._phase === 'error') {
            for (const b of this._menuButtons) UIPainter.button(ctx, b);
        } else if (this._phase === 'hosting') {
            UIPainter.text(ctx, 'ROOM CODE', GameConfig.VIEW_WIDTH / 2, 380,
                { font: '14px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'center' });
            UIPainter.text(ctx, this._roomCode || '----', GameConfig.VIEW_WIDTH / 2, 450,
                { font: 'bold 56px monospace', color: GameConfig.COLOR.GOLD, align: 'center' });
            UIPainter.text(ctx, 'Share with a friend', GameConfig.VIEW_WIDTH / 2, 500,
                { font: '12px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'center' });
        } else if (this._phase === 'codeEntry') {
            this._renderCodeEntry(ctx);
        } else if (this._phase === 'joining' || this._phase === 'matching') {
            UIPainter.text(ctx, this._phase === 'matching' ? 'Starting...' : 'Joining...',
                GameConfig.VIEW_WIDTH / 2, 450,
                { font: 'bold 24px system-ui', color: GameConfig.COLOR.TEXT, align: 'center' });
        }

        if (this._statusMsg) {
            UIPainter.text(ctx, this._statusMsg, GameConfig.VIEW_WIDTH / 2, 760,
                { font: '13px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'center' });
        }
    }

    _renderCodeEntry(ctx) {
        const cx = GameConfig.VIEW_WIDTH / 2;
        UIPainter.text(ctx, 'ENTER ROOM CODE', cx, 270,
            { font: 'bold 18px system-ui', color: GameConfig.COLOR.TEXT, align: 'center' });
        // Code slots
        const slotW = 56, slotH = 64, gap = 10;
        const totalW = CODE_LEN * slotW + (CODE_LEN - 1) * gap;
        const sx0 = (GameConfig.VIEW_WIDTH - totalW) / 2;
        const sy = 295;
        for (let i = 0; i < CODE_LEN; i++) {
            const x = sx0 + i * (slotW + gap);
            const filled = i < this._typedCode.length;
            ctx.fillStyle = filled ? GameConfig.COLOR.PANEL_BG ?? '#1a1a2a' : '#11111a';
            ctx.strokeStyle = filled ? GameConfig.COLOR.GOLD : GameConfig.COLOR.TEXT_DIM;
            ctx.lineWidth = 2;
            ctx.fillRect(x, sy, slotW, slotH);
            ctx.strokeRect(x, sy, slotW, slotH);
            if (filled) {
                UIPainter.text(ctx, this._typedCode[i], x + slotW / 2, sy + slotH / 2 + 14,
                    { font: 'bold 36px monospace', color: GameConfig.COLOR.GOLD, align: 'center' });
            }
        }
        // Keypad
        for (const b of this._keypadButtons) UIPainter.button(ctx, b);
        UIPainter.button(ctx, this._delBtn);
        UIPainter.button(ctx, this._goBtn);
    }
}

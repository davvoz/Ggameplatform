import { GameConfig } from '../config/GameConfig.js';
import { UIPainter } from '../ui/UIPainter.js';
import { ModeSelectState } from './ModeSelectState.js';
import { CampaignSelectState } from './CampaignSelectState.js';
import { BattleState } from './BattleState.js';
import { SoundEvent } from '../audio/SoundEvent.js';

// ─── Layout constants (no magic numbers) ─────────────────────────────────────
const TITLE_Y         = 200;
const STATS_START_Y   = 290;
const BTN_WIDTH       = 240;
const BTN_HEIGHT      = 56;
const BTN_ROW_STEP    = 70;
const BTN_FIRST_Y     = 540;
const REMATCH_HINT_Y  = 510;

const OUTCOME_COLORS = {
    win:     { title: GameConfig.COLOR.GOLD,       outline: GameConfig.COLOR.TITLE_OUTLINE },
    timeout: { title: GameConfig.COLOR.ENEMY_TINT, outline: GameConfig.COLOR.GOLD },
    lose:    { title: GameConfig.COLOR.ENEMY_TINT, outline: GameConfig.COLOR.GOLD },
};

const OUTCOME_TITLES = { win: 'VICTORY', timeout: 'TIME OUT', lose: 'DEFEAT' };

const LINE_STYLE = {
    normal:    { font: '18px system-ui', color: GameConfig.COLOR.TEXT, step: 28 },
    breakdown: { font: '14px system-ui', color: GameConfig.COLOR.TEXT, step: 20 },
};

function makeButton(id, label, rowIndex) {
    const cx = GameConfig.VIEW_WIDTH / 2;
    return {
        id, label, enabled: true,
        x: cx - BTN_WIDTH / 2,
        y: BTN_FIRST_Y + rowIndex * BTN_ROW_STEP,
        w: BTN_WIDTH, h: BTN_HEIGHT,
    };
}

// ─── Abstract base ───────────────────────────────────────────────────────────
/**
 * Common post-battle screen: renders outcome title, stats, and a button row.
 * Mode-specific behaviour (single-player vs multiplayer) lives in subclasses
 * via the Template Method pattern — no `if (isMp)` branching anywhere.
 */
class BaseResultState {
    constructor(game) {
        this._game = game;
        this._buttons = this._buildButtons();
        this._tap = null;
    }

    // ── Template hooks (subclasses override) ────────────────────────────────
    _buildButtons() { return []; }
    _onEnter() { /* no-op */ }
    _onExit()  { /* no-op */ }
    _dispatch(/* id */) { /* no-op */ }
    _renderExtras(/* ctx */) { /* no-op */ }

    // ── State lifecycle ─────────────────────────────────────────────────────
    enter() { this._onEnter(); }
    exit()  { this._onExit(); }

    handleInput(ev) {
        if (ev.type === 'up') this._tap = { x: ev.x, y: ev.y };
    }

    update() {
        if (!this._tap) return;
        const tap = this._tap;
        this._tap = null;
        const hit = this._buttons.find(b => b.enabled && UIPainter.isInside(tap, b));
        if (!hit) return;
        this._game.sound?.play(SoundEvent.UI_CLICK);
        this._game.platform.resetGameOver();
        this._dispatch(hit.id);
    }

    render(ctx) {
        this._renderTitle(ctx);
        this._renderStats(ctx);
        for (const b of this._buttons) UIPainter.button(ctx, b);
        this._renderExtras(ctx);
    }

    // ── Shared helpers ──────────────────────────────────────────────────────
    _renderTitle(ctx) {
        const outcome = this._game.run.outcome;
        const { title: titleColor, outline: titleOutline } = OUTCOME_COLORS[outcome];
        UIPainter.text(ctx, OUTCOME_TITLES[outcome], GameConfig.VIEW_WIDTH / 2, TITLE_Y, {
            font: 'bold 48px system-ui',
            color: titleColor,
            align: 'center',
            outline: { color: titleOutline, width: 3 },
            custom: true
        });
    }

    _renderStats(ctx) {
        const stats = this._game.run.matchStats ?? {
            score: 0, timeBonus: 0, killBonus: 0, durationSec: 0, unitsKilled: 0,
        };
        const lines = [
            { text: `Duration: ${this._fmt(stats.durationSec)}`,  kind: 'normal' },
            { text: `Units defeated: ${stats.unitsKilled}`,       kind: 'normal' },
            { text: ``,                                           kind: 'normal' },
            { text: `Score:  ${stats.score}`,                     kind: 'normal' },
            { text: `  \u23a3 Time bonus:  ${stats.timeBonus}`,   kind: 'breakdown' },
            { text: `  \u23a3 Kill bonus:  ${stats.killBonus}`,   kind: 'breakdown' },
        ];
        let y = STATS_START_Y;
        for (const { text, kind } of lines) {
            const { font, color, step } = LINE_STYLE[kind];
            UIPainter.text(ctx, text, GameConfig.VIEW_WIDTH / 2, y, { font, color, align: 'center', custom: true });
            y += step;
        }
    }

    _fmt(sec) {
        const mm = Math.floor(sec / 60);
        const ss = Math.floor(sec % 60).toString().padStart(2, '0');
        return `${mm}:${ss}`;
    }

    _goToMainMenu() {
        this._game.transitionTo(new ModeSelectState(this._game));
    }
}

// ─── Single-player concrete state ────────────────────────────────────────────
class SinglePlayerResultState extends BaseResultState {
    _buildButtons() {
        return [
            makeButton('replay', 'PLAY AGAIN',   0),
            makeButton('levels', 'CAMPAIGN MAP', 1),
            makeButton('menu',   'MAIN MENU',    2),
        ];
    }

    _dispatch(id) {
        if (id === 'menu') {
            this._goToMainMenu();
            return;
        }
        // 'replay' and 'levels' both return to the campaign map.
        this._game.transitionTo(new CampaignSelectState(this._game));
    }
}

// ─── Multiplayer concrete state ──────────────────────────────────────────────
/**
 * Multiplayer post-battle: owns the rematch handshake. Listeners are bound
 * in _onEnter() and released in _onExit() — there is exactly one owner of
 * the rematch lifecycle at any time, so no double-transition is possible.
 */
class MultiplayerResultState extends BaseResultState {
    constructor(game) {
        super(game);
        this._waitingRematch = false;
        this._opponentReady = false;
        // Bind once so off() can find the exact same reference later.
        this._onRematchRequested = this._onRematchRequested.bind(this);
        this._onMatchStart       = this._onMatchStart.bind(this);
    }

    _buildButtons() {
        return [
            makeButton('replay', 'PLAY AGAIN', 0),
            makeButton('menu',   'MAIN MENU',  1),
        ];
    }

    _onEnter() {
        // Subscribe to the SESSION-scoped handshake (created in MultiplayerLobbyState).
        // Any rematchRequested / matchStart that arrived during the FSM swap is
        // buffered by the handshake and replayed synchronously here, so we can
        // never miss the opponent's signal.
        const handshake = this._game.run.mpRoom?.handshake;
        if (!handshake) return;
        handshake.setObservers({
            onOpponentReady: this._onRematchRequested,
            onMatchStart:    this._onMatchStart,
        });
    }

    _onExit() {
        this._game.run.mpRoom?.handshake?.clearObservers();
    }

    _onRematchRequested() {
        this._opponentReady = true;
    }

    _onMatchStart(message) {
        const room = this._game.run.mpRoom;
        if (room) {
            room.opponentHeroId  = message.opponentHero;
            room.opponentDeckIds = message.opponentDeck;
        }
        this._game.transitionTo(BattleState.create(this._game));
    }

    _dispatch(id) {
        if (id === 'menu')   { this._exitToMenu();     return; }
        if (id === 'replay') { this._requestRematch(); }
    }

    _exitToMenu() {
        this._disconnectClient();
        this._goToMainMenu();
    }

    _disconnectClient() {
        const cli = this._game.run.mpClient;
        const room = this._game.run.mpRoom;
        // Release session-scoped handshake subscriptions first, before the
        // client itself goes away.
        room?.handshake?.dispose();
        if (cli) {
            try { cli.disconnect(); }
            catch (err) { console.debug('[minion_clash] mp disconnect ignored', err); }
        }
        this._game.run.mpClient = null;
        this._game.run.mpRoom = null;
    }

    _requestRematch() {
        const replayBtn = this._buttons.find(b => b.id === 'replay');
        if (replayBtn) replayBtn.enabled = false;
        this._waitingRematch = true;
        this._game.run.mpClient?.sendRematch();
    }

    _renderExtras(ctx) {
        if (!this._waitingRematch) return;
        const hint = this._opponentReady ? 'Opponent ready!' : 'Waiting for opponent…';
        UIPainter.text(ctx, hint, GameConfig.VIEW_WIDTH / 2, REMATCH_HINT_Y, {
            font: '14px system-ui',
            color: GameConfig.COLOR.TEXT,
            align: 'center',
        });
    }
}

// ─── Public facade (factory) ─────────────────────────────────────────────────
/**
 * Entry point for the post-battle screen.
 *   ResultState.create(game) → returns the correct concrete subclass.
 * The choice happens exactly once, at the boundary, based on whether the
 * run carries an active multiplayer client.
 */
export class ResultState {
    static create(game) {
        return game.run.mpClient
            ? new MultiplayerResultState(game)
            : new SinglePlayerResultState(game);
    }
}

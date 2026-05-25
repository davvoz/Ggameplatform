import { GameConfig } from '../config/GameConfig.js';
import { BattleWorld } from '../battle/BattleWorld.js';
import { RemoteBattleView } from '../battle/RemoteBattleView.js';
import { BattleRenderer, handSlotRect } from '../rendering/BattleRenderer.js';
import { UIPainter } from '../ui/UIPainter.js';
import { SoundEvent } from '../audio/SoundEvent.js';
import { ResultState } from './ResultState.js';

// Layout constants for the pause/forfeit button.
const PAUSE_BTN_OFFSET_X = 44;
const PAUSE_BTN_Y = 80;
const PAUSE_BTN_SIZE = 32;

// Score-bonus tuning. Time bonus scales remaining seconds; kill bonus is flat per kill.
const TIME_BONUS_MULT = 10;
const KILL_BONUS_PER_KILL = 30;
const WIN_STARS = 3;

// Seconds to wait after tower destruction before transitioning to the result screen.
const OUTCOME_PAUSE_SEC = 1.8;

// Sentinel level id used for multiplayer matches (not a real campaign level).
const MP_LEVEL_ID = '__multiplayer__';

const NEUTRAL_MODIFIERS = Object.freeze({
    enemyUnitHpMult: 1, playerUnitHpMult: 1,
    enemyManaRegenMult: 1, playerManaRegenMult: 1,
});

/**
 * BaseBattleState: drives the BattleWorld update/render and translates input
 * (drag-and-drop card play, ESC=quit) into player commands. Mode-specific
 * behavior (world construction, play commit, lifecycle hooks) is delegated
 * to subclasses via the Template Method pattern — no `if (isMp)` here.
 */
class BaseBattleState {
    constructor(game) {
        this._game = game;
        this._world = null;
        this._renderer = null;
        this._drag = { active: false, slotIndex: -1, previewCardId: null, x: null, y: null };
        this._endHandled = false;
        this._endFinalized = false;
        this._outcomePause = 0;
        this._pauseBtn = this._buildPauseBtn();
        this._tap = null;
    }

    _buildPauseBtn() {
        return {
            id: 'pause', label: '⏸',
            x: GameConfig.VIEW_WIDTH - PAUSE_BTN_OFFSET_X,
            y: PAUSE_BTN_Y, w: PAUSE_BTN_SIZE, h: PAUSE_BTN_SIZE,
        };
    }

    enter() {
        this._world = this._createWorld();
        this._renderer = new BattleRenderer(this._world);
        this._onEnterMode();
        this._game.sound?.play(SoundEvent.BATTLE_START);
        // Open platform session — runtimeShell creates the session on the backend,
        // which is required for gameOver() to produce XP and the XP banner.
        this._game.platform.resetSession();
    }

    exit() { this._onExitMode(); }

    // ── Abstract hooks (subclasses implement) ─────────────────────────────
    _createWorld() { throw new Error('BaseBattleState._createWorld is abstract'); }
    _commitPlay(_slot, _cardId, _x, _y) { throw new Error('BaseBattleState._commitPlay is abstract'); }
    // ── Optional hooks (default noop) ─────────────────────────────────────
    _onEnterMode() { /* mode-specific wiring */ }
    _onExitMode()  { /* mode-specific teardown */ }
    _onQuitExtra() { /* extra side-effect on quit (e.g. notify server) */ }
    _isMatchTrackedAsLevel() { return false; }

    handleInput(ev) {
        if (this._world?.outcome) return;
        switch (ev.type) {
            case 'down': this._onDown(ev); break;
            case 'move': this._onMove(ev); break;
            case 'up':   this._onUp(ev);   break;
            case 'key':  this._onKey(ev);  break;
            case 'blur': this._cancelDrag(); break;
            default: break;
        }
    }

    _onDown(ev) {
        if (UIPainter.isInside(ev, this._pauseBtn)) {
            this._game.sound?.play(SoundEvent.UI_CLICK);
            this._tap = { kind: 'pause' };
            return;
        }
        const slot = this._slotAt(ev.x, ev.y);
        if (slot < 0) return;
        const cardId = this._world.player.hand.cardAt(slot);
        if (!cardId) return;
        const card = this._world.data.getCard(cardId);
        if (!this._world.player.mana.canConsume(card.cost)) return;
        this._drag.active = true;
        this._drag.slotIndex = slot;
        this._drag.previewCardId = cardId;
        this._drag.x = ev.x;
        this._drag.y = ev.y;
    }

    _onMove(ev) {
        if (!this._drag.active) return;
        this._drag.x = ev.x;
        this._drag.y = ev.y;
    }

    _onUp(ev) {
        if (this._tap?.kind === 'pause') { this._tap = null; this._quitToMenu(); return; }
        if (!this._drag.active) return;
        const { slotIndex: slot, previewCardId: cardId } = this._drag;
        this._commitPlay(slot, cardId, ev.x, ev.y);
        this._cancelDrag();
    }

    _onKey(ev) {
        if (ev.down && ev.code === 'Escape') this._quitToMenu();
    }

    _cancelDrag() {
        this._drag.active = false;
        this._drag.slotIndex = -1;
        this._drag.previewCardId = null;
        this._drag.x = null;
        this._drag.y = null;
    }

    _slotAt(x, y) {
        for (let i = 0; i < GameConfig.UI.HAND_SLOTS; i++) {
            if (UIPainter.isInside({ x, y }, handSlotRect(i))) return i;
        }
        return -1;
    }

    update(dt) {
        if (!this._world) return;
        this._world.update(dt);
        if (!this._world.outcome) return;
        if (!this._endHandled) {
            this._endHandled = true;
            this._outcomePause = OUTCOME_PAUSE_SEC;
            const snd = this._world.outcome === 'win' ? SoundEvent.BATTLE_WIN : SoundEvent.BATTLE_LOSE;
            this._game.sound?.play(snd);
        }
        this._outcomePause -= dt;
        if (this._outcomePause > 0) return;
        if (!this._endFinalized) {
            this._endFinalized = true;
            this._finalizeRun();
            this._game.transitionTo(ResultState.create(this._game));
        }
    }

    _finalizeRun() {
        const w = this._world;
        const scoreData = this._computeScore(w);
        const levelNum = this._extractLevelNum(w.level.id);
        const meta = this._buildMeta(w, levelNum);
        this._reportScore(scoreData.total, meta);
        this._reportGameOver(scoreData.total, meta);
        this._reportLevelCompletion(w, levelNum);
        this._stashRunStats(w, scoreData);
    }

    _extractLevelNum(levelId) {
        return Number.parseInt(levelId.match(/\d+/)?.[0] ?? '0', 10);
    }

    _buildMeta(w, levelNum) {
        return {
            timePlayed: w.matchTime,
            level: levelNum,
            heroId: this._game.run.heroId,
            outcome: w.outcome,
        };
    }

    _reportScore(total, meta) {
        try { this._game.platform.sendScore(total, meta); }
        catch { /* platform may not implement sendScore */ }
    }

    _reportGameOver(total, meta) {
        try { this._game.platform.gameOver(total, meta); }
        catch { /* platform may not implement gameOver */ }
    }

    _reportLevelCompletion(w, levelNum) {
        if (w.outcome !== 'win' || !this._isMatchTrackedAsLevel()) return;
        try { this._game.platform.levelCompleted(levelNum, { stars: WIN_STARS, perfectClear: false }); }
        catch { /* platform may not implement levelCompleted */ }
    }

    _stashRunStats(w, sd) {
        this._game.run.outcome = w.outcome;
        this._game.run.matchStats = {
            score: sd.total, timeBonus: sd.timeBonus, killBonus: sd.killBonus,
            durationSec: w.matchTime, unitsKilled: w.stats.unitsKilled,
        };
    }

    _computeScore(w) {
        if (w.outcome !== 'win') return { total: 0, timeBonus: 0, killBonus: 0 };
        const remaining = Math.max(0, GameConfig.BATTLE.MATCH_TIME_LIMIT - w.matchTime);
        const timeBonus = Math.round(remaining * TIME_BONUS_MULT);
        const killBonus = w.stats.unitsKilled * KILL_BONUS_PER_KILL;
        return { total: timeBonus + killBonus, timeBonus, killBonus };
    }

    _quitToMenu() {
        if (!this._world) return;
        this._onQuitExtra();
        this._world.outcome = 'lose';
        this._game.sound?.play(SoundEvent.BATTLE_LOSE);
        // Skip explosion delay — the player explicitly chose to leave.
        this._endHandled = true;
        this._outcomePause = 0;
    }

    render(ctx) {
        if (!this._renderer) return;
        this._renderer.render(ctx, this._drag);
        UIPainter.buttonCustom(ctx, {
            ...this._pauseBtn,
            fill: 'rgba(0,0,0,0.5)', stroke: 'rgba(255,255,255,0.3)', radius: 6,
        }, (c, btn) => {
            c.font = '18px system-ui';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText('🏳️', btn.x + btn.w / 2, btn.y + btn.h / 2);
        });
    }
}

/**
 * Single-player battle: local authoritative simulation, plays land instantly,
 * level completion is reported to the platform.
 */
class SinglePlayerBattleState extends BaseBattleState {
    _createWorld() {
        const level = this._game.data.getLevelForDifficulty(
            this._game.run.levelId,
            this._game.run.difficulty ?? 'medium'
        );
        return new BattleWorld({
            data: this._game.data, level, runContext: this._game.run,
            assets: this._game.assets, sound: this._game.sound ?? null,
        });
    }

    _commitPlay(slot, _cardId, x, y) {
        this._world.player.playCardFromHand(slot, x, y);
    }

    _isMatchTrackedAsLevel() { return true; }
}

/**
 * Multiplayer battle: server-authoritative simulation. Plays are sent as
 * intents and reconciled by the next snapshot. Owns the per-battle WS
 * listener lifecycle; the socket itself is owned by ResultState.
 */
class MultiplayerBattleState extends BaseBattleState {
    constructor(game) {
        super(game);
        // Bind once so .off() can find the exact same reference at exit time.
        // Each handler is a thin arrow that defers to the world / instance.
        this._onStateMsg     = (m) => this._world?.applySnapshot(m);
        // Server wraps events as {type:'event', tick, event:{...}}; unwrap.
        this._onEventMsg     = (m) => this._world?.applyEvent(m?.event);
        this._onOutcomeMsg   = (m) => this._world?.applyOutcome(m);
        this._onPlayRejected = this._onPlayRejected.bind(this);
        this._onOpponentLeft = this._onOpponentLeft.bind(this);
    }

    _createWorld() {
        return new RemoteBattleView({
            data: this._game.data,
            level: this._buildMpLevel(),
            runContext: this._game.run,
            assets: this._game.assets,
            sound: this._game.sound ?? null,
            mpRoom: this._game.run.mpRoom,
        });
    }

    _buildMpLevel() {
        const mp = this._game.run.mpRoom;
        return {
            id: MP_LEVEL_ID,
            enemyHeroId: mp.opponentHeroId,
            enemyDeck: mp.opponentDeckIds,
            aiProfile: null,
            modifiers: { ...NEUTRAL_MODIFIERS },
        };
    }

    _onEnterMode() {
        const cli = this._game.run.mpClient;
        if (!cli) return;
        cli.on('state',                this._onStateMsg);
        cli.on('event',                this._onEventMsg);
        cli.on('outcome',              this._onOutcomeMsg);
        cli.on('playRejected',         this._onPlayRejected);
        cli.on('opponentDisconnected', this._onOpponentLeft);
        // New battle starting: drop any stale handshake buffer from the
        // previous match so the next ResultState begins from a clean slate.
        this._game.run.mpRoom?.handshake?.reset();
    }

    _onExitMode() {
        // Targeted teardown: only the listeners THIS state added. Session-
        // scoped subscribers (RematchHandshake) survive the transition so
        // 'rematchRequested' / 'matchStart' are never dropped mid-swap.
        const cli = this._game.run.mpClient;
        if (!cli) return;
        cli.off('state',                this._onStateMsg);
        cli.off('event',                this._onEventMsg);
        cli.off('outcome',              this._onOutcomeMsg);
        cli.off('playRejected',         this._onPlayRejected);
        cli.off('opponentDisconnected', this._onOpponentLeft);
    }

    _commitPlay(slot, cardId, x, y) {
        // Server-authoritative: send intent only; next snapshot will reflect
        // mana/hand/spawn. No local mutation.
        this._game.run.mpClient?.sendCardPlay(slot, cardId, x, y);
    }

    _onQuitExtra() {
        this._game.run.mpClient?.sendLeave();
    }

    _onPlayRejected(m) {
        // Server refused the play. Surface a discreet log; the next snapshot
        // will keep the UI in sync (mana/cooldown weren't actually consumed).
        console.debug('[minion_clash] play rejected', m?.code, m?.cardId);
    }

    _onOpponentLeft() {
        // Safety net for true TCP disconnect (WebSocketDisconnect on server).
        // Voluntary forfeit travels via 'outcome' instead — same code path
        // as a natural match end — so this only fires when the server itself
        // emits 'opponentDisconnected', i.e. the peer's socket actually died.
        if (!this._world || this._world.outcome) return;
        this._world.outcome = 'win';
    }
}

/**
 * Public façade. The decision SP vs MP is made ONCE here, at the boundary.
 * From that point on, polymorphism handles everything else.
 */
export class BattleState {
    static create(game) {
        return game.run.mpRoom
            ? new MultiplayerBattleState(game)
            : new SinglePlayerBattleState(game);
    }
}

import { GameConfig } from '../config/GameConfig.js';
import { BattleWorld } from '../battle/BattleWorld.js';
import { RemoteBattleView } from '../battle/RemoteBattleView.js';
import { BattleRenderer, handSlotRect } from '../rendering/BattleRenderer.js';
import { UIPainter } from '../ui/UIPainter.js';
import { SoundEvent } from '../audio/SoundEvent.js';
import { ResultState } from './ResultState.js';

/**
 * BattleState: drives the BattleWorld update/render and translates input
 * (drag-and-drop card play, ESC=quit) into player commands.
 */
export class BattleState {
    constructor(game) {
        this._game = game;
        this._world = null;
        this._renderer = null;
        this._drag = { active: false, slotIndex: -1, previewCardId: null, x: null, y: null };
        this._endHandled = false;
        this._pauseBtn = { id: 'pause', label: '⏸', x: GameConfig.VIEW_WIDTH - 44, y: 80, w: 32, h: 32 };
        this._tap = null;
    }

    enter() {
        const isMp = !!this._game.run.mpRoom;
        const level = isMp ? this._buildMpLevel() : this._game.data.getLevel(this._game.run.levelId);
        if (isMp) {
            this._world = new RemoteBattleView({
                data: this._game.data, level, runContext: this._game.run,
                assets: this._game.assets, sound: this._game.sound ?? null,
                mpRoom: this._game.run.mpRoom,
            });
        } else {
            this._world = new BattleWorld({
                data: this._game.data, level, runContext: this._game.run,
                assets: this._game.assets, sound: this._game.sound ?? null,
            });
        }
        this._renderer = new BattleRenderer(this._world);
        if (isMp) this._wireMultiplayer();
        this._game.sound?.play(SoundEvent.BATTLE_START);

        // Open platform session — runtimeShell creates the session on the backend,
        // which is required for gameOver() to produce XP and the XP banner.
        this._game.platform.resetSession();
    }

    exit() {
        // Drop any MP listeners and close the transport on match end.
        const cli = this._game.run.mpClient;
        if (cli) {
            try { cli.disconnect(); }
            catch (err) { console.debug('[minion_clash] mp disconnect ignored', err); }
        }
        this._game.run.mpClient = null;
        this._game.run.mpRoom = null;
    }

    _buildMpLevel() {
        const mp = this._game.run.mpRoom;
        return {
            id: '__multiplayer__',
            enemyHeroId: mp.opponentHeroId,
            enemyDeck: mp.opponentDeckIds,
            aiProfile: null,
            modifiers: {
                enemyUnitHpMult: 1, playerUnitHpMult: 1,
                enemyManaRegenMult: 1, playerManaRegenMult: 1,
            },
        };
    }

    _wireMultiplayer() {
        const cli = this._game.run.mpClient;
        if (!cli) return;
        cli.on('state', (m) => this._world?.applySnapshot(m));
        // Server wraps events as {type:'event', tick, event:{...}}; unwrap before dispatch.
        cli.on('event', (m) => this._world?.applyEvent(m?.event));
        cli.on('outcome', (m) => this._world?.applyOutcome(m));
        cli.on('playRejected', (m) => this._onPlayRejected(m));
        cli.on('opponentDisconnected', () => this._onOpponentLeft());
    }

    _onPlayRejected(m) {
        // Server refused the play. Surface a discreet log; the next snapshot
        // will keep the UI in sync (mana/cooldown weren't actually consumed).
        console.debug('[minion_clash] play rejected', m?.code, m?.cardId);
    }

    _onOpponentLeft() {
        if (!this._world || this._world.outcome) return;
        // Forfeit: local player wins by default.
        this._world.outcome = 'win';
    }

    handleInput(ev) {
        if (this._world?.outcome) return;
        switch (ev.type) {
            case 'down': this._onDown(ev); break;
            case 'move': this._onMove(ev); break;
            case 'up': this._onUp(ev); break;
            case 'key': this._onKey(ev); break;
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
        const slot = this._drag.slotIndex;
        const cardId = this._drag.previewCardId;
        const isMp = !!this._game.run.mpRoom;
        if (isMp) {
            // Server-authoritative: just send intent. The next snapshot will
            // reflect mana/hand/spawn. No local mutation.
            const cli = this._game.run.mpClient;
            cli?.sendCardPlay(slot, cardId, ev.x, ev.y);
        } else {
            this._world.player.playCardFromHand(slot, ev.x, ev.y);
        }
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
        if (this._world.outcome && !this._endHandled) {
            this._endHandled = true;
            const snd = this._world.outcome === 'win' ? SoundEvent.BATTLE_WIN : SoundEvent.BATTLE_LOSE;
            this._game.sound?.play(snd);
            this._finalizeRun();
            this._game.transitionTo(new ResultState(this._game));
        }
    }

    _finalizeRun() {
        const w = this._world;
        const score = this._computeScore(w);
        const levelNum = Number.parseInt(w.level.id.match(/\d+/)?.[0] ?? '0', 10);
        const meta = {
            timePlayed: w.matchTime,
            level: levelNum,
            heroId: this._game.run.heroId,
            outcome: w.outcome
        };
        try { this._game.platform.sendScore(score, meta); } catch {// Ignore if platform doesn't support score submission.}
        }
        try { this._game.platform.gameOver(score, meta); } catch { // Ignore if platform doesn't support gameOver.}
        }
        if (w.outcome === 'win' && w.level.id !== '__multiplayer__') {
            try { this._game.platform.levelCompleted(levelNum, { stars: 3, perfectClear: false }); } catch { // Ignore if platform doesn't support levelCompleted.  }
            }
        }
        // MP outcome is server-authoritative — no client message needed.
        this._game.run.outcome = w.outcome;
        this._game.run.matchStats = { score, durationSec: w.matchTime, unitsKilled: w.stats.unitsKilled };
    }

    _computeScore(w) {
        if (w.outcome !== 'win') return 0;
        const remaining = Math.max(0, GameConfig.BATTLE.MATCH_TIME_LIMIT - w.matchTime);
        return Math.round(remaining * 10);
    }

    _quitToMenu() {
        if (!this._world) return;
        this._world.outcome = 'lose';
    }

    render(ctx) {
        if (!this._renderer) return;
        this._renderer.render(ctx, this._drag);
        UIPainter.buttonCustom(ctx, {
            ...this._pauseBtn,
            fill: 'rgba(0,0,0,0.5)', stroke: 'rgba(255,255,255,0.3)', radius: 6,
        }, (ctx, btn) => {
            ctx.font = '18px system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏳️', btn.x + btn.w / 2, btn.y + btn.h / 2);
        });
    }
}

import { GameConfig } from '../config/GameConfig.js';
import { UIPainter } from '../ui/UIPainter.js';
import { ModeSelectState } from './ModeSelectState.js';
import { CampaignSelectState } from './CampaignSelectState.js';
import { SoundEvent } from '../audio/SoundEvent.js';

/**
 * Post-battle screen. Shows outcome + stats. Two actions: replay / main menu.
 */
export class ResultState {
    constructor(game) {
        this._game = game;
        this._buttons = [];
        this._tap = null;
    }

    enter() {
        const cx = GameConfig.VIEW_WIDTH / 2;
        this._buttons = [
            { id: 'replay', label: 'PLAY AGAIN', x: cx - 240 / 2, y: 540, w: 240, h: 56, enabled: true },
            { id: 'levels', label: 'CAMPAIGN MAP', x: cx - 240 / 2, y: 610, w: 240, h: 56, enabled: true },
            { id: 'menu',   label: 'MAIN MENU',  x: cx - 240 / 2, y: 680, w: 240, h: 56, enabled: true }
        ];
    }

    handleInput(ev) { if (ev.type === 'up') this._tap = { x: ev.x, y: ev.y }; }

    update() {
        if (!this._tap) return;
        const t = this._tap; this._tap = null;
        for (const b of this._buttons) {
            if (UIPainter.isInside(t, b)) {
                this._game.sound?.play(SoundEvent.UI_CLICK);
                this._dispatch(b.id);
                return;
            }
        }
    }

    _dispatch(id) {
        const g = this._game;
        g.platform.resetGameOver();
        if (id === 'menu') {
            g.transitionTo(new ModeSelectState(g));
        } else {
            // 'replay' and 'levels' both return to the campaign map.
            g.transitionTo(new CampaignSelectState(g));
        }
    }

    render(ctx) {
        const r = this._game.run;
        const isWin = r.outcome === 'win';
        const title = this._titleFor(r.outcome);
        const titleColor = isWin ? GameConfig.COLOR.GOLD : GameConfig.COLOR.ENEMY_TINT;
        const titleOutline = isWin ? GameConfig.COLOR.TITLE_OUTLINE : GameConfig.COLOR.GOLD;
        UIPainter.text(ctx, title, GameConfig.VIEW_WIDTH / 2, 200,
            { font: 'bold 48px system-ui', color: titleColor, align: 'center',
                    outline: { color: titleOutline, width: 3 }
             });

        const stats = r.matchStats ?? { score: 0, durationSec: 0, unitsKilled: 0 };
        const lines = [
            `Score: ${stats.score}`,
            `Duration: ${this._fmt(stats.durationSec)}`,
            `Units defeated: ${stats.unitsKilled}`
        ];
        let y = 290;
        for (const l of lines) {
            UIPainter.text(ctx, l, GameConfig.VIEW_WIDTH / 2, y,
                { font: '18px system-ui', color: GameConfig.COLOR.TEXT, align: 'center' });
            y += 28;
        }
        for (const b of this._buttons) UIPainter.button(ctx, b);
    }

    _fmt(sec) {
        const mm = Math.floor(sec / 60);
        const ss = Math.floor(sec % 60).toString().padStart(2, '0');
        return `${mm}:${ss}`;
    }

    _titleFor(outcome) {
        if (outcome === 'win') return 'VICTORY';
        if (outcome === 'timeout') return 'TIME OUT';
        return 'DEFEAT';
    }
}

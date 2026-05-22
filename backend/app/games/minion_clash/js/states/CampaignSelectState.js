import { GameConfig } from '../config/GameConfig.js';
import { UIPainter } from '../ui/UIPainter.js';
import { DeckBuilderState } from './DeckBuilderState.js';
import { BattleState } from './BattleState.js';
import { SoundEvent } from '../audio/SoundEvent.js';

/**
 * Campaign level picker. Shows all levels; player picks one to start.
 */
export class CampaignSelectState {
    constructor(game) {
        this._game = game;
        this._items = [];
        this._backBtn = null;
        this._tap = null;
    }

    enter() {
        const levels = this._game.data.getAllLevels();
        const w = GameConfig.VIEW_WIDTH - 32;
        const h = 90, gap = 12;
        const startY = 100;
        this._items = levels.map((lvl, i) => ({
            level: lvl, x: 16, y: startY + i * (h + gap), w, h
        }));
        this._backBtn = { id: 'back', label: 'BACK', x: 16, y: 16, w: 90, h: 36, enabled: true };
    }

    handleInput(ev) { if (ev.type === 'up') this._tap = { x: ev.x, y: ev.y }; }

    update() {
        if (!this._tap) return;
        const t = this._tap; this._tap = null;
        if (UIPainter.isInside(t, this._backBtn)) {
            this._game.sound?.play(SoundEvent.UI_CLICK);
            this._game.transitionTo(new DeckBuilderState(this._game));
            return;
        }
        for (const it of this._items) {
            if (UIPainter.isInside(t, it)) {
                this._game.sound?.play(SoundEvent.UI_CLICK);
                this._game.run.levelId = it.level.id;
                this._game.transitionTo(BattleState.create(this._game));
                return;
            }
        }
    }

    render(ctx) {
        UIPainter.button(ctx, this._backBtn);
        UIPainter.text(ctx, 'CAMPAIGN', GameConfig.VIEW_WIDTH / 2, 60,
            { font: 'bold 22px system-ui', color: GameConfig.COLOR.GOLD, align: 'center',
                    outline: { color: GameConfig.COLOR.TITLE_OUTLINE, width: 2 }
             });
        for (const it of this._items) this._drawLevel(ctx, it);
    }

    _drawLevel(ctx, it) {
        UIPainter.panel(ctx, it.x, it.y, it.w, it.h, {
            fill: 'rgba(20,16,40,0.85)', stroke: 'rgba(255,255,255,0.18)'
        });
        UIPainter.text(ctx, it.level.title, it.x + 16, it.y + 30,
            { font: 'bold 18px system-ui', color: GameConfig.COLOR.TEXT });
        UIPainter.text(ctx, it.level.subtitle ?? '', it.x + 16, it.y + 54,
            { font: '15px system-ui', color: GameConfig.COLOR.TEXT ,
                  outline: { color: 'rgba(243, 239, 239, 0.95)', width: 1 }});
        const enemyName = this._game.data.getHero(it.level.enemyHeroId).name;
        UIPainter.text(ctx, `Enemy: ${enemyName}`, it.x + 16, it.y + 76,
            { font: '12px system-ui', color: GameConfig.COLOR.ENEMY_TINT });
    }
}

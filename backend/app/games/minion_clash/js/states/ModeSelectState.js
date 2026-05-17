import { GameConfig } from '../config/GameConfig.js';
import { UIPainter } from '../ui/UIPainter.js';
import { HeroSelectState } from './HeroSelectState.js';
import { SoundEvent } from '../audio/SoundEvent.js';

/**
 * Mode selection screen. 
 */
export class ModeSelectState {
    constructor(game) {
        this._game = game;
        this._buttons = [];
        this._tap = null;
    }

    enter() {
        this._game.run.reset();
        const cx = GameConfig.VIEW_WIDTH / 2;
        this._buttons = [
            { id: 'campaign',    label: 'CAMPAIGN',    subLabel: '5 levels',
              x: cx - 130, y: 380, w: 260, h: 70, enabled: true },
            { id: 'multiplayer', label: 'MULTIPLAYER', subLabel: 'PVP',
              x: cx - 130, y: 470, w: 260, h: 70, enabled: true }
        ];
    }

    handleInput(ev) {
        if (ev.type === 'up') this._tap = { x: ev.x, y: ev.y };
    }

    update() {
        if (!this._tap) return;
        for (const b of this._buttons) {
            if (b.enabled && UIPainter.isInside(this._tap, b)) {
                this._game.sound?.play(SoundEvent.UI_CLICK);
                this._game.run.mode = b.id;
                this._game.transitionTo(new HeroSelectState(this._game));
                this._tap = null;
                return;
            }
        }
        this._tap = null;
    }

    render(ctx) {
        UIPainter.text(ctx, 'MINION CLASH', GameConfig.VIEW_WIDTH / 2, 180,
            { font: 'bold 38px system-ui', color: GameConfig.COLOR.GOLD, align: 'center',
                  outline: { color: GameConfig.COLOR.TITLE_OUTLINE, width: 2 }
             });
        UIPainter.text(ctx, 'Tactical Card RTS', GameConfig.VIEW_WIDTH / 2, 220,
            { font: '20px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'center' });
        UIPainter.text(ctx, 'Choose a mode', GameConfig.VIEW_WIDTH / 2, 320,
            { font: '20px system-ui', color: GameConfig.COLOR.TEXT, align: 'center' });
        for (const b of this._buttons) UIPainter.button(ctx, b);
    }
}

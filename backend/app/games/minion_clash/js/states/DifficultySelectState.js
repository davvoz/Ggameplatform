import { GameConfig } from '../config/GameConfig.js';
import { UIPainter } from '../ui/UIPainter.js';
import { BattleState } from './BattleState.js';
import { CampaignSelectState } from './CampaignSelectState.js';
import { SoundEvent } from '../audio/SoundEvent.js';

const DIFFICULTIES = Object.freeze([
    {
        id:    'easy',
        label: 'EASY',
        color: '#7be37b',
        desc:  'Relaxed pace — learn the level',
    },
    {
        id:    'medium',
        label: 'MEDIUM',
        color: '#ffd166',
        desc:  'Balanced challenge',
    },
    {
        id:    'hard',
        label: 'HARD',
        color: '#ff6a6a',
        desc:  'Aggressive AI — no mercy',
    },
]);

const BTN_W       = GameConfig.VIEW_WIDTH - 48;
const BTN_H       = 80;
const BTN_X       = 24;
const BTN_START_Y = 300;
const BTN_GAP     = 16;

/**
 * DifficultySelectState: shown after the player picks a campaign level.
 *
 * Lets the player choose EASY / MEDIUM / HARD before the battle starts.
 * Sets `game.run.difficulty` and transitions to BattleState.
 *
 * Navigation:
 *   BACK → CampaignSelectState
 *   difficulty tap → BattleState (via BattleState.create)
 */
export class DifficultySelectState {
    constructor(game, levelId) {
        this._game    = game;
        this._levelId = levelId;
        this._btns    = [];
        this._backBtn = null;
        this._level   = null;
        this._tap     = null;
    }

    enter() {
        this._level = this._game.data.getLevel(this._levelId);
        this._btns  = DIFFICULTIES.map((d, i) => ({
            ...d,
            x: BTN_X,
            y: BTN_START_Y + i * (BTN_H + BTN_GAP),
            w: BTN_W,
            h: BTN_H,
        }));
        this._backBtn = {
            id: 'back', label: 'BACK',
            x: 16, y: 16, w: 90, h: 36, enabled: true,
        };
    }

    handleInput(ev) {
        if (ev.type === 'up') this._tap = { x: ev.x, y: ev.y };
    }

    update() {
        if (!this._tap) return;
        const t   = this._tap;
        this._tap = null;

        if (UIPainter.isInside(t, this._backBtn)) {
            this._game.sound?.play(SoundEvent.UI_CLICK);
            this._game.transitionTo(new CampaignSelectState(this._game));
            return;
        }

        for (const btn of this._btns) {
            if (UIPainter.isInside(t, btn)) {
                this._game.sound?.play(SoundEvent.UI_CLICK);
                this._startBattle(btn.id);
                return;
            }
        }
    }

    _startBattle(difficulty) {
        this._game.run.levelId    = this._levelId;
        this._game.run.difficulty = difficulty;
        this._game.transitionTo(BattleState.create(this._game));
    }

    render(ctx) {
        UIPainter.button(ctx, this._backBtn);

        UIPainter.text(ctx, 'SELECT DIFFICULTY', GameConfig.VIEW_WIDTH / 2, 70, {
            font:    'bold 22px system-ui',
            color:   GameConfig.COLOR.GOLD,
            align:   'center',
            outline: { color: GameConfig.COLOR.TITLE_OUTLINE, width: 2 },
            custom:  true,
        });

        if (this._level) {
            UIPainter.text(ctx, this._level.title, GameConfig.VIEW_WIDTH / 2, 130, {
                font:  'bold 18px system-ui',
                color: GameConfig.COLOR.TEXT,
                align: 'center',
            });
            if (this._level.subtitle) {
                UIPainter.text(ctx, this._level.subtitle, GameConfig.VIEW_WIDTH / 2, 160, {
                    font:  '14px system-ui',
                    color: GameConfig.COLOR.TEXT_DIM,
                    align: 'center',
                });
            }
        }

        for (const btn of this._btns) this._drawDifficultyBtn(ctx, btn);
    }

    _drawDifficultyBtn(ctx, btn) {
        UIPainter.panel(ctx, btn.x, btn.y, btn.w, btn.h, {
            fill:   'rgba(20,16,40,0.90)',
            stroke: btn.color,
        });

        UIPainter.text(ctx, btn.label, btn.x + 20, btn.y + 34, {
            font:  'bold 20px system-ui',
            color: btn.color,
        });

        UIPainter.text(ctx, btn.desc, btn.x + 20, btn.y + 58, {
            font:  '13px system-ui',
            color: GameConfig.COLOR.TEXT_DIM,
        });

        // Difficulty indicator dot (right side)
        ctx.save();
        ctx.beginPath();
        ctx.arc(btn.x + btn.w - 32, btn.y + btn.h / 2, 10, 0, Math.PI * 2);
        ctx.fillStyle   = btn.color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.restore();
    }
}

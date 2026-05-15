import { GameConfig } from '../config/GameConfig.js';
import { UIPainter } from '../ui/UIPainter.js';
import { CardArt } from '../ui/CardArt.js';
import { ModeSelectState } from './ModeSelectState.js';
import { DeckBuilderState } from './DeckBuilderState.js';
import { SoundEvent } from '../audio/SoundEvent.js';

/**
 * Hero selection screen. Lists all heroes from DataRegistry.
 */
export class HeroSelectState {
    constructor(game) {
        this._game = game;
        this._heroes = [];
        this._cards = [];           // per-hero panel rects
        this._selected = null;
        this._confirmBtn = null;
        this._backBtn = null;
        this._tap = null;
    }

    enter() {
        this._heroes = this._game.data.getAllHeroes();
        const w = 220, h = 200, gap = 16;
        const cols = 2;
        const totalW = cols * w + (cols - 1) * gap;
        const startX = (GameConfig.VIEW_WIDTH - totalW) / 2;
        const startY = 110;
        this._cards = this._heroes.map((hero, i) => {
            const c = i % cols, r = Math.floor(i / cols);
            return { hero, x: startX + c * (w + gap), y: startY + r * (h + gap), w, h };
        });
        this._confirmBtn = { id: 'confirm', label: 'NEXT: BUILD DECK',
            x: GameConfig.VIEW_WIDTH / 2 - 130, y: 720, w: 260, h: 56, enabled: false };
        this._backBtn = { id: 'back', label: '◀ BACK', x: 16, y: 16, w: 90, h: 36, enabled: true };
    }
    exit() {
        //nothing to clean up
    }

    handleInput(ev) { if (ev.type === 'up') this._tap = { x: ev.x, y: ev.y }; }

    update() {
        if (!this._tap) return;
        const t = this._tap; this._tap = null;
        if (UIPainter.isInside(t, this._backBtn)) {
            this._game.sound?.play(SoundEvent.UI_CLICK);
            this._game.transitionTo(new ModeSelectState(this._game));
            return;
        }
        for (const card of this._cards) {
            if (UIPainter.isInside(t, card)) {
                this._game.sound?.play(SoundEvent.UI_CLICK);
                this._selected = card.hero.id;
                break;
            }
        }
        this._confirmBtn.enabled = !!this._selected;
        if (this._selected && UIPainter.isInside(t, this._confirmBtn)) {
            this._game.sound?.play(SoundEvent.UI_CLICK);
            this._game.run.heroId = this._selected;
            this._game.transitionTo(new DeckBuilderState(this._game));
        }
    }

    render(ctx) {
        UIPainter.button(ctx, this._backBtn);
        UIPainter.text(ctx, 'CHOOSE YOUR HERO', GameConfig.VIEW_WIDTH / 2, 70,
            { font: 'bold 22px system-ui', color: GameConfig.COLOR.GOLD, align: 'center' });

        for (const c of this._cards) this._drawHeroCard(ctx, c);
        UIPainter.button(ctx, this._confirmBtn);
    }

    _drawHeroCard(ctx, card) {
        const isSel = this._selected === card.hero.id;
        const tint = card.hero.color ?? '#5fa8ff';
        const stroke = isSel ? GameConfig.COLOR.GOLD : tint;

        // Outer glow when selected
        if (isSel) {
            ctx.save();
            ctx.shadowColor = tint;
            ctx.shadowBlur = 18;
            UIPainter.panel(ctx, card.x, card.y, card.w, card.h, {
                fill: 'rgba(20,16,40,0.95)', stroke, lineWidth: 2, radius: 12
            });
            ctx.restore();
        } else {
            UIPainter.panel(ctx, card.x, card.y, card.w, card.h, {
                fill: 'rgba(20,16,40,0.85)', stroke, lineWidth: 1, radius: 12
            });
        }

        // Portrait area: tinted plaque + sprite
        const portraitH = 115;
        const px = card.x + 10;
        const py = card.y + 10;
        const pw = card.w - 20;
        UIPainter.panel(ctx, px, py, pw, portraitH, {
            fill: this._mixTint(tint, 0.18), stroke: 'rgba(0,0,0,0.0)', radius: 8
        });
        const sheetId = CardArt.heroSheetId(card.hero);
        const sheet = sheetId ? this._game.assets.peekSheet(sheetId) : null;
        if (!UIPainter.spriteFrame(ctx, sheet, 0, px + 4, py + 4, pw - 8, portraitH - 8)) {
            // Fallback: colored circle if sprite missing
            ctx.fillStyle = tint;
            ctx.beginPath();
            ctx.arc(card.x + card.w / 2, py + portraitH / 2, 26, 0, Math.PI * 2);
            ctx.fill();
        }

        UIPainter.text(ctx, card.hero.name, card.x + card.w / 2, card.y + portraitH + 26,
            { font: 'bold 20px system-ui', align: 'center',
              color: isSel ? GameConfig.COLOR.GOLD : GameConfig.COLOR.TEXT,
              outline: { color: 'rgba(0,0,0,0.95)', width: 1 } });
        const h = card.hero;
        const stats = [
            `HP ${h.hp}   Regen ${h.hpRegen}/s`,
            `DMG ${h.attackDamage} every ${h.attackInterval.toFixed(2)}s`,
            `Range ${h.attackRange}   Speed ${h.moveSpeed}`
        ];
        let y = card.y + portraitH + 46;
        for (const s of stats) {
            UIPainter.text(ctx, s, card.x + card.w / 2, y,
                { font: '13px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'center',
                  outline: { color: 'rgba(0,0,0,0.95)', width: 1 } });
            y += 15;
        }
    }

    /** Returns a translucent tint over a near-black backdrop (CSS rgba string). */
    _mixTint(hex, alpha) {
        const r = Number.parseInt(hex.slice(1, 3), 16);
        const g = Number.parseInt(hex.slice(3, 5), 16);
        const b = Number.parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
}

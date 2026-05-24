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
        const w = 452, h = 155, gap = 10;
        const cols = 1;
        const startX = (GameConfig.VIEW_WIDTH - w) / 2;
        const startY = 90;
        this._cards = this._heroes.map((hero, i) => {
            const c = i % cols, r = Math.floor(i / cols);
            return { hero, x: startX + c * (w + gap), y: startY + r * (h + gap), w, h };
        });
        this._confirmBtn = {
            id: 'confirm', label: 'NEXT: BUILD DECK',
            x: GameConfig.VIEW_WIDTH / 2 - 130, y: 750, w: 260, h: 50, enabled: false
        };
        this._backBtn = { id: 'back', label: 'BACK', x: 16, y: 16, w: 90, h: 36, enabled: true };
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
            {
                font: 'bold 22px system-ui',
                color: GameConfig.COLOR.GOLD,
                align: 'center',
                outline: { color: GameConfig.COLOR.TITLE_OUTLINE, width: 2 },
                custom: true
            });

        for (const c of this._cards) this._drawHeroCard(ctx, c);
        UIPainter.button(ctx, this._confirmBtn);
    }

    _drawHeroCard(ctx, card) {
        const isSel = this._selected === card.hero.id;
        const h = card.hero;
        const tint = h.color ?? '#5fa8ff';
        const stroke = isSel ? GameConfig.COLOR.GOLD : tint;
        const PP = 12;
        const PS = 96;

        // ── Background panel ──────────────────────────────────────────────────
        ctx.save();
        if (isSel) { ctx.shadowColor = tint; ctx.shadowBlur = 22; }
        UIPainter.panel(ctx, card.x, card.y, card.w, card.h, {
            fill: isSel ? 'rgba(255,209,102,0.12)' : 'rgba(20,16,40,0.92)',
            stroke, lineWidth: isSel ? 2 : 1, radius: 10,
        });
        ctx.restore();

        // ── Tinted header band (clips to top rounded edge) ────────────────────
        ctx.save();
        ctx.beginPath();
        ctx.rect(card.x, card.y, card.w, 30);
        ctx.clip();
        UIPainter.panel(ctx, card.x, card.y, card.w, card.h, {
            fill: this._mixTint(tint, 0.3), stroke: 'rgba(0,0,0,0)', radius: 10,
        });
        ctx.restore();

        // ── Portrait ──────────────────────────────────────────────────────────
        const px = card.x + PP;
        const py = card.y + PP;
        UIPainter.panel(ctx, px, py, PS, PS, {
            fill: 'rgba(0,0,0,0.38)', stroke: this._mixTint(tint, 0.45), lineWidth: 1, radius: 6,
        });
        const sheetId = CardArt.heroSheetId(h);
        const sheet = sheetId ? this._game.assets.peekSheet(sheetId) : null;
        if (!UIPainter.spriteFrame(ctx, sheet, 0, px + 2, py + 2, PS - 4, PS - 4)) {
            ctx.save();
            ctx.fillStyle = tint;
            ctx.beginPath();
            ctx.arc(px + PS / 2, py + PS / 2, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── Right column ──────────────────────────────────────────────────────
        const tx = card.x + PP + PS + 10;  // x + 118

        UIPainter.text(ctx, h.name.toUpperCase(), tx, card.y + 22, {
            font: 'bold 16px system-ui', align: 'left',
            color: isSel ? GameConfig.COLOR.GOLD : GameConfig.COLOR.TEXT,
            outline: { color: 'rgba(0,0,0,0.95)', width: 1 },
        });

        this._heroBadge(ctx, tx, card.y + 28, h.attackKind, tint);

        // Separator
        ctx.save();
        ctx.strokeStyle = this._mixTint(tint, 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, card.y + 49);
        ctx.lineTo(card.x + card.w - PP, card.y + 49);
        ctx.stroke();
        ctx.restore();

        // Stats
        const SH = 14;
        const dps = (h.attackDamage / h.attackInterval).toFixed(1);
        this._heroStat(ctx, tx, card.y + 57, 'HP', `${h.hp}`, GameConfig.COLOR.HP_GOOD);
        this._heroStat(ctx, tx, card.y + 57 + SH, 'REG', `${h.hpRegen}/s`, GameConfig.COLOR.HP_GOOD);
        this._heroStat(ctx, tx, card.y + 57 + SH * 2, 'ATK', `${h.attackDamage}`, '#ffb066');
        this._heroStat(ctx, tx, card.y + 57 + SH * 3, 'DPS', dps, '#ffb066');

        // ── Full-width divider ────────────────────────────────────────────────
        const divY = card.y + PP + PS + 8;  // y + 116
        ctx.save();
        ctx.strokeStyle = this._mixTint(tint, 0.22);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(card.x + PP, divY);
        ctx.lineTo(card.x + card.w - PP, divY);
        ctx.stroke();
        ctx.restore();

        // ── Bottom stat grid ──────────────────────────────────────────────────
        const BOT_Y = divY + 10;
        const half = (card.w / 2) - 2;
        this._heroStat(ctx, card.x + PP, BOT_Y, 'RNG', this._rangeLabel(h.attackRange, h.attackKind), GameConfig.COLOR.TEXT_DIM);
        this._heroStat(ctx, card.x + PP + half, BOT_Y, 'INT', `${h.attackInterval.toFixed(2)}s`, GameConfig.COLOR.TEXT_DIM);
        this._heroStat(ctx, card.x + PP, BOT_Y + SH, 'SPD', this._speedLabel(h.moveSpeed), '#9be3ff');
        this._heroStat(ctx, card.x + PP + half, BOT_Y + SH, 'RES', `${h.respawnDelay}s`, '#c97aff');
    }

    _heroStat(ctx, x, y, label, value, valueColor) {
        UIPainter.text(ctx, `${label}:`, x, y, {
            font: '12px system-ui', color: GameConfig.COLOR.TEXT, align: 'left',
            outline: { color: 'rgba(0,0,0,0.9)', width: 1 },
        });
        UIPainter.text(ctx, `${value}`, x + 46, y, {
            font: 'bold 12px system-ui', color: valueColor ?? GameConfig.COLOR.TEXT, align: 'left',
            outline: { color: 'rgba(0,0,0,0.9)', width: 1 },
        });
    }

    _heroBadge(ctx, x, y, kind, tint) {
        const label = kind === 'melee' ? 'MELEE' : 'RANGED';
        const bw = 66, bh = 16;
        UIPainter.panel(ctx, x, y, bw, bh, {
            fill: this._mixTint(tint, 0.35),
            stroke: this._mixTint(tint, 0.7),
            lineWidth: 1, radius: 3,
        });
        UIPainter.text(ctx, label, x + bw / 2, y + bh - 4, {
            font: 'bold 11px system-ui', color: '#ffffff', align: 'center',
        });
    }

    _wrapText(ctx, text, maxWidth, font) {
        ctx.save();
        ctx.font = font;
        const words = text.split(' ');
        const lines = [];
        let current = '';
        for (const word of words) {
            const test = current ? `${current} ${word}` : word;
            if (ctx.measureText(test).width > maxWidth && current) {
                lines.push(current);
                current = word;
            } else {
                current = test;
            }
        }
        if (current) lines.push(current);
        ctx.restore();
        return lines;
    }

    _speedLabel(spd) {
        if (spd <= 0) return 'Static';
        if (spd <= 45) return 'V.Slow';
        if (spd <= 65) return 'Slow';
        if (spd <= 85) return 'Normal';
        if (spd <= 110) return 'Fast';
        return 'V.Fast';
    }

    _rangeLabel(range, attackKind) {
        if (attackKind === 'support' || range <= 0) return 'Aura';
        if (range < 35) return 'Melee';
        if (range < 100) return 'Short';
        if (range < 180) return 'Long';
        return 'Sniper';
    }

    /** Returns a translucent tint over a near-black backdrop (CSS rgba string). */
    _mixTint(hex, alpha) {
        const r = Number.parseInt(hex.slice(1, 3), 16);
        const g = Number.parseInt(hex.slice(3, 5), 16);
        const b = Number.parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
}

import { GameConfig } from '../config/GameConfig.js';
import { UIPainter } from './UIPainter.js';
import { CardArt } from './CardArt.js';

const PORTRAIT_SIZE = 82;
const PORTRAIT_PAD = 6;
const RIGHT_GAP = 8;
const STAT_LINE_H = 14;
const LABEL_W = 50;   // px reserved for the label before value starts

const ATTACK_KIND_LABELS = Object.freeze({
    melee: 'Melee', ranged: 'Ranged', cleave: 'Cleave', support: 'Support',
});

const SPELL_TYPE_LABELS = Object.freeze({
    aoe_damage: 'AoE Damage',
    aoe_damage_slow: 'Dmg + Slow',
    single_damage: 'Single Target',
    aoe_heal: 'AoE Heal',
});

const VISIBLE_TAGS = new Set([
    'flying', 'tank', 'regen', 'swarm', 'fast', 'siege',
    'undead', 'fire', 'magic', 'slow', 'poison', 'taunt', 'berserk', 'assassin',
]);

const COUNT_TAG_BY_KIND = Object.freeze({
    summon: (card) => (card.count > 1 ? `x${card.count} ` : ''),
});

const SPELL_EFFECT_STAT = Object.freeze({
    aoe_heal: (sp) => ({ label: 'HEAL', value: sp.amount, color: GameConfig.COLOR.HP_GOOD }),
});

/**
 * Renders a detailed card tile in the DeckBuilder.
 * Summons show unit stats; spells show effect stats.
 * Pure rendering — no game logic.
 */
export class CardDetailPainter {
    static CARD_H = 220;

    constructor(assets, data) {
        this._assets = assets;
        this._data = data;
        this._rightStatsByKind = Object.freeze({
            summon: (ctx, x, y, card) => this._drawSummonRightStats(ctx, x, y, card),
            spell: (ctx, x, y, card) => this._drawSpellRightStats(ctx, x, y, card),
        });
        this._detailByKind = Object.freeze({
            summon: (ctx, x, y, w, card) => this._drawSummonDetail(ctx, x, y, w, card),
            spell: (ctx, x, y, w, card) => this._drawSpellDetail(ctx, x, y, w, card),
        });
    }

    drawCard(ctx, rect, card, selected) {
        this._drawBackground(ctx, rect, card, selected);
        this._drawPortrait(ctx, rect, card);
        this._drawRightHeader(ctx, rect, card);
        this._drawRightStats(ctx, rect, card);
        this._drawDetailSection(ctx, rect, card);
    }

    // ── Background ────────────────────────────────────────────────────────────

    _drawBackground(ctx, rect, card, selected) {
        const rarity = CardArt.rarityStyle(card.rarity);
        UIPainter.panel(ctx, rect.x, rect.y, rect.w, rect.h, {
            fill: selected ? 'rgba(255,209,102,0.18)' : 'rgba(28,22,52,0.92)',
            stroke: selected ? GameConfig.COLOR.GOLD : rarity.stroke,
            lineWidth: selected ? 2 : 1,
            radius: 6,
        });
    }

    // ── Portrait ──────────────────────────────────────────────────────────────

    _drawPortrait(ctx, rect, card) {
        const px = rect.x + PORTRAIT_PAD;
        const py = rect.y + PORTRAIT_PAD;
        const ps = PORTRAIT_SIZE;

        UIPainter.panel(ctx, px, py, ps, ps, {
            fill: 'rgba(0,0,0,0.35)', stroke: 'rgba(0,0,0,0)', radius: 5,
        });

        const sheet = this._assets.peekSheet(CardArt.cardSheetId(card));
        if (!UIPainter.spriteFrame(ctx, sheet, 0, px + 1, py + 1, ps - 2, ps - 2)) {
            ctx.save();
            ctx.fillStyle = card.spell?.fxColor ?? '#9be3ff';
            ctx.beginPath();
            ctx.arc(px + ps / 2, py + ps / 2, ps / 2 - 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        this._drawCostGem(ctx, px + 2, py + 2, card.cost);
    }

    // ── Right column header ───────────────────────────────────────────────────

    _drawRightHeader(ctx, rect, card) {
        const tx = rect.x + PORTRAIT_PAD + PORTRAIT_SIZE + RIGHT_GAP;
        const nameY = rect.y + 17;
        const tw = rect.x + rect.w - tx - 4;

        const nameLines = this._textLines(card.name, tw).slice(0, 2);
        nameLines.forEach((line, i) => {
            UIPainter.text(ctx, line, tx, nameY + i * 13, {
                font: 'bold 13px system-ui', align: 'left', color: GameConfig.COLOR.TEXT,
                outline: { color: 'rgba(0,0,0,0.95)', width: 1 },
            });
        });

        const countTag = COUNT_TAG_BY_KIND[card.kind]?.(card) ?? '';
        const kindLabel = `${countTag}${card.kind.toUpperCase()}`;
        UIPainter.text(ctx, kindLabel, tx, nameY + nameLines.length * 13 + 2, {
            font: '10px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'left',
        });
    }

    // ── Right column stats ────────────────────────────────────────────────────

    _drawRightStats(ctx, rect, card) {
        const tx = rect.x + PORTRAIT_PAD + PORTRAIT_SIZE + RIGHT_GAP;
        const tw = rect.x + rect.w - tx - 4;
        const nameLineCount = Math.min(this._textLines(card.name, tw).length, 2);
        const baseY = rect.y + 32 + nameLineCount * 13;
        this._rightStatsByKind[card.kind]?.(ctx, tx, baseY, card);
    }

    _drawSummonRightStats(ctx, x, y, card) {
        const unit = this._data.getUnit(card.unitId);
        this._statLine(ctx, x, y, 'HP', unit.hp, GameConfig.COLOR.HP_GOOD);
        if (unit.attackKind === 'support') {
            const auraRadius = unit.auraEffect?.radius;
            this._statLine(ctx, x, y + STAT_LINE_H, 'AURA', auraRadius ? `r:${auraRadius}` : 'Passive', '#9be3ff');
        } else {
            this._statLine(ctx, x, y + STAT_LINE_H, 'ATK', `${unit.attackDamage} dmg`, '#ffb066');
        }
        this._statLine(ctx, x, y + STAT_LINE_H * 2, 'SPD', unit.moveSpeed, GameConfig.COLOR.TEXT_DIM);
    }

    _drawSpellRightStats(ctx, x, y, card) {
        const sp = card.spell;
        if (!sp) return;
        const effect = SPELL_EFFECT_STAT[sp.type]?.(sp) ?? { label: 'DMG', value: sp.damage, color: '#ffb066' };
        UIPainter.text(ctx, SPELL_TYPE_LABELS[sp.type] ?? sp.type, x, y, {
            font: 'bold 11px system-ui', color: '#9be3ff', align: 'left',
        });
        this._statLine(ctx, x, y + STAT_LINE_H, effect.label, effect.value, effect.color);
        this._statLine(ctx, x, y + STAT_LINE_H * 2, 'AOE', `r:${sp.radius ?? '-'}`, GameConfig.COLOR.TEXT_DIM);
    }

    // ── Full-width detail section (below portrait) ────────────────────────────

    _drawDetailSection(ctx, rect, card) {
        const x = rect.x + PORTRAIT_PAD;
        const y = rect.y + PORTRAIT_PAD + PORTRAIT_SIZE + RIGHT_GAP;
        const w = rect.w - PORTRAIT_PAD * 2;
        this._detailByKind[card.kind]?.(ctx, x, y, w, card);
    }

    _drawSummonDetail(ctx, x, y, w, card) {
        const unit = this._data.getUnit(card.unitId);
        const COL = w / 2;

        // Row 1: RNG + INT
        this._statLine(ctx, x, y, 'RNG', this._rangeLabel(unit.attackRange, unit.attackKind), GameConfig.COLOR.TEXT_DIM);
        this._statLine(ctx, x + COL, y, 'INT', `${unit.attackInterval}s`, GameConfig.COLOR.TEXT_DIM);
        // Row 2: KIND + CDL
        this._statLine(ctx, x, y + STAT_LINE_H, 'KIND', ATTACK_KIND_LABELS[unit.attackKind] ?? unit.attackKind, GameConfig.COLOR.TEXT);
        this._statLine(ctx, x + COL, y + STAT_LINE_H, 'CDL', `${card.cooldown}s`, GameConfig.COLOR.TEXT_DIM);

        let nextY = y + STAT_LINE_H * 2;

        // Optional: special ability stat (aura, regen, rage, siege…)
        const special = this._specialLabel(unit);
        if (special) {
            this._statLine(ctx, x, nextY, special.key, special.val, special.color);
            nextY += STAT_LINE_H;
        }

        // Tags
        const tags = (unit.tags ?? [])
            .filter((t) => VISIBLE_TAGS.has(t))
            .map((t) => t.charAt(0).toUpperCase() + t.slice(1));
        if (tags.length > 0) {
            const lineCount = this._drawWrappedText(ctx, tags.join(' · '), x + w / 2, nextY, w, {
                font: '11px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'center',
                outline: { color: 'rgba(0,0,0,0.9)', width: 1 },
            });
            nextY += STAT_LINE_H * lineCount;
        }

        // Trigger: on-death, on-hit, cleave description
        const trigger = this._triggerLabel(unit);
        if (trigger) {
            this._drawWrappedText(ctx, trigger, x + w / 2, nextY, w, {
                font: '11px system-ui', color: '#c97aff', align: 'center',
                outline: { color: 'rgba(0,0,0,0.9)', width: 1 },
            });
        }
    }

    _drawSpellDetail(ctx, x, y, w, card) {
        const sp = card.spell;
        if (!sp) return;
        const COL = w / 2;

        this._statLine(ctx, x, y, 'CDL', `${card.cooldown}s`, GameConfig.COLOR.TEXT_DIM);

        if (sp.slowFactor !== undefined) {
            const pct = Math.round((1 - sp.slowFactor) * 100);
            this._statLine(ctx, x + COL, y, 'SLOW', `-${pct}%`, '#9be3ff');
            this._statLine(ctx, x, y + STAT_LINE_H, 'DUR', `${sp.slowDuration}s`, '#9be3ff');
        }

        if (sp.groundOnly) {
            UIPainter.text(ctx, 'Ground units only', x + w / 2, y + STAT_LINE_H * 2, {
                font: '10px system-ui', color: '#c97aff', align: 'center', outline: { color: 'rgba(0,0,0,0.9)', width: 1 },
            });
        }
    }

    // ── Shared primitives ─────────────────────────────────────────────────────

    _statLine(ctx, x, y, label, value, valueColor) {
        UIPainter.text(ctx, `${label}:`, x, y, {
            font: '11px system-ui', color: GameConfig.COLOR.TEXT, align: 'left', outline: { color: 'rgba(0,0,0,0.9)', width: 1 },
        });
        UIPainter.text(ctx, `${value}`, x + LABEL_W, y, {
            font: 'bold 11px system-ui', color: valueColor ?? GameConfig.COLOR.TEXT, align: 'left', outline: { color: 'rgba(0,0,0,0.9)', width: 1 },
        });
    }

    _drawCostGem(ctx, x, y, cost) {
        const r = 12, cx = x + r, cy = y + r;
        ctx.save();
        ctx.fillStyle = GameConfig.COLOR.MANA;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        UIPainter.text(ctx, `${cost}`, cx, cy + 5, {
            font: 'bold 14px system-ui', color: '#fff', align: 'center',
            outline: { color: 'rgba(0,0,0,0.9)', width: 1 },
        });
    }

    _fitText(s, maxWidthPx, charPx) {
        const max = Math.max(3, Math.floor(maxWidthPx / charPx));
        return s.length <= max ? s : `${s.slice(0, Math.max(1, max - 1))}\u2026`;
    }
    /**
     * Splits `text` into word-wrapped lines that fit within `maxWidth` px.
     * Uses `charPx` as the approximate glyph advance width.
     */
    _textLines(text, maxWidth) {
        // BitmapFont advancePx=18 at scale=1; at 11px → scale=0.5 → advance=9px
        const charPx = 9;
        const maxChars = Math.max(6, Math.floor(maxWidth / charPx));
        const words = text.split(' ');
        const lines = [];
        let current = '';
        for (const word of words) {
            const candidate = current ? `${current} ${word}` : word;
            if (candidate.length > maxChars && current) {
                lines.push(current);
                current = word;
            } else {
                current = candidate;
            }
        }
        if (current) lines.push(current);
        return lines;
    }

    /**
     * Draws word-wrapped text centered at `cx`.
     * Returns the number of lines rendered (so callers can advance Y).
     */
    _drawWrappedText(ctx, text, cx, y, maxWidth, opts) {
        const lines = this._textLines(text, maxWidth);
        for (const line of lines) {
            UIPainter.text(ctx, line, cx, y, opts);
            y += STAT_LINE_H;
        }
        return lines.length;
    }
    // ── Label helpers ─────────────────────────────────────────────────────────

    _rangeLabel(range, attackKind) {
        if (attackKind === 'support' || range <= 0) return 'Aura';
        if (range < 35) return 'Melee';
        if (range < 100) return 'Short';
        if (range < 180) return 'Long';
        return 'Sniper';
    }

    /** Returns a { key, val, color } descriptor for notable passives, or null. */
    _specialLabel(unit) {
        if (unit.hpRegen > 0) return { key: 'REGEN', val: `${unit.hpRegen}/s`, color: GameConfig.COLOR.HP_GOOD };
        if (unit.siegeBonus) return { key: 'SIEGE', val: `x${unit.siegeBonus} vs Tower`, color: '#ffb066' };
        if (unit.auraEffect?.type === 'heal') return { key: 'AURA', val: `+${unit.auraEffect.amountPerSecond}/s allies`, color: GameConfig.COLOR.HP_GOOD };
        if (unit.auraEffect?.type === 'buff') return { key: 'BUFF', val: `+${Math.round((unit.auraEffect.damageMult - 1) * 100)}% DMG`, color: '#ffd166' };
        if (unit.auraEffect?.type === 'slow') return { key: 'AURA', val: 'Slows nearby foes', color: '#9be3ff' };
        if (unit.auraEffect?.type === 'dot') return { key: 'AURA', val: `${unit.auraEffect.damagePerSecond} dmg/s foes`, color: '#8fd66c' };
        if (unit.lowHpRageMult) return { key: 'RAGE', val: `x${unit.lowHpRageMult} below 50% HP`, color: '#ff6a3a' };
        if (unit.tauntRadius) return { key: 'TAUNT', val: `forces targets r:${unit.tauntRadius}`, color: '#ffd166' };
        return null;
    }

    /** Returns a one-line trigger description, or null if none. */
    _triggerLabel(unit) {
        const od = unit.onDeath;
        if (od?.type === 'summon') {
            return `On death: spawn ${od.count}x ${od.unitId.replaceAll('_', ' ')}`;
        }
        const oh = unit.onHitEffect;
        if (oh?.type === 'slow') {
            return `On hit: slow -${Math.round((1 - oh.factor) * 100)}% (${oh.duration}s)`;
        }
        if (unit.splashRadius) {
            return `Cleave: ${Math.round(unit.splashDamageMult * 100)}% dmg in r:${unit.splashRadius}`;
        }
        return null;
    }
}

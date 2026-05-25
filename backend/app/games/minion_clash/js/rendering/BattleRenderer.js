import { GameConfig } from '../config/GameConfig.js';
import { EntityKind } from '../entities/Entity.js';
import { UIPainter } from '../ui/UIPainter.js';
import { CardArt } from '../ui/CardArt.js';
import { ArenaTheme } from './ArenaTheme.js';
import { VfxDrawRegistry } from '../vfx/VfxDrawRegistry.js';

/** Visual config for each aura type — drawn beneath all sprites in a dedicated pass. */
const AURA_STYLES = Object.freeze({
    heal: { fill: 'rgba(160,230,100,0.05)', stroke: 'rgba(160,230,100,0.50)', freq: 0.8 },
    buff: { fill: 'rgba(255,200, 60,0.06)', stroke: 'rgba(255,215, 60,0.60)', freq: 0.7 },
    slow: { fill: 'rgba(170,140,255,0.05)', stroke: 'rgba(170,140,255,0.50)', freq: 0.6 },
    dot:  { fill: 'rgba(100,185, 60,0.06)', stroke: 'rgba(100,185, 60,0.52)', freq: 1.1 },
});

/**
 * Renders the battle: arena, entities, projectiles, VFX, and the bottom HUD
 * (mana bar + 4-card hand + tower HP). Pure draw — no game logic.
 */
export class BattleRenderer {
    constructor(world) {
        this._world = world;
        const themeId = world?.level?.theme ?? ArenaTheme.forLevel(world?.level?.id);
        this._arena = new ArenaTheme(themeId);
        this._vfxDrawRegistry = VfxDrawRegistry.createDefault()
            .register('spell', (ctx, it) => this._drawSpellVfx(ctx, it));
    }

    render(ctx, drag) {
        this._drawArena(ctx);
        this._drawEntities(ctx);
        this._drawVfx(ctx);
        this._drawTopHud(ctx);
        this._drawHand(ctx, drag);
        if (drag?.previewCardId) this._drawDragPreview(ctx, drag);
    }

    _drawArena(ctx) {
        this._arena.draw(ctx);
    }

    _drawEntities(ctx) {
        const list = this._world.entityManager.list();
        // Pass 0: aura rings beneath everything.
        this.drawAuraRings(list, ctx);
        // Draw in z-order: towers, units/heroes, projectiles.
        this.drawTowers(list, ctx);
        this.drawUnitsAndHeroes(list, ctx);
        this.drawProjectiles(list, ctx);
        // Animate dead towers culled from the entity list
        const pt = this._world.player?.tower;
        const et = this._world.enemy?.tower;
        if (pt?.isDead() && pt.deathTimestamp) this._drawTower(ctx, pt);
        if (et?.isDead() && et.deathTimestamp) this._drawTower(ctx, et);
    }

    drawProjectiles(list, ctx) {
        for (const e of list) {
            if (e.kind === EntityKind.PROJECTILE) this._drawProjectile(ctx, e);
        }
    }

    drawUnitsAndHeroes(list, ctx) {
        for (const e of list) {
            if (e.kind === EntityKind.UNIT) this._drawUnit(ctx, e);
            else if (e.kind === EntityKind.HERO) this._drawHero(ctx, e);
        }
    }

    drawTowers(list, ctx) {
        for (const e of list) {
            if (e.kind === EntityKind.TOWER) this._drawTower(ctx, e);
        }
    }

    drawAuraRings(list, ctx) {
        for (const e of list) {
            if (e.kind === EntityKind.UNIT) this._drawAura(ctx, e);
        }
    }

    _drawAura(ctx, e) {
        const aura = e.def?.auraEffect;
        if (!aura || e.isDead()) return;
        const style = AURA_STYLES[aura.type];
        if (!style) return;
        const t = performance.now() / 1000;
        const pulse = 1 + 0.04 * Math.sin(t * style.freq * Math.PI * 2);
        const r = aura.radius * pulse;
        ctx.save();
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fillStyle = style.fill;
        ctx.fill();
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    _teamColor(team) {
        return team === 'player' ? GameConfig.COLOR.PLAYER_TINT : GameConfig.COLOR.ENEMY_TINT;
    }

    _drawTower(ctx, t) {
        if (t.isDead()) {
            if (!t.deathTimestamp) return;
            const elapsed = performance.now() - t.deathTimestamp;
            if (elapsed > 1500) return;
            const p = elapsed / 1500;
            ctx.save();
            ctx.globalAlpha = 1 - p;
            ctx.translate(t.x, t.y);
            ctx.rotate(p * Math.PI * 2);
            const s = 1 + p * 1.2;
            ctx.scale(s, s);
            ctx.translate(-t.x, -t.y);
            this._drawTowerBody(ctx, t);
            ctx.restore();
            return;
        }
        this._drawTowerBody(ctx, t);
        this._hpBar(ctx, t, 56);
    }

    _drawTowerBody(ctx, t) {
        if (t.sprite) {
            t.sprite.draw(ctx, t.x, t.y, t.facingX);
            this._teamRingTower(ctx, t);
            return;
        }
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.fillStyle = '#3a3550';
        ctx.fillRect(-t.radius, -t.radius, t.radius * 2, t.radius * 2);
        ctx.fillStyle = this._teamColor(t.team);
        ctx.fillRect(-t.radius + 4, -t.radius + 4, t.radius * 2 - 8, 6);
        ctx.fillRect(-t.radius + 4, t.radius - 10, t.radius * 2 - 8, 6);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.strokeRect(-t.radius + 0.5, -t.radius + 0.5, t.radius * 2 - 1, t.radius * 2 - 1);
        ctx.restore();
    }

    _teamRingTower(ctx, t) {
        ctx.strokeStyle = this._teamColor(t.team);
        ctx.lineWidth = 2;
        ctx.strokeRect(t.x - t.radius, t.y - t.radius, t.radius * 2, t.radius * 2);
    }

    _drawUnit(ctx, u) {
        if (u.sprite) {
            u.sprite.draw(ctx, u.x, u.y, u.facingX);
            this._drawDotOverlay(ctx, u);
            this._hpBar(ctx, u, u.radius * 2 + 6);
            return;
        }
        const c = u.def.color ?? '#aaa';
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
        ctx.fill();
        // Flying marker (small wings dot)
        if (u.def.tags?.includes('flying')) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(u.x - 3, u.y - u.radius - 4, 6, 1);
        }
        this._hpBar(ctx, u, u.radius * 2 + 6);
    }

    _drawHero(ctx, h) {
        if (h.sprite) {
            h.sprite.draw(ctx, h.x, h.y, h.facingX);
            this._drawDotOverlay(ctx, h);
            this._hpBar(ctx, h, h.radius * 2 + 8);
            return;
        }
        const c = h.def.color ?? '#fff';
        ctx.save();
        ctx.translate(h.x, h.y);
        // Star/diamond shape
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(0, -h.radius - 2);
        ctx.lineTo(h.radius + 2, 0);
        ctx.lineTo(0, h.radius + 2);
        ctx.lineTo(-h.radius - 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        this._hpBar(ctx, h, h.radius * 2 + 8);
    }

    _drawDotOverlay(ctx, e) {
        if (!e.hasDot()) return;
        const t = performance.now() / 1000;
        const pulse = 0.55 + 0.22 * Math.sin(t * 4);
        const r = (e.sprite ? e.sprite.halfHeight() * 0.55 : e.radius) + 3;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#5fdc28';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = pulse * 0.18;
        ctx.fillStyle = '#5fdc28';
        ctx.fill();
        ctx.restore();
    }

    _drawProjectile(ctx, p) {
        if (p.sprite) {
            p.sprite.draw(ctx, p.x, p.y, 1, p.angle);
            return;
        }
        ctx.fillStyle = p.color ?? '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    _hpBar(ctx, e, width) {
        if (e.hp >= e.maxHp) return;
        const ratio = Math.max(0, e.hp / e.maxHp);
        const w = width;
        const h = 4;
        const x = e.x - w / 2;
        // Anchor above the sprite's actual top edge when present; fall back to
        // the entity radius for primitive (non-sprite) rendering. Without this,
        // the bar sits over the sprite's face because radius << sprite height.
        const topOffset = e.sprite ? e.sprite.halfHeight() : e.radius;
        const y = e.y - topOffset - 6;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = ratio > 0.4 ? GameConfig.COLOR.HP_GOOD : GameConfig.COLOR.HP_BAD;
        ctx.fillRect(x, y, w * ratio, h);
    }

    _drawVfx(ctx) {
        for (const it of this._world.vfx.list()) {
            this._vfxDrawRegistry.draw(ctx, it);
        }
    }

    _drawSpellVfx(ctx, it) {
        const t = it.life / it.maxLife;
        ctx.save();
        this._drawSpellFill(ctx, it, t);
        this._drawSpellRing(ctx, it, t);
        this._drawSpellSymbol(ctx, it, t);
        ctx.restore();
    }

    _drawSpellFill(ctx, it, t) {
        const alpha = Math.max(0, 1 - t * 2) * 0.55;
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = it.color;
        ctx.beginPath();
        ctx.arc(it.x, it.y, it.radius * (0.3 + t * 1.1), 0, Math.PI * 2);
        ctx.fill();
    }

    _drawSpellRing(ctx, it, t) {
        const alpha = Math.max(0, 1 - t * 1.4) * 0.85;
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = it.color;
        ctx.lineWidth = Math.max(1, 5 * (1 - t));
        ctx.beginPath();
        ctx.arc(it.x, it.y, it.radius * (0.15 + t * 1.3), 0, Math.PI * 2);
        ctx.stroke();
    }

    _drawSpellSymbol(ctx, it, t) {
        if (!it.cardId) return;
        const card  = this._world.data.getCard(it.cardId);
        const sheet = this._world.assets?.peekSheet(CardArt.cardSheetId(card));
        const symScale = 0.35 + Math.min(1, t * 3) * 0.65;
        const alpha    = t < 0.35 ? 1 : Math.max(0, 1 - (t - 0.35) / 0.65);
        if (alpha <= 0) return;
        const size = Math.max(32, Math.round(it.radius * symScale * 0.9));
        ctx.globalAlpha = alpha;
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 10;
        UIPainter.spriteFrame(ctx, sheet, 0, it.x - size / 2, it.y - size / 2, size, size);
        ctx.shadowBlur = 0;
    }

    _drawTopHud(ctx) {
        const w = this._world;
        // Top bar background
        ctx.fillStyle = 'rgba(7,6,15,0.7)';
        ctx.fillRect(0, 0, GameConfig.VIEW_WIDTH, GameConfig.UI.HUD_TOP_HEIGHT);
        // Enemy info (left side of top bar)
        const enemyHero = w.enemy.hero.def;
        UIPainter.text(ctx, `${enemyHero.name}`, 12, 24,
            { font: 'bold 13px system-ui', color: GameConfig.COLOR.ENEMY_TINT });
        UIPainter.bar(ctx, { x: 12, y: 32, w: 140, h: 8 },
            w.enemy.tower.hp / w.enemy.tower.maxHp, GameConfig.COLOR.ENEMY_TINT);
        UIPainter.text(ctx, `Tower ${Math.ceil(w.enemy.tower.hp)}/${w.enemy.tower.maxHp}`, 12, 56,
            { font: '11px system-ui', color: GameConfig.COLOR.TEXT_DIM });

        // Timer (center) — turns orange in last rush window, red in last half
        const t = Math.max(0, w.timeLeft);
        const mm = Math.floor(t / 60);
        const ss = Math.floor(t % 60).toString().padStart(2, '0');
        UIPainter.text(ctx, `${mm}:${ss}`, GameConfig.VIEW_WIDTH / 2, 36,
            { font: 'bold 22px system-ui', color: BattleRenderer._timerColor(t), align: 'center' });

        // Player info (right side of top bar)
        const px = GameConfig.VIEW_WIDTH - 152;
        const playerHero = w.player.hero.def;
        UIPainter.text(ctx, `${playerHero.name}`, GameConfig.VIEW_WIDTH - 12, 24,
            { font: 'bold 13px system-ui', color: GameConfig.COLOR.PLAYER_TINT, align: 'right' });
        UIPainter.bar(ctx, { x: px, y: 32, w: 140, h: 8 },
            w.player.tower.hp / w.player.tower.maxHp, GameConfig.COLOR.PLAYER_TINT);
        UIPainter.text(ctx, `Tower ${Math.ceil(w.player.tower.hp)}/${w.player.tower.maxHp}`,
            GameConfig.VIEW_WIDTH - 12, 56,
            { font: '11px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'right' });
    }

    static _timerColor(t) {
        const rush = GameConfig.ARENA.MANA_RUSH_THRESHOLD;
        if (t <= rush / 2) return GameConfig.COLOR.MANA_RUSH_RED;
        if (t <= rush)     return GameConfig.COLOR.MANA_RUSH;
        return GameConfig.COLOR.GOLD;
    }

    static _manaBarColor(tLeft) {
        const rush = GameConfig.ARENA.MANA_RUSH_THRESHOLD;
        if (tLeft > rush)      return GameConfig.COLOR.MANA;
        if (tLeft <= rush / 2) return GameConfig.COLOR.MANA_RUSH_RED;
        return GameConfig.COLOR.MANA_RUSH;
    }

    _drawHand(ctx, drag) {
        const u = GameConfig.UI;
        // Mana bar — accelerated in last 60s, visual feedback on color and label
        const mp = this._world.player.mana;
        const tLeft = this._world.timeLeft ?? Infinity;
        const inRush = tLeft <= GameConfig.ARENA.MANA_RUSH_THRESHOLD;
        const manaColor = BattleRenderer._manaBarColor(tLeft);
        UIPainter.bar(ctx,
            { x: 12, y: u.MANA_BAR_Y, w: GameConfig.VIEW_WIDTH - 24, h: u.MANA_BAR_HEIGHT },
            mp.value / mp.max, manaColor);
        const manaLabel = inRush
            ? `⚡ ${mp.value.toFixed(1)} / ${mp.max} MANA RUSH!`
            : `${mp.value.toFixed(1)} / ${mp.max} mana`;
        UIPainter.text(ctx, manaLabel,
            GameConfig.VIEW_WIDTH / 2, u.MANA_BAR_Y - 2,
            {
                font: inRush ? 'bold 10px system-ui' : '10px system-ui',
                color: inRush ? manaColor : GameConfig.COLOR.TEXT_DIM, align: 'center'
            });

        // Hand panel background
        ctx.fillStyle = 'rgba(7,6,15,0.75)';
        ctx.fillRect(0, u.HAND_PANEL_Y, GameConfig.VIEW_WIDTH, u.HAND_PANEL_HEIGHT);

        const slots = this._world.player.hand.slots;
        for (let i = 0; i < slots.length; i++) {
            const rect = handSlotRect(i);
            this._drawHandSlot(ctx, rect, slots[i], drag, i);
        }
    }

    _drawHandSlot(ctx, rect, cardId, drag, index) {
        const isDragging = drag?.slotIndex === index;
        if (isDragging) {
            UIPainter.panel(ctx, rect.x, rect.y, rect.w, rect.h,
                { fill: 'rgba(255,209,102,0.10)', stroke: 'rgba(255,209,102,0.6)' });
            return;
        }
        if (!cardId) {
            UIPainter.panel(ctx, rect.x, rect.y, rect.w, rect.h,
                { fill: 'rgba(20,16,40,0.8)', stroke: 'rgba(255,255,255,0.10)' });
            UIPainter.text(ctx, '...', rect.x + rect.w / 2, rect.y + rect.h / 2 + 4,
                { font: '14px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'center' });
            return;
        }
        const card = this._world.data.getCard(cardId);
        const enabled = this._world.player.mana.canConsume(card.cost);
        this._paintCardBody(ctx, rect, card, enabled);
    }

    /**
     * Paints a hand card vertically: sprite portrait centered top,
     * full-width name at bottom, cost gem in top-left corner.
     */
    _paintCardBody(ctx, rect, card, enabled) {
        const rarity = CardArt.rarityStyle(card.rarity);
        const fill = enabled ? 'rgba(40,32,80,0.92)' : 'rgba(40,32,80,0.45)';
        UIPainter.panel(ctx, rect.x, rect.y, rect.w, rect.h, {
            fill, stroke: enabled ? rarity.stroke : 'rgba(255,255,255,0.15)',
            lineWidth: enabled ? 2 : 1, radius: 8
        });

        // Portrait: square, centered horizontally near the top
        const portraitSize = Math.min(rect.h - 18, 40);
        const portraitX = rect.x + (rect.w - portraitSize) / 2;
        const portraitY = rect.y + 3;
        this._paintCardPortrait(ctx, card, portraitX, portraitY, portraitSize, portraitSize, enabled);

        // Name strip across the full card width — outlined for readability
        const nameColor = enabled ? GameConfig.COLOR.TEXT : GameConfig.COLOR.TEXT_DIM;
        UIPainter.text(ctx, this._fitName(card.name, rect.w - 6),
            rect.x + rect.w / 2, rect.y + rect.h - 4,
            {
                font: 'bold 10px system-ui', align: 'center', color: nameColor,
                outline: { color: 'rgba(0,0,0,0.95)', width: 1 }
            });

        // Cost gem: top-left corner, slightly overlapping the portrait
        this._paintCostGem(ctx, rect.x + 11, rect.y + 11, card.cost, enabled);
    }

    _paintCardPortrait(ctx, card, x, y, w, h, enabled) {
        const sheetId = CardArt.cardSheetId(card);
        const sheet = sheetId ? this._world.assets?.peekSheet(sheetId) : null;
        // Plaque background
        UIPainter.panel(ctx, x, y, w, h, {
            fill: 'rgba(0,0,0,0.35)', stroke: 'rgba(0,0,0,0)', radius: 6
        });
        if (UIPainter.spriteFrame(ctx, sheet, 0, x + 1, y + 1, w - 2, h - 2)) {
            if (!enabled) {
                ctx.save();
                ctx.fillStyle = 'rgba(10,8,20,0.55)';
                ctx.fillRect(x, y, w, h);
                ctx.restore();
            }
            return;
        }
        // Spell fallback: colored disc using fxColor
        const color = card.spell?.fxColor ?? '#9be3ff';
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _paintCostGem(ctx, cx, cy, cost, enabled) {
        const r = 11;
        ctx.save();
        ctx.fillStyle = enabled ? GameConfig.COLOR.MANA : 'rgba(80,80,120,0.7)';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        UIPainter.text(ctx, `${cost}`, cx, cy + 4,
            {
                font: 'bold 12px system-ui', color: '#fff', align: 'center',
                outline: { color: 'rgba(0,0,0,0.9)', width: 1 }
            });
    }

    /** Truncates name with ellipsis when too long for the available width. */
    _fitName(name, maxWidthPx) {
        // Bitmap font at 10px: advance ~8 px/char.
        const maxChars = Math.max(4, Math.floor(maxWidthPx / 8));
        if (name.length <= maxChars) return name;
        return name.slice(0, Math.max(1, maxChars - 1)) + '…';
    }

    _drawDragPreview(ctx, drag) {
        const card = this._world.data.getCard(drag.previewCardId);
        const a = GameConfig.ARENA;
        const valid = drag.x !== null && drag.y !== null && drag.y >= a.SUMMON_ZONE_TOP;
        // Drop zone overlay
        ctx.save();
        ctx.fillStyle = 'rgba(95,168,255,0.06)';
        ctx.fillRect(a.SUMMON_ZONE_LEFT, a.SUMMON_ZONE_TOP,
            a.SUMMON_ZONE_RIGHT - a.SUMMON_ZONE_LEFT, a.SUMMON_ZONE_BOTTOM - a.SUMMON_ZONE_TOP);
        ctx.strokeStyle = valid ? GameConfig.COLOR.GOLD : 'rgba(255,80,80,0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(a.SUMMON_ZONE_LEFT + 1, a.SUMMON_ZONE_TOP + 1,
            a.SUMMON_ZONE_RIGHT - a.SUMMON_ZONE_LEFT - 2, a.SUMMON_ZONE_BOTTOM - a.SUMMON_ZONE_TOP - 2);
        ctx.setLineDash([]);
        ctx.restore();
        // Cursor marker
        if (drag.x !== null && drag.y !== null) {
            const ringColor = valid ? 'rgba(255,209,102,0.55)' : 'rgba(255,90,90,0.55)';
            ctx.fillStyle = ringColor;
            ctx.beginPath();
            ctx.arc(drag.x, drag.y, 28, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(drag.x, drag.y, 28, 0, Math.PI * 2);
            ctx.stroke();

            // Sprite preview centered on cursor (or fxColor disc for spells)
            const sheetId = CardArt.cardSheetId(card);
            const sheet = sheetId ? this._world.assets?.peekSheet(sheetId) : null;
            UIPainter.spriteFrame(ctx, sheet, 0, drag.x - 28, drag.y - 28, 56, 56);

            UIPainter.text(ctx, card.name, drag.x, drag.y - 38,
                {
                    font: 'bold 12px system-ui', color: GameConfig.COLOR.TEXT, align: 'center',
                    outline: { color: 'rgba(0,0,0,0.95)', width: 3 }
                });
        }
    }
}

export function handSlotRect(index) {
    const u = GameConfig.UI;
    const totalW = u.HAND_SLOTS * u.CARD_WIDTH + (u.HAND_SLOTS - 1) * u.CARD_GAP;
    const startX = (GameConfig.VIEW_WIDTH - totalW) / 2;
    return {
        x: startX + index * (u.CARD_WIDTH + u.CARD_GAP),
        y: u.HAND_PANEL_Y + (u.HAND_PANEL_HEIGHT - u.CARD_HEIGHT) / 2,
        w: u.CARD_WIDTH,
        h: u.CARD_HEIGHT
    };
}

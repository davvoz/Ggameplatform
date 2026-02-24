/**
 * EntityCardRenderers — Stateless card-rendering strategies.
 *
 * Each function draws one entity "card" at a given position with
 * the given alpha and scale.  Used as `cardRenderer` callbacks
 * inside ShowcasePhase instances.
 *
 * Signature (all renderers):
 *   (ctx, item, x, y, alpha, scale, itemT, game, w, h, index)
 */
import { easeOut, renderBossPartsAtPosition } from './CinematicUtils.js';
import { BOSS_INTERVAL } from '../../WorldConfig.js';
import { title, ui, mono } from '../../FontConfig.js';

// ═══════════════════════════════════════════════════════
//  Ship card  (fleet roster)
// ═══════════════════════════════════════════════════════
export function renderShipCard(ctx, ship, x, y, alpha, _scale, _itemT, game, w) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // ── Sprite + glow ──
    const sprite = game.assets.getSprite(`ship_${ship.id}`);
    if (sprite) {
        const sz = 90;
        ctx.drawImage(sprite, x - sz / 2, y - sz / 2, sz, sz);
        ctx.globalAlpha = alpha * 0.15;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, sz);
        grad.addColorStop(0, ship.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(x - sz, y - sz, sz * 2, sz * 2);
    }

    // ── Name ──
    ctx.globalAlpha = alpha;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const nameSize = Math.min(26, w * 0.058);
    ctx.font       = title(nameSize, 'bold');
    ctx.shadowColor = ship.color;
    ctx.shadowBlur  = 15;
    ctx.fillStyle   = ship.color;
    ctx.fillText(ship.name.toUpperCase(), x, y + 55);

    // ── Description ──
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = alpha * 0.6;
    const descSize = Math.min(14, w * 0.032);
    ctx.font      = ui(descSize);
    ctx.fillStyle = '#99aabb';
    const desc = ship.description.length > 40
        ? ship.description.substring(0, 40) + '...'
        : ship.description;
    ctx.fillText(desc, x, y + 82);

    // ── Stat bars ──
    const stats    = ship.stats;
    const barW     = 70, barH = 4;
    const barStartY = y + 104;
    const keys   = ['hp', 'speed', 'fireRate', 'resist'];
    const labels = ['HP', 'SPD', 'FIRE', 'RES'];
    ctx.globalAlpha = alpha * 0.5;
    for (let s = 0; s < keys.length; s++) {
        const val = stats[keys[s]] / 10;
        const by  = barStartY + s * 14;
        ctx.font      = mono(Math.min(10, w * 0.022), 400);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#556677';
        ctx.fillText(labels[s], x - barW / 2 - 5, by + barH);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x - barW / 2, by, barW, barH);
        ctx.fillStyle = ship.color;
        ctx.fillRect(x - barW / 2, by, barW * val, barH);
    }

    ctx.restore();
}

// ═══════════════════════════════════════════════════════
//  Mini-Boss card
// ═══════════════════════════════════════════════════════
export function renderMiniBossCard(ctx, mb, x, y, alpha, _scale, itemT, game, w) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // ── Glow ──
    const glowR = 70;
    ctx.globalAlpha = alpha * 0.15;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    grd.addColorStop(0, mb.color);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);

    // ── Sprite parts ──
    ctx.globalAlpha = alpha;
    const spread = easeOut(Math.min(1, itemT / 0.6));
    renderBossPartsAtPosition(ctx, game.assets, mb, x, y, 1.1, spread, itemT);

    // ── Name ──
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const nameSize = Math.min(24, w * 0.052);
    ctx.font       = title(nameSize, 'bold');
    ctx.shadowColor = mb.color;
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = mb.color;
    ctx.fillText(mb.name.toUpperCase(), x, y + 58);

    // ── Pattern ──
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = alpha * 0.5;
    const patSize = Math.min(13, w * 0.028);
    ctx.font      = mono(patSize, 400);
    ctx.fillStyle = '#888';
    ctx.fillText(`pattern: ${mb.movePattern}`, x, y + 84);

    ctx.restore();
}

// ═══════════════════════════════════════════════════════
//  Boss card
// ═══════════════════════════════════════════════════════
export function renderBossCard(ctx, boss, x, y, alpha, scale, itemT, game, w, _h, index) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // ── Glow ──
    const glowR = 95 * scale;
    ctx.globalAlpha = alpha * 0.18;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    grd.addColorStop(0,   boss.color);
    grd.addColorStop(0.6, boss.color + '44');
    grd.addColorStop(1,   'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fill();

    // ── Targeting brackets ──
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = '#ff3322';
    ctx.lineWidth   = 2.5;
    const bw = 65 * scale, bh = 65 * scale;
    const blx = x - bw, bly = y - bh;
    const brx = x + bw, bry = y + bh;
    const cLen = 16;
    ctx.beginPath(); ctx.moveTo(blx, bly + cLen); ctx.lineTo(blx, bly); ctx.lineTo(blx + cLen, bly); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(brx - cLen, bly); ctx.lineTo(brx, bly); ctx.lineTo(brx, bly + cLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(blx, bry - cLen); ctx.lineTo(blx, bry); ctx.lineTo(blx + cLen, bry); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(brx - cLen, bry); ctx.lineTo(brx, bry); ctx.lineTo(brx, bry - cLen); ctx.stroke();

    // ── Sprite parts ──
    ctx.globalAlpha = alpha;
    const spread = easeOut(Math.min(1, itemT / 0.8));
    renderBossPartsAtPosition(ctx, game.assets, boss, x, y, scale, spread, itemT);

    // ── Boss name ──
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const nameSize = Math.min(28, w * 0.06) * Math.min(1, scale + 0.2);
    ctx.font       = title(nameSize, 'bold');
    ctx.shadowColor = boss.color;
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = boss.color;
    ctx.fillText(boss.name.toUpperCase(), x, y + 74 * scale);

    // ── Level indicator (world-relative) ──
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = alpha * 0.6;
    const lvlSize = Math.min(14, w * 0.03);
    ctx.font      = mono(lvlSize, 400);
    ctx.fillStyle = '#cc6655';
    ctx.fillText(`LEVEL ${(index + 1) * BOSS_INTERVAL}`, x, y + 98 * scale);

    ctx.restore();
}

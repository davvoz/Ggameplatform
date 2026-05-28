/**
 * Full-screen canvas overlay that explains rules, symbol payouts,
 * payline shapes and bonus triggers. No HTML — pure 2D canvas.
 *
 * Responsibilities (SRP):
 *  - own its open/close + scroll state
 *  - render header, scrollable content, scrollbar, close button
 *  - hit-test its own close button
 *  - consume input while open (caller routes events here)
 */
import { GameConfig } from '../config/GameConfig.js';

const PADDING = 10;
const HEADER_H = 50;
const KEY_SCROLL_STEP = 40;

export class PaytableOverlay {
    constructor(dataRegistry, symbolRenderer) {
        this.data = dataRegistry;
        this.symbolRenderer = symbolRenderer;
        this._open = false;
        this._scrollY = 0;
        this._contentHeight = 0;
        this._viewportH = 0;
        this._dragging = false;
        this._dragMoved = 0;
        this._lastPointerY = 0;
        this._t = 0;
        this._closeRect = null;
    }

    isOpen() { return this._open; }
    open()   { this._open = true;  this._scrollY = 0; this._dragging = false; }
    close()  { this._open = false; this._dragging = false; }

    update(dt) { if (this._open) this._t += dt; }

    handleInput(ev) {
        if (!this._open) return;
        switch (ev.type) {
            case 'pointerdown': this._onDown(ev); break;
            case 'pointermove': this._onMove(ev); break;
            case 'pointerup':   this._onUp(ev); break;
            case 'keydown':     this._onKey(ev); break;
        }
    }

    _onDown(ev) {
        if (this._hitClose(ev.x, ev.y)) { this.close(); return; }
        this._dragging = true;
        this._dragMoved = 0;
        this._lastPointerY = ev.y;
    }
    _onMove(ev) {
        if (!this._dragging) return;
        const dy = ev.y - this._lastPointerY;
        this._dragMoved += Math.abs(dy);
        this._scrollBy(-dy);
        this._lastPointerY = ev.y;
    }
    _onUp() { this._dragging = false; }

    _onKey(ev) {
        const k = ev.code || ev.key;
        if (k === 'Escape' || k === 'KeyI' || k === '?') { this.close(); return; }
        if (k === 'ArrowDown') this._scrollBy(KEY_SCROLL_STEP);
        else if (k === 'ArrowUp')   this._scrollBy(-KEY_SCROLL_STEP);
        else if (k === 'PageDown')  this._scrollBy(this._viewportH * 0.8);
        else if (k === 'PageUp')    this._scrollBy(-this._viewportH * 0.8);
        else if (k === 'Home')      this._scrollY = 0;
        else if (k === 'End')       this._scrollY = this._maxScroll();
    }

    _maxScroll() {
        return Math.max(0, this._contentHeight - this._viewportH);
    }
    _scrollBy(dy) {
        this._scrollY = Math.max(0, Math.min(this._maxScroll(), this._scrollY + dy));
    }
    _hitClose(x, y) {
        const r = this._closeRect;
        return !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    /* ===== rendering ===== */

    render(ctx) {
        if (!this._open) return;
        const W = GameConfig.VIEW_WIDTH;
        const H = GameConfig.VIEW_HEIGHT;

        ctx.save();
        // Dimmer
        ctx.fillStyle = 'rgba(2,0,10,0.94)';
        ctx.fillRect(0, 0, W, H);

        // Panel
        const px = PADDING, py = PADDING;
        const pw = W - PADDING * 2, ph = H - PADDING * 2;
        this._drawPanel(ctx, px, py, pw, ph);

        // Header
        this._drawHeader(ctx, px, py, pw, HEADER_H);

        // Scrollable content (clipped + translated)
        const cx = px + 10;
        const cy = py + HEADER_H + 4;
        const cw = pw - 20;
        const ch = ph - HEADER_H - 12;
        this._viewportH = ch;

        ctx.save();
        ctx.beginPath();
        ctx.rect(cx, cy, cw, ch);
        ctx.clip();
        ctx.translate(0, -this._scrollY);

        let y = cy + 4;
        y = this._drawRules(ctx, cx, y, cw);            y += 10;
        y = this._drawSymbolTable(ctx, cx, y, cw);      y += 10;
        y = this._drawPaylines(ctx, cx, y, cw);         y += 14;
        y = this._drawBonusInfo(ctx, cx, y, cw);        y += 6;

        this._contentHeight = (y - cy);
        ctx.restore();

        // Scrollbar
        this._drawScrollbar(ctx, px + pw - 7, cy, ch);

        ctx.restore();
    }

    _drawPanel(ctx, x, y, w, h) {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, '#180428');
        grad.addColorStop(1, '#080018');
        ctx.fillStyle = grad;
        this._roundRect(ctx, x, y, w, h, 14);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = GameConfig.COLOR.NEON_VIOLET;
        ctx.shadowColor = GameConfig.COLOR.NEON_VIOLET;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    _drawHeader(ctx, x, y, w, h) {
        ctx.save();
        ctx.font = '900 20px system-ui,sans-serif';
        ctx.fillStyle = GameConfig.COLOR.NEON_GOLD;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = GameConfig.COLOR.NEON_GOLD;
        ctx.shadowBlur = 10;
        ctx.fillText('PAYTABLE & RULES', x + 14, y + 20);
        ctx.shadowBlur = 0;

        ctx.font = '600 9px system-ui,sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText('drag to scroll · ESC or ✕ to close', x + 14, y + 38);

        // Close button (✕)
        const cs = 32;
        const cx = x + w - cs - 8;
        const cy = y + (h - cs) / 2;
        this._closeRect = { x: cx, y: cy, w: cs, h: cs };
        ctx.fillStyle = 'rgba(255,40,80,0.18)';
        this._roundRect(ctx, cx, cy, cs, cs, 8);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = GameConfig.COLOR.NEON_RED;
        ctx.shadowColor = GameConfig.COLOR.NEON_RED;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '900 18px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✕', cx + cs / 2, cy + cs / 2 + 1);

        // Divider
        ctx.strokeStyle = 'rgba(204,0,255,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + h);
        ctx.lineTo(x + w - 8, y + h);
        ctx.stroke();
        ctx.restore();
    }

    /* ===== sections ===== */

    _drawRules(ctx, x, y, w) {
        y = this._drawSection(ctx, x, y, w, 'HOW IT WORKS');
        const rules = [
            '• Spin the 5 reels and match symbols on an active PAYLINE to win coins.',
            '• Paylines pay LEFT → RIGHT only, starting from REEL 1 (leftmost).',
            '• You need 3, 4 or 5 IDENTICAL symbols on ADJACENT reels — no gaps allowed.',
            '• ★ WILD substitutes any normal symbol (NOT ✦ Scatter, NOT 📦 Bonus).',
            '• ✦ SCATTER pays anywhere on the grid — 3+ trigger FREE SPINS.',
            '• 📦 BONUS — 3+ anywhere trigger the TREASURE VAULT mini-game.',
            '• 💰 COIN — every $ on the grid pays +5 × per-line bet (anywhere, no payline).',
            '• How many paylines are ACTIVE depends on your BET TIER (see below).',
            '• Final payout = base × per-line bet × multipliers (Free Spins, Hot Streak, Powerups).',
        ];
        y = this._drawBullets(ctx, x, y, w, rules);
        y += 6;
        y = this._drawSection(ctx, x, y, w, 'BET TIERS — ACTIVE PAYLINES');
        const tierLines = this.data.bets.tiers.map(t =>
            `• ${t.label} — ${t.perLine} coin/line × ${t.activeLines} lines = ${t.perLine * t.activeLines}/spin (uses lines 1-${t.activeLines}).`
        );
        return this._drawBullets(ctx, x, y, w, tierLines);
    }

    _drawSymbolTable(ctx, x, y, w) {
        y = this._drawSection(ctx, x, y, w, 'SYMBOLS & PAYOUTS  (coins × per-line bet)');
        const cols = {
            nameX: x + 86,
            x3:    x + w - 130,
            x4:    x + w - 80,
            x5:    x + w - 28,
        };
        // header
        ctx.save();
        ctx.font = '700 9px system-ui,sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText('×3', cols.x3, y + 8);
        ctx.fillText('×4', cols.x4, y + 8);
        ctx.fillText('×5', cols.x5, y + 8);
        ctx.textAlign = 'left';
        ctx.fillText('SYMBOL  /  NAME', x + 6, y + 8);
        ctx.restore();
        y += 18;
        const rowH = 34;
        for (const sym of this.data.symbolList) {
            this._drawSymbolRow(ctx, { x, y, w, rowH }, sym, cols);
            y += rowH + 2;
        }
        return y;
    }

    _drawSymbolRow(ctx, box, sym, cols) {
        const { x, y, w, rowH } = box;
        const { x3: col3X, x4: col4X, x5: col5X } = cols;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        this._roundRect(ctx, x, y, w, rowH, 5);
        ctx.fill();

        // icon (uses the same symbol renderer the reels use → consistent visuals)
        const iconSize = rowH - 4;
        this.symbolRenderer.draw(ctx, sym.id, x + 2, y + 2, iconSize, iconSize, { t: this._t, scale: 0.9 });

        // name
        ctx.font = '800 11px system-ui,sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this._symbolDisplayName(sym), x + 46, y + rowH / 2);

        // payout cells or special label
        ctx.font = '900 12px system-ui,sans-serif';
        ctx.textAlign = 'center';
        if (sym.isScatter) {
            ctx.fillStyle = GameConfig.COLOR.NEON_GOLD;
            ctx.font = '800 10px system-ui,sans-serif';
            ctx.fillText('TRIGGERS FREE SPINS (3+)', (col3X + col5X) / 2, y + rowH / 2);
        } else if (sym.isBonusTrigger) {
            ctx.fillStyle = GameConfig.COLOR.NEON_ORANGE;
            ctx.font = '800 10px system-ui,sans-serif';
            ctx.fillText('TRIGGERS TREASURE VAULT (3+)', (col3X + col5X) / 2, y + rowH / 2);
        } else if (sym.isWild) {
            ctx.fillStyle = GameConfig.COLOR.NEON_VIOLET;
            ctx.font = '800 10px system-ui,sans-serif';
            ctx.fillText('SUBSTITUTES ANY NORMAL SYMBOL', (col3X + col5X) / 2, y + rowH / 2);
        } else if (sym.isCash) {
            ctx.fillStyle = GameConfig.COLOR.NEON_GOLD;
            ctx.font = '800 10px system-ui,sans-serif';
            ctx.fillText(`+${sym.cashPayout ?? 5} × BET / COIN (ANYWHERE)`, (col3X + col5X) / 2, y + rowH / 2);
        } else {
            ctx.fillStyle = '#fff';
            ctx.fillText(String(sym.payout?.['3'] ?? '–'), col3X, y + rowH / 2);
            ctx.fillText(String(sym.payout?.['4'] ?? '–'), col4X, y + rowH / 2);
            ctx.fillStyle = GameConfig.COLOR.NEON_GOLD;
            ctx.fillText(String(sym.payout?.['5'] ?? '–'), col5X, y + rowH / 2);
        }
        ctx.restore();
    }

    _symbolDisplayName(sym) {
        const map = {
            seven_lucky: 'LUCKY 7',
            diamond:     'DIAMOND',
            crown:       'CROWN',
            star_wild:   'WILD ★',
            rainbow:     'RAINBOW',
            bar_gold:    'BAR GOLD',
            bar_silver:  'BAR SILVER',
            cherry_bomb: 'CHERRY',
            bell_neon:   'BELL',
            watermelon:  'MELON',
            grapes:      'GRAPES',
            lemon:       'LEMON',
            orange:      'ORANGE',
            scatter_star:'SCATTER ✦',
            bonus_chest: 'BONUS 📦',
            coin_cash:   'COIN $'
        };
        return map[sym.id] || sym.id.toUpperCase();
    }

    _drawPaylines(ctx, x, y, w) {
        y = this._drawSection(ctx, x, y, w, 'PAYLINES — ALL READ LEFT → RIGHT');
        // helpful caption
        ctx.save();
        ctx.font = '600 10px system-ui,sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Coloured path = winning shape. Dots = cells that must match.', x + 4, y);
        y += 16;
        ctx.restore();

        const colW = w / 2;
        const blockW = colW - 8;
        const blockH = 76;
        const lines = this.data.paylines;
        for (let i = 0; i < lines.length; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const bx = x + col * colW + 4;
            const by = y + row * (blockH + 6);
            this._drawPaylineBlock(ctx, bx, by, blockW, blockH, lines[i], i + 1);
        }
        return y + Math.ceil(lines.length / 2) * (blockH + 6);
    }

    _drawPaylineBlock(ctx, x, y, w, h, line, num) {
        ctx.save();
        // panel
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        this._roundRect(ctx, x, y, w, h, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // label
        ctx.font = '900 10px system-ui,sans-serif';
        ctx.fillStyle = line.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.shadowColor = line.color;
        ctx.shadowBlur = 4;
        ctx.fillText(`LINE ${num} — ${line.label}`, x + 6, y + 4);
        ctx.shadowBlur = 0;

        // 5x3 mini-grid
        const gridX = x + 6;
        const gridY = y + 20;
        const gridW = w - 12;
        const gridH = h - 32;
        const cellW = gridW / 5;
        const cellH = gridH / 3;

        for (let r = 0; r < 5; r++) {
            for (let row = 0; row < 3; row++) {
                const ccx = gridX + r * cellW;
                const ccy = gridY + row * cellH;
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                ctx.fillRect(ccx + 1, ccy + 1, cellW - 2, cellH - 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(ccx + 1, ccy + 1, cellW - 2, cellH - 2);
            }
        }

        // path
        ctx.lineWidth = 2;
        ctx.strokeStyle = line.color;
        ctx.shadowColor = line.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let i = 0; i < line.cells.length; i++) {
            const [r, row] = line.cells[i];
            const cx = gridX + r * cellW + cellW / 2;
            const cy = gridY + row * cellH + cellH / 2;
            if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
        }
        ctx.stroke();

        // dots
        for (const [r, row] of line.cells) {
            const cx = gridX + r * cellW + cellW / 2;
            const cy = gridY + row * cellH + cellH / 2;
            ctx.fillStyle = line.color;
            ctx.beginPath();
            ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
            ctx.fill();
        }

        // arrow → direction
        ctx.shadowBlur = 0;
        ctx.font = '700 8px system-ui,sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('→', x + w - 6, y + h - 2);
        ctx.restore();
    }

    _drawBonusInfo(ctx, x, y, w) {
        y = this._drawSection(ctx, x, y, w, 'BONUSES & SPECIAL WINS');
        const b = this.data.bonuses;
        const fs = b.freeSpins.rewards;
        const hot = b.hotStreak.thresholds.map(t => t.wins + ' wins=×' + t.multiplier).join('  ·  ');
        const lines = [
            `• FREE SPINS — 3 ✦: ${fs['3'].spins} spins ×${fs['3'].multiplier}  |  4 ✦: ${fs['4'].spins} ×${fs['4'].multiplier}  |  5 ✦: ${fs['5'].spins} ×${fs['5'].multiplier}.`,
            `• TREASURE VAULT — ${b.treasureVault.minBonus}+ 📦 anywhere: pick ${b.treasureVault.picks} of ${b.treasureVault.chests} chests for coins, multipliers… or EXIT.`,
            `• HOT STREAK — consecutive wins boost payout: ${hot}.`,
            `• JACKPOT — 5× 7 on a payline at MAX BET. Base prize: ${b.jackpot.basePayout.toLocaleString('en-US')} + accumulated pool.`,
        ];
        return this._drawBullets(ctx, x, y, w, lines);
    }

    /* ===== primitives ===== */

    _drawSection(ctx, x, y, w, title) {
        ctx.save();
        ctx.fillStyle = 'rgba(204,0,255,0.20)';
        this._roundRect(ctx, x, y, w, 22, 4);
        ctx.fill();
        ctx.font = '900 12px system-ui,sans-serif';
        ctx.fillStyle = GameConfig.COLOR.NEON_VIOLET;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = GameConfig.COLOR.NEON_VIOLET;
        ctx.shadowBlur = 6;
        ctx.fillText(title, x + 10, y + 11);
        ctx.shadowBlur = 0;
        ctx.restore();
        return y + 28;
    }

    _drawBullets(ctx, x, y, w, lines) {
        ctx.save();
        ctx.font = '600 11px system-ui,sans-serif';
        ctx.fillStyle = 'rgba(240,240,255,0.92)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        for (const line of lines) {
            const wrapped = this._wrap(ctx, line, w - 12);
            for (const wl of wrapped) {
                ctx.fillText(wl, x + 6, y);
                y += 15;
            }
            y += 3;
        }
        ctx.restore();
        return y;
    }

    _wrap(ctx, text, maxW) {
        const words = text.split(' ');
        const out = [];
        let cur = '';
        for (const word of words) {
            const trial = cur ? cur + ' ' + word : word;
            if (ctx.measureText(trial).width > maxW) {
                if (cur) out.push(cur);
                cur = word;
            } else {
                cur = trial;
            }
        }
        if (cur) out.push(cur);
        return out;
    }

    _drawScrollbar(ctx, x, y, h) {
        const max = this._maxScroll();
        if (max <= 0) return;
        const thumbH = Math.max(20, h * (h / (h + max)));
        const t = this._scrollY / max;
        const thumbY = y + (h - thumbH) * t;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x, y, 4, h);
        ctx.fillStyle = GameConfig.COLOR.NEON_VIOLET;
        ctx.shadowColor = GameConfig.COLOR.NEON_VIOLET;
        ctx.shadowBlur = 6;
        ctx.fillRect(x, thumbY, 4, thumbH);
        ctx.restore();
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

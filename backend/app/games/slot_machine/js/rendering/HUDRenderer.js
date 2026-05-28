/**
 * HUD strip: balance, bet, last win, hot streak, free spins counter,
 * and the action buttons (BET-, BET+, MAX, SPIN, AUTO).
 * Returns hit-test rects for the spinning/idle states to consume.
 */
import { GameConfig } from '../config/GameConfig.js';

export class HUDRenderer {
    constructor(dataRegistry) {
        this.data = dataRegistry;
        this.t = 0;
        this.lastButtons = {};
    }

    update(dt) { this.t += dt; }

    /** Render all HUD elements; return button rects keyed by id. */
    render(ctx, runCtx, opts = {}) {
        this._drawHUD(ctx, runCtx);
        const rects = this._drawButtons(ctx, runCtx, opts);
        this._drawFooter(ctx, runCtx, rects);
        this.lastButtons = rects;
        return rects;
    }

    /** Hit-test by id given a pointer position. */
    hitTest(x, y) {
        for (const [id, r] of Object.entries(this.lastButtons)) {
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return id;
        }
        return null;
    }

    _drawHUD(ctx, runCtx) {
        const L = GameConfig.LAYOUT;
        const tier = this.data.bets.tiers[runCtx.betTierIndex];
        const betTotal = tier.perLine * tier.activeLines;
        const balanceColor = runCtx.balance < betTotal ? GameConfig.COLOR.NEON_RED : GameConfig.COLOR.NEON_GOLD;

        ctx.save();
        ctx.textBaseline = 'middle';

        // Balance
        this._label(ctx, 'BALANCE', 28, L.HUD_Y + 22);
        this._value(ctx, runCtx.balance.toLocaleString('en-US'), 28, L.HUD_Y + 46, balanceColor, 22, 'left');

        // Bet
        this._label(ctx, 'BET', 28, L.HUD_Y + 74);
        this._value(ctx, `${betTotal}  (${tier.activeLines} × ${tier.perLine})`, 28, L.HUD_Y + 94, GameConfig.COLOR.NEON_CYAN, 14, 'left');

        // Last win
        this._label(ctx, 'WIN', GameConfig.VIEW_WIDTH - 28, L.HUD_Y + 22, 'right');
        const lastWinColor = runCtx.lastWin > 0 ? GameConfig.COLOR.NEON_LIME : GameConfig.COLOR.CHROME;
        this._value(ctx, runCtx.lastWin > 0 ? `+${runCtx.lastWin}` : '0', GameConfig.VIEW_WIDTH - 28, L.HUD_Y + 46, lastWinColor, 22, 'right');

        // Hot streak / free spins
        if (runCtx.freeSpinsRemaining > 0) {
            this._value(ctx, `🎰 FREE x${runCtx.freeSpinsMultiplier}: ${runCtx.freeSpinsRemaining}`,
                GameConfig.VIEW_WIDTH - 28, L.HUD_Y + 78, GameConfig.COLOR.NEON_GOLD, 14, 'right');
        } else if (runCtx.hotStreakLabel) {
            const pulse = 0.7 + Math.sin(this.t * 8) * 0.3;
            ctx.shadowBlur = 10 * pulse;
            ctx.shadowColor = GameConfig.COLOR.NEON_RED;
            this._value(ctx, runCtx.hotStreakLabel, GameConfig.VIEW_WIDTH - 28, L.HUD_Y + 78, GameConfig.COLOR.NEON_RED, 14, 'right');
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    }

    _label(ctx, txt, x, y, align = 'left') {
        ctx.font = '700 10px system-ui,sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.textAlign = align;
        ctx.fillText(txt, x, y);
    }

    _value(ctx, txt, x, y, color, size, align = 'left') {
        ctx.font = `900 ${size}px system-ui,sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.fillText(txt, x, y);
    }

    _drawButtons(ctx, runCtx, opts) {
        const L = GameConfig.LAYOUT;
        const COL = GameConfig.COLOR;
        const enabledSpin = opts.canSpin !== false;

        const rects = {};
        // Row 1: powerups
        this._drawPowerUpRow(ctx, runCtx, opts, rects, L.BUTTONS_Y + 4, 34);
        // Row 2: bet- / bet+ / max / auto
        const yBet = L.BUTTONS_Y + 44;
        const rowH = 38;
        rects.betDown = this._btn({ ctx, x: 22,  y: yBet, w: 70, h: rowH, label: '−',  color: COL.NEON_CYAN, enabled: true });
        rects.betUp   = this._btn({ ctx, x: 100, y: yBet, w: 70, h: rowH, label: '+',  color: COL.NEON_CYAN, enabled: true });
        rects.max     = this._btn({ ctx, x: 178, y: yBet, w: 70, h: rowH, label: 'MAX', color: COL.NEON_GOLD, enabled: true });
        rects.auto    = this._btn({ ctx, x: 256, y: yBet, w: 90, h: rowH, label: runCtx.autoplayRemaining > 0 ? `AUTO ${runCtx.autoplayRemaining}` : 'AUTO', color: COL.NEON_VIOLET, enabled: true });

        // Row 3: SPIN
        rects.spin = this._spinButton(ctx, 22, L.BUTTONS_Y + 88, GameConfig.VIEW_WIDTH - 44, 44,
            runCtx.freeSpinsRemaining > 0 ? 'FREE SPIN' : 'SPIN',
            enabledSpin);
        return rects;
    }

    _drawPowerUpRow(ctx, runCtx, opts, rects, y, h) {
        const mgr = opts.powerUpManager;
        if (!mgr) return;
        const list = mgr.catalogList();
        const tier = this.data.bets.tiers[runCtx.betTierIndex];
        const betTotal = tier.perLine * tier.activeLines;
        const active = new Map(mgr.active().map(p => [p.id, p]));
        const totalW = GameConfig.VIEW_WIDTH - 44;
        const gap = 6;
        const w = Math.floor((totalW - gap * (list.length - 1)) / list.length);
        let x = 22;
        for (const cls of list) {
            const inst = active.get(cls.id);
            const cost = cls.cost(betTotal);
            const onCooldown = cls.id === 'reel_lock' && runCtx.lockCooldown > 0 && !inst;
            const canBuy = !inst && runCtx.balance >= cost && runCtx.freeSpinsRemaining === 0 && !onCooldown;
            this._drawPowerUpButton(ctx, {
                x, y, w, h, cls, instance: inst, cost, canBuy,
                cooldown: onCooldown ? runCtx.lockCooldown : 0,
            });
            rects[`powerup:${cls.id}`] = { x, y, w, h };
            x += w + gap;
        }
    }

    _drawPowerUpButton(ctx, opts) {
        const { x, y, w, h, cls, instance, cost, canBuy } = opts;
        const active = !!instance;
        const fillStyle = this._powerUpFill(active, canBuy);
        const glow = this._powerUpGlow(active, canBuy);
        ctx.save();
        ctx.fillStyle = fillStyle;
        this._roundRect(ctx, x, y, w, h, 8);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = cls.color;
        ctx.shadowColor = cls.color;
        ctx.shadowBlur = glow;
        ctx.stroke();
        ctx.shadowBlur = 0;
        // icon
        ctx.font = '700 16px system-ui,sans-serif';
        ctx.fillStyle = canBuy || active ? '#fff' : 'rgba(255,255,255,0.35)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(cls.icon, x + 6, y + h / 2);
        // label
        ctx.font = '900 11px system-ui,sans-serif';
        ctx.fillStyle = canBuy || active ? cls.color : 'rgba(170,180,200,0.4)';
        ctx.fillText(cls.label, x + 26, y + h / 2 - 7);
        // cost or remaining or cooldown
        ctx.font = '700 10px system-ui,sans-serif';
        if (active) {
            ctx.fillStyle = '#fff';
            ctx.fillText(`✕ ${instance.remaining} spin`, x + 26, y + h / 2 + 7);
        } else if (opts.cooldown > 0) {
            ctx.fillStyle = 'rgba(255,80,120,0.85)';
            ctx.fillText(`🚫 ${opts.cooldown} spin`, x + 26, y + h / 2 + 7);
        } else {
            ctx.fillStyle = canBuy ? 'rgba(255,215,0,0.95)' : 'rgba(170,180,200,0.5)';
            ctx.fillText(`-${cost}`, x + 26, y + h / 2 + 7);
        }
        ctx.restore();
    }

    _powerUpFill(active, canBuy) {
        if (active) return 'rgba(60,20,90,0.9)';
        if (canBuy) return 'rgba(20,5,40,0.85)';
        return 'rgba(20,5,40,0.35)';
    }

    _powerUpGlow(active, canBuy) {
        if (active) return 14;
        if (canBuy) return 8;
        return 0;
    }

    _btn(options) {
        const { ctx, x, y, w, h, label, color, enabled } = options;
        ctx.save();
        ctx.fillStyle = enabled ? 'rgba(20,5,40,0.85)' : 'rgba(20,5,40,0.35)';
        this._roundRect(ctx, x, y, w, h, 10);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = enabled ? 10 : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.font = '900 14px system-ui,sans-serif';
        ctx.fillStyle = enabled ? color : 'rgba(170,180,200,0.4)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2);
        ctx.restore();
        return { x, y, w, h };
    }

    _spinButton(ctx, x, y, w, h, label, enabled) {
        ctx.save();
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        if (enabled) {
            grad.addColorStop(0, '#ff44aa');
            grad.addColorStop(0.5, '#cc00ff');
            grad.addColorStop(1, '#660099');
        } else {
            grad.addColorStop(0, '#444');
            grad.addColorStop(1, '#222');
        }
        ctx.fillStyle = grad;
        this._roundRect(ctx, x, y, w, h, 14);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = enabled ? GameConfig.COLOR.NEON_GOLD : '#555';
        ctx.shadowColor = GameConfig.COLOR.NEON_GOLD;
        ctx.shadowBlur = enabled ? 18 : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.font = '900 22px system-ui,sans-serif';
        ctx.fillStyle = enabled ? '#fff' : '#999';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2);
        ctx.restore();
        return { x, y, w, h };
    }

    _drawFooter(ctx, runCtx, rects) {
        const L = GameConfig.LAYOUT;
        const COL = GameConfig.COLOR;
        const cy = L.FOOTER_Y + L.FOOTER_HEIGHT / 2;

        // Left: session stats
        ctx.save();
        ctx.font = '600 10px system-ui,sans-serif';
        ctx.fillStyle = 'rgba(170,180,200,0.55)';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const txt = `SPINS: ${runCtx.spinsPlayed}    TOTAL WON: ${runCtx.totalWon.toLocaleString('en-US')}`;
        ctx.fillText(txt, 22, cy);
        ctx.restore();

        // Right: "? PAYTABLE" pill
        const bw = 110, bh = 26;
        const bx = GameConfig.VIEW_WIDTH - bw - 14;
        const by = cy - bh / 2;
        ctx.save();
        ctx.fillStyle = 'rgba(20,5,40,0.85)';
        this._roundRect(ctx, bx, by, bw, bh, 13);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = COL.NEON_CYAN;
        ctx.shadowColor = COL.NEON_CYAN;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.font = '900 11px system-ui,sans-serif';
        ctx.fillStyle = COL.NEON_CYAN;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('? PAYTABLE', bx + bw / 2, by + bh / 2);
        ctx.restore();

        if (rects) rects.paytable = { x: bx, y: by, w: bw, h: bh };
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

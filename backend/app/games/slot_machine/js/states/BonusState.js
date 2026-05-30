/**
 * Treasure Vault mini-game. 9 chests displayed in a 3×3 grid (overlaying reels).
 * Player taps to open up to N chests; each reveals a prize.
 * Reveal on tap with sound + popup; "exit" outcome ends early.
 */
import { IdleState } from './IdleState.js';
import { GameConfig } from '../config/GameConfig.js';
import { SoundEvent } from '../audio/SoundEvent.js';

export class BonusState {
    constructor(game, betTotal) {
        this.game = game;
        this.betTotal = betTotal;
        this.picksLeft = game.bonusManager.picks;
        this.totalCoins = 0;
        this.multiplier = 1;
        this.openedChests = new Map(); // index → outcome
        this._chestRects = [];
        this._endTimer = 0;
        this._endHoldMs = 1600;
        this._exited = false;
        this._exitedAt = 0;
    }

    enter() {
        this.game.sound.play(SoundEvent.BONUS_TRIGGER);
        this.game.vfx.popup(
            GameConfig.VIEW_WIDTH / 2,
            GameConfig.LAYOUT.REEL_AREA_Y + 40,
            'TREASURE VAULT',
            GameConfig.COLOR.NEON_GOLD,
            { life: 1.5, size: 26, vy: -10 }
        );
        this.game.marquee.push('💰 TREASURE VAULT 💰', GameConfig.COLOR.NEON_GOLD, 3000);
        this._layoutChests();
    }

    _layoutChests() {
        const L = GameConfig.LAYOUT;
        const cols = 3, rows = 3;
        const padX = 30, padY = 30;
        const w = (L.REEL_AREA_W - padX * (cols + 1)) / cols;
        const h = (L.REEL_AREA_H - padY * (rows + 1)) / rows;
        let idx = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this._chestRects.push({
                    idx,
                    x: L.REEL_AREA_X + padX * (c + 1) + w * c,
                    y: L.REEL_AREA_Y + padY * (r + 1) + h * r,
                    w, h
                });
                idx++;
            }
        }
    }

    exit() {
        //no special cleanup needed
    }

    update(dt) {
        if (this._exited || this.picksLeft === 0) {
            this._endTimer += dt * 1000;
            if (this._endTimer >= this._endHoldMs) this._finish();
        }
    }

    handleInput(event) {
        if (this._exited || this.picksLeft === 0) return;
        if (event.type !== 'pointerdown') return;
        const hit = this._findChest(event.x, event.y);
        if (hit == null) return;
        if (this.openedChests.has(hit)) return;
        this._openChest(hit);
    }

    _findChest(x, y) {
        for (const r of this._chestRects) {
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.idx;
        }
        return null;
    }

    _openChest(idx) {
        const outcome = this.game.bonusManager.rollPick();
        this.openedChests.set(idx, outcome);
        this.picksLeft--;
        this.game.sound.play(SoundEvent.CHEST_OPEN);

        const rect = this._chestRects.find(r => r.idx === idx);
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        if (outcome.type === 'coins') {
            const amount = Math.round(outcome.value * this.multiplier);
            this.totalCoins += amount;
            this.game.vfx.popup(cx, cy, `+${amount}`, GameConfig.COLOR.NEON_GOLD, { size: 22, life: 1.2 });
            this.game.vfx.emitBurst(cx, cy, 28, GameConfig.COLOR.NEON_GOLD, { speedMax: 280 });
        } else if (outcome.type === 'multiplier') {
            this.multiplier *= outcome.value;
            this.game.vfx.popup(cx, cy, `×${outcome.value}`, GameConfig.COLOR.NEON_VIOLET, { size: 26, life: 1.2 });
            this.game.vfx.emitBurst(cx, cy, 32, GameConfig.COLOR.NEON_VIOLET, { speedMax: 320 });
        }
    }

    _finish() {
        const ctx = this.game.runCtx;
        ctx.totalWon += this.totalCoins;
        ctx.balance += this.totalCoins;
        ctx.lastWin = this.totalCoins;
        ctx.pushLastWin(this.totalCoins);
        if (this.totalCoins > 0) {
            // Count as a won hand: force-expire LOCK and apply cooldown
            const hadLock = this.game.powerUpManager.forceExpire('reel_lock');
            ctx.lockCooldown = 3;
            if (hadLock) {
                this.game.marquee.push('🔓 LOCK released — cooldown 3 spins', '#00ffff', 2000);
            }
            this.game.platform.sendScore(ctx.totalWon, { reason: 'bonus', amount: this.totalCoins });
            this.game.platform.awardCoins(this.totalCoins, `Slot bonus: ${this.totalCoins} coins`)
                .catch(err => console.warn('[BonusState] awardCoins failed:', err));
        }
        this.game.fsm.set(new IdleState(this.game));
    }

    render(ctx) {
        this.game.renderWorld(ctx, { canSpin: false });
        this._drawOverlay(ctx);
    }

    _drawOverlay(ctx) {
        const L = GameConfig.LAYOUT;
        ctx.save();
        ctx.fillStyle = GameConfig.COLOR.OVERLAY;
        ctx.fillRect(L.REEL_AREA_X, L.REEL_AREA_Y, L.REEL_AREA_W, L.REEL_AREA_H);

        ctx.font = '900 14px system-ui,sans-serif';
        ctx.fillStyle = GameConfig.COLOR.NEON_GOLD;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = GameConfig.COLOR.NEON_GOLD;
        ctx.shadowBlur = 8;
        const chestLabel = this.picksLeft === 1 ? 'chest' : 'chests';
        const multiplierLabel = this.multiplier > 1 ? ` ×${this.multiplier}` : '';
        ctx.fillText(`Pick ${this.picksLeft} ${chestLabel}  •  WON ${this.totalCoins}${multiplierLabel}`,
            GameConfig.VIEW_WIDTH / 2, L.REEL_AREA_Y + 6);
        ctx.shadowBlur = 0;

        for (const c of this._chestRects) this._drawChest(ctx, c);
        ctx.restore();
    }

    _getChestColor(opened) {
        if (!opened) return GameConfig.COLOR.NEON_ORANGE;
        if (opened.type === 'multiplier') return GameConfig.COLOR.NEON_VIOLET;
        return GameConfig.COLOR.NEON_GOLD;
    }

    _getChestLabel(opened) {
        if (!opened) return '📦';
        if (opened.type === 'coins') return `${opened.value}`;
        if (opened.type === 'multiplier') return `×${opened.value}`;
        return 'X';
    }

    _drawChest(ctx, c) {
        const opened = this.openedChests.get(c.idx);
        const color = this._getChestColor(opened);
        const grad = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
        grad.addColorStop(0, opened ? '#1a1a2a' : '#5a3010');
        grad.addColorStop(1, opened ? '#0a0a14' : '#2a1006');
        ctx.fillStyle = grad;
        this._roundRect(ctx, c.x, c.y, c.w, c.h, 10);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.font = `900 ${Math.floor(c.h * 0.4)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        const label = this._getChestLabel(opened);
        ctx.fillText(label, c.x + c.w / 2, c.y + c.h / 2);
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

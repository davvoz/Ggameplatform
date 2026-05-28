/**
 * Idle: waiting for the player. Handles bet adjustment, autoplay toggle,
 * and triggers SpinningState on SPIN.
 */
import { SpinningState } from './SpinningState.js';
import { SoundEvent } from '../audio/SoundEvent.js';
import { GameConfig } from '../config/GameConfig.js';

export class IdleState {
    constructor(game) {
        this.game = game;
        this._debounce = 0;
        this._pendingSpin = false;
    }

    enter() {
        // Resume free spin auto-flow if any
        if (this.game.runCtx.freeSpinsRemaining > 0) {
            this._debounce = 0.4;
        }
        if (this.game.runCtx.autoplayRemaining > 0 && this._canAfford()) {
            this._debounce = 0.25;
        }
    }
    exit() {
        //nothing to clean up
    }

    update(dt) {
        this._debounce = Math.max(0, this._debounce - dt);
        if (this._debounce > 0) return;
        const ctx = this.game.runCtx;
        if (ctx.freeSpinsRemaining > 0) {
            this._spin();
            return;
        }
        if (ctx.autoplayRemaining > 0 && this._canAfford()) {
            this._spin();
        }
    }

    handleInput(event) {
        if (event.type === 'pointerdown') {
            const id = this.game.hud.hitTest(event.x, event.y);
            if (id) {
                this._handleButton(id);
                return;
            }
            this._handleReelTap(event.x, event.y);
        } else if (event.type === 'keydown') {
            this._handleKey(event);
        }
    }

    _handleReelTap(x, y) {
        const lockPU = this.game.powerUpManager.getActive('reel_lock');
        if (!lockPU) return;
        if (this.game.runCtx.freeSpinsRemaining > 0) return;
        const idx = this._reelAt(x, y);
        if (idx < 0) return;
        const column = this.game.reelRenderers[idx].visible.slice();
        const nowLocked = lockPU.toggleReel(idx, column);
        this.game.sound.play(SoundEvent.UI_CLICK);
        const label = nowLocked ? `🔒 REEL ${idx + 1} LOCKED` : `🔓 REEL ${idx + 1} UNLOCKED`;
        this.game.marquee.push(label, '#00ffff', 1400);
    }

    _reelAt(x, y) {
        const L = GameConfig.LAYOUT;
        if (y < L.REEL_AREA_Y || y > L.REEL_AREA_Y + L.REEL_AREA_H) return -1;
        if (x < L.REEL_AREA_X || x > L.REEL_AREA_X + L.REEL_AREA_W) return -1;
        const stride = L.CELL_W + L.CELL_GAP_X;
        const i = Math.floor((x - L.REEL_AREA_X) / stride);
        if (i < 0 || i >= this.game.reelRenderers.length) return -1;
        // Exclude clicks falling in the gutter between reels.
        const localX = (x - L.REEL_AREA_X) - i * stride;
        if (localX > L.CELL_W) return -1;
        return i;
    }

    _handleButton(id) {
        if (typeof id === 'string' && id.startsWith('powerup:')) {
            this._buyPowerUp(id.slice('powerup:'.length));
            return;
        }
        switch (id) {
            case 'spin':    this._spin(); break;
            case 'betUp':   this._adjustBet(+1); break;
            case 'betDown': this._adjustBet(-1); break;
            case 'max':     this._maxBet(); break;
            case 'auto':    this._toggleAuto(); break;
        }
    }

    _buyPowerUp(id) {
        if (this.game.runCtx.freeSpinsRemaining > 0) return;
        const mgr = this.game.powerUpManager;
        const cls = mgr.catalog.classOf(id);

        // LOCK is blocked while on post-win cooldown.
        if (id === 'reel_lock' && this.game.runCtx.lockCooldown > 0 && !mgr.hasActive(id)) {
            this.game.sound.play(SoundEvent.UI_CLICK);
            this.game.marquee.push(
                `🚫 LOCK cooldown — ${this.game.runCtx.lockCooldown} spin${this.game.runCtx.lockCooldown === 1 ? '' : 's'} left`,
                '#ff3366',
                1800
            );
            return;
        }

        // Toggle OFF: cancel and refund proportional to unused spins.
        if (mgr.hasActive(id)) {
            const refund = mgr.cancel(id, this.game.runCtx);
            this.game.sound.play(SoundEvent.BET_CHANGE);
            this.game.marquee.push(
                `${cls.icon} ${cls.label} OFF  +${refund} refund`,
                cls.color,
                1800
            );
            return;
        }

        // Toggle ON: one-click purchase.
        const tier = this.game.data.bets.tiers[this.game.runCtx.betTierIndex];
        const betTotal = tier.perLine * tier.activeLines;
        const cost = mgr.costFor(id, betTotal);

        if (this.game.runCtx.balance < cost) {
            this.game.sound.play(SoundEvent.UI_CLICK);
            this.game.marquee.push(`${cls.icon} ${cls.label} needs ${cost} coins`, '#ff3366', 1800);
            return;
        }
        mgr.purchase(id, betTotal, this.game.runCtx);
        this.game.sound.play(SoundEvent.BET_CHANGE);
        this.game.marquee.push(
            `${cls.icon} ${cls.label} ON: ${cls.description}`,
            cls.color,
            2200
        );
    }

    _handleKey(event) {
        switch (event.code) {
            case 'Space':      this._spin(); break;
            case 'ArrowRight': this._adjustBet(+1); break;
            case 'ArrowLeft':  this._adjustBet(-1); break;
            case 'KeyM':       this._maxBet(); break;
            case 'KeyA':       this._toggleAuto(); break;
        }
    }

    async _spin() {
        if (this._pendingSpin) return;
        if (!this._canAfford()) {
            this.game.sound.play(SoundEvent.UI_CLICK);
            this.game.checkGameOverOnBroke();
            return;
        }
        const isFree = this.game.runCtx.freeSpinsRemaining > 0;
        if (!isFree && this.game.platform.isAvailable()) {
            const tier = this.game.data.bets.tiers[this.game.runCtx.betTierIndex];
            const betTotal = tier.perLine * tier.activeLines;
            this._pendingSpin = true;
            const ok = await this.game.platform.spendCoins(betTotal, `Slot bet: ${betTotal} coins`);
            this._pendingSpin = false;
            if (!ok) {
                this.game.sound.play(SoundEvent.UI_CLICK);
                this.game.marquee.push('❌ Coins insufficient', '#ff2244', 2000);
                return;
            }
        }
        // One spin = one server session. Open it now; EvaluationState closes it via gameOver().
        if (this.game.platform.isAvailable()) {
            this.game.platform.resetSession();
        }
        this.game.fsm.set(new SpinningState(this.game));
    }

    _adjustBet(delta) {
        if (this.game.runCtx.freeSpinsRemaining > 0) return;
        const tiers = this.game.data.bets.tiers;
        const next = Math.max(0, Math.min(tiers.length - 1, this.game.runCtx.betTierIndex + delta));
        if (next !== this.game.runCtx.betTierIndex) {
            this.game.runCtx.betTierIndex = next;
            this.game.sound.play(SoundEvent.BET_CHANGE);
        }
    }

    _maxBet() {
        if (this.game.runCtx.freeSpinsRemaining > 0) return;
        const target = this.game.data.bets.maxBetTierIndex;
        if (target !== this.game.runCtx.betTierIndex) {
            this.game.runCtx.betTierIndex = target;
            this.game.sound.play(SoundEvent.BET_CHANGE);
        }
    }

    _toggleAuto() {
        if (this.game.runCtx.autoplayRemaining > 0) {
            this.game.runCtx.autoplayRemaining = 0;
        } else {
            const presets = this.game.data.config.autoplay.presets;
            this.game.runCtx.autoplayRemaining = presets[2] ?? 25;
        }
        this.game.sound.play(SoundEvent.UI_CLICK);
    }

    _canAfford() {
        if (this.game.runCtx.freeSpinsRemaining > 0) return true;
        const tier = this.game.data.bets.tiers[this.game.runCtx.betTierIndex];
        return this.game.runCtx.balance >= tier.perLine * tier.activeLines;
    }

    render(ctx) {
        this.game.renderWorld(ctx, { canSpin: this._canAfford() && this._debounce <= 0 });
    }
}

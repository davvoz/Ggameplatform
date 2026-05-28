/**
 * Spinning: starts all reels with staggered full-spin durations, waits for them
 * to land, then hands off to EvaluationState. Charges the bet at entry.
 */
import { EvaluationState } from './EvaluationState.js';
import { SoundEvent } from '../audio/SoundEvent.js';

export class SpinningState {
    constructor(game) {
        this.game = game;
        this._allStopped = false;
        this._stopOrder = [];
        this._stoppedFlags = [];
    }

    enter() {
        const data = this.game.data;
        const reels = this.game.reelRenderers;
        const isFree = this.game.runCtx.freeSpinsRemaining > 0;
        const tier = data.bets.tiers[this.game.runCtx.betTierIndex];
        const betTotal = tier.perLine * tier.activeLines;

        if (isFree) {
            this.game.runCtx.freeSpinsRemaining--;
        } else {
            this.game.runCtx.balance -= betTotal;
            this.game.runCtx.jackpotPool += data.config.jackpotTicker.incrementPerSpin * betTotal;

        }
        this.game.runCtx.spinsPlayed++;
        if (this.game.runCtx.autoplayRemaining > 0 && !isFree) {
            this.game.runCtx.autoplayRemaining--;
        }

        const stopStagger = isFree
            ? data.config.reels.stopStaggerFreeSpinsMs
            : data.config.reels.stopStaggerMs;
        const fullMin = data.config.reels.fullSpeedMinMs;
        const fullMax = data.config.reels.fullSpeedMaxMs;
        const baseFull = fullMin + Math.random() * (fullMax - fullMin);

        this._grid = [];
        this._stoppedFlags = new Array(reels.length).fill(false);

        // First pass: roll every reel and collect its target visible[].
        const landings = [];
        for (let i = 0; i < reels.length; i++) {
            const { landingIndex, visible } = this.game.reelEngine.spinReel(i);
            landings.push({ landingIndex, visible: visible.slice() });
            this._grid.push(visible.slice());
        }

        // Tick down the LOCK cooldown one spin at a time.
        if (this.game.runCtx.lockCooldown > 0) {
            this.game.runCtx.lockCooldown--;
        }

        // Powerups mutate the grid in place (and we keep visibles in sync).
        this.game.powerUpManager.transformSpin(this._grid, data, this.game.runCtx);
        for (let i = 0; i < reels.length; i++) {
            landings[i].visible = this._grid[i].slice();
        }

        // Determine which reels are frozen by the ReelLock powerup.
        const lockPU = this.game.powerUpManager.getActive('reel_lock');
        const lockedSet = lockPU ? new Set(lockPU.lockedIndices()) : new Set();

        // Second pass: spin free reels, keep locked reels frozen (no animation).
        for (let i = 0; i < reels.length; i++) {
            if (lockedSet.has(i)) {
                // Reel stays in IDLE phase — visible already holds the snapshot.
                this._stoppedFlags[i] = true;
            } else {
                const fullMs = baseFull + i * stopStagger;
                reels[i].startSpin(landings[i].visible, landings[i].landingIndex, fullMs);
            }
        }

        this.game.paylineRenderer.setHits([]);
        this.game.sound.play(SoundEvent.SPIN_START);
        this.game.sound.startLoop(SoundEvent.REEL_SPIN_LOOP);
        const spinLabel = isFree ? `FREE SPIN  ${this.game.runCtx.freeSpinsRemaining + 1} LEFT` : 'SPINNING...';
        const spinColor = isFree ? '#ffd700' : '#00ffff';
        this.game.marquee.push(spinLabel, spinColor, 4000);
    }

    exit() {
        this.game.sound.stopLoop(SoundEvent.REEL_SPIN_LOOP);
    }

    update(dt) {
        const reels = this.game.reelRenderers;
        for (let i = 0; i < reels.length; i++) {
            if (!this._stoppedFlags[i] && reels[i].isStopped()) {
                this._stoppedFlags[i] = true;
                this.game.sound.play(SoundEvent.REEL_STOP);
            }
        }
        if (this._stoppedFlags.every(Boolean) && !this._allStopped) {
            this._allStopped = true;
            this.game.fsm.set(new EvaluationState(this.game, this._grid));
        }
    }

    handleInput() {
        // Spin cannot be cancelled.
    }

    render(ctx) {
        this.game.renderWorld(ctx, { canSpin: false });
    }
}

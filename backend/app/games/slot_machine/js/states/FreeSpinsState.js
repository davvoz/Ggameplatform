/**
 * Free spins announcement → returns to Idle, which auto-spins
 * while freeSpinsRemaining > 0.
 */
import { IdleState } from './IdleState.js';
import { GameConfig } from '../config/GameConfig.js';
import { SoundEvent } from '../audio/SoundEvent.js';

export class FreeSpinsState {
    constructor(game, scatterCount) {
        this.game = game;
        this.scatterCount = scatterCount;
        this._elapsed = 0;
        this._holdMs = 2200;
    }

    enter() {
        const cfg = this.game.data.bonuses.freeSpins;
        const reward = cfg.rewards[String(this.scatterCount)] ?? cfg.rewards['3'];
        const isRetrigger = this.game.runCtx.freeSpinsRemaining > 0;
        if (isRetrigger) {
            this.game.runCtx.freeSpinsRemaining += cfg.retriggerBonusSpins;
        } else {
            this.game.runCtx.freeSpinsRemaining = reward.spins;
            this.game.runCtx.freeSpinsMultiplier = reward.multiplier;
            this.game.runCtx.freeSpinsTotalWon = 0;
        }
        this.game.sound.play(SoundEvent.FREE_SPINS_START);
        const txt = isRetrigger
            ? `+${cfg.retriggerBonusSpins} FREE SPINS!`
            : `${reward.spins} FREE SPINS  ×${reward.multiplier}`;
        this.game.marquee.push(txt, GameConfig.COLOR.NEON_GOLD, this._holdMs);
        this.game.vfx.popup(
            GameConfig.VIEW_WIDTH / 2,
            GameConfig.LAYOUT.REEL_AREA_Y + GameConfig.LAYOUT.REEL_AREA_H / 2,
            txt,
            GameConfig.COLOR.NEON_GOLD,
            { life: this._holdMs / 1000, size: 28, vy: -20 }
        );
    }

    exit() {
        // nothing to do
    }

    update(dt) {
        this._elapsed += dt * 1000;
        if (this._elapsed >= this._holdMs) {
            this.game.fsm.set(new IdleState(this.game));
        }
    }

    handleInput(event) {
        if (event.type === 'pointerdown' || event.type === 'keydown') {
            this._elapsed = this._holdMs;
        }
    }

    render(ctx) {
        this.game.renderWorld(ctx, { canSpin: false });
    }
}

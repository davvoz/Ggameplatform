/**
 * Jackpot! Awards the visible pool, drains it, fires the siren and confetti.
 */
import { IdleState } from './IdleState.js';
import { GameConfig } from '../config/GameConfig.js';
import { SoundEvent } from '../audio/SoundEvent.js';

export class JackpotState {
    constructor(game) {
        this.game = game;
        this._elapsed = 0;
        this._holdMs = 5000;
        this._burstTimer = 0;
        this._awarded = 0;
    }

    enter() {
        const data = this.game.data;
        const baseSeed = data.config.jackpotTicker.seed;
        const pool = Math.max(data.bonuses.jackpot.basePayout, Math.floor(this.game.runCtx.jackpotPool));
        this._awarded = pool;
        this.game.runCtx.balance += pool;
        this.game.runCtx.totalWon += pool;
        this.game.runCtx.lastWin = pool;
        this.game.runCtx.jackpotPool = baseSeed; // reseed
        this.game.platform.sendScore(this.game.runCtx.totalWon, { reason: 'jackpot', amount: pool });
        this.game.sound.play(SoundEvent.JACKPOT_SIREN);
        this.game.marquee.push(`★ JACKPOT WON  +${pool} ★`, '#ff2244', this._holdMs);
    }

    exit() {
        // nothing to do
    }

    update(dt) {
        this._elapsed += dt * 1000;
        this._burstTimer += dt;
        if (this._burstTimer > 0.18) {
            this._burstTimer = 0;
            const cx = 60 + Math.random() * (GameConfig.VIEW_WIDTH - 120);
            const cy = GameConfig.LAYOUT.REEL_AREA_Y + Math.random() * GameConfig.LAYOUT.REEL_AREA_H;
            const colors = [GameConfig.COLOR.NEON_GOLD, GameConfig.COLOR.NEON_RED, GameConfig.COLOR.NEON_VIOLET, GameConfig.COLOR.NEON_CYAN];
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.game.vfx.emitBurst(cx, cy, 30, color, { speedMax: 380 });
        }
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
        // Big overlay
        ctx.save();
        ctx.fillStyle = GameConfig.COLOR.OVERLAY_DEEP;
        ctx.fillRect(0, 0, GameConfig.VIEW_WIDTH, GameConfig.VIEW_HEIGHT);
        const pulse = 0.7 + Math.sin(this._elapsed * 0.02) * 0.3;
        ctx.font = '900 56px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = GameConfig.COLOR.NEON_GOLD;
        ctx.shadowColor = GameConfig.COLOR.NEON_GOLD;
        ctx.shadowBlur = 28 * pulse;
        ctx.fillText('JACKPOT!', GameConfig.VIEW_WIDTH / 2, GameConfig.VIEW_HEIGHT * 0.42);
        ctx.font = '900 30px system-ui,sans-serif';
        ctx.fillStyle = GameConfig.COLOR.NEON_RED;
        ctx.shadowColor = GameConfig.COLOR.NEON_RED;
        ctx.shadowBlur = 24;
        ctx.fillText(`+${this._awarded.toLocaleString('en-US')}`, GameConfig.VIEW_WIDTH / 2, GameConfig.VIEW_HEIGHT * 0.55);
        ctx.restore();
    }
}

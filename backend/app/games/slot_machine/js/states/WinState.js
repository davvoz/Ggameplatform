/**
 * Win celebration: cycles through hits via PaylineRenderer (already configured),
 * shows tier message (BIG WIN / SUPER WIN / MEGA WIN), bursts coins, then goes Idle.
 */
import { IdleState } from './IdleState.js';
import { GameConfig } from '../config/GameConfig.js';
import { SoundEvent } from '../audio/SoundEvent.js';

const TIER_TO_SOUND = Object.freeze({
    small:  SoundEvent.WIN_SMALL,
    medium: SoundEvent.WIN_MEDIUM,
    big:    SoundEvent.WIN_BIG,
    super:  SoundEvent.WIN_SUPER,
    mega:   SoundEvent.WIN_MEGA
});

const TIER_TO_COLOR = Object.freeze({
    small:  GameConfig.COLOR.NEON_CYAN,
    medium: GameConfig.COLOR.NEON_LIME,
    big:    GameConfig.COLOR.NEON_GOLD,
    super:  GameConfig.COLOR.NEON_ORANGE,
    mega:   GameConfig.COLOR.NEON_RED
});

export class WinState {
    constructor(game, amount, tier, hits) {
        this.game = game;
        this.amount = amount;
        this.tier = tier;
        this.hits = hits;
        this._elapsed = 0;
        this._holdMs = GameConfig.TIMINGS.WIN_TIER_HOLD_MS[tier] ?? 1000;
    }

    enter() {
        this.game.sound.play(TIER_TO_SOUND[this.tier]);
        const msg = this.game.data.config.wins.messages[this.tier];
        if (msg) {
            this.game.vfx.popup(
                GameConfig.VIEW_WIDTH / 2,
                GameConfig.LAYOUT.REEL_AREA_Y + GameConfig.LAYOUT.REEL_AREA_H / 2,
                msg,
                TIER_TO_COLOR[this.tier],
                { life: this._holdMs / 1000, size: 32, vy: -30 }
            );
            this.game.marquee.push(`${msg}  +${this.amount}`, TIER_TO_COLOR[this.tier], this._holdMs);
        }
        this._burstCoins();
    }

    _burstCoins() {
        const color = TIER_TO_COLOR[this.tier];
        const count = { small: 14, medium: 28, big: 60, super: 100, mega: 160 }[this.tier] ?? 14;
        this.game.vfx.emitBurst(
            GameConfig.VIEW_WIDTH / 2,
            GameConfig.LAYOUT.REEL_AREA_Y + GameConfig.LAYOUT.REEL_AREA_H / 2,
            count, color, { speedMin: 80, speedMax: 360, lifeMin: 0.6, lifeMax: 1.4, sizeMin: 2, sizeMax: 5 }
        );
        this.game.sound.play(SoundEvent.COIN_DROP);
    }

    exit() {
        this.game.paylineRenderer.setHits([]);
    }

    update(dt) {
        this._elapsed += dt * 1000;
        if (this._elapsed >= this._holdMs) {
            this.game.fsm.set(new IdleState(this.game));
        }
    }

    handleInput(event) {
        // Skip celebration on tap or any key
        if (event.type === 'pointerdown' || event.type === 'keydown') {
            this._elapsed = this._holdMs;
        }
    }

    render(ctx) {
        this.game.renderWorld(ctx, { canSpin: false });
    }
}

import { GameConfig } from '../config/GameConfig.js';
import { SoundEvent } from '../audio/SoundEvent.js';
import { UIPainter } from '../ui/UIPainter.js';
import { ResultState } from './ResultState.js';

const C = GameConfig.COLOR;

/**
 * Runs BetResolver, awards winnings, fires VFX, briefly shows the winning
 * number, then transitions to ResultState.
 */
export class RevealState {
    constructor(game, spinNumber) {
        this._game = game;
        this._number = spinNumber;
        this._resolution = null;
        this._elapsed = 0;
        this._displayDuration = game.data.getConfig().reveal.displayDuration;
        this._bigWinMultiplier = game.data.getConfig().reveal.bigWinMultiplier;
    }

    enter() {
        const placed = this._game.run.chips.getBets();
        this._resolution = this._game.betResolver.resolve(this._number, placed);
        this._game.run.heatmap.record(this._number);
        this._game.run.lastSpinNumber = this._number;
        this._game.run.lastResolution = this._resolution;
        this._game.run.totalSpins += 1;
        if (this._resolution.totalWin > 0) {
            this._game.run.addWinnings(this._resolution.totalWin);
            const isBig = this._resolution.totalWin >= this._resolution.totalWager * this._bigWinMultiplier;
            this._game.sound.play(isBig ? SoundEvent.WIN_BIG : SoundEvent.WIN_SMALL);
            this._fireVFX(isBig);
            this._game.platform.sendScore(this._resolution.totalWin, {
                spin: this._number, wager: this._resolution.totalWager, win: this._resolution.totalWin
            });
        } else {
            this._game.sound.play(SoundEvent.LOSE);
        }
    }

    exit() { /* no cleanup needed */ }

    update(dt) {
        this._elapsed += dt;
        this._game.vfx.update(dt);
        if (this._elapsed >= this._displayDuration) {
            this._game.transitionTo(new ResultState(this._game, this._number, this._resolution));
        }
    }

    handleInput(event) {
        if (event.type === 'down' && this._elapsed > 0.3) {
            this._game.transitionTo(new ResultState(this._game, this._number, this._resolution));
        }
    }

    render(ctx) {
        this._game.tableRenderer.draw(ctx, this._game.run);
        this._game.wheelRenderer.draw(ctx, 0, 0, 0.82, this._number);
        this._game.hud.draw(ctx, this._game.run);
        this._game.vfx.render(ctx);
        // Big number badge
        const W = GameConfig.VIEW_WIDTH;
        UIPainter.panel(ctx, W / 2 - 50, GameConfig.LAYOUT.BUTTON_BAR_Y + 4, 100, 44,
            { fill: 'rgba(8,8,12,0.94)', border: C.GOLD_BRIGHT, borderWidth: 2 });
        UIPainter.text(ctx, String(this._number), W / 2, GameConfig.LAYOUT.BUTTON_BAR_Y + 26, {
            size: 28, weight: 'bold', color: C.GOLD_BRIGHT, align: 'center', shadow: true
        });
    }

    _fireVFX(isBig) {
        const W = GameConfig.VIEW_WIDTH;
        const cx = W / 2;
        const cy = GameConfig.LAYOUT.WHEEL_CY;
        for (const entry of this._resolution.perBet) {
            if (!entry.hit) continue;
            const kind = entry.bet.vfx ?? entry.def.vfx ?? 'default';
            this._game.vfx.burst(cx, cy, kind, isBig ? 32 : 18);
        }
        if (isBig) {
            this._game.vfx.burst(cx, cy, 'bigwin', 48);
            this._game.vfx.flash('BIG WIN!', C.GOLD_BRIGHT);
        }
    }
}

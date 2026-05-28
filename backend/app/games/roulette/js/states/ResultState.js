import { GameConfig } from '../config/GameConfig.js';
import { UIPainter } from '../ui/UIPainter.js';
import { BettingState } from './BettingState.js';

const C = GameConfig.COLOR;

/**
 * Post-spin summary. Auto-dismisses to BettingState or on tap.
 * Also drives platform "gameOver" when balance reaches 0.
 */
export class ResultState {
    constructor(game, spinNumber, resolution) {
        this._game = game;
        this._number = spinNumber;
        this._resolution = resolution;
        this._elapsed = 0;
        this._autoDismiss = 2.4;
        this._gameOverNotified = false;
    }

    enter() {
        // Clear bets after resolution so player can place fresh chips.
        this._game.run.chips.clear();
        if (this._game.run.balance <= 0 && !this._gameOverNotified) {
            this._gameOverNotified = true;
            this._game.platform.gameOver(this._game.run.totalWon, {
                spins: this._game.run.totalSpins,
                biggestWin: this._game.run.biggestWin,
                finalBalance: this._game.run.balance
            });
        }
    }

    exit() { /* no cleanup needed */ }

    update(dt) {
        this._elapsed += dt;
        this._game.vfx.update(dt);
        if (this._elapsed >= this._autoDismiss) this._returnToBetting();
    }

    handleInput(event) {
        if (event.type === 'down' && this._elapsed > 0.2) this._returnToBetting();
    }

    render(ctx) {
        this._game.tableRenderer.draw(ctx, this._game.run);
        this._game.wheelRenderer.draw(ctx, 0, 0, 0.82, this._number);
        this._game.hud.draw(ctx, this._game.run);
        this._game.vfx.render(ctx);
        this._drawSummary(ctx);
    }

    _drawSummary(ctx) {
        const W = GameConfig.VIEW_WIDTH;
        const win = this._resolution.totalWin;
        const wager = this._resolution.totalWager;
        const net = this._resolution.net;
        const winning = win > 0;
        const isBust = this._game.run.balance <= 0;
        const y = GameConfig.LAYOUT.CHIP_BAR_Y - 8;
        const h = 56;
        UIPainter.panel(ctx, 10, y, W - 20, h, {
            fill: winning ? 'rgba(14,125,63,0.94)' : 'rgba(40,28,28,0.94)',
            border: winning ? C.GOLD_BRIGHT : C.TEXT_DIM
        });
        const condA = (winning ? `+${win}` : 'NO WIN');
        const headline = isBust ? 'BUSTED' : condA;
        const condB = (winning ? C.IVORY : C.TEXT_DIM);
        UIPainter.text(ctx, headline, W / 2, y + 18, {
            size: 20, weight: 'bold',
            color: isBust ? C.RED_BRIGHT : condB,
            align: 'center', shadow: true
        });
        UIPainter.text(ctx,
            `Wager ${wager}  ·  Net ${net >= 0 ? '+' : ''}${net}`,
            W / 2, y + 40,
            { size: 12, color: C.TEXT, align: 'center' });
    }

    _returnToBetting() {
        if (this._game.run.balance <= 0) return;   // stay on screen if bust
        this._game.transitionTo(new BettingState(this._game));
    }
}

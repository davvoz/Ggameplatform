import { State } from './State.js';

/**
 * Betting phase — player adjusts bet and presses GIOCA.
 */
export class BettingState extends State {
    enter() {
        this._game.ui.showBetControls();
        this._game.playerHand.clear();
        this._game.dealerHand.clear();
        this._game.croupier.play('idle');
    }

    exit() {
        this._game.ui.hideAll();
    }

    update(dt) {}
    draw(ctx) {}
}

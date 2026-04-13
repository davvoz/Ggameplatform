import { State } from './State.js';

/**
 * Player's turn — can request another card (CARTA) or stand (STAI).
 */
export class PlayingState extends State {
    enter() {
        this._game.ui.showPlayControls();

        // Immediate bust check (e.g. after getting a card)
        if (this._game.playerHand.busted) {
            this._game.fsm.transition('result');
            return;
        }

        // Sette e mezzo — auto stand
        if (this._game.playerHand.setteEMezzo) {
            this._game.fsm.transition('dealerTurn');
        }
    }

    exit() {
        this._game.ui.hideAll();
    }
}

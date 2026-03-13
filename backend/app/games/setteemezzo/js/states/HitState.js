import { State } from './State.js';

/**
 * Hit state — plays deal animation, shows card at the end.
 */
export class HitState extends State {
    #done = false;

    enter() {
        this.#done = false;
        this._game.ui.hideAll();
        this._game.croupier.onDealFinished = () => {
            this._game.dealCardToPlayer();
            this.#done = true;
        };
        this._game.croupier.play('deal');
    }

    update(dt) {
        if (this.#done && !this._game.tweensActive) {
            if (this._game.playerHand.busted) {
                this._game.fsm.transition('result');
            } else if (this._game.playerHand.setteEMezzo) {
                this._game.fsm.transition('dealerTurn');
            } else {
                this._game.fsm.transition('playing');
            }
        }
    }
}

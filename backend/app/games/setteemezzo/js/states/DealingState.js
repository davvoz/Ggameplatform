import { State } from './State.js';

/**
 * Dealing state — croupier plays deal animation,
 * card appears only after animation finishes.
 */
export class DealingState extends State {
    #done = false;

    enter() {
        this.#done = false;
        this._game.ui.hideAll();
        // Start deal animation — card dealt on finish callback
        this._game.croupier.onDealFinished = () => {
            this._game.dealCardToPlayer();
            this.#done = true;
        };
        this._game.croupier.play('deal');
    }

    update(dt) {
        // Wait for card slide-in tween to settle before transitioning
        if (this.#done && !this._game.tweensActive) {
            this._game.fsm.transition('playing');
        }
    }
}

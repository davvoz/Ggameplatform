import { State } from './State.js';

/**
 * Dealer's turn — AI draws cards following standard rules.
 * Dealer must draw if below 5, stands at 5+.
 */
export class DealerTurnState extends State {
    #timer = 0;
    #phase = 'reveal';   // reveal → draw → done
    #drawDelay = 900;

    enter() {
        this.#timer = 0;
        this.#phase = 'reveal';
        // Reveal dealer's first card
        this._game.dealerHand.revealAll();
        this._game.croupier.play('idle');
    }

    update(dt) {
        this.#timer += dt;

        switch (this.#phase) {
            case 'reveal':
                if (this.#timer > 800) {
                    this.#timer = 0;
                    this.#phase = 'draw';
                }
                break;

            case 'draw': {
                const score = this._game.dealerHand.trueScore;

                // Dealer stands at 5 or above
                if (score >= 5 || this._game.dealerHand.busted) {
                    this.#phase = 'done';
                    this._game.fsm.transition('result');
                    return;
                }

                if (this.#timer > this.#drawDelay) {
                    this.#timer = 0;
                    this.#phase = 'dealing';
                    // Play deal anim — card on finish
                    this._game.croupier.onDealFinished = () => {
                        this._game.dealCardToDealer();
                        this.#phase = 'draw';
                    };
                    this._game.croupier.play('deal');
                }
                break;
            }

            case 'dealing':
                // Waiting for deal animation to finish (callback handles transition)
                break;
        }
    }
}

import { State } from './State.js';

/**
 * Result state — determines winner, shows result, awards/takes chips.
 * Bet was already deducted at deal time; here we only award payouts.
 */
export class ResultState extends State {
    enter() {
        const player = this._game.playerHand;
        const dealer = this._game.dealerHand;

        // Reveal all cards
        player.revealAll();
        dealer.revealAll();

        const pScore = player.trueScore;
        const dScore = dealer.trueScore;
        const pBust = player.busted;
        const dBust = dealer.busted;
        const bet = this._game.currentBet;

        // payout = total coins returned to the player (0 on loss)
        // Bet was already deducted at deal-time, so:
        //   win 1x  → payout = bet * 2 (bet back + 1x winnings)
        //   win 2x  → payout = bet * 3 (bet back + 2x bonus for sette e mezzo)
        //   lose    → payout = 0

        let result, text, color, payout = 0;

        if (pBust) {
            result = 'lose';
            text = 'BUSTED!';
            color = '#ff4444';
        } else if (dBust) {
            result = 'win';
            text = 'DEALER BUSTED!';
            color = '#39ff14';
            payout = bet * 2;
        } else if (player.setteEMezzo && !dealer.setteEMezzo) {
            result = 'win';
            text = 'SEVEN AND A HALF!';
            color = '#d4af37';
            payout = bet * 3;
        } else if (pScore > dScore) {
            result = 'win';
            text = 'YOU WIN!';
            color = '#39ff14';
            payout = bet * 2;
        } else if (dScore > pScore) {
            result = 'lose';
            text = 'YOU LOSE!';
            color = '#ff4444';
        } else {
            // Tie — dealer wins (house edge)
            result = 'lose';
            text = 'TIE - DEALER WINS';
            color = '#ffaa00';
        }

        // Update local chips with payout
        if (payout > 0) {
            this._game.addChips(payout);
        }

        this._game.ui.showResult(text, color);

        // Croupier reaction
        if (result === 'win') {
            this._game.croupier.playReaction('happy');
            this._game.particles.emit(
                this._game.renderer.width / 2,
                this._game.renderer.height / 2,
                40,
                { colors: ['#d4af37', '#fff', '#39ff14'] }
            );
        } else {
            this._game.croupier.playReaction('sad');
        }

        // Platform session close (fire-and-forget)
        this._game.resolveRoundOnPlatform(result, payout, {
            player_score: pScore,
            dealer_score: dScore,
            bet_amount: bet,
            player_busted: pBust,
            dealer_busted: dBust,
            sette_e_mezzo: player.setteEMezzo,
        });
    }

    exit() {
        this._game.ui.hideAll();
    }
}

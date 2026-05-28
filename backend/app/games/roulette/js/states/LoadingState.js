import { GameConfig } from '../config/GameConfig.js';
import { BettingState } from './BettingState.js';
import { UIPainter } from '../ui/UIPainter.js';

const C = GameConfig.COLOR;

/**
 * Brief intro / "ready" gate. Data is already loaded by Game.init.
 * Transitions to BettingState on first user input or after a short delay.
 */
export class LoadingState {
    constructor(game) {
        this._game = game;
        this._elapsed = 0;
        this._minDuration = 0.6;
    }

    enter() { /* nothing */ }
    exit()  { /* nothing */ }

    update(dt) {
        this._elapsed += dt;
        if (this._elapsed >= this._minDuration) {
            this._game.transitionTo(new BettingState(this._game));
        }
    }

    handleInput(event) {
        if (event.type === 'down' && this._elapsed >= this._minDuration * 0.5) {
            this._game.transitionTo(new BettingState(this._game));
        }
    }

    render(ctx) {
        const W = GameConfig.VIEW_WIDTH;
        const H = GameConfig.VIEW_HEIGHT;
        ctx.fillStyle = C.BG;
        ctx.fillRect(0, 0, W, H);
        UIPainter.text(ctx, 'ROULETTE ROYALE', W / 2, H / 2 - 20, {
            size: 28, weight: 'bold', color: C.GOLD_BRIGHT, align: 'center', shadow: true
        });
        UIPainter.text(ctx, 'TAP TO PLAY', W / 2, H / 2 + 16, {
            size: 14, color: C.TEXT_DIM, align: 'center'
        });
    }
}

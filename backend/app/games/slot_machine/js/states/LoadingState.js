/**
 * Sits between boot and Idle. Used when we need to display loading inside the canvas
 * (the HTML loader covers the visual until DataRegistry resolves; this state
 * exists primarily so the FSM always has a valid state).
 */
import { GameConfig } from '../config/GameConfig.js';

export class LoadingState {
    constructor(game) { this.game = game; }
    enter() {
        // Nothing to load here, but simulate a delay so the loading screen is visible
    }
    exit() { 
        // No cleanup needed, but this is a good place to cancel any pending loads if there were any.
    }
    update() {
        // Transition to Idle immediately; the HTML loader will have covered the visual until this point.
     }
    handleInput() {
        // No input handling in loading screen
     }
    render(ctx) {
        const W = GameConfig.VIEW_WIDTH, H = GameConfig.VIEW_HEIGHT;
        ctx.fillStyle = GameConfig.COLOR.BG_DEEP;
        ctx.fillRect(0, 0, W, H);
        ctx.font = '900 28px system-ui,sans-serif';
        ctx.fillStyle = GameConfig.COLOR.NEON_GOLD;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = GameConfig.COLOR.NEON_GOLD;
        ctx.shadowBlur = 14;
        ctx.fillText('NEON JACKPOT', W / 2, H / 2);
        ctx.shadowBlur = 0;
    }
}

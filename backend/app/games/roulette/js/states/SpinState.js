import { GameConfig } from '../config/GameConfig.js';
import { SoundEvent } from '../audio/SoundEvent.js';
import { WheelPhysics } from '../systems/WheelPhysics.js';
import { UIPainter } from '../ui/UIPainter.js';
import { RevealState } from './RevealState.js';

const C = GameConfig.COLOR;

/**
 * Spins the wheel + ball. Picks the target number at start.
 * Hands off to RevealState when settled.
 */
export class SpinState {
    constructor(game) {
        this._game = game;
        this._physics = new WheelPhysics(
            game.data.getConfig().spin,
            game.data.getWheelOrder()
        );
        this._target = this._pickTarget();
    }

    enter() {
        this._physics.setOnBounce(() => this._game.sound.play(SoundEvent.BALL_BOUNCE));
        this._physics.start(this._target);
    }
    exit() { /* no cleanup needed */ }

    update(dt) {
        this._physics.update(dt);
        this._game.vfx.update(dt);
        if (this._physics.isSettled()) {
            this._game.sound.play(SoundEvent.BALL_SETTLE);
            this._game.transitionTo(new RevealState(this._game, this._target));
        }
    }

    handleInput(_event) { /* ignore during spin */ }

    render(ctx) {
        this._game.tableRenderer.draw(ctx, this._game.run);
        this._game.wheelRenderer.draw(
            ctx,
            this._physics.getWheelAngle(),
            this._physics.getBallAngle(),
            this._physics.getBallRadius(),
            null
        );
        this._game.hud.draw(ctx, this._game.run);
        this._game.vfx.render(ctx);
        UIPainter.panel(ctx, GameConfig.VIEW_WIDTH / 2 - 70, GameConfig.LAYOUT.BUTTON_BAR_Y + 8, 140, 36,
            { fill: 'rgba(8,8,12,0.85)', border: C.GOLD });
        UIPainter.text(ctx, 'SPINNING…', GameConfig.VIEW_WIDTH / 2, GameConfig.LAYOUT.BUTTON_BAR_Y + 26, {
            size: 14, weight: 'bold', color: C.GOLD_BRIGHT, align: 'center'
        });
    }

    _pickTarget() {
        const order = this._game.data.getWheelOrder();
        return order[Math.floor(Math.random() * order.length)];
    }
}

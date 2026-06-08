import { CarController } from './CarController.js';

/**
 * Translates the shared {@link InputManager} state into car controls.
 * Adding a new control scheme means adding a controller, not editing this one.
 */
export class PlayerCarController extends CarController {
    /**
     * @param {import('../input/InputManager.js').InputManager} input
     */
    constructor(input) {
        super();
        this._input = input;
    }

    /**
     * @param {import('../entities/Car.js').Car} _car
     * @param {import('../domain/Track.js').Track} _track
     * @returns {{throttle:number, brake:number, steer:number}}
     */
    sample(_car, _track) {
        const s = this._input.state;
        this._control.throttle = s.up ? 1 : 0;
        this._control.brake = s.down ? 1 : 0;
        this._control.steer = (s.left ? 1 : 0) - (s.right ? 1 : 0);
        return this._control;
    }
}

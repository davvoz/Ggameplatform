/**
 * Abstract car controller — the ICarController contract. A controller turns
 * some source of intent (human input, AI, network...) into a normalized
 * {@link ControlInput}. It must not mutate the car or run physics (SRP); it
 * only reports desired controls.
 *
 * Each controller reuses one control object to avoid per-frame allocations.
 */
export class CarController {
    constructor() {
        /** @type {{throttle:number, brake:number, steer:number}} */
        this._control = { throttle: 0, brake: 0, steer: 0 };
    }

    /**
     * Compute the desired controls for this frame.
     * @abstract
     * @param {import('../entities/Car.js').Car} _car
     * @param {import('../domain/Track.js').Track} _track
     * @returns {{throttle:number, brake:number, steer:number}}
     */
    sample(_car, _track) {
        throw new Error('CarController.sample() must be overridden');
    }
}

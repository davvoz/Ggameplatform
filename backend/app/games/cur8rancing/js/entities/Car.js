import { GameConfig } from '../config/GameConfig.js';

/**
 * A racing car as a composition of:
 *  - {@link CarModel}      its immutable performance data,
 *  - a Three.js Object3D   its visual representation,
 *  - a {@link CarController} the intent source, and
 *  - shared {@link CarPhysics} the motion integrator.
 *
 * The car owns its kinematic state and keeps the view in sync. Race-level data
 * (segmentIndex, onRoad) is written by RaceManager and read by AI/physics.
 */
export class Car {
    /**
     * @param {import('../domain/CarModel.js').CarModel} model
     * @param {import('three').Object3D} object3D model + shadow group
     * @param {import('../controllers/CarController.js').CarController} controller
     * @param {import('../physics/CarPhysics.js').CarPhysics} physics shared instance
     * @param {boolean} isPlayer
     */
    constructor(model, object3D, controller, physics, isPlayer) {
        this.model = model;
        this.object3D = object3D;
        this.controller = controller;
        this.physics = physics;
        this.isPlayer = isPlayer;

        this.x = 0;
        this.z = 0;
        this.heading = 0;
        this.speed = 0;
        this.onRoad = true;
        this.segmentIndex = 0;
    }

    /**
     * Position the car and reset motion.
     * @param {number} x
     * @param {number} z
     * @param {number} heading radians
     */
    placeAt(x, z, heading) {
        this.x = x;
        this.z = z;
        this.heading = heading;
        this.speed = 0;
        this._syncView();
    }

    /**
     * Sample controls, integrate physics and update the mesh.
     * @param {number} dt seconds
     * @param {import('../domain/Track.js').Track} track
     */
    update(dt, track) {
        const control = this.controller.sample(this, track);
        this.physics.update(this, control, dt, this.onRoad);
        this._syncView();
    }

    /** Displayed speed in "km/h". @returns {number} */
    speedKmh() {
        return Math.abs(this.speed) * GameConfig.DISPLAY.SPEED_FACTOR;
    }

    _syncView() {
        this.object3D.position.set(this.x, 0, this.z);
        this.object3D.rotation.y = this.heading + this.model.modelYaw;
    }
}

import { ChaseCamera } from '../rendering/ChaseCamera.js';

/**
 * Holds everything that lives for the duration of a single race: the track,
 * the cars, the manager, the chase camera and every Three.js object added to
 * the scene. Centralizing teardown here prevents leaks across restarts (SRP).
 */
export class RaceScene {
    /** @param {import('../rendering/SceneRenderer.js').SceneRenderer} renderer */
    constructor(renderer) {
        this._renderer = renderer;
        this._views = [];
        /** @type {import('../domain/Track.js').Track|null} */
        this.track = null;
        /** @type {import('../entities/Car.js').Car[]} */
        this.cars = [];
        /** @type {import('../entities/Car.js').Car|null} */
        this.player = null;
        /** @type {import('./RaceManager.js').RaceManager|null} */
        this.raceManager = null;
        this.chaseCamera = new ChaseCamera();
    }

    /**
     * Add an object to the scene and track it for later disposal.
     * @param {import('three').Object3D} object3D
     */
    addView(object3D) {
        this._views.push(object3D);
        this._renderer.add(object3D);
    }

    /** Remove every scene object owned by this race. */
    dispose() {
        for (const v of this._views) this._renderer.remove(v);
        this._views.length = 0;
        this.cars.length = 0;
        this.player = null;
        this.raceManager = null;
    }
}

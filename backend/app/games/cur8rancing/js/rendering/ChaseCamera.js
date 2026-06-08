import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';

/**
 * Smooth third-person chase camera. Given a target car it positions the shared
 * camera behind and above it, looking slightly ahead. Allocation-free: all
 * vector math reuses scratch instances.
 */
export class ChaseCamera {
    constructor() {
        this._desired = new THREE.Vector3();
        this._look = new THREE.Vector3();
    }

    /**
     * Smoothly follow the car.
     * @param {THREE.PerspectiveCamera} camera
     * @param {import('../entities/Car.js').Car} car
     * @param {number} dt seconds
     */
    follow(camera, car, dt) {
        const C = GameConfig.CAMERA;
        const fx = Math.sin(car.heading);
        const fz = Math.cos(car.heading);
        this._desired.set(car.x - fx * C.DISTANCE, C.HEIGHT, car.z - fz * C.DISTANCE);
        const k = 1 - Math.exp(-C.LERP * dt);
        camera.position.lerp(this._desired, k);
        this._look.set(car.x + fx * C.LOOK_AHEAD, 1, car.z + fz * C.LOOK_AHEAD);
        camera.lookAt(this._look);
    }

    /**
     * Snap instantly behind the car (used before the countdown).
     * @param {THREE.PerspectiveCamera} camera
     * @param {import('../entities/Car.js').Car} car
     */
    snap(camera, car) {
        const C = GameConfig.CAMERA;
        const fx = Math.sin(car.heading);
        const fz = Math.cos(car.heading);
        camera.position.set(car.x - fx * C.DISTANCE, C.HEIGHT, car.z - fz * C.DISTANCE);
        this._look.set(car.x + fx * C.LOOK_AHEAD, 1, car.z + fz * C.LOOK_AHEAD);
        camera.lookAt(this._look);
    }
}

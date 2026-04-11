/**
 * CameraController — Smooth vertical camera tracking.
 *
 * Single Responsibility: translates the player's world-y into a camera offset,
 * with one-way upward tracking and configurable lerp smoothing.
 */

import { GAME_SETTINGS } from '../config/Constants.js';

export class CameraController {
    #y = 0;
    #targetY = 0;
    #lerpFactor;

    /**
     * @param {number} [lerpFactor=GAME_SETTINGS.CAMERA_LERP]
     */
    constructor(lerpFactor = GAME_SETTINGS.CAMERA_LERP) {
        this.#lerpFactor = lerpFactor;
    }

    /** Current camera offset (world-space y). */
    get y() { return this.#y; }

    /**
     * Update camera to track the player.
     * Only moves upward — never pulls down when the player falls.
     *
     * @param {number} dt            — delta time in seconds
     * @param {number} playerY       — player's world-y position
     * @param {number} designHeight  — viewport height in design pixels
     */
    update(dt, playerY, designHeight) {
        const target = playerY - designHeight * 0.5;
        if (target < this.#targetY) {
            this.#targetY = target;
        }

        const diff = this.#targetY - this.#y;
        this.#y += diff * this.#lerpFactor * 60 * dt;
    }

    /** Reset camera to origin. */
    reset() {
        this.#y = 0;
        this.#targetY = 0;
    }
}

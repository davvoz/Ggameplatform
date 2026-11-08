import { View } from '../config/Tuning.js';

/**
 * The camera of the rules: it only moves forward, follows the player once she
 * passes the follow line, and stops at locks (arenas, bosses) until the
 * director opens them again. The renderer adds shake and smoothing on top.
 */
const MAX_CATCH_UP = 3;

export class ScrollCamera {
    x = 0;
    /** furthest x the camera may reach: the end of the mission */
    maxX;
    /** temporary limit set by an arena or a boss */
    lockX = Infinity;

    /** @param {number} levelLength */
    constructor(levelLength) {
        this.maxX = Math.max(0, levelLength - View.width);
    }

    get right() {
        return this.x + View.width;
    }

    get locked() {
        return this.lockX !== Infinity;
    }

    /** @param {number} playerX */
    follow(playerX) {
        const limit = Math.min(this.maxX, this.lockX);
        const target = Math.min(playerX - View.width * View.followAt, limit);
        if (target > this.x) this.x = Math.min(target, this.x + MAX_CATCH_UP);
    }

    lockAt(x) {
        this.lockX = Math.max(this.x, x);
    }

    unlock() {
        this.lockX = Infinity;
    }

    /** @returns {boolean} true while the camera has not reached its lock */
    get settling() {
        return this.locked && this.x < Math.min(this.lockX, this.maxX) - 0.5;
    }

    visible(x, margin = 0) {
        return x > this.x - margin && x < this.right + margin;
    }
}

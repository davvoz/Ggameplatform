/**
 * The pose a car is drawn in. The steering itself reaches full lock in a
 * blink (it is the handling, sim/Car.js), so drawn as it is the car would
 * snap from straight to its fullest turn. The drawn lean follows it at its
 * own pace instead, through every pose in between, and keeps a pose until
 * the lean is clearly past its edge, so a car steering on a pose's edge
 * does not flicker between two.
 *
 * Pure numbers (tested in Node); one Lean per car on screen.
 */

/**
 * The pose for a lean: 0 straight, up to `steps` (fullest right) at `fullAt`, negative to the left.
 * @param {number} lean -1..1 @param {number} steps @param {number} fullAt
 */
export function poseAt(lean, steps, fullAt) {
    const level = Math.min(steps, Math.floor((Math.abs(lean) / fullAt) * steps));
    return Math.sign(lean) * level || 0;
}

export class Lean {
    #steps;
    #tuning;
    #shown = 0;
    #pose = 0;

    /** @param {number} steps the car's turning poses each side @param {{rate: number, fullAt: number, margin: number}} tuning */
    constructor(steps, tuning) {
        this.#steps = steps;
        this.#tuning = tuning;
    }

    /**
     * @param {number} turn the car's steering, -1..1 @param {number} dt seconds since the last call
     * @returns {number} the pose to draw
     */
    follow(turn, dt) {
        const { rate, fullAt, margin } = this.#tuning;
        const most = rate * dt;
        this.#shown += Math.max(-most, Math.min(most, turn - this.#shown));
        const low = poseAt(this.#shown - margin, this.#steps, fullAt);
        const high = poseAt(this.#shown + margin, this.#steps, fullAt);
        this.#pose = Math.max(low, Math.min(high, this.#pose));
        return this.#pose;
    }
}

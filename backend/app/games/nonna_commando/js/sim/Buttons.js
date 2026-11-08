/**
 * The whole input of one tick is a bitmask. Keyboard, gamepad and touch all
 * reduce to it, and a recorded run is just a list of these numbers.
 */
export const Btn = Object.freeze({
    LEFT: 1,
    RIGHT: 2,
    UP: 4,
    DOWN: 8,
    JUMP: 16,
    FIRE: 32,
    BOMB: 64,
});

/** Current and previous buttons, with edge detection. */
export class ButtonState {
    now = 0;
    prev = 0;

    /** @param {number} bits */
    update(bits) {
        this.prev = this.now;
        this.now = bits;
    }

    held(bit) {
        return (this.now & bit) !== 0;
    }

    pressed(bit) {
        return (this.now & bit) !== 0 && (this.prev & bit) === 0;
    }

    released(bit) {
        return (this.now & bit) === 0 && (this.prev & bit) !== 0;
    }

    /** -1, 0 or 1 */
    get axisX() {
        return (this.held(Btn.RIGHT) ? 1 : 0) - (this.held(Btn.LEFT) ? 1 : 0);
    }
}

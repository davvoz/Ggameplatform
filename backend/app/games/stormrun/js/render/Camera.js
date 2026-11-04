/**
 * World to screen. The view shows the same metres ahead on every device, and
 * zooms out only when a flight needs it. The further the runner falls behind,
 * the further left it slides, towards the storm: the screen is the danger bar.
 */

const VIEW_WIDTH = 60;
const MIN_ZOOM = 0.5;
const SKY_ABOVE_RUNNER = 9;
const SKY_ABOVE_GROUND = 12;
const GROUND_BELOW = 5;
const CLOSE_FRACTION = 0.16;
const SAFE_FRACTION = 0.34;
const SAFE_GAP = 42;
const SAMPLE_STEP = 8;
const SMOOTHING = 5;

export class Camera {
    /** Screen pixels per metre. */
    scale = 1;
    left = 0;
    bottom = 0;
    width = 1;
    height = 1;

    #fraction = SAFE_FRACTION;
    #travelled = 0;

    /** Follow the current frame at once, with no easing. */
    jump(terrain, runnerX, runnerY, gap) {
        this.#apply(terrain, runnerX, runnerY, gap, 1);
    }

    /** Ease towards the current frame. */
    follow(terrain, runnerX, runnerY, gap, dt) {
        this.#apply(terrain, runnerX, runnerY, gap, 1 - Math.exp(-SMOOTHING * dt));
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    /** @returns {number} screen x of a world x */
    sx(x) {
        return (x - this.left) * this.scale;
    }

    /** @returns {number} screen y of a world y */
    sy(y) {
        return this.height - (y - this.bottom) * this.scale;
    }

    get right() {
        return this.left + this.width / this.scale;
    }

    /**
     * How far a distant layer has scrolled, in screen pixels. It follows the road
     * travelled and not the view: a zoom moves the view, and if the scenery
     * followed it, it would run backwards at every flight.
     * @param {number} parallax share of the speed of the ground
     * @returns {number}
     */
    scrollFor(parallax) {
        return this.#travelled * (this.width / VIEW_WIDTH) * parallax;
    }

    #apply(terrain, runnerX, runnerY, gap, ease) {
        this.#travelled = runnerX;
        const baseScale = this.width / VIEW_WIDTH;
        const viewWidth = this.width / this.scale;

        const safety = Math.min(1, Math.max(0, gap / SAFE_GAP));
        const fraction = CLOSE_FRACTION + (SAFE_FRACTION - CLOSE_FRACTION) * safety;
        this.#fraction += (fraction - this.#fraction) * ease;

        const viewLeft = runnerX - this.#fraction * viewWidth;
        let lowest = Infinity;
        let highest = -Infinity;
        for (let x = viewLeft; x <= viewLeft + viewWidth; x += SAMPLE_STEP) {
            const ground = terrain.heightAt(x);
            lowest = Math.min(lowest, ground);
            highest = Math.max(highest, ground);
        }

        const bottom = lowest - GROUND_BELOW;
        const top = Math.max(highest + SKY_ABOVE_GROUND, runnerY + SKY_ABOVE_RUNNER);
        const targetScale = Math.max(baseScale * MIN_ZOOM, Math.min(baseScale, this.height / (top - bottom)));

        this.scale += (targetScale - this.scale) * ease;
        this.bottom += (bottom - this.bottom) * ease;
        this.left = runnerX - this.#fraction * (this.width / this.scale);
    }
}

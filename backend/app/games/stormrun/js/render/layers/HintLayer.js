import { drawSprite } from '../art/Bake.js';

/** The tutorial is played, not read: a word above the blob until it has jumped. */

const JUMPS_TO_LEARN = 3;
const OBSTACLE_NEAR = 26;
const AIR_TICKS_FOR_SECOND_TAP = 14;
const LIFT = 6;
const ART_SCALE = 0.085;

export class HintLayer {
    #tapTag;
    #tapAgainTag;
    /** Off once the player has shown they know the game. */
    enabled = true;

    /**
     * @param {import('../art/Bake.js').Sprite} tapTag
     * @param {import('../art/Bake.js').Sprite} tapAgainTag
     */
    constructor(tapTag, tapAgainTag) {
        this.#tapTag = tapTag;
        this.#tapAgainTag = tapAgainTag;
    }

    draw(ctx, { sim, camera, runnerX, runnerY }) {
        if (!this.enabled || sim.tick === 0 || sim.jumps >= JUMPS_TO_LEARN) return;
        const tag = this.#tagFor(sim);
        if (!tag) return;
        drawSprite(ctx, tag, camera.sx(runnerX), camera.sy(runnerY + LIFT), camera.scale * ART_SCALE);
    }

    #tagFor({ runner, course, jumps }) {
        if (!runner.grounded) {
            return jumps === 2 && runner.airTicks > AIR_TICKS_FOR_SECOND_TAP ? this.#tapAgainTag : null;
        }
        const near = course.obstacles.some((o) => o.x > runner.x && o.x - runner.x < OBSTACLE_NEAR);
        return near || jumps === 0 ? this.#tapTag : null;
    }
}

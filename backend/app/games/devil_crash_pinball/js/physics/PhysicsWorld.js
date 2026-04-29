import { Ball } from './Ball.js';
import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Drives ball integration with substeps. Sections own their colliders;
 * the world just hands the ball to the active section for resolution.
 */
export class PhysicsWorld {
    constructor(ball) {
        this.ball = ball;
    }

    /**
     * @param {number} dt
     * @param {{resolve: function(Ball): void} | function(Ball): {resolve: function(Ball): void}} sectionOrResolver
     *   Pass a Section directly, or a function (ball) => Section to re-evaluate the active
     *   section every substep. The latter prevents cross-boundary tunneling when the ball
     *   crosses a section edge mid-frame.
     */
    step(dt, sectionOrResolver) {
        const subDt = dt / C.PHYSICS_SUBSTEPS;
        const isDynamic = typeof sectionOrResolver === 'function';
        for (let i = 0; i < C.PHYSICS_SUBSTEPS; i++) {
            this.ball.prevPos.copy(this.ball.pos); // snapshot before integration (CCD)
            this.ball.integrate(subDt);
            const section = isDynamic ? sectionOrResolver(this.ball) : sectionOrResolver;
            section.resolve(this.ball, subDt);
        }
        this.ball.pushTrail();
    }
}

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
     * @param {{resolve: function(Ball): void}} activeSection
     */
    step(dt, activeSection) {
        const subDt = dt / C.PHYSICS_SUBSTEPS;
        for (let i = 0; i < C.PHYSICS_SUBSTEPS; i++) {
            this.ball.prevPos.copy(this.ball.pos); // snapshot before integration (CCD)
            this.ball.integrate(subDt);
            activeSection.resolve(this.ball);
        }
        this.ball.pushTrail();
    }
}

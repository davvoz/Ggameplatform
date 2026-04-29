import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Drives ball integration with fixed substeps and delegates collision
 * resolution to the section that owns the ball at each substep.
 *
 * Tunneling guarantee: this class enforces, at construction time, the
 * invariant that one substep can never displace the ball by more than its
 * radius. With this invariant, a single discrete narrow-phase test per
 * substep is sufficient — no Continuous Collision Detection is needed.
 */
export class PhysicsWorld {
    constructor(ball) {
        this.ball = ball;
        PhysicsWorld._assertNoTunneling();
    }

    /**
     * Integrate one frame in {@link C.PHYSICS_SUBSTEPS} substeps.
     * @param {number} dt frame delta in seconds (already clamped by the game loop)
     * @param {(ball:object) => {resolve:(ball:object, dt:number) => void}} resolveSection
     *   Function returning the section that owns the ball for the current substep.
     *   Called every substep so cross-section tunneling is impossible.
     */
    step(dt, resolveSection) {
        const subDt = dt / C.PHYSICS_SUBSTEPS;
        for (let i = 0; i < C.PHYSICS_SUBSTEPS; i++) {
            this.ball.integrate(subDt);
            resolveSection(this.ball).resolve(this.ball, subDt);
        }
        this.ball.pushTrail();
    }

    /**
     * Compile-time-style invariant: with the current physics constants and
     * the dt clamp applied by the game loop, one substep cannot displace
     * the ball by more than its radius.
     *
     * If a future change breaks this, the engine fails loud at boot rather
     * than silently allowing tunneling bugs.
     * @private
     */
    static _assertNoTunneling() {
        const maxSubstepPx = (C.BALL_MAX_SPEED * C.FRAME_DT_CLAMP) / C.PHYSICS_SUBSTEPS;
        if (maxSubstepPx >= C.BALL_RADIUS) {
            throw new Error(
                `[PhysicsWorld] Tunneling invariant violated: ` +
                `max substep displacement ${maxSubstepPx.toFixed(2)}px ` +
                `>= BALL_RADIUS ${C.BALL_RADIUS}px. ` +
                `Increase PHYSICS_SUBSTEPS or reduce BALL_MAX_SPEED / FRAME_DT_CLAMP.`
            );
        }
    }
}

import { SimConfig } from '../../config/SimConfig.js';
import { SimEvent } from '../../sim/Simulation.js';
import { BLOB_ART_RADIUS, drawLeg, Mood } from '../art/BlobArt.js';

/** The blob on screen: it squashes, stretches and reacts, all from the state. */

const FEAR_GAP = 16;
const JOY_SECONDS = 0.8;
const LAND_SECONDS = 0.2;
const MOTION_EASE = 16;
const MAX_TILT = 0.55;
const HURT_SECONDS = 0.6;
const STRIDE_PER_METRE = 1.05;
const LEG_LENGTH = 0.62;
const LEG_SPREAD = 0.34;

export class RunnerLayer {
    #art;
    #stretchX = 1;
    #stretchY = 1;
    #tilt = 0;
    #landTimer = 0;
    #joyTimer = 0;
    #fullTimer = 0;
    #hurtTimer = 0;

    /** @param {import('../art/BlobArt.js').BlobArt} art */
    constructor(art) {
        this.#art = art;
    }

    reset() {
        this.#landTimer = this.#joyTimer = this.#fullTimer = this.#hurtTimer = 0;
    }

    onEvent(event) {
        if (event.type === SimEvent.LAND) this.#landTimer = LAND_SECONDS;
        if (event.type === SimEvent.PERFECT) this.#joyTimer = JOY_SECONDS;
        if (event.type === SimEvent.RAINBOW) this.#joyTimer = this.#fullTimer = JOY_SECONDS * 1.5;
        if (event.type === SimEvent.HIT) this.#hurtTimer = HURT_SECONDS;
    }

    update({ sim, dt }) {
        const { runner } = sim;
        this.#landTimer = Math.max(0, this.#landTimer - dt);
        this.#joyTimer = Math.max(0, this.#joyTimer - dt);
        this.#fullTimer = Math.max(0, this.#fullTimer - dt);
        this.#hurtTimer = Math.max(0, this.#hurtTimer - dt);

        const [targetX, targetY] = this.#targetStretch(sim);
        const ease = 1 - Math.exp(-MOTION_EASE * dt);
        this.#stretchX += (targetX - this.#stretchX) * ease;
        this.#stretchY += (targetY - this.#stretchY) * ease;

        const heading = Math.atan2(runner.vy, Math.max(1, runner.vx));
        const tilt = Math.min(MAX_TILT, Math.max(-MAX_TILT, heading));
        this.#tilt += (-tilt - this.#tilt) * ease;
    }

    draw(ctx, { sim, camera, time, runnerX, runnerY }) {
        const radius = SimConfig.runner.radius;
        const artScale = (camera.scale * radius) / BLOB_ART_RADIUS;
        const body = this.#art.body(this.#fullTimer > 0 ? SimConfig.paint.bands : sim.tank.bands, time);
        const face = this.#art.faces[this.#mood(sim)];
        const tilt = this.#tilt;
        const stretchY = this.#stretchY;

        // the centre stays one radius above the ground, along the ground's normal
        const lift = radius * stretchY;
        const x = camera.sx(runnerX + Math.sin(tilt) * lift);
        const y = camera.sy(runnerY + Math.cos(tilt) * lift);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        this.#drawLegs(ctx, sim.runner, radius * camera.scale, runnerX);
        ctx.save();
        ctx.scale(this.#stretchX * artScale, stretchY * artScale);
        ctx.drawImage(body.canvas, -body.anchorX, -body.anchorY, body.width, body.height);
        ctx.restore();

        // the face keeps most of its proportions when the body squashes
        ctx.scale(((1 + this.#stretchX) / 2) * artScale, ((1 + stretchY) / 2) * artScale);
        ctx.drawImage(face.canvas, -face.anchorX, -face.anchorY, face.width, face.height);
        ctx.restore();
    }

    #drawLegs(ctx, runner, radius, runnerX) {
        const phase = runnerX * STRIDE_PER_METRE;
        const hipY = radius * 0.72 * this.#stretchY;
        const length = radius * LEG_LENGTH;

        for (const side of [0, Math.PI]) {
            const swing = runner.grounded ? Math.sin(phase + side) : 0.5 * (side === 0 ? 1 : -1);
            const lift = runner.grounded ? Math.max(0, Math.cos(phase + side)) * 0.34 : 0.1;
            const hipX = radius * LEG_SPREAD * (side === 0 ? 0.4 : -0.4);
            const footX = hipX + swing * length * 0.8;
            const footY = hipY + length * (1 - lift);
            drawLeg(ctx, hipX, hipY, footX, footY, radius);
        }
    }

    #targetStretch({ runner }) {
        if (this.#landTimer > 0) return [1.3, 0.7];
        if (runner.grounded) return [1, 1];
        return runner.vy > 0 ? [0.86, 1.18] : [1.06, 0.95];
    }

    #mood(sim) {
        if (this.#hurtTimer > 0) return Mood.HURT;
        if (this.#joyTimer > 0) return Mood.JOY;
        if (sim.gap < FEAR_GAP) return Mood.FEAR;
        return sim.runner.grounded ? Mood.CALM : Mood.FLY;
    }
}

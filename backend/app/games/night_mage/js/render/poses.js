import { ACTORS, FRAMES } from '../config/Sprites.js';

/**
 * Which frame of which animation shows an actor in a state, `time` seconds in.
 * Pure: the view asks it every frame, the tests can ask it too.
 *
 * @param {string} actor key of ACTORS
 * @param {string} state the simulation state (or the mage's pose)
 * @param {number} time seconds spent in that state
 * @param {object} [stats] the monster's stats, for timed poses
 * @returns {{anim: string, frame: number}}
 */
export function poseFrame(actor, state, time, stats = {}) {
    const { poses } = ACTORS[actor];
    const pose = poses[state] ?? poses.idle ?? poses.fly;
    if (pose.timed) {
        const duration = stats[pose.timed] || 0.5;
        const span = pose.to - pose.from + 1;
        const step = Math.min(span - 1, Math.floor((time / duration) * span));
        return { anim: pose.anim, frame: pose.from + step };
    }
    const index = Math.floor((time * 1000) / pose.ms);
    return { anim: pose.anim, frame: pose.loop ? index % FRAMES : Math.min(FRAMES - 1, index) };
}

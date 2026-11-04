/**
 * Obstacle catalogue. Adding an obstacle means adding an entry here, a
 * placement rule in CoursePatterns.js and a drawing in ObstacleArt.js.
 *
 * Each one is answered with the jump: over a stump or a puddle, and a short hop
 * under a low cloud.
 */

export const ObstacleTypes = Object.freeze({
    stump: Object.freeze({
        id: 'stump',
        halfWidth: 1.2,
        halfHeight: 1.1,
        speedFactor: 0.55,
        losesBand: true,
    }),
    cloud: Object.freeze({
        id: 'cloud',
        halfWidth: 3,
        halfHeight: 1.4,
        speedFactor: 0.65,
        losesBand: true,
    }),
    puddle: Object.freeze({
        id: 'puddle',
        halfWidth: 3.4,
        halfHeight: 0.5,
        speedFactor: 0.82,
        losesBand: false,
    }),
});

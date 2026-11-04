/**
 * Placement rules: what stands on a hill. A pattern is a small strategy that
 * reads a hill and adds drops or obstacles, so a new idea is a new entry here.
 *
 * A hill runs from a crest down to a valley and up to the next crest.
 *
 * @typedef {Object} Hill
 * @property {number} crestX
 * @property {number} crestY
 * @property {number} valleyX
 * @property {number} valleyY
 * @property {number} nextCrestX
 * @property {number} nextCrestY
 * @property {number} distance metres from the start
 *
 * @typedef {Object} PlacementContext
 * @property {Hill} hill
 * @property {import('../core/Rng.js').Rng} rng
 * @property {import('./Terrain.js').Terrain} terrain
 * @property {(x: number, y: number) => void} addDrop
 * @property {(typeId: string, x: number, y: number) => void} addObstacle
 */

const GROUND_CLEARANCE = 2.2;
const STUMP_CENTRE = 1.1;

/** Drops on the run line: taken without doing anything. */
function dropsAlongGround(ctx, fromX, toX, count) {
    for (let i = 0; i < count; i++) {
        const x = fromX + ((toX - fromX) * (i + 0.5)) / count;
        ctx.addDrop(x, ctx.terrain.heightAt(x) + GROUND_CLEARANCE);
    }
}

/** An arch over the ground, shaped like a jump. */
function dropsInArc(ctx, centreX, width, count, peak) {
    for (let i = 0; i < count; i++) {
        const t = (i + 1) / (count + 1);
        const x = centreX + (t - 0.5) * width;
        ctx.addDrop(x, ctx.terrain.heightAt(x) + GROUND_CLEARANCE + 4 * peak * t * (1 - t));
    }
}

function stumpAt(ctx, x) {
    ctx.addObstacle('stump', x, ctx.terrain.heightAt(x) + STUMP_CENTRE);
}

function middleOfDescent({ crestX, valleyX }, rng) {
    return crestX + (valleyX - crestX) * rng.range(0.35, 0.65);
}

function middleOfClimb({ valleyX, nextCrestX }, rng) {
    return valleyX + (nextCrestX - valleyX) * rng.range(0.35, 0.65);
}

export const DropPatterns = Object.freeze([
    {
        id: 'none',
        weight: () => 3,
        place() {},
    },
    {
        id: 'line',
        weight: () => 3,
        place(ctx) {
            const { crestX, valleyX } = ctx.hill;
            dropsAlongGround(ctx, crestX + (valleyX - crestX) * 0.25, valleyX, 3);
        },
    },
    {
        id: 'jump-arc',
        weight: () => 5,
        place(ctx) {
            dropsInArc(ctx, ctx.hill.valleyX, 20, ctx.rng.int(4, 5), ctx.rng.range(3, 4.5));
        },
    },
    {
        id: 'double-jump-arc',
        weight: (distance) => (distance < 300 ? 0 : 3),
        place(ctx) {
            dropsInArc(ctx, ctx.hill.valleyX, 24, 3, ctx.rng.range(7, 9));
        },
    },
]);

export const ObstaclePatterns = Object.freeze([
    {
        id: 'stump',
        chance: (difficulty) => difficulty.stump,
        place(ctx) {
            stumpAt(ctx, middleOfDescent(ctx.hill, ctx.rng));
        },
    },
    {
        id: 'puddle',
        chance: (difficulty) => difficulty.puddle,
        place(ctx) {
            const { valleyX, valleyY } = ctx.hill;
            ctx.addObstacle('puddle', valleyX, valleyY + 0.3);
        },
    },
    {
        id: 'stump-pair',
        chance: (difficulty) => difficulty.pair,
        place(ctx) {
            const x = middleOfClimb(ctx.hill, ctx.rng);
            const spacing = ctx.rng.range(11, 15);
            stumpAt(ctx, x - spacing / 2);
            stumpAt(ctx, x + spacing / 2);
        },
    },
    {
        id: 'low-cloud',
        chance: (difficulty) => difficulty.cloud,
        place(ctx) {
            const { nextCrestX } = ctx.hill;
            ctx.addObstacle('cloud', nextCrestX, ctx.terrain.heightAt(nextCrestX) + ctx.rng.range(6.5, 7.5));
        },
    },
]);

/**
 * How the course changes with distance: values are interpolated between stages.
 * The first stage is deliberately kind, the game has to welcome everybody.
 */

const STAGES = Object.freeze([
    { at: 0, lengthMin: 34, lengthMax: 42, dropMin: 4, dropMax: 6, stump: 0.75, puddle: 0, pair: 0, cloud: 0 },
    { at: 300, lengthMin: 30, lengthMax: 44, dropMin: 4, dropMax: 8, stump: 0.8, puddle: 0.4, pair: 0.15, cloud: 0 },
    { at: 800, lengthMin: 28, lengthMax: 46, dropMin: 5, dropMax: 10, stump: 0.8, puddle: 0.45, pair: 0.3, cloud: 0.25 },
    { at: 1600, lengthMin: 26, lengthMax: 48, dropMin: 5, dropMax: 12, stump: 0.85, puddle: 0.5, pair: 0.45, cloud: 0.35 },
    { at: 3000, lengthMin: 24, lengthMax: 50, dropMin: 6, dropMax: 13, stump: 0.9, puddle: 0.55, pair: 0.6, cloud: 0.45 },
]);

const FIELDS = ['lengthMin', 'lengthMax', 'dropMin', 'dropMax', 'stump', 'puddle', 'pair', 'cloud'];

/**
 * @param {number} distance metres from the start
 * @returns {{lengthMin: number, lengthMax: number, dropMin: number, dropMax: number,
 *            stump: number, puddle: number, pair: number, cloud: number}}
 */
export function difficultyAt(distance) {
    let index = 0;
    while (index < STAGES.length - 1 && STAGES[index + 1].at <= distance) index++;
    if (index === STAGES.length - 1) return STAGES[index];

    const from = STAGES[index];
    const to = STAGES[index + 1];
    const t = (distance - from.at) / (to.at - from.at);
    const result = {};
    for (const field of FIELDS) result[field] = from[field] + (to[field] - from[field]) * t;
    return result;
}

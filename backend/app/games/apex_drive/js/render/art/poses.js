/**
 * A car's poses as rows of letters, all the same size so the car does not
 * jump when it changes pose: 0 is straight (the left half and its mirror),
 * 1..n turn right a step more each (drawn whole in the car's config,
 * `turns`, slightest first), -1..-n are their mirrors. A car with no turns
 * drawn has the straight pose only.
 *
 * Pure: config in, rows out (tested in Node); render/CarArt.js paints them.
 */

export function mirrorRows(rows) {
    return rows.map((row) => [...row].reverse().join(''));
}

/** The left half and its mirror. */
function whole(left) {
    const width = left[0].length;
    return left.map((row, i) => {
        if (row.length !== width) throw new Error(`Car row ${i} is ${row.length} pixels, expected ${width}`);
        return row + [...row].reverse().join('');
    });
}

/** Every turn as tall as the car and as wide as the first turn. */
function checkTurns(straight, turns) {
    const width = turns[0].rows[0].length;
    turns.forEach(({ rows }, n) => {
        if (rows.length !== straight.length) throw new Error(`Turn ${n + 1} is ${rows.length} rows, expected ${straight.length}`);
        rows.forEach((row, i) => {
            if (row.length !== width) throw new Error(`Turn ${n + 1} row ${i} is ${row.length} pixels, expected ${width}`);
        });
    });
    return width;
}

/** The room on each side of the straight pose that makes it as wide as the turns. */
function marginOf(straight, width) {
    const margin = (width - straight[0].length) / 2;
    if (!Number.isInteger(margin) || margin < 0) throw new Error(`Turns are ${width} pixels wide: the car plus an even margin`);
    return margin;
}

/** The tread columns: wherever the wheels have a W. */
function treadsOf(rows) {
    const columns = new Set();
    rows.forEach((row) => [...row].forEach((letter, x) => letter === 'W' && columns.add(x)));
    return [...columns];
}

function pose(rows, pipes, y) {
    return { rows, treads: treadsOf(rows), exhaust: pipes.map((x) => ({ x, y })) };
}

/**
 * @param {typeof import('../../config/Cars.js').CARS.comet} car
 * @returns {{width: number, height: number, steps: number,
 *   poses: Record<number, {rows: string[], treads: number[], exhaust: {x: number, y: number}[]}>}}
 */
export function posesOf(car) {
    const straight = whole(car.left);
    const turns = car.turns ?? [];
    const width = turns.length > 0 ? checkTurns(straight, turns) : straight[0].length;
    const margin = marginOf(straight, width);
    const pad = '.'.repeat(margin);
    const { y } = car.exhaust;
    const poses = { 0: pose(straight.map((row) => pad + row + pad), [margin + car.exhaust.x, width - 1 - margin - car.exhaust.x], y) };
    turns.forEach(({ rows, exhaust }, i) => {
        poses[i + 1] = pose(rows, exhaust, y);
        poses[-(i + 1)] = pose(mirrorRows(rows), exhaust.map((x) => width - 1 - x), y);
    });
    return { width, height: straight.length, steps: turns.length, poses };
}

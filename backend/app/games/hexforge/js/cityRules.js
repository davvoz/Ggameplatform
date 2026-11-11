/**
 * Client copies of the city rules, used only to preview what the server will
 * say (green or red placement, a production counter that ticks up). The
 * server always has the last word.
 */

export function occupiedCells(building, x = building.x, y = building.y) {
    const cells = [];
    for (let cx = x; cx < x + building.size; cx++) {
        for (let cy = y; cy < y + building.size; cy++) cells.push(`${cx},${cy}`);
    }
    return cells;
}

/** Same codes as the server: null, 'outside_city' or 'occupied'. */
export function placementError(city, building, x, y) {
    const max = city.grid - 2;
    if (x < 1 || y < 1 || x + building.size - 1 > max || y + building.size - 1 > max) {
        return 'outside_city';
    }
    const wanted = new Set(occupiedCells(building, x, y));
    for (const other of city.buildings) {
        if (other.id === building.id) continue;
        if (occupiedCells(other).some((cell) => wanted.has(cell))) return 'occupied';
    }
    return null;
}

/** What a production building holds `elapsed` seconds after the server reported it. */
export function estimatePending(production, elapsed) {
    const made = Math.floor((production.per_hour * Math.max(0, elapsed)) / 3600);
    return Math.min(production.capacity, production.pending + made);
}

/** Top-left cell that puts a building of `size` under a pointer at world (x, y). */
export function anchorFor(size, x, y) {
    return { x: Math.round(x - size / 2), y: Math.round(y - size / 2) };
}

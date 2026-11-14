/** Reading a defense test: the share of raids held and the weakest side. */

export function percentHeld(report) {
    return report.total ? Math.round((100 * report.held) / report.total) : 0;
}

/** The side that holds the fewest raids, or null when every side holds as many. */
export function weakestSide(sides) {
    const entries = Object.entries(sides);
    const counts = entries.map(([, s]) => s.held);
    if (counts.every((n) => n === counts[0])) return null;
    return entries.reduce((low, entry) => (entry[1].held < low[1].held ? entry : low), entries[0])[0];
}

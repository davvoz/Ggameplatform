/**
 * What the game needs from the outside world. The game depends only on this
 * contract: it runs the same on the platform and alone, and swapping the
 * platform touches a single class.
 *
 * @typedef {Object} RunResult
 * @property {number} metres
 * @property {number} drops
 * @property {number} rainbows
 * @property {number} perfectLandings
 * @property {string} weekId
 *
 * @typedef {Object} Standing
 * @property {number} rank
 * @property {string} username
 * @property {number} metres
 * @property {boolean} isPlayer
 *
 * @typedef {Object} LevelUp
 * @property {number} level
 * @property {string} title
 * @property {number} coins 0 when the player cannot receive them
 *
 * @typedef {Object} PlatformGateway
 * @property {() => Promise<void>} connect
 * @property {(callbacks: {onPause: Function, onResume: Function}) => void} onLifecycle
 * @property {(callbacks: {onXp: (xp: number) => void, onLevelUp: (levelUp: LevelUp) => void}) => void} onRewards
 *   the server answers some time after finishRun, whatever the game shows by then
 * @property {() => Promise<{weekId: string, seed: number}>} loadWeek
 * @property {() => Promise<number>} loadBest
 * @property {(metres: number) => void} saveBest
 * @property {() => void} startRun fire and forget: the run starts at once
 * @property {(result: RunResult) => void} finishRun
 * @property {() => Promise<Standing[]>} loadStandings best of the week, first to last
 * @property {() => void} toggleFullscreen
 */

/** ISO week of a date, like the platform uses for its weekly leaderboard. */
export function isoWeekId(date) {
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
    const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
    const week = Math.ceil(((day.getTime() - yearStart) / 86400000 + 1) / 7);
    return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** A seed for a week id, used only if the server cannot be reached. */
export function fallbackSeed(weekId) {
    let hash = 7;
    for (let i = 0; i < weekId.length; i++) hash = Math.imul(hash, 31) + weekId.charCodeAt(i);
    return (hash >>> 0) % 2147483647 || 1;
}

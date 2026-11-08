/**
 * What the game needs from the outside world. The game depends only on this
 * contract: it runs the same on the platform and alone, and swapping the
 * platform touches a single class.
 *
 * @typedef {Object} RunReport
 * @property {number} score
 * @property {number} missionsCleared
 * @property {number} reachedMission
 * @property {number} kills
 * @property {number} rescues
 * @property {number} teeth
 * @property {number} bestMultiplier
 * @property {boolean} victory
 * @property {number} ticks
 * @property {number} seed
 * @property {string} weekId
 *
 * @typedef {Object} Standing
 * @property {number} rank
 * @property {string} username
 * @property {number} score
 * @property {boolean} isPlayer
 *
 * @typedef {Object} PlatformGateway
 * @property {() => Promise<void>} connect
 * @property {(callbacks: {onPause: Function, onResume: Function}) => void} onLifecycle
 * @property {(callbacks: {onXp: (xp: number) => void, onLevelUp: (l: {level: number, title: string, coins: number}) => void}) => void} onRewards
 * @property {() => {weekId: string, seed: number}} week the run everybody plays this week
 * @property {() => Promise<number>} loadBest
 * @property {(score: number) => void} saveBest
 * @property {() => void} startRun
 * @property {(report: RunReport) => void} finishRun
 * @property {() => Promise<Standing[]>} loadStandings best of the week, first to last
 * @property {() => void} toggleFullscreen
 */

/** ISO week of a date, like the platform's weekly leaderboard. */
export function isoWeekId(date) {
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
    const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
    const week = Math.ceil(((day.getTime() - yearStart) / 86400000 + 1) / 7);
    return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** The seed of a week: the same for everyone, new every Monday. */
export function weekSeed(weekId) {
    let hash = 0x811c9dc5;
    const text = `nonna-commando:${weekId}`;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
    return (hash >>> 0) % 2147483647 || 1;
}

/**
 * What the game needs from the outside world. The game depends only on this
 * contract: it runs the same on the platform and alone.
 *
 * @typedef {Object} Invader a monster another player sent
 * @property {string} id
 * @property {'bat'|'warrior'|'archer'|'brawler'} kind
 * @property {number} level 1..5
 * @property {string} name its owner's name
 *
 * @typedef {Object} InvaderOutcome what an invader did in this run
 * @property {string} id
 * @property {number} damage hearts it took from the mage
 * @property {boolean} slain
 * @property {boolean} killedMage
 *
 * @typedef {Object} Inbox what the player's own invaders did out there
 * @property {number} hits
 * @property {number} kills
 * @property {number} slain
 * @property {number} active
 *
 * @typedef {Object} PlatformGateway
 * @property {() => Promise<void>} connect
 * @property {(callbacks: {onPause: Function, onResume: Function}) => void} onLifecycle
 * @property {(callbacks: {onXp: (xp: number) => void, onLevelUp: Function}) => void} onRewards
 * @property {() => {weekId: string, seed: number}} week the night everybody plays this week
 * @property {() => Promise<number>} loadBest
 * @property {(score: number) => void} saveBest
 * @property {() => void} startRun
 * @property {(report: object) => void} finishRun
 * @property {(count: number) => Promise<Invader[]>} loadInvaders monsters from other players for this run
 * @property {(outcomes: InvaderOutcome[]) => void} reportInvaders
 * @property {(kind: string, wave: number) => Promise<boolean>} sendInvader
 * @property {() => Promise<Inbox|null>} loadInbox
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
    const text = `night-mage:${weekId}`;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
    return (hash >>> 0) % 2147483647 || 1;
}

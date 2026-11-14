/** Trophy leagues: where each starts and how far through it a player is, and when a rival can be attacked. */

/** Trophies where each league starts (display only: the server decides the league). */
export const LEAGUE_FLOORS = { Bronze: 0, Silver: 200, Gold: 500, Neon: 1000, Mythic: 2000 };

/** How far through the current league (0 to 1), for the bar under the player's name. */
export function leagueProgress(trophies, league, next) {
    if (!next) return 1;
    const floor = LEAGUE_FLOORS[league] ?? 0;
    return Math.max(0, Math.min(1, (trophies - floor) / Math.max(1, next.at - floor)));
}

/** What blocks an attack on this rival, or null; also used for the Fight hint. */
export function rivalBlocker(pvp, rival) {
    if (!pvp.arena) return 'Clear Scrap Hollow to enter the arena';
    if (!rival) return 'Find a rival first';
    if (!rival.available) return 'This rival is shielded now. Find another';
    return null;
}

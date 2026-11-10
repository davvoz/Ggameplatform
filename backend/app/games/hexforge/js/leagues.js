/** Trophy leagues: colours and wording (the bands themselves are decided by the server). */

export const LEAGUE_COLORS = {
    Bronze: '#d08a4c',
    Silver: '#c3cbdb',
    Gold: '#ffd75e',
    Neon: '#39e6ff',
    Mythic: '#ff3d9a',
};

/** "+30" / "−20" / "0" for a trophy change. */
export function signed(n) {
    if (n > 0) return `+${n}`;
    if (n < 0) return `−${-n}`;
    return '0';
}

/** How far the next league is, or a line for the top league. */
export function progressText(me) {
    if (!me.next_league) return 'Top league reached.';
    return `${me.next_league.name} at ${me.next_league.at} · ${me.next_league.at - me.trophies} to go`;
}

/** Your place in the ranking, in words. */
export function rankText(me) {
    return me.rank ? `Rank #${me.rank}` : 'Not ranked yet: win a raid against a rival';
}

/** The line under a rival's name: what the raid is worth. */
export function stakesText(stakes) {
    return `Win ${signed(stakes.win)} · lose ${signed(-stakes.loss)} trophies`;
}

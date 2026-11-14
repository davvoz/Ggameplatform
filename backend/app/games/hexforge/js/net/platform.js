/**
 * The Cur8 platform around the game, through its SDK (when the page runs
 * inside the platform). Every attack is a platform session: it starts when
 * the squad launches and ends with the battle's result, so the platform
 * gives XP and counts the daily quests (attacks, victories, destruction).
 * Everything fails soft: alone, without the SDK, the game just plays.
 */

const sdk = () => globalThis.PlatformSDK ?? null;

export async function connectPlatform() {
    try {
        await sdk()?.init({ onStart() {}, onPause() {}, onResume() {}, onExit() {}, timeout: 2500 });
    } catch (error) {
        console.error('[Hexforge] platform SDK init failed', error);
    }
}

/** Inside the platform, asks it for full screen (its top bar goes too); false when there is no platform to ask. */
export function platformFullscreen() {
    if (!sdk()?.toggleFullscreen) return false;
    sdk().toggleFullscreen();
    return true;
}

export function attackStarted() {
    sdk()?.resetSession?.()?.catch?.((error) => console.error('[Hexforge] session start failed', error));
}

/**
 * What the platform gets for one battle: the score is the destruction %;
 * `opponent` (the raided player or the outpost) lets the ping say whom.
 */
export function attackReport(summary, { pvp = false, opponent = '' } = {}) {
    return {
        score: summary.destruction,
        extra_data: {
            attacks: 1,
            victories: summary.victory ? 1 : 0,
            destruction: summary.destruction,
            core_destroyed: summary.core_destroyed ? 1 : 0,
            pvp: pvp ? 1 : 0,
            opponent: String(opponent).slice(0, 40),
            heroes_lost: summary.heroes.filter((h) => !h.survived).length,
        },
    };
}

/**
 * The battle is over (its report is on screen): the picture of the report
 * goes first, for the "Post on Pings" dialog to use instead of the platform's
 * own card, then the session ends.
 */
export function attackEnded(summary, ending, image = null) {
    const { score, extra_data: extraData } = attackReport(summary, ending);
    try {
        if (image) sdk()?.sendToPlatform?.('shareCard', { image });
        sdk()?.gameOver?.(score, { extra_data: extraData });
    } catch (error) {
        console.error('[Hexforge] session end failed', error);
    }
}

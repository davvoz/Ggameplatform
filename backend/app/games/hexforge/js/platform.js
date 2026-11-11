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

/** Full screen: inside the platform it asks the platform (its top bar goes too), alone the browser. */
export function toggleFullscreen() {
    if (sdk()?.toggleFullscreen) {
        sdk().toggleFullscreen();
    } else if (document.fullscreenElement) {
        void document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen?.().catch(() => {});
    }
}

export function attackStarted() {
    sdk()?.resetSession?.()?.catch?.((error) => console.error('[Hexforge] session start failed', error));
}

/** What the platform gets for one battle: the score is the destruction %. */
export function attackReport(summary, rival) {
    return {
        score: summary.destruction,
        extra_data: {
            attacks: 1,
            victories: summary.victory ? 1 : 0,
            destruction: summary.destruction,
            core_destroyed: summary.core_destroyed ? 1 : 0,
            pvp: rival ? 1 : 0,
            heroes_lost: summary.heroes.filter((h) => !h.survived).length,
        },
    };
}

export function attackEnded(summary, rival) {
    const { score, extra_data: extraData } = attackReport(summary, rival);
    try {
        sdk()?.gameOver?.(score, { extra_data: extraData });
    } catch (error) {
        console.error('[Hexforge] session end failed', error);
    }
}

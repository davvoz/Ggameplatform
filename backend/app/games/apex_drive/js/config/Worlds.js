/**
 * The career, world by world. A world has its own look (a theme of
 * config/Themes.js), its own props by the road, and a list of tracks
 * (keys of config/Tracks.js) raced in order. Its rivals drive harder and
 * its prizes grow from one world to the next.
 *
 * A new world: an entry here (and a theme). It unlocks when every track of
 * the world before it ends on the podium.
 */
export const WORLDS = [
    {
        id: 'sunsetCoast',
        name: 'SUNSET COAST',
        theme: 'dusk',
        /** Its race music (config/Music.js); a track may have its own `music`. */
        music: 'sunsetRun',
        tracks: ['duskValley', 'pierCircuit', 'cliffRoad'],
        /** Rivals' engines, x their own skill. */
        difficulty: 0.93,
        prizeScale: 1,
        /** Props by the road: kinds of config/Props.js and how often each comes. */
        props: { pine: 5, rock: 2, lamp: 2, billboard: 1 },
        /** One prop every so many segments on each side, on average. */
        propEvery: 7,
    },
    {
        id: 'neonCity',
        name: 'NEON CITY',
        theme: 'night',
        music: 'nightDrive',
        tracks: ['neonAvenue', 'underpass', 'stormBypass'],
        difficulty: 0.95,
        prizeScale: 1.4,
        props: { lamp: 5, building: 4, billboard: 2, cone: 1 },
        propEvery: 4,
    },
    {
        id: 'auroraPeaks',
        name: 'AURORA PEAKS',
        theme: 'aurora',
        music: 'polarLights',
        tracks: ['iceFields', 'glacierPass', 'whiteout'],
        difficulty: 0.97,
        prizeScale: 1.9,
        props: { snowPine: 6, snowPole: 3, rock: 1, cabin: 1, snowman: 1 },
        propEvery: 5,
    },
];

import { edge, fromSky, hostage, lengthFor, party, pickup, platform, prop, spawn } from './build.js';

/**
 * MISSION 1: TRATTORIA ROW
 * Nonna's street at sunset, dressed for the Supremo's birthday. Teaches the
 * basics in order: shoot, crouch under shots, the slipper, barrels, the first
 * arena, balloons, a tank, and a cake that fights back.
 */
const BOSS_AT = 3920;

export const Mission1 = {
    id: 1,
    name: 'TRATTORIA ROW',
    theme: 'town',
    music: 'town',
    bossMusic: 'boss',
    difficulty: 1,
    parSeconds: 300,
    length: lengthFor(BOSS_AT),
    ground: [[0, 184], [1300, 184], [1380, 172], [1760, 172], [1840, 184], [5000, 184]],
    platforms: [
        platform(540, 140, 60),
        platform(1000, 150, 44), platform(1120, 124, 40), platform(1240, 150, 44),
        platform(2590, 138, 60), platform(2750, 138, 60),
        platform(3150, 150, 50), platform(3300, 150, 50),
    ],
    props: [
        prop('crate', 250, 'cannolo'),
        prop('barrel', 405),
        prop('cutout', 700),
        prop('cake', 770, 'cannolo'),
        prop('crate', 1520, 'tooth'),
        prop('speaker', 2300),
        prop('barrel', 2465), prop('barrel', 2545),
        prop('cutout', 2700),
        prop('crate', 3010, 'fireworks'),
        prop('crate', 3420, 'tooth'),
        prop('cake', 3720, 'lasagna'),
    ],
    hostages: [hostage(840, 'heavy'), hostage(1690, 'bombs'), hostage(2960, 'shotgun')],
    pickups: [pickup('tooth', 1140, 124), pickup('espresso', 2180)],
    enemies: [
        party('grunt', 340), party('grunt', 372), party('grunt', 480),
        spawn('bazooka', 1620),
        spawn('mortar', 1900),
        party('grunt', 2490), party('grunt', 2520),
        spawn('sniper', 2620, {}, 138), spawn('sniper', 2790, {}, 138),
        spawn('shield', 2880),
    ],
    script: [
        { at: 200, spawn: [spawn('grunt', edge(200)), spawn('grunt', edge(200, 34))] },
        { at: 470, spawn: [spawn('grenadier', edge(470))] },
        { at: 640, spawn: [spawn('clown', edge(640))] },
        {
            at: 900,
            arena: {
                waves: [
                    [spawn('grunt', edge(900)), spawn('grunt', edge(900, 26)), spawn('grenadier', edge(900, 60))],
                    [fromSky('grunt', 1030), fromSky('grunt', 1250, -50), spawn('clown', edge(900)), spawn('clown', edge(900, 44))],
                    [spawn('shield', edge(900)), spawn('grunt', edge(900, 30)), spawn('grunt', edge(900, 62))],
                ],
            },
        },
        { at: 1380, spawn: [spawn('balloon', 1700, {}, -10), spawn('balloon', 1770, {}, -40)] },
        { at: 1500, spawn: [spawn('grunt', edge(1500)), spawn('grunt', edge(1500, 30))] },
        { at: 1700, spawn: [spawn('clown', edge(1700)), spawn('clown', edge(1700, 36))] },
        { at: 1960, boss: spawn('panzerpig', edge(1960, 40)), bossMusic: 'boss' },
        { at: 2000, music: 'town' },
        { at: 2200, spawn: [spawn('clown', edge(2200)), spawn('clown', edge(2200, 22)), spawn('clown', edge(2200, 44))] },
        { at: 2400, spawn: [spawn('grunt', edge(2400)), spawn('grenadier', edge(2400, 40))] },
        { at: 2700, spawn: [spawn('balloon', 2900, {}, -10), spawn('balloon', 2980, {}, -44), spawn('balloon', 3040, {}, -20)] },
        { at: 2850, spawn: [spawn('shield', edge(2850)), spawn('grunt', edge(2850, 30))] },
        {
            at: 3100,
            arena: {
                waves: [
                    [spawn('grenadier', 3170, {}, 150), spawn('grunt', edge(3100)), spawn('grunt', edge(3100, 30))],
                    [spawn('balloon', 3300, {}, -10), spawn('balloon', 3380, {}, -36), spawn('balloon', 3440, {}, -10), spawn('grunt', edge(3100))],
                    [spawn('clown', edge(3100)), spawn('clown', edge(3100, 30)), spawn('clown', edge(3100, 60)),
                        spawn('shield', edge(3100, 90)), spawn('grenadier', edge(3100, 40))],
                ],
            },
        },
        { at: 3560, spawn: [spawn('grunt', edge(3560)), spawn('grunt', edge(3560, 25)), spawn('grunt', edge(3560, 50))] },
        { at: 3700, banner: 'THE CAKE APPROACHES' },
        { at: BOSS_AT, boss: spawn('torta', edge(BOSS_AT, 50)), final: true, bossMusic: 'boss' },
    ],
};

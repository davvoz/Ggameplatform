import { edge, fromSky, hostage, lengthFor, party, pickup, platform, prop, spawn } from './build.js';

/**
 * MISSION 2: PORTO SPAGHETTI
 * The harbour at night, where the party supplies come in. Containers to climb,
 * gulls and drones from above, mortars on the piers, an ice cream van with a
 * grudge and a pinata that flies.
 */
const BOSS_AT = 4330;

const g = (n) => spawn('gull', edge(n.at, n.dx ?? 0), { awake: true }, n.y);

export const Mission2 = {
    id: 2,
    name: 'PORTO SPAGHETTI',
    theme: 'harbor',
    music: 'harbor',
    bossMusic: 'boss',
    difficulty: 1.12,
    parSeconds: 330,
    length: lengthFor(BOSS_AT),
    ground: [[0, 184], [700, 184], [760, 174], [1300, 174], [1360, 184], [2600, 184], [2660, 174], [3300, 174], [3360, 184], [5000, 184]],
    platforms: [
        platform(420, 156, 52),
        platform(900, 146, 60), platform(950, 118, 44),
        platform(1500, 152, 56), platform(1840, 150, 50),
        platform(2700, 120, 50), platform(2900, 120, 50),
        platform(3120, 140, 56), platform(3150, 108, 40),
        platform(3700, 152, 56),
    ],
    props: [
        prop('crate', 300, 'cannolo'),
        prop('barrel', 610), prop('barrel', 630),
        prop('crate', 1980, 'tooth'),
        prop('speaker', 2480),
        prop('barrel', 3420), prop('barrel', 3440),
        prop('crate', 3820, 'tooth'),
        prop('cake', 4050, 'lasagna'),
    ],
    hostages: [hostage(1010, 'flamer'), hostage(2120, 'lasagna'), hostage(3050, 'fireworks')],
    pickups: [pickup('tooth', 3165, 108), pickup('bombs', 1520, 152)],
    enemies: [
        party('grunt', 440, 156), party('grunt', 470),
        spawn('bazooka', 660),
        spawn('mortar', 1120),
        spawn('turret', 1870),
        spawn('sniper', 2720, {}, 120), spawn('sniper', 2920, {}, 120),
        party('grunt', 3440), party('grunt', 3470),
        spawn('mortar', 3720, {}, 152),
    ],
    script: [
        { at: 150, spawn: [g({ at: 150, y: 80 }), g({ at: 150, dx: 30, y: 96 }), g({ at: 150, dx: 60, y: 72 })] },
        { at: 600, spawn: [spawn('drone', edge(600), {}, 90)] },
        { at: 880, spawn: [spawn('grunt', edge(880)), spawn('grenadier', edge(880, 30))] },
        {
            at: 1200,
            arena: {
                waves: [
                    [spawn('grunt', edge(1200)), spawn('grunt', edge(1200, 30)), spawn('bazooka', edge(1200, 60))],
                    [spawn('drone', edge(1200), {}, 80), spawn('drone', edge(1200, 40), {}, 60),
                        g({ at: 1200, y: 70 }), g({ at: 1200, dx: 24, y: 90 }), g({ at: 1200, dx: 48, y: 60 })],
                    [spawn('shield', edge(1200)), spawn('shield', edge(1200, 30)), spawn('grenadier', edge(1200, 60))],
                ],
            },
        },
        { at: 1650, spawn: [g({ at: 1650, y: 70 }), g({ at: 1650, dx: 20, y: 86 }), g({ at: 1650, dx: 40, y: 64 }), g({ at: 1650, dx: 60, y: 92 }), g({ at: 1650, dx: 80, y: 76 })] },
        { at: 1900, spawn: [spawn('balloon', 2100, {}, -10), spawn('balloon', 2180, {}, -44)] },
        { at: 2000, spawn: [spawn('clown', edge(2000)), spawn('grunt', edge(2000, 30))] },
        { at: 2250, boss: spawn('gelato', edge(2250, 40)), bossMusic: 'boss' },
        { at: 2290, music: 'harbor' },
        { at: 2450, spawn: [spawn('clown', edge(2450)), spawn('clown', edge(2450, 24)), spawn('clown', edge(2450, 48))] },
        { at: 2700, spawn: [spawn('drone', edge(2700), {}, 80), spawn('drone', edge(2700, 50), {}, 100)] },
        { at: 2900, spawn: [spawn('bazooka', edge(2900)), spawn('grunt', edge(2900, 30))] },
        {
            at: 3250,
            arena: {
                waves: [
                    [spawn('mortar', 3600), spawn('grunt', edge(3250)), spawn('grunt', edge(3250, 30))],
                    [g({ at: 3250, y: 70 }), g({ at: 3250, dx: 24, y: 84 }), g({ at: 3250, dx: 48, y: 64 }), g({ at: 3250, dx: 72, y: 90 }),
                        spawn('balloon', 3400, {}, -10), spawn('balloon', 3500, {}, -40)],
                    [spawn('bazooka', edge(3250)), spawn('shield', edge(3250, 30)), spawn('grunt', edge(3250, 60)), spawn('clown', edge(3250, 90))],
                ],
            },
        },
        { at: 3700, spawn: [fromSky('grunt', 3900), fromSky('grenadier', 4000, -40), spawn('drone', edge(3700), {}, 90)] },
        { at: 3950, spawn: [spawn('clown', edge(3950)), spawn('shield', edge(3950, 30))] },
        { at: 4100, banner: 'SOMETHING IS FLYING IN' },
        { at: BOSS_AT, boss: spawn('pinata', edge(BOSS_AT, 40), {}, 40), final: true, bossMusic: 'boss' },
    ],
};

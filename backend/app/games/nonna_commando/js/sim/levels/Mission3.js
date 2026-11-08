import { edge, fromSky, hostage, lengthFor, party, pickup, platform, prop, spawn } from './build.js';

/**
 * MISSION 3: PALAZZO SUPREMO
 * The palace on the night of the party: marble, gold, portraits of one man.
 * Guards with fan-shot muskets, a ballroom full of clowns, a gate to blow open,
 * Capitano Baffone, and the birthday boy himself.
 */
const BOSS_AT = 4260;

export const Mission3 = {
    id: 3,
    name: 'PALAZZO SUPREMO',
    theme: 'palace',
    music: 'palace',
    bossMusic: 'final',
    difficulty: 1.25,
    parSeconds: 380,
    length: lengthFor(BOSS_AT),
    ground: [[0, 184], [2500, 184], [2600, 172], [3000, 172], [3100, 184], [5000, 184]],
    platforms: [
        platform(560, 136, 70),
        platform(1000, 140, 60), platform(1210, 140, 60),
        platform(1560, 118, 50),
        platform(2700, 112, 70), platform(2900, 112, 70),
        platform(3400, 140, 56), platform(3560, 116, 44),
    ],
    props: [
        prop('cutout', 260), prop('cake', 330, 'cannolo'),
        prop('crate', 820, 'tooth'),
        prop('barrel', 1340), prop('barrel', 1360),
        prop('gate', 1500),
        prop('cutout', 1700), prop('cutout', 1760),
        prop('speaker', 2380),
        prop('cutout', 2800, 'tooth'),
        prop('barrel', 3200), prop('barrel', 3220),
        prop('cake', 3900, 'lasagna'),
    ],
    hostages: [hostage(700, 'shotgun'), hostage(1900, 'heavy'), hostage(3300, 'fireworks')],
    pickups: [pickup('tooth', 3580, 116), pickup('espresso', 1650)],
    enemies: [
        party('grunt', 420), party('guard', 470),
        spawn('sniper', 590, {}, 136),
        spawn('turret', 1580, {}, 118),
        spawn('guard', 1440),
        spawn('sniper', 2720, {}, 112), spawn('sniper', 2940, {}, 112),
        party('guard', 2560), party('grunt', 2620),
        spawn('turret', 3620, {}, 184),
    ],
    script: [
        { at: 250, spawn: [spawn('grunt', edge(250)), spawn('grunt', edge(250, 30))] },
        { at: 600, spawn: [spawn('drone', edge(600), {}, 80)] },
        {
            at: 900,
            arena: {
                waves: [
                    [spawn('guard', edge(900)), spawn('grunt', edge(900, 30)), spawn('grunt', edge(900, 50))],
                    [spawn('clown', edge(900)), spawn('clown', edge(900, 26)), spawn('clown', edge(900, 52)), fromSky('clown', 1060)],
                    [spawn('guard', edge(900)), spawn('shield', edge(900, 30)), spawn('grenadier', 1230, {}, 140)],
                ],
            },
        },
        { at: 1250, banner: 'BLOW THE GATE' },
        { at: 1600, spawn: [spawn('guard', edge(1600)), spawn('grenadier', edge(1600, 40))] },
        { at: 1800, spawn: [spawn('balloon', 2000, {}, -10), spawn('balloon', 2080, {}, -40), spawn('drone', edge(1800), {}, 90)] },
        { at: 2100, boss: spawn('baffone', edge(2100, 40)), bossMusic: 'boss' },
        { at: 2140, music: 'palace' },
        { at: 2300, spawn: [spawn('clown', edge(2300)), spawn('clown', edge(2300, 26)), spawn('guard', edge(2300, 50))] },
        { at: 2650, spawn: [spawn('drone', edge(2650), {}, 70), spawn('drone', edge(2650, 40), {}, 96)] },
        { at: 2900, spawn: [spawn('shield', edge(2900)), spawn('guard', edge(2900, 34))] },
        {
            at: 3250,
            arena: {
                waves: [
                    [spawn('drone', edge(3250), {}, 70), spawn('drone', edge(3250, 30), {}, 90), spawn('drone', edge(3250, 60), {}, 60)],
                    [spawn('guard', edge(3250)), spawn('guard', edge(3250, 34)), spawn('clown', edge(3250, 60)), spawn('clown', edge(3250, 84))],
                    [spawn('shield', edge(3250)), spawn('shield', edge(3250, 28)), spawn('grenadier', 3420, {}, 140), spawn('grenadier', edge(3250, 60))],
                ],
            },
        },
        { at: 3700, spawn: [fromSky('guard', 3950), spawn('grunt', edge(3700)), spawn('grunt', edge(3700, 30))] },
        { at: 3880, banner: 'THE SUPREMO AWAITS' },
        { at: BOSS_AT, boss: spawn('throne', edge(BOSS_AT, 50)), final: true, bossMusic: 'final' },
    ],
};

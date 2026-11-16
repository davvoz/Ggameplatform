/**
 * The rivals. Each one drives a stock car tuned by `skill` (x the world's
 * difficulty) and `effect` (as in config/Parts.js), painted in its own
 * colours, with a way of racing (`behaviour`, see sim/ai/behaviours.js):
 *
 * - racer: takes the racing line, saves its nitro for the straights
 * - blocker: moves across to stay in front of the player behind it
 * - rammer: steers into the player when side by side
 * - weaver: swerves from lane to lane
 * - cruiser: keeps its lane at a steady pace
 *
 * Colours replace the body letters of the car's art (config/Cars.js).
 */
export const DRIVERS = [
    {
        id: 'vex', name: 'VEX', behaviour: 'racer', skill: 1.02,
        colors: { R: '#7ab4ff', r: '#2a6cff', d: '#163a8a', y: '#f2eef6' },
        effect: { mul: { grip: 1.1 } },
    },
    {
        id: 'brick', name: 'BRICK', behaviour: 'rammer', skill: 0.97,
        colors: { R: '#ffb46a', r: '#e8721c', d: '#8a3a10', y: '#140c1c' },
        effect: { mul: { ram: 1.8, mass: 1.15 }, add: { health: 60 } },
    },
    {
        id: 'nyx', name: 'NYX', behaviour: 'blocker', skill: 0.99,
        colors: { R: '#d69aff', r: '#9a3ad8', d: '#4e1a78', y: '#ffd34a' },
        effect: {},
    },
    {
        id: 'zip', name: 'ZIP', behaviour: 'weaver', skill: 0.98,
        colors: { R: '#9effa0', r: '#2ec24a', d: '#146a28', y: '#140c1c' },
        effect: { mul: { traction: 1.1 } },
    },
    {
        id: 'otto', name: 'OTTO', behaviour: 'cruiser', skill: 0.95,
        colors: { R: '#ffffff', r: '#c8c8d8', d: '#6a6a80', y: '#d22f4a' },
        effect: { add: { health: 40 } },
    },
];

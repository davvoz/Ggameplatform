/**
 * Mods: the tactical layer of the build. Bought once, then fitted in the
 * garage's MODS tab before a race. Each takes a slot and draws `energy`
 * from the mod bay (both grow with the MOD BAY part), so not all of them fit
 * at once, and many have a price on the road too: the build is a choice made
 * for a track, its weather and one's way of driving.
 *
 * `effect` works as in config/Parts.js. `lines` is what the garage shows.
 */
export const MODS = {
    slipstream: {
        name: 'SLIPSTREAM COIL',
        energy: 2,
        price: 1200,
        lines: ['DRAFTING CUTS TWICE', 'AS MUCH AIR DRAG'],
        effect: { mul: { draftBonus: 2 } },
    },
    ramPlates: {
        name: 'RAM PLATES',
        energy: 2,
        price: 1400,
        lines: ['BUMPS HIT 2X HARDER', 'AND HURT YOU HALF', '+6% WEIGHT'],
        effect: { mul: { ram: 2, bumpTaken: 0.5, mass: 1.06 } },
    },
    injector: {
        name: 'NOS INJECTOR',
        energy: 2,
        price: 1600,
        lines: ['NITRO +30% POWER', 'ONE CHARGE LESS'],
        effect: { mul: { nitroPower: 1.3 }, add: { nitroCharges: -1 } },
    },
    // once EXTRA TANK (one more charge: useless with the best nitro, already at the limit);
    // the id stays, as the careers that bought it saved it
    extraTank: {
        name: 'POWER NITRO',
        energy: 2,
        price: 1800,
        lines: ['NITRO +20% POWER', '+4% WEIGHT'],
        effect: { mul: { nitroPower: 1.2, mass: 1.04 } },
    },
    magnet: {
        name: 'PICKUP MAGNET',
        energy: 1,
        price: 700,
        lines: ['GRABS PICKUPS', 'FROM FURTHER AWAY'],
        effect: { add: { magnet: 0.45 } },
    },
    driftCharger: {
        name: 'DRIFT CHARGER',
        energy: 2,
        price: 2000,
        lines: ['SLIDING IN BENDS', 'REFILLS THE NITRO'],
        effect: { add: { driftCharge: 0.4 } },
    },
    lapShield: {
        name: 'LAP SHIELD',
        energy: 3,
        price: 2600,
        lines: ['A 3 S SHIELD', 'AT EVERY NEW LAP'],
        effect: { add: { lapShield: 3 } },
    },
    ghostEcu: {
        name: 'GHOST ECU',
        energy: 2,
        price: 2200,
        lines: ['+8% POWER', '-25% ARMOR'],
        effect: { mul: { power: 1.08, health: 0.75 } },
    },
    rallyKit: {
        name: 'RALLY KIT',
        energy: 1,
        price: 800,
        lines: ['THE GRASS SLOWS', 'YOU MUCH LESS', '-3% POWER'],
        effect: { mul: { offRoadLimit: 1.8, offRoadDrag: 0.5, power: 0.97 } },
    },
    launchControl: {
        name: 'LAUNCH CONTROL',
        energy: 1,
        price: 600,
        lines: ['EASIER PERFECT START', 'LONGER START BOOST'],
        effect: { mul: { launchWindow: 2.2, launchBoost: 1.6 } },
    },
    scrapHunter: {
        name: 'SCRAP HUNTER',
        energy: 1,
        price: 500,
        lines: ['CASH PICKUPS', 'PAY TWICE'],
        effect: { mul: { cashBonus: 2 } },
    },
    stormTires: {
        name: 'STORM TIRES',
        energy: 1,
        price: 1000,
        lines: ['RAIN AND SNOW TAKE', 'HALF THE GRIP AWAY'],
        effect: { add: { weatherGrip: 0.5 } },
    },
};

/**
 * The car and its upgrades. A car starts from BASE_STATS; every part
 * installed and every mod fitted changes them through an `effect`:
 * `mul` multiplies a stat, `add` adds to it (sim/Build.js applies them).
 *
 * Parts are bought in tiers, in order, in the garage's PARTS tab: tier 0 is
 * what the car comes with. A new category or a new tier is data only.
 */

/** The stock car. Units: see PHYSICS in Tuning.js. */
export const BASE_STATS = {
    /** Engine power: top speed is (power / drag) ^ (1/3). */
    power: 1.05e7,
    /** Most push the tyres can put down, units/s^2. */
    traction: 3600,
    /** Air drag. */
    drag: 7.9e-6,
    /** 1 = stock weight: more mass, slower to speed up. */
    mass: 1,
    /** Grip in bends, x PHYSICS.slipLimit before sliding. */
    grip: 1,
    /** Brake force, x PHYSICS.brake. */
    brake: 1,
    health: 100,
    nitroCharges: 3,
    /** Power while the nitro burns. */
    nitroPower: 1.8,
    /** Seconds one charge burns. */
    nitroTime: 2.4,
    /** On the grass the car slows down to this speed... */
    offRoadLimit: 3200,
    /** ...at this x PHYSICS.offRoadDrag. */
    offRoadDrag: 1,
    /** Drag cut in a rival's slipstream. */
    draftBonus: 0.3,
    /** Extra reach for pickups, half widths. */
    magnet: 0,
    /** Cash pickups pay this many times their value. */
    cashBonus: 1,
    /** How hard this car shoves the others in a bump. */
    ram: 1,
    /** How much of a bump this car feels (shove and damage). */
    bumpTaken: 1,
    /** Nitro gauge filled per second of sliding: a full gauge is one more charge. */
    driftCharge: 0,
    /** Seconds of shield at every new lap. */
    lapShield: 0,
    /** x RACE.launchWindow and x RACE.launchBoost. */
    launchWindow: 1,
    launchBoost: 1,
    /** Share of the weather's grip loss taken away (0..1). */
    weatherGrip: 0,
    /** Mod slots and the energy the mods can draw. */
    slots: 2,
    energy: 3,
};

/** In the order the garage lists them. */
export const PARTS = {
    engine: {
        name: 'ENGINE',
        tiers: [
            { name: 'STOCK V6', price: 0, effect: {} },
            { name: 'TWIN TURBO V8', price: 1200, effect: { mul: { power: 1.14, mass: 1.02 } } },
            { name: 'HYPER V10', price: 3200, effect: { mul: { power: 1.3, mass: 1.04 } } },
            { name: 'FUSION CORE', price: 7500, effect: { mul: { power: 1.5, mass: 1.05 } } },
        ],
    },
    gearbox: {
        name: 'GEARBOX',
        tiers: [
            { name: 'STOCK 5 SPEED', price: 0, effect: {} },
            { name: 'CLOSE RATIO', price: 900, effect: { mul: { traction: 1.12 } } },
            { name: 'SEQUENTIAL', price: 2400, effect: { mul: { traction: 1.25, power: 1.03 } } },
            { name: 'DUAL CLUTCH', price: 5600, effect: { mul: { traction: 1.4, power: 1.05 } } },
        ],
    },
    tires: {
        name: 'TYRES',
        tiers: [
            { name: 'STREET', price: 0, effect: {} },
            { name: 'SPORT', price: 800, effect: { mul: { grip: 1.12, traction: 1.04 } } },
            { name: 'SEMI SLICK', price: 2200, effect: { mul: { grip: 1.25, traction: 1.08 } } },
            { name: 'RACE SLICK', price: 5000, effect: { mul: { grip: 1.4, traction: 1.12 } } },
        ],
    },
    aero: {
        name: 'AERO',
        tiers: [
            { name: 'STOCK BODY', price: 0, effect: {} },
            { name: 'SPLITTER', price: 1000, effect: { mul: { drag: 0.95, grip: 1.03 } } },
            { name: 'WIDE BODY', price: 2600, effect: { mul: { drag: 0.9, grip: 1.06 } } },
            { name: 'ACTIVE WING', price: 6000, effect: { mul: { drag: 0.84, grip: 1.1 } } },
        ],
    },
    armor: {
        name: 'ARMOR',
        tiers: [
            { name: 'STEEL', price: 0, effect: {} },
            { name: 'ROLL CAGE', price: 700, effect: { add: { health: 30 }, mul: { mass: 1.03 } } },
            { name: 'KEVLAR', price: 1900, effect: { add: { health: 65 }, mul: { mass: 1.04 } } },
            { name: 'NANO WEAVE', price: 4400, effect: { add: { health: 100 }, mul: { mass: 1.04 } } },
        ],
    },
    nitro: {
        name: 'NITRO',
        tiers: [
            { name: '3 SHOT KIT', price: 0, effect: {} },
            { name: '4 SHOT KIT', price: 1100, effect: { add: { nitroCharges: 1 } } },
            { name: 'HIGH FLOW', price: 2800, effect: { add: { nitroCharges: 1 }, mul: { nitroPower: 1.12, nitroTime: 1.15 } } },
            { name: 'PLASMA NOS', price: 6400, effect: { add: { nitroCharges: 2 }, mul: { nitroPower: 1.2, nitroTime: 1.3 } } },
        ],
    },
    chassis: {
        name: 'MOD BAY',
        tiers: [
            { name: '2 SLOTS', price: 0, effect: {} },
            { name: '3 SLOTS', price: 1500, effect: { add: { slots: 1, energy: 2 } } },
            { name: '4 SLOTS', price: 3800, effect: { add: { slots: 2, energy: 4 }, mul: { mass: 0.98 } } },
            { name: '5 SLOTS', price: 8000, effect: { add: { slots: 3, energy: 6 }, mul: { mass: 0.96 } } },
        ],
    },
};

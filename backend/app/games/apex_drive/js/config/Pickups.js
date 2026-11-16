/**
 * Power ups on the road. Driving over one takes it; they come back every lap.
 * sim/Pickups.js lays them out from the track's seed, sim/Race.js applies them.
 * A new kind: an entry here, its effect in Race, its icon in render/PickupArt.js.
 */
export const PICKUPS = {
    cash: { name: 'CASH', weight: 5, value: 60 },
    nitro: { name: 'NITRO', weight: 2 },
    repair: { name: 'REPAIR', weight: 1.4, value: 30 },
    shield: { name: 'SHIELD', weight: 1.2, seconds: 5 },
    boost: { name: 'BOOST', weight: 1.4, seconds: 1.2 },
};

export const PICKUP_LAYOUT = {
    /** Segments between two rows of pickups, at least and at most. */
    gap: [60, 120],
    /** Where on the road they sit (half widths from the middle). */
    lanes: [-0.62, 0, 0.62],
    /** A row has one pickup, sometimes two. */
    pairChance: 0.3,
    /** Reach of a pickup, half widths (plus the car's magnet). */
    reach: 0.3,
    /** No pickups this close to the start line, segments. */
    clearStart: 40,
};

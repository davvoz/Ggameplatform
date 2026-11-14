import { WORLD } from '../config/Tuning.js';

const FLY_TOP = 90;
const FLY_BOTTOM = 250;
const LEDGE_INSET = 24;
/** A ledge that reaches this close to the screen edge is entered from off screen. */
const EDGE = 24;

/**
 * Where a new monster appears. Flyers come in from a side of the sky,
 * walkers from the side of a ledge: the floor more often, the high ledges
 * mostly for archers, who like to shoot from above.
 */
export function placeMonster(kind, flying, { terrain, mage, rng }) {
    const side = rng.chance(0.5) ? -1 : 1;
    if (flying) {
        return { x: side < 0 ? -WORLD.entryMargin : WORLD.width + WORLD.entryMargin, y: rng.range(FLY_TOP, FLY_BOTTOM), layer: 0 };
    }
    const ledge = chooseLedge(kind, terrain, mage, rng);
    if (!ledge) {
        const x = side < 0 ? -WORLD.entryMargin : WORLD.width + WORLD.entryMargin;
        return { x, y: terrain.floorAt(x), layer: terrain.floorLayerAt(mage.x) };
    }
    const x = entryX(ledge, side, mage);
    return { x, y: terrain.surfaceOn(ledge.layer, x), layer: ledge.layer };
}

function chooseLedge(kind, terrain, mage, rng) {
    const floor = terrain.floorLayerAt(mage.x);
    const upperWeight = kind === 'archer' ? 3 : 1;
    const weights = {};
    terrain.ledges.forEach((ledge, i) => {
        weights[i] = ledge.layer === floor ? 4 : upperWeight;
    });
    if (Object.keys(weights).length === 0) return null;
    return terrain.ledges[Number(rng.weighted(weights))];
}

function entryX(ledge, side, mage) {
    const reachesLeft = ledge.minX <= EDGE;
    const reachesRight = ledge.maxX >= WORLD.width - 1 - EDGE;
    let goLeft = side < 0;
    // a ledge that ends at the mage's side is entered from its far end
    if (mage.x <= ledge.minX) goLeft = false;
    if (mage.x >= ledge.maxX) goLeft = true;
    if (goLeft) return reachesLeft ? -WORLD.entryMargin : ledge.minX + LEDGE_INSET;
    return reachesRight ? WORLD.width + WORLD.entryMargin : ledge.maxX - LEDGE_INSET;
}

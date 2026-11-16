import { DRIVERS } from '../config/Drivers.js';
import { POTHOLES } from '../config/Hazards.js';
import { PICKUP_LAYOUT, PICKUPS } from '../config/Pickups.js';
import { PROPS, SCENERY } from '../config/Props.js';
import { TRACKS } from '../config/Tracks.js';
import { BODY, RACE, ROAD, TRACK_BUILD } from '../config/Tuning.js';
import { WEATHER } from '../config/Weather.js';
import { WORLDS } from '../config/Worlds.js';
import { hashSeed, Rng } from '../core/Rng.js';
import { createBrain } from './ai/behaviours.js';
import { applyEffect, computeStats } from './Build.js';
import { CATALOG } from './Career.js';
import { Car } from './Car.js';
import { layPickups, PickupField } from './Pickups.js';
import { layPotholes, PotholeField } from './Potholes.js';
import { Race, Racer } from './Race.js';
import { bySegment, layScenery } from './Scenery.js';
import { Track } from './Track.js';

/**
 * Builds a race from the game's data: the track of a world, its weather,
 * props, pickups and potholes, the rivals on the grid and the player at the back.
 */

const tracks = new Map();

/** Tracks are built once and kept: building one walks its whole spline. */
export function trackOf(id) {
    if (!TRACKS[id]) throw new Error(`Unknown track ${id}`);
    if (!tracks.has(id)) tracks.set(id, new Track({ ...TRACKS[id], id }, { segmentLength: ROAD.segmentLength, ...TRACK_BUILD }));
    return tracks.get(id);
}

/**
 * Every prop kind a world's races can show: the world's, its tracks' own,
 * barriers where there are works, warning signs where the road is broken.
 */
export function propKindsOf(world) {
    const kinds = new Set(Object.keys(world.props));
    for (const id of world.tracks) {
        for (const kind of Object.keys(TRACKS[id].scenery?.props ?? {})) kinds.add(kind);
        if (TRACKS[id].roadworks) kinds.add('barrier');
        if (TRACKS[id].broken) kinds.add('rough');
    }
    return [...kinds];
}

/** The song a track is raced to: its own, or its world's. */
export function musicOf(trackId) {
    return TRACKS[trackId]?.music ?? worldOf(trackId).music;
}

/** The world a track belongs to. */
export function worldOf(trackId) {
    const world = WORLDS.find((w) => w.tracks.includes(trackId));
    if (!world) throw new Error(`Track ${trackId} is in no world`);
    return world;
}

function rivalStats(driver, world) {
    const stats = applyEffect(computeStats({ parts: {}, mods: [] }, CATALOG), driver.effect);
    stats.power *= world.difficulty * driver.skill;
    return stats;
}

/** Place on the grid: two by two behind the line, the first place at the front. */
function gridSpot(index) {
    const row = Math.floor(index / 2);
    return { z: -(row + 1) * RACE.gridGap - BODY.length, x: index % 2 === 0 ? -RACE.gridSide : RACE.gridSide };
}

/**
 * @param {{trackId: string, playerStats: import('./Build.js').Stats, playerName?: string, seed?: number}} options
 *   seed: varies the rivals' choices from race to race (the track itself never changes)
 */
export function createRace({ trackId, playerStats, playerName = 'YOU', seed = 1 }) {
    const track = trackOf(trackId);
    const world = worldOf(trackId);
    const rng = new Rng(hashSeed(track.seed, seed));
    const lapLength = track.length;

    const rivals = DRIVERS.map((driver) => new Racer({
        id: driver.id,
        name: driver.name,
        car: new Car(rivalStats(driver, world)),
        brain: createBrain(driver.behaviour, rng),
        colors: driver.colors,
        lapLength,
    }));
    const player = new Racer({
        id: 'player',
        name: playerName,
        car: new Car(playerStats),
        brain: createBrain('racer', rng),
        isPlayer: true,
        lapLength,
    });
    const racers = [...rivals, player];
    racers.forEach((racer, i) => Object.assign(racer.car, gridSpot(i)));

    const props = layScenery(track, { ...world, ...TRACKS[trackId].scenery }, PROPS, SCENERY);
    return new Race({
        track,
        world,
        weather: WEATHER[track.weather],
        racers,
        pickups: new PickupField(layPickups(track, PICKUPS, PICKUP_LAYOUT), lapLength),
        pickupKinds: PICKUPS,
        reach: PICKUP_LAYOUT.reach,
        props,
        propsAt: bySegment(props),
        potholes: new PotholeField(layPotholes(track, POTHOLES)),
        rng,
    });
}

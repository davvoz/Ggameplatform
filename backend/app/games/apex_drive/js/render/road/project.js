/**
 * The pseudo-3D projection of the 16-bit racers. The road is not a 3D model:
 * it is a list of segments straight ahead, at growing distances. Bends are
 * faked by sliding each segment sideways by an amount that grows faster and
 * faster (x += dx; dx += curve), hills by the segments' heights. Each segment
 * becomes a strip of the screen between its near and far edge.
 *
 * Pure function: numbers in, numbers out, no canvas.
 *
 * @typedef {{x: number, y: number, w: number}} Edge screen x of the road's middle,
 *   screen y, half width of the road in pixels
 * @typedef {{index: number, n: number, near: Edge, far: Edge, tunnel: boolean, broken: boolean}} Strip
 *   n: how many segments ahead of the camera (0 = the one it is on); tunnel: under a roof;
 *   broken: broken road (patched asphalt, no lane marks)
 * @typedef {{width: number, height: number, horizon: number, focal: number}} View
 *   focal: pixels per world unit at distance 1
 * @typedef {{x: number, y: number, z: number}} Camera world position (z wraps)
 */

import { wrap } from '../../sim/Track.js';

/** Segments closer than this (world units) are behind the lens. */
const NEAR_CLIP = 1;

/**
 * @param {import('../../sim/Track.js').Track} track
 * @param {Camera} camera
 * @param {View} view
 * @param {{halfWidth: number, drawDistance: number}} road
 * @returns {Strip[]} from near to far, only the strips in front of the camera
 */
export function projectRoad(track, camera, view, road) {
    const { segments, segmentLength, length } = track;
    const camZ = wrap(camera.z, length);
    const baseIndex = Math.floor(camZ / segmentLength) % segments.length;
    const base = segments[baseIndex];
    const edge = (x, y, z) => {
        const scale = view.focal / z;
        return { x: view.width / 2 + (x - camera.x) * scale, y: view.horizon - (y - camera.y) * scale, w: road.halfWidth * scale };
    };

    const strips = [];
    let x = 0;
    let dx = -base.curve * track.progressIn(camZ);
    for (let n = 0; n < road.drawDistance; n++) {
        const index = (baseIndex + n) % segments.length;
        const segment = segments[index];
        const z1 = (baseIndex + n) * segmentLength - camZ;
        const z2 = z1 + segmentLength;
        if (z1 >= NEAR_CLIP) {
            strips.push({
                index,
                n,
                near: edge(x, segment.y1, z1),
                far: edge(x + dx, segment.y2, z2),
                tunnel: segment.tunnel === true,
                broken: segment.broken === true,
            });
        }
        x += dx;
        dx += segment.curve;
    }
    return strips;
}

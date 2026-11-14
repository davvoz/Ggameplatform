/**
 * The walkable surfaces of a scene: one or more layers, each an array with
 * the surface height at every x (null where a platform has a gap). The data
 * comes from the heightmap editor in `tools/`.
 */
const SNAP = 8;
const MIN_LEDGE = 140;
/** Off the screen, a layer continues at its edge height if it reaches this close to the edge. */
const EDGE_REACH = 16;

/** The same surfaces seen in a mirror, for flipped scenes. */
export function mirrorLayers(layers) {
    return layers.map((layer) => [...layer].reverse());
}

function segmentsOf(layer, index) {
    const segments = [];
    let start = null;
    for (let x = 0; x <= layer.length; x++) {
        const solid = x < layer.length && layer[x] != null;
        if (solid && start === null) start = x;
        if (!solid && start !== null) {
            segments.push({ layer: index, minX: start, maxX: x - 1 });
            start = null;
        }
    }
    return segments;
}

export class Terrain {
    #layers;
    #width;
    #ledges;

    /** @param {{width: number, height: number, layers: (number|null)[][]}} data */
    constructor({ width, height, layers }) {
        this.#width = width;
        this.height = height;
        this.#layers = layers.filter((layer) => layer.some((y) => y != null));
        this.#ledges = this.#layers
            .flatMap((layer, i) => segmentsOf(layer, i))
            .filter((s) => s.maxX - s.minX >= MIN_LEDGE)
            .map((s) => ({ ...s, y: this.#surfaceOf(s.layer, (s.minX + s.maxX) / 2) }));
    }

    get width() {
        return this.#width;
    }

    /** Every ledge a monster can stand on, long enough to walk. */
    get ledges() {
        return this.#ledges;
    }

    #edgeOf(layer, fromLeft) {
        for (let step = 0; step < EDGE_REACH; step++) {
            const y = layer[fromLeft ? step : this.#width - 1 - step];
            if (y != null) return y;
        }
        return null;
    }

    #surfaceOf(layerIndex, x) {
        const layer = this.#layers[layerIndex];
        if (x < 0 || x > this.#width - 1) return this.#edgeOf(layer, x < 0);
        const clamped = x;
        const i = Math.floor(clamped);
        const y0 = layer[i];
        if (y0 == null) return null;
        const y1 = layer[Math.min(i + 1, this.#width - 1)];
        return y1 == null ? y0 : y0 + (y1 - y0) * (clamped - i);
    }

    /** All surface heights at x, topmost first. */
    surfacesAt(x) {
        const found = [];
        for (let i = 0; i < this.#layers.length; i++) {
            const y = this.#surfaceOf(i, x);
            if (y != null) found.push(y);
        }
        return found.sort((a, b) => a - b);
    }

    /** The lowest surface at x: the ground floor. */
    floorAt(x) {
        const found = this.surfacesAt(x);
        return found.length > 0 ? found.at(-1) : this.height;
    }

    /** The first surface at or under feet at `feetY` (a little above counts). */
    surfaceBelow(x, feetY) {
        for (const y of this.surfacesAt(x)) {
            if (y >= feetY - SNAP) return y;
        }
        return null;
    }

    /** The surface height at x on one layer, or null over a gap. */
    surfaceOn(layerIndex, x) {
        return this.#surfaceOf(layerIndex, x);
    }

    /**
     * Where a falling body crossing from `fromY` to `toY` at x lands, if it does.
     * @returns {{layer: number, y: number}|null}
     */
    landing(x, fromY, toY) {
        let best = null;
        for (let i = 0; i < this.#layers.length; i++) {
            const y = this.#surfaceOf(i, x);
            const crossed = y != null && y >= fromY - SNAP && y <= toY;
            if (crossed && (best === null || y < best.y)) best = { layer: i, y };
        }
        return best;
    }

    /** The layer index of the floor at x (the lowest surface). */
    floorLayerAt(x) {
        let best = null;
        for (let i = 0; i < this.#layers.length; i++) {
            const y = this.#surfaceOf(i, x);
            if (y != null && (best === null || y > best.y)) best = { layer: i, y };
        }
        return best?.layer ?? 0;
    }

    /** The ledge of a layer around x (a pixel past its ends still counts). */
    ledgeOf(layerIndex, x) {
        return this.#ledges.find((l) => l.layer === layerIndex && x >= l.minX - 2 && x <= l.maxX + 2) ?? null;
    }
}

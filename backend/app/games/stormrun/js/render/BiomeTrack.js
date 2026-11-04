import { Biomes, BIOME_BLEND, BIOME_SPAN } from '../config/Palette.js';

/** Scenery colours for a distance, blended between biomes and looping forever. */

const QUANTUM = 4;

function parse(hex) {
    const value = parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(from, to, t) {
    const a = parse(from);
    const b = parse(to);
    const channel = (i) => Math.round(a[i] + (b[i] - a[i]) * t);
    return `rgb(${channel(0)},${channel(1)},${channel(2)})`;
}

export class BiomeTrack {
    #bucket = -1;
    #colors = {};

    /** @returns {Object<string, string>} scenery colours */
    at(metres) {
        const bucket = Math.floor(metres / QUANTUM);
        if (bucket !== this.#bucket) {
            this.#bucket = bucket;
            this.#colors = this.#compute(bucket * QUANTUM);
        }
        return this.#colors;
    }

    #compute(metres) {
        const index = Math.floor(metres / BIOME_SPAN);
        const from = Biomes[index % Biomes.length];
        const to = Biomes[(index + 1) % Biomes.length];
        const blendStart = BIOME_SPAN - BIOME_BLEND;
        const t = Math.max(0, (metres % BIOME_SPAN - blendStart) / BIOME_BLEND);
        if (t === 0) return from;

        const colors = {};
        for (const key of Object.keys(from)) colors[key] = mix(from[key], to[key], t);
        return colors;
    }
}

import { GRADES } from '../config/Grades.js';
import { SCENES } from '../config/Scenes.js';

const KEEP = 3;

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Cannot load ${src}`));
        image.src = src;
    });
}

const clamp = (v) => (v < 0 ? 0 : Math.min(255, v));

/** Applies a 3x4 colour matrix to every pixel. */
function grade(ctx, width, height, matrix) {
    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    const [[rr, rg, rb, ro], [gr, gg, gb, go], [br, bg, bb, bo]] = matrix;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = clamp(rr * r + rg * g + rb * b + ro);
        data[i + 1] = clamp(gr * r + gg * g + gb * b + go);
        data[i + 2] = clamp(br * r + bg * g + bb * b + bo);
    }
    ctx.putImageData(image, 0, 0);
}

/**
 * The painted backgrounds. A map's background is baked once (stretched to
 * the arena, mirrored, colour graded) into a canvas; only the last few are
 * kept, so memory stays small however many maps there are.
 */
export class SceneArt {
    #images = new Map();
    #baked = new Map();
    #width;
    #height;

    constructor(width, height) {
        this.#width = width;
        this.#height = height;
    }

    /** Loads every scene image (they are few; maps reuse them). */
    async load() {
        await Promise.all(Object.entries(SCENES).map(async ([key, scene]) => {
            this.#images.set(key, await loadImage(scene.image));
        }));
    }

    /** The background of a map, baked on first use. @param {import('../config/Scenes.js').MapSpec} spec */
    backdrop(spec) {
        if (!this.#baked.has(spec.id)) this.#bake(spec);
        const canvas = this.#baked.get(spec.id);
        // most recently used last
        this.#baked.delete(spec.id);
        this.#baked.set(spec.id, canvas);
        return canvas;
    }

    /** Bakes a map ahead of time, when the browser is idle. */
    prepare(spec) {
        if (!spec || this.#baked.has(spec.id)) return;
        const idle = globalThis.requestIdleCallback ?? ((fn) => setTimeout(fn, 200));
        idle(() => {
            if (!this.#baked.has(spec.id)) this.#bake(spec);
        });
    }

    #bake(spec) {
        const canvas = document.createElement('canvas');
        canvas.width = this.#width;
        canvas.height = this.#height;
        const ctx = canvas.getContext('2d', { willReadFrequently: Boolean(spec.grade) });
        ctx.imageSmoothingQuality = 'high';
        if (spec.mirror) {
            ctx.translate(this.#width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(this.#images.get(spec.scene), 0, 0, this.#width, this.#height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (spec.grade) grade(ctx, this.#width, this.#height, GRADES[spec.grade]);
        this.#baked.set(spec.id, canvas);
        while (this.#baked.size > KEEP) this.#baked.delete(this.#baked.keys().next().value);
    }
}

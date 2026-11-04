import { SimConfig } from '../config/SimConfig.js';
import { Terrain } from './Terrain.js';
import { difficultyAt } from './Difficulty.js';
import { DropPatterns, ObstaclePatterns } from './CoursePatterns.js';
import { ObstacleTypes } from './ObstacleTypes.js';

/** The endless course: built hill by hill from the seed as the runner advances. */

const START_CREST_Y = 9;
const FLAT_BEFORE_START = 220;

export class Course {
    #config;
    #startX;
    #shapeRng;
    #dropRng;
    #obstacleRng;

    /** @type {Terrain} */
    terrain;
    /** Sorted by x. @type {{x: number, y: number, taken: boolean}[]} */
    drops = [];
    /** Sorted by x. @type {{type: object, x: number, y: number, hit: boolean}[]} */
    obstacles = [];

    /**
     * @param {import('../core/Rng.js').Rng} rng
     * @param {typeof SimConfig} config
     */
    constructor(rng, config = SimConfig) {
        this.#config = config.course;
        this.#startX = config.runner.startX;
        this.#shapeRng = rng.fork('shape');
        this.#dropRng = rng.fork('drops');
        this.#obstacleRng = rng.fork('obstacles');

        this.terrain = new Terrain(this.#startX - FLAT_BEFORE_START, START_CREST_Y);
        this.terrain.addKnot(this.#startX, START_CREST_Y);
    }

    /** Build the course up to x. */
    extendTo(x) {
        while (this.terrain.endX < x) this.#addHill();
    }

    /** Forget what lies far behind x. */
    trimBefore(x) {
        this.terrain.trimBefore(x);
        this.#trimList(this.drops, x);
        this.#trimList(this.obstacles, x);
    }

    #trimList(list, x) {
        let drop = 0;
        while (drop < list.length && list[drop].x < x) drop++;
        if (drop > 0) list.splice(0, drop);
    }

    #addHill() {
        const hill = this.#shapeNextHill();
        this.terrain.addKnot(hill.valleyX, hill.valleyY);
        this.terrain.addKnot(hill.nextCrestX, hill.nextCrestY);

        const pattern = this.#dropRng.pickWeighted(DropPatterns, (p) => p.weight(hill.distance));
        pattern.place(this.#placementContext(hill, this.#dropRng));
        this.drops.sort((a, b) => a.x - b.x);

        if (hill.distance >= this.#config.safeStart) this.#placeObstacles(hill);
    }

    #shapeNextHill() {
        const rng = this.#shapeRng;
        const { minCrestY, maxCrestY, maxSlope, rampRatio } = this.#config;
        const crestX = this.terrain.endX;
        const crestY = this.terrain.endY;
        const distance = crestX - this.#startX;
        const difficulty = difficultyAt(distance);

        const fall = rng.range(difficulty.dropMin, difficulty.dropMax);
        const fallLength = Math.max(rng.range(difficulty.lengthMin, difficulty.lengthMax), (1.5 * fall) / maxSlope);
        const valleyY = crestY - fall;

        const nextCrestY = Math.min(maxCrestY, Math.max(minCrestY, crestY + rng.range(-3, 3)));
        const climb = nextCrestY - valleyY;
        const climbLength = Math.max(
            rng.range(difficulty.lengthMin, difficulty.lengthMax) * rampRatio,
            (1.5 * climb) / maxSlope
        );

        return {
            crestX,
            crestY,
            valleyX: crestX + fallLength,
            valleyY,
            nextCrestX: crestX + fallLength + climbLength,
            nextCrestY,
            distance,
        };
    }

    #placeObstacles(hill) {
        const rng = this.#obstacleRng;
        const difficulty = difficultyAt(hill.distance);
        const context = this.#placementContext(hill, rng);
        for (const pattern of ObstaclePatterns) {
            if (rng.chance(pattern.chance(difficulty))) pattern.place(context);
        }
        this.obstacles.sort((a, b) => a.x - b.x);
    }

    #placementContext(hill, rng) {
        return {
            hill,
            rng,
            terrain: this.terrain,
            addDrop: (x, y) => this.drops.push({ x, y, taken: false }),
            addObstacle: (typeId, x, y) => this.obstacles.push({ type: ObstacleTypes[typeId], x, y, hit: false }),
        };
    }
}

import { CarModel } from '../domain/CarModel.js';

const BASE = 'assets/cars/';

/**
 * Raw, designer-editable car definitions. Adding a new car here makes it
 * available in the menu with zero code changes elsewhere (Open/Closed).
 */
const DEFINITIONS = [
    {
        id: 'bolt',  name: 'Bolt', color: 0xff4d4d,
        modelUrl: BASE + 'Copilot3D-20e82c44-d16b-4f7b-9fe4-631a6ad4e145.glb',
        maxSpeed: 66, acceleration: 30, grip: 0.78, mass: 980,
    },
    {
        id: 'comet', name: 'Comet', color: 0x4d9bff,
        modelUrl: BASE + 'Copilot3D-25ff8a2c-3e8a-4454-9cd7-2c08d2db0ae8.glb',
        maxSpeed: 70, acceleration: 26, grip: 0.7, mass: 1040,
    },
    {
        id: 'vortex', name: 'Vortex', color: 0x9b59ff,
        modelUrl: BASE + 'Copilot3D-d67bde63-76a1-44f0-b839-e12f2e8625d4.glb',
        maxSpeed: 62, acceleration: 34, grip: 0.84, mass: 920,
    },
    {
        id: 'titan', name: 'Titan', color: 0xffc24d,
        modelUrl: BASE + 'Copilot3D-dbba9e09-257c-4a5f-8d4e-380bc3697886.glb',
        maxSpeed: 58, acceleration: 24, grip: 0.9, mass: 1180,
    },
    {
        id: 'spark', name: 'Spark', color: 0x4dffb0,
        modelUrl: BASE + 'Copilot3D-eba568c0-0b77-4991-bfef-43545018a0c1.glb',
        maxSpeed: 64, acceleration: 32, grip: 0.74, mass: 960,
    },
];

/**
 * Read-only catalog of selectable cars.
 */
export class CarCatalog {
    constructor() {
        /** @type {CarModel[]} */
        this.cars = DEFINITIONS.map((d) => new CarModel(d));
    }

    /** @returns {CarModel[]} */
    all() {
        return this.cars;
    }

    /**
     * @param {string} id
     * @returns {CarModel|null}
     */
    byId(id) {
        return this.cars.find((c) => c.id === id) ?? null;
    }

    /** @returns {CarModel} */
    first() {
        return this.cars[0];
    }
}

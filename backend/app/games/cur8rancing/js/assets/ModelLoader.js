import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GameConfig } from '../config/GameConfig.js';

/**
 * Loads and caches GLB car models. Raw scenes are downloaded once per URL and
 * cached; callers receive independent clones so multiple cars can share a file
 * without re-downloading (keeps the asset budget reasonable for 7MB models).
 *
 * Loaded models are normalized: centered on the ground (y=0) and scaled so the
 * longest horizontal axis equals CAR.LENGTH, with that axis aligned to +Z.
 */
export class ModelLoader {
    constructor() {
        this._loader = new GLTFLoader();
        /** @type {Map<string, THREE.Object3D>} url -> normalized template */
        this._cache = new Map();
        /** @type {Map<string, Promise<THREE.Object3D>>} in-flight loads */
        this._pending = new Map();
    }

    /**
     * Load (or reuse) a model and return a ready-to-place clone.
     * @param {string} url
     * @returns {Promise<THREE.Object3D>}
     */
    async load(url) {
        const template = await this._template(url);
        return template.clone(true);
    }

    /**
     * @param {string} url
     * @returns {Promise<THREE.Object3D>}
     */
    _template(url) {
        const cached = this._cache.get(url);
        if (cached) return Promise.resolve(cached);
        const inFlight = this._pending.get(url);
        if (inFlight !== undefined) return inFlight;

        const job = new Promise((resolve, reject) => {
            this._loader.load(
                url,
                (gltf) => {
                    const normalized = ModelLoader._normalize(gltf.scene);
                    this._cache.set(url, normalized);
                    this._pending.delete(url);
                    resolve(normalized);
                },
                undefined,
                (err) => { this._pending.delete(url); reject(err); },
            );
        });
        this._pending.set(url, job);
        return job;
    }

    /**
     * Center, scale and orient a freshly loaded scene.
     * @param {THREE.Object3D} scene
     * @returns {THREE.Object3D}
     */
    static _normalize(scene) {
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        // Recenter on origin, drop onto the ground plane.
        scene.position.set(-center.x, -box.min.y, -center.z);

        const wrapper = new THREE.Group();
        wrapper.add(scene);
        // Align the longest horizontal axis (the car's length) to +Z.
        if (size.x > size.z) wrapper.rotation.y = Math.PI / 2;

        const longest = Math.max(size.x, size.z) || 1;
        const scale = GameConfig.CAR.LENGTH / longest;
        wrapper.scale.setScalar(scale);
        wrapper.updateMatrixWorld(true);
        return wrapper;
    }
}

import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';
import { CarPainter } from './CarPainter.js';

/**
 * Assembles a renderable car view from a loaded GLB model: applies the car's
 * unique livery, enables shadow casting and adds a soft contact shadow
 * underneath. Keeps Three.js view assembly in one place so menu preview and
 * race cars stay consistent (DRY).
 */
export class CarViewFactory {
    /**
     * @param {THREE.Object3D} model normalized GLB instance
     * @param {import('../domain/CarModel.js').CarModel} car car data (livery, colour)
     * @returns {THREE.Group} group containing the model and its shadow
     */
    static assemble(model, car) {
        const group = new THREE.Group();
        CarPainter.paint(model, car);
        model.traverse((o) => {
            if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = false;
            }
        });
        group.add(model);
        group.add(CarViewFactory._shadow());
        return group;
    }

    static _shadow() {
        const geo = new THREE.CircleGeometry(GameConfig.CAR.SHADOW_RADIUS, 20);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.02;
        return mesh;
    }
}

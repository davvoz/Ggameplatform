import * as THREE from 'three';

/**
 * Builds the static 3D geometry for a {@link Track}: grass, the road ribbon,
 * painted edges and the start/finish line. Rendering concern only — it reads
 * track data and produces a Three.js Group.
 */
export class TrackMeshBuilder {
    /**
     * @param {import('../domain/Track.js').Track} track
     * @param {typeof import('../config/GameConfig.js').GameConfig} config
     * @returns {THREE.Group}
     */
    static build(track, config) {
        const group = new THREE.Group();
        group.add(TrackMeshBuilder._grass(config));
        group.add(TrackMeshBuilder._road(track, config));
        group.add(TrackMeshBuilder._edge(track, config, track.halfWidth));
        group.add(TrackMeshBuilder._edge(track, config, -track.halfWidth));
        group.add(TrackMeshBuilder._startLine(track, config));
        return group;
    }

    static _grass(config) {
        const geo = new THREE.PlaneGeometry(1400, 1400);
        const mat = new THREE.MeshStandardMaterial({ color: config.TRACK.GRASS_COLOR });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = -0.05;
        mesh.receiveShadow = true;
        return mesh;
    }

    static _road(track, config) {
        const n = track.N;
        const positions = new Float32Array(n * 2 * 3);
        for (let i = 0; i < n; i++) {
            const p = track.points[i];
            const nr = track.normals[i];
            const o = i * 6;
            positions[o] = p.x + nr.x * track.halfWidth;
            positions[o + 1] = 0;
            positions[o + 2] = p.z + nr.z * track.halfWidth;
            positions[o + 3] = p.x - nr.x * track.halfWidth;
            positions[o + 4] = 0;
            positions[o + 5] = p.z - nr.z * track.halfWidth;
        }
        const indices = TrackMeshBuilder._ribbonIndices(n);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({ color: config.TRACK.ROAD_COLOR, roughness: 0.95 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        return mesh;
    }

    static _ribbonIndices(n) {
        const indices = [];
        for (let i = 0; i < n; i++) {
            const l = i * 2;
            const r = i * 2 + 1;
            const nl = ((i + 1) % n) * 2;
            const nr = ((i + 1) % n) * 2 + 1;
            indices.push(l, r, nl, r, nr, nl);
        }
        return indices;
    }

    static _edge(track, config, offset) {
        const n = track.N;
        const positions = new Float32Array((n + 1) * 3);
        for (let i = 0; i <= n; i++) {
            const idx = i % n;
            const p = track.points[idx];
            const nr = track.normals[idx];
            positions[i * 3] = p.x + nr.x * offset;
            positions[i * 3 + 1] = 0.04;
            positions[i * 3 + 2] = p.z + nr.z * offset;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.LineBasicMaterial({ color: config.TRACK.EDGE_COLOR });
        return new THREE.Line(geo, mat);
    }

    static _startLine(track, config) {
        const geo = new THREE.BoxGeometry(track.halfWidth * 2, 0.1, 2.2);
        const mat = new THREE.MeshStandardMaterial({ color: config.TRACK.EDGE_COLOR });
        const mesh = new THREE.Mesh(geo, mat);
        const p = track.points[0];
        mesh.position.set(p.x, 0.06, p.z);
        mesh.rotation.y = track.headingAt(0);
        return mesh;
    }
}

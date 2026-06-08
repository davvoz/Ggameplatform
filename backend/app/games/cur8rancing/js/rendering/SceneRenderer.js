import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Owns the Three.js renderer, scene, camera and lighting. It exposes the scene
 * graph to states (which add/remove their own objects) and renders each frame.
 * It holds no game logic.
 */
export class SceneRenderer {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {typeof import('../config/GameConfig.js').GameConfig} config
     */
    constructor(canvas, config) {
        this._cfg = config;
        this._canvas = canvas;

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.RENDER.PIXEL_RATIO_CAP));
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(config.RENDER.SKY_COLOR);
        this.scene.fog = new THREE.Fog(config.RENDER.SKY_COLOR, config.RENDER.FOG_NEAR, config.RENDER.FOG_FAR);
        this._buildEnvironment();

        this.camera = new THREE.PerspectiveCamera(
            config.CAMERA.FOV, 1, config.CAMERA.NEAR, config.CAMERA.FAR,
        );
        this.camera.position.set(0, 30, 60);
        this.camera.lookAt(0, 0, 0);

        this._buildLights();
        this._onResize = () => this._resize();
        window.addEventListener('resize', this._onResize);
        this._resize();
    }

    /**
     * Image-based lighting so metallic PBR car materials (metalness=1 in the
     * GLB files) reveal their base color textures instead of rendering black.
     */
    _buildEnvironment() {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
    }

    _buildLights() {
        const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x20301f, 0.9);
        const sun = new THREE.DirectionalLight(0xffffff, 1.1);
        sun.position.set(80, 160, 60);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        const s = 200;
        sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
        sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
        sun.shadow.camera.far = 400;
        this.scene.add(hemi, sun);
    }

    /** @param {THREE.Object3D} obj */
    add(obj) {
        this.scene.add(obj);
    }

    /** @param {THREE.Object3D} obj */
    remove(obj) {
        this.scene.remove(obj);
    }

    /** Render one frame. dt is accepted for symmetry with the loop. */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    _resize() {
        const w = this._canvas.clientWidth || window.innerWidth;
        const h = this._canvas.clientHeight || window.innerHeight;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    /** Release GPU resources and listeners. */
    dispose() {
        window.removeEventListener('resize', this._onResize);
        this.scene.environment?.dispose();
        this.renderer.dispose();
    }
}

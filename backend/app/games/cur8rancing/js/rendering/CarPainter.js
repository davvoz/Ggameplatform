import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';

/**
 * Paints car bodies with a unique, hand-made procedural livery per model and
 * gives every car the same dark tinted glass for its greenhouse (windows).
 *
 * The supplied GLB files are a single mesh with one blank material, so there is
 * no separate "glass" geometry to recolour and cars would otherwise render
 * plain white. This class splits each geometry by height into two material
 * groups — body and glass — once per file, then assigns the per-car livery to
 * the body and a shared tinted material to the greenhouse band. Textures and
 * materials are cached so the work happens once and is reused across every
 * instance (SRP: the only place that decides how a car looks).
 */
export class CarPainter {
    /** @type {Map<string, THREE.MeshStandardMaterial>} id -> shared body material */
    static _bodyMaterials = new Map();
    /** @type {THREE.MeshStandardMaterial|null} shared glass material */
    static _glass = null;

    /**
     * Split the geometry and apply the car's body livery plus shared glass.
     * @param {THREE.Object3D} object3D normalized GLB instance
     * @param {import('../domain/CarModel.js').CarModel} car
     */
    static paint(object3D, car) {
        const body = CarPainter._bodyFor(car);
        const glass = CarPainter._glassMaterial();
        object3D.traverse((node) => {
            if (!node.isMesh) return;
            const split = CarPainter._splitGeometry(node.geometry);
            node.material = split ? [body, glass] : body;
        });
    }

    /**
     * Reorder a geometry's triangles into a body group and a glass group based
     * on normalized vertex height. Runs once per geometry (cached via userData).
     * @param {THREE.BufferGeometry} geometry
     * @returns {boolean} true when two material groups are present
     */
    static _splitGeometry(geometry) {
        if (geometry.userData.carSplit) return geometry.groups.length === 2;

        const pos = geometry.getAttribute('position');
        if (!pos) { geometry.userData.carSplit = true; return false; }

        const index = CarPainter._indexArray(geometry, pos.count);
        const { min, max } = CarPainter._heightRange(pos);
        const span = max - min || 1;
        const { BAND_LOW, BAND_HIGH } = GameConfig.CAR.GLASS;

        const bodyTris = [];
        const glassTris = [];
        for (let i = 0; i < index.length; i += 3) {
            const a = index[i]; const b = index[i + 1]; const c = index[i + 2];
            const h = ((pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3 - min) / span;
            const bucket = (h >= BAND_LOW && h <= BAND_HIGH) ? glassTris : bodyTris;
            bucket.push(a, b, c);
        }

        CarPainter._applyGroups(geometry, bodyTris, glassTris);
        geometry.userData.carSplit = true;
        return geometry.groups.length === 2;
    }

    /** @returns {ArrayLike<number>} triangle index (existing or sequential). */
    static _indexArray(geometry, vertexCount) {
        if (geometry.index) return geometry.index.array;
        const seq = new Uint32Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) seq[i] = i;
        return seq;
    }

    /** @returns {{min:number,max:number}} vertical bounds of the geometry. */
    static _heightRange(pos) {
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            if (y < min) min = y;
            if (y > max) max = y;
        }
        return { min, max };
    }

    /** Rewrite the index so body triangles precede glass, then add 2 groups. */
    static _applyGroups(geometry, bodyTris, glassTris) {
        if (glassTris.length === 0) {
            geometry.clearGroups();
            geometry.addGroup(0, bodyTris.length, 0);
            return;
        }
        const merged = new Uint32Array(bodyTris.length + glassTris.length);
        merged.set(bodyTris, 0);
        merged.set(glassTris, bodyTris.length);
        geometry.setIndex(new THREE.BufferAttribute(merged, 1));
        geometry.clearGroups();
        geometry.addGroup(0, bodyTris.length, 0);
        geometry.addGroup(bodyTris.length, glassTris.length, 1);
    }

    /** Shared dark tinted glass, identical on every car. */
    static _glassMaterial() {
        if (CarPainter._glass) return CarPainter._glass;
        const g = GameConfig.CAR.GLASS;
        CarPainter._glass = new THREE.MeshStandardMaterial({
            color: g.COLOR,
            metalness: g.METALNESS,
            roughness: g.ROUGHNESS,
            envMapIntensity: 1.3,
        });
        return CarPainter._glass;
    }

    /**
     * @param {import('../domain/CarModel.js').CarModel} car
     * @returns {THREE.MeshStandardMaterial}
     */
    static _bodyFor(car) {
        const cached = CarPainter._bodyMaterials.get(car.id);
        if (cached) return cached;

        const texture = new THREE.CanvasTexture(CarPainter._paintLivery(car));
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 8;

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.45,
            roughness: 0.28,
            envMapIntensity: 1.1,
        });
        CarPainter._bodyMaterials.set(car.id, material);
        return material;
    }

    /**
     * Draw a 512x512 livery for one car: base colour, per-id motif and
     * complementary-colour accent inserts.
     * @param {import('../domain/CarModel.js').CarModel} car
     * @returns {HTMLCanvasElement}
     */
    static _paintLivery(car) {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const base = CarPainter._hex(car.color);
        const accent = CarPainter._complementary(car.color);

        CarPainter._fillBase(ctx, size, base);
        const motif = CarPainter._MOTIFS[car.id] ?? CarPainter._stripes;
        motif(ctx, size, base);
        CarPainter._accents(ctx, size, accent);
        CarPainter._sheen(ctx, size);
        return canvas;
    }

    /** Complementary-colour inserts: lower blade band plus thin pinstripes. */
    static _accents(ctx, size, accent) {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(0, size * 0.78);
        ctx.lineTo(size, size * 0.66);
        ctx.lineTo(size, size * 0.74);
        ctx.lineTo(0, size * 0.86);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = accent;
        ctx.lineWidth = size * 0.012;
        ctx.beginPath(); ctx.moveTo(0, size * 0.9); ctx.lineTo(size, size * 0.78); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, size * 0.74); ctx.lineTo(size, size * 0.62); ctx.stroke();
    }

    /** Vertical gradient of the base colour for depth. */
    static _fillBase(ctx, size, base) {
        const grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0, CarPainter._shade(base, 1.25));
        grad.addColorStop(0.5, base);
        grad.addColorStop(1, CarPainter._shade(base, 0.6));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
    }

    /** Soft diagonal highlight, sells the glossy paint look. */
    static _sheen(ctx, size) {
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, 'rgba(255,255,255,0.18)');
        grad.addColorStop(0.45, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.22)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
    }

    // ---- Per-car motifs -------------------------------------------------

    /** Bolt — twin centre racing stripes. */
    static _racingStripes(ctx, size) {
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(size * 0.4, 0, size * 0.06, size);
        ctx.fillRect(size * 0.54, 0, size * 0.06, size);
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(size * 0.47, 0, size * 0.06, size);
    }

    /** Comet — swooping speed streaks. */
    static _speedStreaks(ctx, size, base) {
        ctx.strokeStyle = CarPainter._shade(base, 1.7);
        ctx.lineWidth = size * 0.035;
        ctx.lineCap = 'round';
        for (let i = -2; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(-size * 0.2, i * size * 0.18);
            ctx.quadraticCurveTo(size * 0.5, i * size * 0.18 - size * 0.12, size * 1.2, i * size * 0.18 + size * 0.1);
            ctx.stroke();
        }
    }

    /** Vortex — hex carbon weave. */
    static _hexWeave(ctx, size, base) {
        const r = size / 14;
        ctx.strokeStyle = CarPainter._shade(base, 1.6);
        ctx.lineWidth = 3;
        for (let row = -1; row * r * 1.5 < size + r; row++) {
            for (let col = -1; col * r * Math.sqrt(3) < size + r; col++) {
                const cx = col * r * Math.sqrt(3) + (row % 2 ? r * Math.sqrt(3) / 2 : 0);
                CarPainter._hexagon(ctx, cx, row * r * 1.5, r * 0.92);
            }
        }
    }

    /** Titan — heavy plated panels with rivets. */
    static _platePanels(ctx, size, base) {
        const step = size / 4;
        ctx.strokeStyle = CarPainter._shade(base, 0.45);
        ctx.lineWidth = size * 0.02;
        for (let i = 1; i < 4; i++) {
            ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
        }
        ctx.fillStyle = CarPainter._shade(base, 1.8);
        for (let x = step; x < size; x += step) {
            for (let y = step; y < size; y += step) {
                ctx.beginPath(); ctx.arc(x, y, size * 0.012, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    /** Spark — electric lightning bolts. */
    static _lightning(ctx, size, base) {
        ctx.strokeStyle = CarPainter._shade(base, 2.2);
        ctx.lineWidth = size * 0.025;
        ctx.lineJoin = 'round';
        for (let i = 0; i < 3; i++) {
            const x0 = size * (0.2 + i * 0.3);
            ctx.beginPath();
            ctx.moveTo(x0, 0);
            ctx.lineTo(x0 - size * 0.06, size * 0.4);
            ctx.lineTo(x0 + size * 0.05, size * 0.45);
            ctx.lineTo(x0 - size * 0.04, size);
            ctx.stroke();
        }
    }

    /** Generic fallback — diagonal stripes in the base hue. */
    static _stripes(ctx, size, base) {
        ctx.strokeStyle = CarPainter._shade(base, 1.5);
        ctx.lineWidth = size * 0.04;
        for (let x = -size; x < size * 2; x += size * 0.18) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + size, size);
            ctx.stroke();
        }
    }

    // ---- Small drawing helpers -----------------------------------------

    static _hexagon(ctx, cx, cy, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + i * Math.PI / 3;
            const x = cx + r * Math.cos(a);
            const y = cy + r * Math.sin(a);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }

    /** Hex int -> #rrggbb. */
    static _hex(color) {
        return '#' + color.toString(16).padStart(6, '0');
    }

    /**
     * Complementary colour (hue + 180°) as an rgb() string.
     * @param {number} color packed 0xRRGGBB
     * @returns {string}
     */
    static _complementary(color) {
        const hsl = {};
        new THREE.Color(color).getHSL(hsl);
        const comp = new THREE.Color().setHSL((hsl.h + 0.5) % 1, Math.min(1, hsl.s + 0.1), 0.55);
        return `rgb(${Math.round(comp.r * 255)},${Math.round(comp.g * 255)},${Math.round(comp.b * 255)})`;
    }

    /**
     * Multiply an #rrggbb colour towards white (>1) or black (<1).
     * @param {string} hex
     * @param {number} factor
     * @returns {string}
     */
    static _shade(hex, factor) {
        const n = Number.parseInt(hex.slice(1), 16);
        const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
        const r = clamp(((n >> 16) & 0xff) * factor);
        const g = clamp(((n >> 8) & 0xff) * factor);
        const b = clamp((n & 0xff) * factor);
        return `rgb(${r},${g},${b})`;
    }
}

/** Per-id motif registry (declared after the class so methods exist). */
CarPainter._MOTIFS = Object.freeze({
    bolt: CarPainter._racingStripes,
    comet: CarPainter._speedStreaks,
    vortex: CarPainter._hexWeave,
    titan: CarPainter._platePanels,
    spark: CarPainter._lightning,
});

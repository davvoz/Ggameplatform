import * as THREE from "three";

/**
 * Geometry Cache - Riusa geometrie identiche invece di crearne di nuove
 * Questo riduce drasticamente il memory usage
 */
export class GeometryCache {
  static cache = new Map();

  static getGeometry(type, params) {
    const key = GeometryCache._generateKey(type, params);
    
    if (GeometryCache.cache.has(key)) {
      return GeometryCache.cache.get(key); // Riusa la stessa geometria!
    }

    let geometry;
    const p = params;
    
    switch (type) {
      case "sphere":
        geometry = new THREE.SphereGeometry(p.radius || 1, p.widthSegments || 8, p.heightSegments || 6);
        break;
      case "box":
        geometry = new THREE.BoxGeometry(p.width || 1, p.height || 1, p.depth || 1);
        break;
      case "cylinder":
        geometry = new THREE.CylinderGeometry(p.radiusTop || 1, p.radiusBottom || 1, p.height || 1, p.segments || 8);
        break;
      case "torus":
        geometry = new THREE.TorusGeometry(p.radius || 1, p.tube || 0.4, p.radialSegments || 8, p.tubularSegments || 12);
        break;
      case "octahedron":
        geometry = new THREE.OctahedronGeometry(p.radius || 1, p.detail || 0);
        break;
      case "plane":
        geometry = new THREE.PlaneGeometry(p.width || 1, p.height || 1);
        break;
      case "cone":
        geometry = new THREE.ConeGeometry(p.radius || 1, p.height || 1, p.radialSegments || 8);
        break;
      case "icosahedron":
        geometry = new THREE.IcosahedronGeometry(p.radius || 1, p.detail || 0);
        break;
      default:
        geometry = new THREE.SphereGeometry(1, 8, 6);
    }

    GeometryCache.cache.set(key, geometry);
    return geometry;
  }

  static _generateKey(type, params) {
    return `${type}_${JSON.stringify(params)}`;
  }

  static clear() {
    GeometryCache.cache.forEach(geo => geo.dispose());
    GeometryCache.cache.clear();
  }

  static getStats() {
    return {
      cached: GeometryCache.cache.size
    };
  }
}

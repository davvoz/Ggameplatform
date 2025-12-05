import * as THREE from "three";

/**
 * Geometry Cache - Riusa geometrie identiche invece di crearne di nuove
 * Questo riduce drasticamente il memory usage
 * 
 * OTTIMIZZATO PER MOBILE:
 * - Rileva dispositivo e riduce automaticamente i segmenti
 * - Usa geometrie LOD (Level of Detail) 
 * - Pre-computa bounding per frustum culling
 */
export class GeometryCache {
  static cache = new Map();
  static qualityMultiplier = GeometryCache._detectQualityMultiplier();

  static _detectQualityMultiplier() {
    const isMobile = /android|webos|iphone|ipad|ipod/i.test(navigator.userAgent);
    const isLowEnd = navigator.hardwareConcurrency <= 4;
    
    if (isMobile) return 0.5;  // 50% segmenti su mobile
    if (isLowEnd) return 0.7;  // 70% su PC low-end
    return 1.0;                // 100% su desktop potente
  }

  static getGeometry(type, params) {
    const key = GeometryCache._generateKey(type, params);
    
    if (GeometryCache.cache.has(key)) {
      return GeometryCache.cache.get(key); // Riusa la stessa geometria!
    }

    let geometry;
    const p = params;
    const q = GeometryCache.qualityMultiplier;
    
    switch (type) {
      case "sphere":
        geometry = new THREE.SphereGeometry(
          p.radius || 1, 
          Math.max(4, Math.floor((p.widthSegments || 8) * q)),
          Math.max(3, Math.floor((p.heightSegments || 6) * q))
        );
        break;
      case "box":
        geometry = new THREE.BoxGeometry(p.width || 1, p.height || 1, p.depth || 1);
        break;
      case "cylinder":
        geometry = new THREE.CylinderGeometry(
          p.radiusTop || 1, 
          p.radiusBottom || 1, 
          p.height || 1, 
          Math.max(4, Math.floor((p.segments || 8) * q))
        );
        break;
      case "torus":
        geometry = new THREE.TorusGeometry(
          p.radius || 1, 
          p.tube || 0.4, 
          Math.max(4, Math.floor((p.radialSegments || 8) * q)),
          Math.max(6, Math.floor((p.tubularSegments || 12) * q))
        );
        break;
      case "octahedron":
        geometry = new THREE.OctahedronGeometry(p.radius || 1, Math.floor((p.detail || 0) * q));
        break;
      case "plane":
        geometry = new THREE.PlaneGeometry(p.width || 1, p.height || 1);
        break;
      case "cone":
        geometry = new THREE.ConeGeometry(
          p.radius || 1, 
          p.height || 1, 
          Math.max(4, Math.floor((p.radialSegments || 8) * q))
        );
        break;
      case "icosahedron":
        geometry = new THREE.IcosahedronGeometry(p.radius || 1, Math.floor((p.detail || 0) * q));
        break;
      default:
        geometry = new THREE.SphereGeometry(1, Math.floor(8 * q), Math.floor(6 * q));
    }

    // Pre-computa bounding sphere per frustum culling ottimizzato
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

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

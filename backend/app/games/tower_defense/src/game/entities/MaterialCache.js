import * as THREE from "three";

/**
 * Material Cache - Riusa materiali identici invece di crearne di nuovi
 * Questo riduce drasticamente i draw calls e migliora le prestazioni
 */
export class MaterialCache {
  static cache = new Map();

  static getMaterial(type, params) {
    const key = MaterialCache._generateKey(type, params);
    
    if (MaterialCache.cache.has(key)) {
      return MaterialCache.cache.get(key); // NO CLONE - riusa lo stesso materiale!
    }

    let material;
    switch (type) {
      case "standard":
        material = new THREE.MeshStandardMaterial(params);
        break;
      case "physical":
        material = new THREE.MeshPhysicalMaterial(params);
        break;
      case "basic":
        material = new THREE.MeshBasicMaterial(params);
        break;
      default:
        material = new THREE.MeshStandardMaterial(params);
    }

    MaterialCache.cache.set(key, material);
    return material; // NO CLONE!
  }

  static _generateKey(type, params) {
    return `${type}_${JSON.stringify(params)}`;
  }

  static clear() {
    MaterialCache.cache.forEach(mat => mat.dispose());
    MaterialCache.cache.clear();
  }
}

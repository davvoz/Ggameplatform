import * as THREE from "three";

/**
 * Material Cache - Riusa materiali identici invece di crearne di nuovi
 * Questo riduce drasticamente i draw calls e migliora le prestazioni
 * 
 * OTTIMIZZATO PER MOBILE:
 * - Disabilita feature costose su mobile (roughness maps, metalness)
 * - Usa MeshBasicMaterial invece di Standard su mobile
 * - Disabilita fog su mobile
 */
export class MaterialCache {
  static cache = new Map();
  static isMobile = /android|webos|iphone|ipad|ipod/i.test(navigator.userAgent);
  static isLowEnd = navigator.hardwareConcurrency <= 4;

  static getMaterial(type, params) {
    // Su mobile, forza basic material per performance
    if (MaterialCache.isMobile && (type === "standard" || type === "physical")) {
      type = "basic";
      // Rimuovi parametri non supportati da BasicMaterial
      const { roughness, metalness, envMap, ...basicParams } = params;
      params = basicParams;
    }

    const key = MaterialCache._generateKey(type, params);
    
    if (MaterialCache.cache.has(key)) {
      return MaterialCache.cache.get(key); // NO CLONE - riusa lo stesso materiale!
    }

    let material;
    
    // Parametri ottimizzati
    const optimizedParams = {
      ...params,
      fog: MaterialCache.isMobile ? false : (params.fog !== false),
      flatShading: MaterialCache.isMobile || params.flatShading || false
    };

    switch (type) {
      case "standard":
        material = new THREE.MeshStandardMaterial({
          ...optimizedParams,
          roughness: MaterialCache.isLowEnd ? 1 : (optimizedParams.roughness || 0.5),
          metalness: MaterialCache.isLowEnd ? 0 : (optimizedParams.metalness || 0.5)
        });
        break;
      case "physical":
        material = new THREE.MeshPhysicalMaterial(optimizedParams);
        break;
      case "basic":
        material = new THREE.MeshBasicMaterial(optimizedParams);
        break;
      default:
        material = new THREE.MeshStandardMaterial(optimizedParams);
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

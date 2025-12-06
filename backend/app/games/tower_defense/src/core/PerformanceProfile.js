/**
 * Performance Profile System - Configurazioni ottimali per diversi dispositivi
 * Factory Pattern + Strategy Pattern per gestire performance su mobile/desktop
 */

import * as THREE from 'three';

export class PerformanceProfile {
  constructor(settings) {
    this.pixelRatio = settings.pixelRatio;
    this.shadows = settings.shadows;
    this.antialias = settings.antialias;
    this.maxEnemies = settings.maxEnemies;
    this.maxProjectiles = settings.maxProjectiles;
    this.particleQuality = settings.particleQuality;
    this.geometryQuality = settings.geometryQuality;
    this.targetFPS = settings.targetFPS;
    this.shadowMapSize = settings.shadowMapSize;
    this.enableFog = settings.enableFog;
  }

  /**
   * Applica le impostazioni al renderer
   */
  applyToRenderer(renderer) {
    renderer.setPixelRatio(this.pixelRatio);
    renderer.shadowMap.enabled = this.shadows;
    
    if (this.shadows) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false; // Update manuale
    }
    
    // Ottimizzazioni generali
    renderer.info.autoReset = false;
    renderer.sortObjects = false; // Risparmia sorting
  }

  /**
   * Applica le impostazioni alla scena
   */
  applyToScene(scene) {
    if (scene.fog && !this.enableFog) {
      scene.fog = null;
    }
  }

  /**
   * Ottieni il quality multiplier per geometrie
   */
  getGeometryQuality() {
    return this.geometryQuality;
  }
}

/**
 * Factory per creare profili ottimizzati
 */
export class PerformanceProfileFactory {
  static detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
    const isLowEnd = navigator.hardwareConcurrency <= 4 || navigator.deviceMemory <= 4;
    
    return {
      isMobile,
      isTablet,
      isLowEnd,
      deviceType: isMobile ? 'mobile' : (isTablet ? 'tablet' : 'desktop')
    };
  }

  /**
   * Crea il profilo ottimale basato sul dispositivo
   */
  static createOptimal() {
    const device = PerformanceProfileFactory.detectDevice();
    
    if (device.isMobile) {
      return PerformanceProfileFactory.createMobileProfile();
    } else if (device.isTablet) {
      return PerformanceProfileFactory.createTabletProfile();
    } else if (device.isLowEnd) {
      return PerformanceProfileFactory.createLowEndProfile();
    } else {
      return PerformanceProfileFactory.createDesktopProfile();
    }
  }

  /**
   * Profilo Mobile - Performance al massimo
   */
  static createMobileProfile() {
    return new PerformanceProfile({
      pixelRatio: 1, // Fisso a 1x su mobile
      shadows: false,
      antialias: false,
      maxEnemies: 30,
      maxProjectiles: 50,
      particleQuality: 0.3,
      geometryQuality: 0.5,
      targetFPS: 30,
      shadowMapSize: 512,
      enableFog: false
    });
  }

  /**
   * Profilo Tablet - Bilanciato
   */
  static createTabletProfile() {
    return new PerformanceProfile({
      pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      shadows: true,
      antialias: false,
      maxEnemies: 50,
      maxProjectiles: 100,
      particleQuality: 0.5,
      geometryQuality: 0.7,
      targetFPS: 45,
      shadowMapSize: 1024,
      enableFog: true
    });
  }

  /**
   * Profilo Low-End Desktop
   */
  static createLowEndProfile() {
    return new PerformanceProfile({
      pixelRatio: 1,
      shadows: true,
      antialias: false,
      maxEnemies: 70,
      maxProjectiles: 150,
      particleQuality: 0.6,
      geometryQuality: 0.8,
      targetFPS: 60,
      shadowMapSize: 1024,
      enableFog: true
    });
  }

  /**
   * Profilo Desktop - Qualità massima
   */
  static createDesktopProfile() {
    return new PerformanceProfile({
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      shadows: true,
      antialias: true,
      maxEnemies: 100,
      maxProjectiles: 200,
      particleQuality: 1.0,
      geometryQuality: 1.0,
      targetFPS: 60,
      shadowMapSize: 2048,
      enableFog: true
    });
  }
}

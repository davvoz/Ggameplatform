import * as THREE from "three";
import { BaseEntity } from "./BaseEntity.js";

/**
 * FloatingText - Entità scalabile per mostrare testo animato nello spazio 3D
 * Usato per damage numbers, upgrade feedback, status messages, etc.
 */
export class FloatingText extends BaseEntity {
  constructor(position, text, options = {}) {
    super();

    this.position = position.clone();
    this.text = text;

    // Opzioni configurabili
    this.options = {
      color: options.color || 0xffffff,
      fontSize: options.fontSize || 64,
      duration: options.duration || 1.2,
      velocity: options.velocity || new THREE.Vector3(0, 1.5, 0),
      fadeStart: options.fadeStart || 0.5, // frazione della durata dopo cui inizia il fade
      scale: options.scale || 1.0,
      gravity: options.gravity || -0.5, // accelerazione verso il basso
      randomOffset: options.randomOffset !== undefined ? options.randomOffset : true,
      style: options.style || "normal", // "normal", "critical", "upgrade", "warning"
      ...options
    };

    this.velocity = this.options.velocity.clone();
    this.age = 0;
    this.lifeTime = this.options.duration;

    // Applica offset casuale per evitare sovrapposizioni
    if (this.options.randomOffset) {
      this.position.x += (Math.random() - 0.5) * 0.3;
      this.position.z += (Math.random() - 0.5) * 0.3;
      this.velocity.x += (Math.random() - 0.5) * 0.4;
    }

    // Reference to texture for disposal
    this.texture = null;

    this.mesh = this._createMesh();
    this.mesh.position.copy(this.position);
  }

  _createMesh() {
    // Crea una sprite per il testo
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Dimensioni canvas basate su fontSize - aumentato per testi più lunghi
    const size = this.options.fontSize;
    canvas.width = size * 8; // Aumentato da 4 a 8 per testi più lunghi
    canvas.height = size * 1.5;

    // Stile basato sul tipo
    let fontWeight = 'bold';
    let fontSize = size;
    let strokeWidth = size * 0.08;
    let glowBlur = size * 0.15;

    if (this.options.style === 'critical') {
      fontWeight = '900';
      fontSize *= 1.3;
      strokeWidth *= 1.5;
      glowBlur *= 1.8;
    } else if (this.options.style === 'upgrade') {
      fontWeight = 'bold';
      fontSize *= 1.1;
      glowBlur *= 1.4;
    }

    context.font = `${fontWeight} ${fontSize}px 'Orbitron', 'Arial', sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    const textX = canvas.width / 2;
    const textY = canvas.height / 2;

    // Effetto glow
    context.shadowBlur = glowBlur;
    context.shadowColor = this._getColorString(this.options.color);

    // Outline scuro per contrasto
    context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    context.lineWidth = strokeWidth;
    context.strokeText(this.text, textX, textY);

    // Testo principale
    context.fillStyle = this._getColorString(this.options.color);
    context.fillText(this.text, textX, textY);

    // Crea texture dalla canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Store texture reference for disposal
    this.texture = texture;

    // Crea sprite material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      depthTest: true
    });

    const sprite = new THREE.Sprite(material);

    // Scala sprite in base al world space
    const aspectRatio = canvas.width / canvas.height;
    const worldScale = this.options.scale * 0.8;
    sprite.scale.set(worldScale * aspectRatio, worldScale, 1);

    sprite.userData.baseScale = sprite.scale.clone();

    return sprite;
  }

  _getColorString(color) {
    const threeColor = new THREE.Color(color);
    return `rgb(${Math.floor(threeColor.r * 255)}, ${Math.floor(threeColor.g * 255)}, ${Math.floor(threeColor.b * 255)})`;
  }

  update(deltaTime) {
    if (this.isDisposed) return;

    this.age += deltaTime;

    // Rimuovi quando scaduto
    if (this.age >= this.lifeTime) {
      this.dispose(this.mesh?.parent || null);
      return;
    }

    // Fisica semplice
    this.velocity.y += this.options.gravity * deltaTime;
    this.position.addScaledVector(this.velocity, deltaTime);

    if (this.mesh) {
      this.mesh.position.copy(this.position);

      const progress = this.age / this.lifeTime;
      const material = this.mesh.material;

      // Animazione scala: pop iniziale, poi normalizza
      let scale = 1.0;
      if (progress < 0.15) {
        // Pop iniziale
        const popProgress = progress / 0.15;
        scale = 1 + Math.sin(popProgress * Math.PI) * 0.4;
      } else {
        // Leggero rimbalzo
        scale = 1 + Math.sin(progress * Math.PI * 2) * 0.05;
      }

      const baseScale = this.mesh.userData.baseScale;
      this.mesh.scale.set(
        baseScale.x * scale,
        baseScale.y * scale,
        baseScale.z
      );

      // Fade out verso la fine
      const fadeProgress = this.options.fadeStart;
      if (progress > fadeProgress) {
        const fadeAmount = (progress - fadeProgress) / (1 - fadeProgress);
        material.opacity = 1 - fadeAmount;
      }

      // Rotazione leggera verso camera (billboard automatico con Sprite)
    }
  }

  /**
   * Override dispose to clean up texture
   */
  dispose(scene) {
    // Dispose texture
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }

    // Dispose material
    if (this.mesh && this.mesh.material) {
      this.mesh.material.dispose();
    }

    // Call parent dispose
    super.dispose(scene);
  }

  /**
   * Factory methods per vari tipi di floating text
   */
  /**
   * Factory methods per vari tipi di floating text
   */
  static createDamage(position, damage, isCritical = false) {
    const text = `-${Math.round(damage)}`;
    const options = {
      color: isCritical ? 0xff6b35 : 0xff9966,
      fontSize: 56,
      duration: 1.0,
      velocity: new THREE.Vector3(0, 1.8, 0),
      gravity: -0.8,
      style: isCritical ? 'critical' : 'normal'
    };
    return new FloatingText(position, text, options);
  }

  static createUpgrade(position, level) {
    const text = `⬆ LEVEL ${level} ⬆`;
    const options = {
      color: 0x00ff88,
      fontSize: 64,
      duration: 2.0,
      velocity: new THREE.Vector3(0, 1.5, 0),
      gravity: -0.4,
      style: 'upgrade',
      randomOffset: false
    };
    return new FloatingText(position, text, options);
  }

  static createInfo(position, text, color = 0xffffff) {
    const options = {
      color: color,
      fontSize: 42,
      duration: 1.3,
      velocity: new THREE.Vector3(0, 1.0, 0),
      gravity: -0.4,
      style: 'normal'
    };
    return new FloatingText(position, text, options);
  }

  static createWarning(position, text) {
    const options = {
      color: 0xffda6c,
      fontSize: 50,
      duration: 1.8,
      velocity: new THREE.Vector3(0, 0.8, 0),
      gravity: -0.2,
      style: 'warning',
      randomOffset: false
    };
    return new FloatingText(position, text, options);
  }
}

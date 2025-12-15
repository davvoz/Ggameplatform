/**
 * Dice Factory
 * Single Responsibility: Die creation
 */

import { GAME_CONSTANTS } from '../constants.js';

export class DiceFactory {
  createDie(x, y, z) {
    const geometry = this._createGeometry();
    const material = this._createMaterial();
    const die = new THREE.Mesh(geometry, material);

    die.position.set(x, y, z);
    die.castShadow = true;
    die.receiveShadow = true;

    this._addDots(die);
    this._addEdges(die, geometry);

    return die;
  }

  _createGeometry() {
    return new THREE.BoxGeometry(
      GAME_CONSTANTS.DICE_SIZE,
      GAME_CONSTANTS.DICE_SIZE,
      GAME_CONSTANTS.DICE_SIZE,
      GAME_CONSTANTS.DICE_SEGMENTS,
      GAME_CONSTANTS.DICE_SEGMENTS,
      GAME_CONSTANTS.DICE_SEGMENTS
    );
  }

  _createMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.25,
      metalness: 0.05,
      envMapIntensity: 1.0
    });
  }

  _addDots(die) {
    const dotGeometry = new THREE.SphereGeometry(GAME_CONSTANTS.DOT_RADIUS, 16, 16);
    const dotMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0c1c,
      roughness: 0.8,
      metalness: 0.0
    });

    const size = GAME_CONSTANTS.DICE_SIZE;
    const dotDepth = GAME_CONSTANTS.DOT_DEPTH;
    const offset = size / 3;

    // Face 1 - 1 dot
    this._addDot(die, 0, 0, size / 2 + dotDepth / 2, dotGeometry, dotMaterial);

    // Face 2 - 2 dots
    this._addDot(die, size / 2 + dotDepth / 2, offset, -offset, dotGeometry, dotMaterial);
    this._addDot(die, size / 2 + dotDepth / 2, -offset, offset, dotGeometry, dotMaterial);

    // Face 3 - 3 dots
    this._addDot(die, -offset, size / 2 + dotDepth / 2, -offset, dotGeometry, dotMaterial);
    this._addDot(die, 0, size / 2 + dotDepth / 2, 0, dotGeometry, dotMaterial);
    this._addDot(die, offset, size / 2 + dotDepth / 2, offset, dotGeometry, dotMaterial);

    // Face 4 - 4 dots
    this._addDot(die, -offset, -(size / 2 + dotDepth / 2), -offset, dotGeometry, dotMaterial);
    this._addDot(die, -offset, -(size / 2 + dotDepth / 2), offset, dotGeometry, dotMaterial);
    this._addDot(die, offset, -(size / 2 + dotDepth / 2), -offset, dotGeometry, dotMaterial);
    this._addDot(die, offset, -(size / 2 + dotDepth / 2), offset, dotGeometry, dotMaterial);

    // Face 5 - 5 dots
    this._addDot(die, -(size / 2 + dotDepth / 2), -offset, -offset, dotGeometry, dotMaterial);
    this._addDot(die, -(size / 2 + dotDepth / 2), -offset, offset, dotGeometry, dotMaterial);
    this._addDot(die, -(size / 2 + dotDepth / 2), 0, 0, dotGeometry, dotMaterial);
    this._addDot(die, -(size / 2 + dotDepth / 2), offset, -offset, dotGeometry, dotMaterial);
    this._addDot(die, -(size / 2 + dotDepth / 2), offset, offset, dotGeometry, dotMaterial);

    // Face 6 - 6 dots
    this._addDot(die, -offset, -offset, -(size / 2 + dotDepth / 2), dotGeometry, dotMaterial);
    this._addDot(die, -offset, 0, -(size / 2 + dotDepth / 2), dotGeometry, dotMaterial);
    this._addDot(die, -offset, offset, -(size / 2 + dotDepth / 2), dotGeometry, dotMaterial);
    this._addDot(die, offset, -offset, -(size / 2 + dotDepth / 2), dotGeometry, dotMaterial);
    this._addDot(die, offset, 0, -(size / 2 + dotDepth / 2), dotGeometry, dotMaterial);
    this._addDot(die, offset, offset, -(size / 2 + dotDepth / 2), dotGeometry, dotMaterial);
  }

  _addDot(parent, x, y, z, geometry, material) {
    const dot = new THREE.Mesh(geometry, material);
    dot.position.set(x, y, z);
    dot.castShadow = true;
    parent.add(dot);
  }

  _addEdges(die, geometry) {
    const edges = new THREE.EdgesGeometry(geometry, 15);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x000000,
      linewidth: 2,
      opacity: 0.8,
      transparent: true
    });
    const lineSegments = new THREE.LineSegments(edges, lineMaterial);
    die.add(lineSegments);
  }
}

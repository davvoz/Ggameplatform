import * as THREE from "three";

/**
 * Skill Color System - Maps skills to colors and blends them
 * Follows Single Responsibility Principle
 */
export class SkillColorSystem {
  constructor() {
    // Branch base colors - Pure hues for each branch
    this.branchColors = {
      'offense': 0xff0033,   // Magenta Red
      'control': 0x0099ff,   // Electric Blue
      'utility': 0xff9900,   // Orange
    };
    
    // Colors for each tier - Colori saturi e distintivi
    this.tierColors = {
      'offense': {
        1: 0xff3366,  // Rosa acceso
        2: 0xff0033,  // Rosso magenta
        3: 0xcc0000,  // Rosso puro scuro
      },
      'control': {
        1: 0x33ccff,  // Azzurro elettrico
        2: 0x0099ff,  // Blu brillante
        3: 0x0066cc,  // Blu intenso
      },
      'utility': {
        1: 0xffcc00,  // Arancione dorato
        2: 0xff9900,  // Arancione acceso
        3: 0xff6600,  // Arancione scuro
      }
    };
    
    // Map skills to their tier
    this.skillTiers = {
      // Offense branch
      'off_damage1': 1,
      'off_damage2': 2,
      'off_crit': 3,
      
      // Control branch
      'ctrl_slow1': 1,
      'ctrl_slow2': 2,
      'ctrl_aoe': 3,
      
      // Utility branch
      'util_speed1': 1,
      'util_speed2': 2,
      'util_multi': 3,
    };
    
    // Default color (no skills)
    this.defaultColor = 0x888888; // Gray
  }

  /**
   * Calculate blended color based on unlocked skills
   * Mixes colors like a painter - each skill adds its color to the mix
   * @param {Set} unlockedSkills - Set of skill IDs
   * @returns {number} Blended hex color
   */
  getBlendedColor(unlockedSkills) {
    console.log('[SKILL COLOR] getBlendedColor called:', {
      skills: Array.from(unlockedSkills || [])
    });
    
    // No skills unlocked - return default white
    if (!unlockedSkills || unlockedSkills.size === 0) {
      console.log('[SKILL COLOR] No skills, returning white');
      return 0xffffff;
    }

    // Collect all colors from unlocked skills (each skill uses its own branch)
    const colorsToMix = [];
    
    for (const skillId of unlockedSkills) {
      // Auto-detect branch from skill ID prefix
      let skillBranch = null;
      if (skillId.startsWith('off_')) skillBranch = 'offense';
      else if (skillId.startsWith('ctrl_')) skillBranch = 'control';
      else if (skillId.startsWith('util_')) skillBranch = 'utility';
      
      if (!skillBranch) {
        console.warn('[SKILL COLOR] Cannot detect branch for skill:', skillId);
        continue;
      }
      
      const branchTierColors = this.tierColors[skillBranch];
      if (!branchTierColors) {
        console.warn('[SKILL COLOR] No tier colors for branch:', skillBranch);
        continue;
      }
      
      const tier = this.skillTiers[skillId];
      if (!tier || !branchTierColors[tier]) {
        console.warn('[SKILL COLOR] Unknown tier for skill:', skillId);
        continue;
      }
      
      const color = new THREE.Color(branchTierColors[tier]);
      colorsToMix.push(color);
      console.log(`[SKILL COLOR] Skill ${skillId} (${skillBranch}) tier ${tier} color: ${color.getHexString()}`);
    }

    // No valid skills found - return white
    if (colorsToMix.length === 0) {
      console.log('[SKILL COLOR] No valid skills, returning white');
      return 0xffffff;
    }

    // Single color - return it directly
    if (colorsToMix.length === 1) {
      console.log('[SKILL COLOR] Single color:', colorsToMix[0].getHexString());
      return colorsToMix[0].getHex();
    }

    // Mix all colors together (average RGB like mixing paint)
    let r = 0, g = 0, b = 0;
    for (const color of colorsToMix) {
      r += color.r;
      g += color.g;
      b += color.b;
    }
    
    const count = colorsToMix.length;
    const mixedColor = new THREE.Color(r / count, g / count, b / count);
    
    console.log('[SKILL COLOR] Mixed', count, 'colors into:', mixedColor.getHexString());
    
    return mixedColor.getHex();
  }

  /**
   * Get emissive color with intensity
   * @param {Set} unlockedSkills - Set of skill IDs
   * @param {string|null} skillBranch - Current skill branch
   * @returns {Object} {color: number, intensity: number}
   */
  getEmissiveColor(unlockedSkills) {
    const blendedColor = this.getBlendedColor(unlockedSkills);
    
    // Intensity is not used with MeshBasicMaterial, but keep for compatibility
    const skillCount = unlockedSkills ? unlockedSkills.size : 0;
    const intensity = Math.min(1.0 + (skillCount * 0.3), 3.0);
    
    return {
      color: blendedColor,
      intensity: intensity
    };
  }

  /**
   * This method is no longer used but kept for compatibility
   */
  _blendColors(colors) {
    if (colors.length === 0) return new THREE.Color(this.defaultColor);
    if (colors.length === 1) return colors[0];
    return colors[0]; // Just return first color
  }

  /**
   * Get color gradient for skill progression
   * @param {string} branch - Skill branch
   * @param {number} tier - Skill tier (1-3)
   * @returns {number} Color for that tier
   */
  getTierColor(branch, tier) {
    const branchTierColors = this.tierColors[branch];
    if (!branchTierColors || !branchTierColors[tier]) {
      return this.branchColors[branch] || this.defaultColor;
    }
    return branchTierColors[tier];
  }
}
